import { query } from '../config/db.js';
import { sanitizePhoneForWaha, cleanPhone } from '../../../src/utils/phone.js';
import { checkWhatsappExists } from '../../../src/api/waha.js';
import { recoveryQueue } from '../../../src/config/queues.js';

export async function processWebhook(tenant_id, platform, payload) {
  try {
    if (platform === 'hotmart') {
      await handleHotmart(tenant_id, payload);
    } else if (platform === 'kiwify') {
      await handleKiwify(tenant_id, payload);
    }
  } catch (error) {
    console.error(`Error processing ${platform} webhook:`, error);
    // Even if processing fails, we might want to log it, but for now just throw
    throw error;
  }
}

async function handleKiwify(tenant_id, payload) {
  // Check if it's the specific abandoned cart payload format from Kiwify
  if (payload.status === 'abandoned' && payload.cpf) {
    const email = payload.email;
    const name = payload.name;
    const phone = payload.phone || '';
    const document = payload.cpf || '';
    
    const productId = payload.product_id;
    const productName = payload.product_name || 'Produto Kiwify';
    const price = 0; // Not available in the root of abandoned cart payload
    
    const transactionId = payload.id; // Unique ID for this abandoned cart session
    const status = 'carrinho abandonado';
    
    await upsertPlatformData(tenant_id, 'kiwify', { email, name, phone, document, productId, productName, price, transactionId, status });
    return;
  }

  // Standard Kiwify webhook
  const customer = payload.Customer;
  const product = payload.Product;
  
  if (!customer || !product || !payload.order_id) return;

  const email = customer.email;
  const name = customer.full_name || customer.first_name || '';
  const phone = customer.mobile || '';
  const document = customer.CPF || customer.cnpj || '';

  const productId = product.product_id;
  const productName = product.product_name;
  
  // Kiwify charge_amount is typically in cents (e.g. 3241 = 32.41)
  let price = 0;
  if (payload.Commissions && payload.Commissions.charge_amount) {
    price = payload.Commissions.charge_amount / 100;
  }

  const transactionId = payload.order_id;
  
  let status = 'pendente';
  const event = payload.webhook_event_type;
  
  switch (event) {
    case 'order_approved':
      status = 'aprovada';
      break;
    case 'order_refunded':
      status = 'reembolsada';
      break;
    case 'order_chargedback':
      status = 'chargeback';
      break;
    case 'order_refused':
    case 'order_canceled':
      status = 'cancelada';
      break;
    case 'billet_created':
    case 'pix_created':
    case 'waiting_payment':
      status = 'pendente';
      break;
    default:
      const orderStatus = payload.order_status;
      if (orderStatus === 'paid') status = 'aprovada';
      else if (orderStatus === 'refunded') status = 'reembolsada';
      else if (orderStatus === 'chargedback') status = 'chargeback';
      else if (orderStatus === 'refused') status = 'cancelada';
      else if (orderStatus === 'waiting_payment') status = 'pendente';
      break;
  }

  await upsertPlatformData(tenant_id, 'kiwify', { email, name, phone, document, productId, productName, price, transactionId, status });
}

async function handleHotmart(tenant_id, payload) {
  // Hotmart webhook v2.0.0
  const data = payload.data;
  if (!data) return;

  const event = payload.event;
  const buyer = data.buyer;
  const product = data.product;
  const purchase = data.purchase;

  if (!buyer || !product || !purchase) return;

  const email = buyer.email;
  const name = buyer.name;
  const phone = buyer.checkout_phone || '';
  const document = buyer.document || '';

  const productId = product.id.toString();
  const productName = product.name;
  const price = purchase.price?.value || 0;

  const transactionId = purchase.transaction;
  
  // Map Hotmart status to our status
  let status = 'pendente';
  
  switch (event) {
    case 'PURCHASE_APPROVED':
    case 'PURCHASE_COMPLETE':
      status = 'aprovada';
      break;
    case 'PURCHASE_CANCELED':
      status = 'cancelada';
      break;
    case 'PURCHASE_REFUNDED':
      status = 'reembolsada';
      break;
    case 'PURCHASE_CHARGEBACK':
      status = 'chargeback';
      break;
    case 'PURCHASE_EXPIRED':
      status = 'expirada';
      break;
    case 'PURCHASE_DELAYED':
      status = 'atrasada';
      break;
    case 'PURCHASE_PROTEST':
    case 'PURCHASE_DISPUTE':
      status = 'disputa';
      break;
    case 'PURCHASE_PENDING':
    case 'PURCHASE_BILLET_PRINTED':
    case 'PURCHASE_PIX_GENERATED':
    default:
      const purchaseStatus = purchase.status;
      if (purchaseStatus === 'APPROVED' || purchaseStatus === 'COMPLETE') status = 'aprovada';
      else if (purchaseStatus === 'CANCELED') status = 'cancelada';
      else if (purchaseStatus === 'REFUNDED') status = 'reembolsada';
      else if (purchaseStatus === 'CHARGEBACK') status = 'chargeback';
      else if (purchaseStatus === 'EXPIRED') status = 'expirada';
      else if (purchaseStatus === 'DELAYED') status = 'atrasada';
      else if (purchaseStatus === 'DISPUTE' || purchaseStatus === 'PROTEST') status = 'disputa';
      break;
  }

  await upsertPlatformData(tenant_id, 'hotmart', { email, name, phone, document, productId, productName, price, transactionId, status });
}

async function upsertPlatformData(tenant_id, platform, { email, name, phone, document, productId, productName, price, transactionId, status }) {
  let finalPhone = phone;
  let whatsappId = null;

  if (phone) {
    const sanitized = sanitizePhoneForWaha(phone);
    if (sanitized) {
      let wahaSession = process.env.WAHA_SESSION || 'default';
      const settingsRes = await query('SELECT waha_session_id FROM agent_settings WHERE tenant_id = $1', [tenant_id]);
      if (settingsRes.rows.length > 0 && settingsRes.rows[0].waha_session_id) {
        wahaSession = settingsRes.rows[0].waha_session_id;
      }

      const wahaRes = await checkWhatsappExists(wahaSession, sanitized);
      if (wahaRes && wahaRes.numberExists) {
        whatsappId = wahaRes.chatId;
        finalPhone = whatsappId.replace('@c.us', '').replace('@s.whatsapp.net', '');
      } else {
        finalPhone = cleanPhone(phone);
      }
    } else {
      finalPhone = cleanPhone(phone);
    }
  }

  // 1. Upsert Client
  let clientRes = await query(
    `SELECT id FROM clients WHERE tenant_id = $1 AND (email = $2 OR phone = $3) LIMIT 1`,
    [tenant_id, email, finalPhone]
  );
  let clientId;

  if (clientRes.rows.length > 0) {
    clientId = clientRes.rows[0].id;
    await query(
      `UPDATE clients SET name = $1, phone = $2, document = $3, whatsapp_id = COALESCE($4, whatsapp_id), jid = COALESCE($5, jid), updated_at = NOW() WHERE id = $6`,
      [name, finalPhone, document, whatsappId, whatsappId, clientId]
    );
  } else {
    clientRes = await query(
      `INSERT INTO clients (tenant_id, name, email, phone, document, whatsapp_id, jid, type) VALUES ($1, $2, $3, $4, $5, $6, $7, 'lead') RETURNING id`,
      [tenant_id, name, email, finalPhone, document, whatsappId, whatsappId]
    );
    clientId = clientRes.rows[0].id;
  }

  // 2. Upsert Product
  let productRes = await query(
    `SELECT id FROM products WHERE tenant_id = $1 AND platform = $2 AND platform_id = $3 LIMIT 1`,
    [tenant_id, platform, productId]
  );
  let dbProductId;

  if (productRes.rows.length > 0) {
    dbProductId = productRes.rows[0].id;
    if (price > 0) {
      await query(
        `UPDATE products SET name = $1, price = $2, updated_at = NOW() WHERE id = $3`,
        [productName, price, dbProductId]
      );
    } else {
      await query(
        `UPDATE products SET name = $1, updated_at = NOW() WHERE id = $2`,
        [productName, dbProductId]
      );
    }
  } else {
    productRes = await query(
      `INSERT INTO products (tenant_id, name, price, platform_id, platform) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [tenant_id, productName, price, productId, platform]
    );
    dbProductId = productRes.rows[0].id;
  }

  // 3. Upsert Sale
  let saleRes = await query(
    `SELECT id, status FROM sales WHERE tenant_id = $1 AND platform = $2 AND transaction_id = $3 LIMIT 1`,
    [tenant_id, platform, transactionId]
  );

  let isRecovery = false;

  if (status === 'aprovada' && finalPhone) {
    const abandonedRes = await query(`
      SELECT s.id 
      FROM sales s
      JOIN clients c ON s.client_id = c.id
      WHERE s.tenant_id = $1 AND c.phone = $2 AND s.status = 'carrinho abandonado' AND s.recovered_cart = FALSE
      LIMIT 1
    `, [tenant_id, finalPhone]);

    if (abandonedRes.rows.length > 0) {
      isRecovery = true;
      await query(`UPDATE sales SET recovered_cart = TRUE, updated_at = NOW() WHERE id = $1`, [abandonedRes.rows[0].id]);
    }
  }

  if (saleRes.rows.length > 0) {
    const saleId = saleRes.rows[0].id;
    if (price > 0) {
      await query(
        `UPDATE sales SET status = $1, amount = $2, recovered_cart = $3, updated_at = NOW() WHERE id = $4`,
        [status, price, isRecovery, saleId]
      );
    } else {
      await query(
        `UPDATE sales SET status = $1, recovered_cart = $2, updated_at = NOW() WHERE id = $3`,
        [status, isRecovery, saleId]
      );
    }
  } else {
    await query(
      `INSERT INTO sales (tenant_id, client_id, product_id, amount, status, transaction_id, platform, recovered_cart) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [tenant_id, clientId, dbProductId, price, status, transactionId, platform, isRecovery]
    );
  }
  
  if (status === 'aprovada') {
    await query(`UPDATE clients SET type = 'cliente' WHERE id = $1`, [clientId]);
  }

  if (status === 'carrinho abandonado' && whatsappId) {
    const jobId = `recovery_${tenant_id}_${transactionId}`;
    await recoveryQueue.add(
      'process_recovery',
      {
        tenantId: tenant_id,
        contactId: whatsappId,
        customerName: name,
        productName: productName,
        transactionId: transactionId
      },
      { jobId, delay: 2 * 60 * 1000, removeOnComplete: true, removeOnFail: false }
    );
    console.log(`[INFO] Agendada recuperação de carrinho para ${whatsappId} em 2 minutos.`);
  }
}
