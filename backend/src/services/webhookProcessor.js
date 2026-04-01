import { query } from '../config/db.js';

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
  // 1. Upsert Customer
  let customerRes = await query(
    `SELECT id FROM customers WHERE tenant_id = $1 AND email = $2 LIMIT 1`,
    [tenant_id, email]
  );
  let customerId;

  if (customerRes.rows.length > 0) {
    customerId = customerRes.rows[0].id;
    await query(
      `UPDATE customers SET name = $1, phone = $2, document = $3, updated_at = NOW() WHERE id = $4`,
      [name, phone, document, customerId]
    );
  } else {
    customerRes = await query(
      `INSERT INTO customers (tenant_id, name, email, phone, document, type) VALUES ($1, $2, $3, $4, $5, 'lead') RETURNING id`,
      [tenant_id, name, email, phone, document]
    );
    customerId = customerRes.rows[0].id;
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

  if (saleRes.rows.length > 0) {
    const saleId = saleRes.rows[0].id;
    if (price > 0) {
      await query(
        `UPDATE sales SET status = $1, amount = $2, updated_at = NOW() WHERE id = $3`,
        [status, price, saleId]
      );
    } else {
      await query(
        `UPDATE sales SET status = $1, updated_at = NOW() WHERE id = $2`,
        [status, saleId]
      );
    }
  } else {
    await query(
      `INSERT INTO sales (tenant_id, customer_id, product_id, amount, status, transaction_id, platform) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [tenant_id, customerId, dbProductId, price, status, transactionId, platform]
    );
  }
  
  if (status === 'aprovada') {
    await query(`UPDATE customers SET type = 'cliente' WHERE id = $1`, [customerId]);
  }
}
