import express from 'express';
import dotenv from 'dotenv';
import { query } from '../config/db.js';
import { redis } from '../config/redis.js';
import { chatQueue } from '../config/queues.js';
import { cleanPhone } from '../utils/phone.js';
import { processMedia } from './media.js';

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;
const TENANT_ID = process.env.DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000000';

app.get('/', (req, res) => {
  res.status(200).send('API is running successfully!');
});

app.post('/webhook', async (req, res) => {
  try {
    const payload = req.body;
    
    // Find tenant by session
    const sessionName = payload.session || process.env.WAHA_SESSION || 'default';
    let tenantId = process.env.DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000000';
    
    const settingsRes = await query('SELECT tenant_id FROM agent_settings WHERE waha_session_id = $1', [sessionName]);
    console.log(`[WEBHOOK] Recebido webhook para sessão: ${sessionName}. Encontrados ${settingsRes.rows.length} tenants.`);
    
    if (settingsRes.rows.length > 0) {
      tenantId = settingsRes.rows[0].tenant_id;
      console.log(`[WEBHOOK] Tenant resolvido: ${tenantId}`);
    } else {
      console.log(`[WEBHOOK] Sessão não encontrada na tabela agent_settings. Usando default: ${tenantId}`);
    }

    const eventResult = await query(
      `INSERT INTO webhook_events (tenant_id, payload) VALUES ($1, $2) RETURNING id`,
      [tenantId, JSON.stringify(payload)]
    );
    const eventId = eventResult.rows[0].id;

    if (payload.event !== 'message' && payload.event !== 'message.any') {
      await query(`UPDATE webhook_events SET status = 'ignored' WHERE id = $1`, [eventId]);
      return res.status(200).send('Event ignored');
    }

    const message = payload.payload;
    const { from, to, body, isGroupMsg, hasMedia, fromMe } = message;
    
    // WAHA sometimes uses 'fromMe' instead of 'isFromMe'
    const isFromMe = message.isFromMe !== undefined ? message.isFromMe : fromMe;
    const source = message.source;

    if (isGroupMsg) {
      await query(`UPDATE webhook_events SET status = 'ignored_group' WHERE id = $1`, [eventId]);
      return res.status(200).send('Groups ignored');
    }

    const contactId = (isFromMe && to) ? to : from;
    const rawPhone = cleanPhone(contactId);

    if (isFromMe) {
      const isApiSource = source === 'api';
      const botSent = await redis.get(`bot_sent:${contactId}`);
      
      // Se não foi o bot que enviou (bot_sent false) E não veio da API (source !== 'api'), pausa o bot
      if (!botSent && !isApiSource) {
        await query(
          `INSERT INTO conversation_summaries (tenant_id, contact_id, is_bot_paused, bot_paused_at) 
           VALUES ($1, $2, true, NOW()) 
           ON CONFLICT (tenant_id, contact_id) DO UPDATE SET is_bot_paused = true, bot_paused_at = NOW()`,
          [tenantId, contactId]
        );
        console.log(`[INFO] Intervenção humana detectada para ${contactId}. Bot pausado.`);
      } else {
        console.log(`[INFO] Mensagem fromMe ignorada. Motivo: botSent=${!!botSent}, isApiSource=${isApiSource}`);
      }
      await query(`UPDATE webhook_events SET status = 'processed_from_me' WHERE id = $1`, [eventId]);
      return res.status(200).send('Message from me processed');
    }

    const summaryRes = await query(
      `SELECT is_bot_paused FROM conversation_summaries WHERE tenant_id = $1 AND contact_id = $2`,
      [tenantId, contactId]
    );

    if (summaryRes.rows.length > 0 && summaryRes.rows[0].is_bot_paused) {
      console.log(`[INFO] Bot pausado para ${contactId}. Mensagem ignorada.`);
      await query(`UPDATE webhook_events SET status = 'bot_paused' WHERE id = $1`, [eventId]);
      return res.status(200).send('Bot is paused');
    }

    await query(
      `INSERT INTO clients (phone, whatsapp_id, jid) VALUES ($1, $2, $3)
       ON CONFLICT (phone) DO UPDATE SET whatsapp_id = EXCLUDED.whatsapp_id, jid = EXCLUDED.jid`,
      [rawPhone, contactId, contactId]
    );

    // Also ensure they exist in customers table for UI visibility
    let customerName = payload.pushName || payload.name || rawPhone;
    const existingCustomer = await query(
      `SELECT id FROM customers WHERE tenant_id = $1 AND phone = $2`,
      [tenantId, rawPhone]
    );

    if (existingCustomer.rows.length === 0) {
      await query(
        `INSERT INTO customers (tenant_id, phone, name, type) VALUES ($1, $2, $3, 'lead')`,
        [tenantId, rawPhone, customerName]
      );
    }

    let textToProcess = body;
    if (hasMedia) {
      const mediaText = await processMedia(message);
      if (mediaText) textToProcess = mediaText;
    }

    if (!textToProcess || textToProcess.trim() === '') {
      await query(`UPDATE webhook_events SET status = 'empty_message' WHERE id = $1`, [eventId]);
      return res.status(200).send('Empty message ignored');
    }

    const bufferKey = `chat_buffer:${tenantId}:${contactId}`;
    await redis.rpush(bufferKey, textToProcess);
    
    const jobId = `job_chat_${tenantId}_${contactId}`;
    
    const existingJob = await chatQueue.getJob(jobId);
    if (existingJob) {
      const isActive = await existingJob.isActive();
      if (!isActive) {
        console.log(`[BUFFER] Mensagem adicional recebida. Removendo job existente (ID: ${jobId}) para estender o tempo do buffer.`);
        try {
          await existingJob.remove();
        } catch (e) {
          console.log(`[BUFFER] Nao foi possivel remover o job ${jobId} (pode estar sendo processado).`);
        }
      } else {
        console.log(`[BUFFER] Job ${jobId} já está ativo. A mensagem foi adicionada ao buffer e será processada no próximo ciclo se o worker já tiver lido o buffer, ou na mesma execução.`);
      }
    } else {
      console.log(`[BUFFER] Nova mensagem. Iniciando timer de buffer para o job (ID: ${jobId}).`);
    }

    const bufferTime = parseInt(process.env.MESSAGE_BUFFER_TIME_MS, 10) || 3000;
    
    // Only add if it doesn't exist or we just removed it
    const jobExists = await chatQueue.getJob(jobId);
    if (!jobExists) {
      console.log(`[BUFFER] Adicionando novo job (ID: ${jobId}) com delay de ${bufferTime}ms.`);
      await chatQueue.add(
        'process_chat', 
        { 
          tenantId: tenantId, 
          contactId, 
          phone: rawPhone, 
          session: sessionName 
        },
        { jobId, delay: bufferTime, removeOnComplete: true, removeOnFail: false }
      );
    }

    await query(`UPDATE webhook_events SET status = 'processed' WHERE id = $1`, [eventId]);
    res.status(200).send('Webhook processed');
  } catch (error) {
    console.error('Error processing webhook:', error);
    // Tenta atualizar o status para error se o eventId estiver definido
    try {
      if (typeof eventId !== 'undefined' || (error.eventId)) {
        const idToUpdate = eventId || error.eventId;
        await query(`UPDATE webhook_events SET status = 'error' WHERE id = $1`, [idToUpdate]);
      }
    } catch (updateError) {
      console.error('Failed to update webhook status to error:', updateError);
    }
    res.status(500).send('Internal Server Error');
  }
});

app.post('/api/resume-bot', async (req, res) => {
  const { tenantId, contactId } = req.body;
  await query(
    `UPDATE conversation_summaries SET is_bot_paused = false, bot_paused_at = NULL WHERE tenant_id = $1 AND contact_id = $2`,
    [tenantId || TENANT_ID, contactId]
  );
  res.send({ success: true, message: 'Bot resumed' });
});

app.listen(PORT, () => {
  console.log(`[API] Server running on port ${PORT}`);
});
