import { Worker } from 'bullmq';
import { redis } from '../config/redis.js';
import { query } from '../config/db.js';
import { generateEmbedding, chatCompletion, summarizeConversation } from './llm.js';
import { buildContext } from './prompts.js';
import { agentTools, executeTool } from './tools.js';
import { sendText, startTyping, stopTyping } from '../api/waha.js';
import dotenv from 'dotenv';

dotenv.config();

const chatWorker = new Worker('chat_queue', async job => {
  const { tenantId, contactId, phone, session } = job.data;
  
  try {
    const bufferKey = `chat_buffer:${tenantId}:${contactId}`;
    const messagesInBuffer = await redis.lrange(bufferKey, 0, -1);
    await redis.del(bufferKey);

    if (messagesInBuffer.length === 0) return;

    const combinedMessage = messagesInBuffer.join('\n');
    console.log(`[Worker] Processando mensagem para ${contactId}: ${combinedMessage}`);

    await startTyping(session, contactId);

    const userEmbedding = await generateEmbedding(combinedMessage);
    await query(
      `INSERT INTO conversation_messages (tenant_id, contact_id, role, content, embedding) VALUES ($1, $2, $3, $4, $5)`,
      [tenantId, contactId, 'user', combinedMessage, `[${userEmbedding.join(',')}]`]
    );

    const { messages, oldSummary, recentMessagesText } = await buildContext(tenantId, contactId, combinedMessage, userEmbedding);

    let aiResponse = await chatCompletion(messages, agentTools);
    let finalAssistantText = aiResponse.content;

    while (aiResponse.tool_calls && aiResponse.tool_calls.length > 0) {
      messages.push(aiResponse);

      for (const toolCall of aiResponse.tool_calls) {
        const functionName = toolCall.function.name;
        const functionArgs = toolCall.function.arguments;
        
        console.log(`[Worker] IA invocando Tool: ${functionName}`);
        const toolResult = await executeTool(functionName, functionArgs, tenantId, contactId);

        await query(
          `INSERT INTO tool_calls (tenant_id, contact_id, tool_name, tool_args, tool_result) VALUES ($1, $2, $3, $4, $5)`,
          [tenantId, contactId, functionName, functionArgs, JSON.stringify(toolResult)]
        );
        
        messages.push({
          tool_call_id: toolCall.id,
          role: 'tool',
          name: functionName,
          content: toolResult,
        });
      }

      aiResponse = await chatCompletion(messages, agentTools);
      finalAssistantText = aiResponse.content;
    }

    const pauseCheck = await query(`SELECT is_bot_paused FROM conversation_summaries WHERE tenant_id = $1 AND contact_id = $2`, [tenantId, contactId]);
    if (pauseCheck.rows.length > 0 && pauseCheck.rows[0].is_bot_paused && !finalAssistantText) {
      console.log(`[Worker] Bot pausado durante a execu��o de tool. Nenhuma resposta ser� enviada.`);
      await stopTyping(session, contactId);
      return;
    }

    if (!finalAssistantText) {
      finalAssistantText = "Desculpe, ocorreu um erro ao processar sua solicita��o.";
    }

    await redis.setex(`bot_sent:${contactId}`, 60, 'true');
    
    const typingDelay = Math.min(finalAssistantText.length * 20, 3000); 
    await new Promise(r => setTimeout(r, typingDelay));
    
    await stopTyping(session, contactId);
    await sendText(session, contactId, finalAssistantText);

    const assistantEmbedding = await generateEmbedding(finalAssistantText);
    await query(
      `INSERT INTO conversation_messages (tenant_id, contact_id, role, content, embedding) VALUES ($1, $2, $3, $4, $5)`,
      [tenantId, contactId, 'assistant', finalAssistantText, `[${assistantEmbedding.join(',')}]`]
    );

    // Remove any pending followup job since we just replied
    const { recoveryQueue } = await import('../config/queues.js');
    const followupJobId = `followup_${tenantId}_${contactId}`;
    const existingFollowup = await recoveryQueue.getJob(followupJobId);
    if (existingFollowup) {
      await existingFollowup.remove();
      console.log(`[Worker] Follow-up pendente removido para ${contactId} pois o bot respondeu.`);
    }

    // Schedule new followup if configured
    const settingsRes = await query('SELECT followup_enabled, followup_delay_minutes, followup_message FROM agent_settings WHERE tenant_id = $1', [tenantId]);
    if (settingsRes.rows.length > 0) {
      const { followup_enabled, followup_delay_minutes, followup_message } = settingsRes.rows[0];
      if (followup_enabled && followup_delay_minutes > 0 && followup_message && followup_message.trim() !== '') {
        await recoveryQueue.add(
          'process_followup',
          {
            tenantId,
            contactId,
            session,
            message: followup_message
          },
          { 
            jobId: followupJobId, 
            delay: followup_delay_minutes * 60 * 1000, 
            removeOnComplete: true, 
            removeOnFail: false 
          }
        );
        console.log(`[Worker] Agendado novo follow-up para ${contactId} em ${followup_delay_minutes} minutos.`);
      }
    }

    summarizeConversation(`${recentMessagesText}\nUser: ${combinedMessage}\nAssistant: ${finalAssistantText}`, oldSummary)
      .then(async (newSummary) => {
        await query(
          `INSERT INTO conversation_summaries (tenant_id, contact_id, summary) 
           VALUES ($1, $2, $3) 
           ON CONFLICT (tenant_id, contact_id) DO UPDATE SET summary = EXCLUDED.summary`,
          [tenantId, contactId, newSummary]
        );
      })
      .catch(console.error);

    console.log(`[Worker] Resposta enviada e processamento concluído para ${contactId}.`);

    // Verifica se chegaram novas mensagens no buffer enquanto o bot processava
    const leftOver = await redis.llen(bufferKey);
    if (leftOver > 0) {
      console.log(`[Worker] Mais mensagens detectadas no buffer para ${contactId}. Enfileirando novo job.`);
      const { chatQueue } = await import('../config/queues.js');
      await chatQueue.add('process_chat', job.data, { delay: 1000 });
    }

  } catch (error) {
    console.error(`[Worker] Erro ao processar chat para ${contactId}:`, error);
  }
}, { connection: redis });

chatWorker.on('failed', (job, err) => {
  console.error(`Job ${job.id} falhou:`, err.message);
});

const recoveryWorker = new Worker('recovery_queue', async job => {
  if (job.name === 'process_followup') {
    const { tenantId, contactId, session, message } = job.data;
    try {
      console.log(`[Worker] Processando follow-up automático para ${contactId}`);
      
      const pauseCheck = await query(`SELECT is_bot_paused FROM conversation_summaries WHERE tenant_id = $1 AND contact_id = $2`, [tenantId, contactId]);
      if (pauseCheck.rows.length > 0 && pauseCheck.rows[0].is_bot_paused) {
        console.log(`[Worker] Bot pausado para ${contactId}. Cancelando follow-up.`);
        return;
      }

      await sendText(session, contactId, message);
      
      const assistantEmbedding = await generateEmbedding(message);
      await query(
        `INSERT INTO conversation_messages (tenant_id, contact_id, role, content, embedding) VALUES ($1, $2, $3, $4, $5)`,
        [tenantId, contactId, 'assistant', message, `[${assistantEmbedding.join(',')}]`]
      );
      console.log(`[Worker] Follow-up automático enviado para ${contactId}.`);
    } catch (error) {
      console.error(`[Worker] Erro ao processar follow-up para ${contactId}:`, error);
    }
    return;
  }

  // Original cart recovery logic
  const { tenantId, contactId, customerName, productName, transactionId } = job.data;
  
  try {
    console.log(`[Worker] Processando recuperação de carrinho para ${contactId} (${transactionId})`);
    
    // Check if it's already recovered or if the cart was paid in the meantime
    const saleRes = await query(`SELECT status, recovered_cart FROM sales WHERE tenant_id = $1 AND transaction_id = $2`, [tenantId, transactionId]);
    if (saleRes.rows.length > 0) {
      const sale = saleRes.rows[0];
      if (sale.status === 'aprovada' || sale.recovered_cart) {
        console.log(`[Worker] Venda ${transactionId} já foi recuperada ou aprovada. Cancelando contato.`);
        return;
      }
    }

    let wahaSession = process.env.WAHA_SESSION || 'default';
    const settingsRes = await query('SELECT waha_session_id FROM agent_settings WHERE tenant_id = $1', [tenantId]);
    if (settingsRes.rows.length > 0 && settingsRes.rows[0].waha_session_id) {
      wahaSession = settingsRes.rows[0].waha_session_id;
    }

    const message = `Olá ${customerName ? customerName.split(' ')[0] : ''}! Tudo bem? Vi que você se interessou pelo ${productName} mas não finalizou a compra. Ficou com alguma dúvida? Posso te ajudar com algo?`;
    
    await sendText(wahaSession, contactId, message);
    
    // Also inject this message into the conversation history so the agent knows it started the conversation
    const assistantEmbedding = await generateEmbedding(message);
    await query(
      `INSERT INTO conversation_messages (tenant_id, contact_id, role, content, embedding) VALUES ($1, $2, $3, $4, $5)`,
      [tenantId, contactId, 'assistant', message, `[${assistantEmbedding.join(',')}]`]
    );

    console.log(`[Worker] Mensagem de recuperação enviada para ${contactId}.`);
  } catch (error) {
    console.error(`[Worker] Erro ao processar recuperação para ${contactId}:`, error);
  }
}, { connection: redis });

recoveryWorker.on('failed', (job, err) => {
  console.error(`Recovery Job ${job.id} falhou:`, err.message);
});

console.log('[Worker] BullMQ Worker de chat e recovery iniciados.');
