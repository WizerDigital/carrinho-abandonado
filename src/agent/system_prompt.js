import { query } from '../config/db.js';

export async function getSystemPrompt(tenantId, contactId) {
  // Fetch tenant configuration
  const settingsRes = await query('SELECT * FROM agent_settings WHERE tenant_id = $1', [tenantId]);
  const settings = settingsRes.rows[0] || {};
  
  // Fetch customer info
  const clientRes = await query('SELECT * FROM clients WHERE phone = $1 OR whatsapp_id = $1 OR jid = $1', [contactId]);
  const client = clientRes.rows[0] || {};

  let abandonedCarts = [];
  let pastSales = [];
  if (client.phone) {
    const cartsRes = await query(`
      SELECT s.amount, p.name as product_name, p.description as product_desc
      FROM sales s
      JOIN clients c ON s.client_id = c.id
      JOIN products p ON s.product_id = p.id
      WHERE c.phone = $1 AND c.tenant_id = $2 AND s.status = 'carrinho abandonado'
    `, [client.phone, tenantId]);
    abandonedCarts = cartsRes.rows;

    const salesRes = await query(`
      SELECT s.amount, s.status, p.name as product_name, s.created_at
      FROM sales s
      JOIN clients c ON s.client_id = c.id
      JOIN products p ON s.product_id = p.id
      WHERE c.phone = $1 AND c.tenant_id = $2 AND s.status != 'carrinho abandonado'
      ORDER BY s.created_at DESC LIMIT 5
    `, [client.phone, tenantId]);
    pastSales = salesRes.rows;
  }

  const toneMap = {
    'formal': 'Você deve usar um tom formal e profissional.',
    'amigavel': 'Você deve usar um tom amigável, empático e caloroso.',
    'vendedor': 'Você deve ser persuasivo, com foco em fechar a venda.',
    'descontraido': 'Você deve usar um tom descontraído e leve, usando emojis.'
  };

  const agentName = settings.agent_name || 'Assistente';
  const basePersona = settings.personality || `Você é ${agentName}, um assistente virtual focado em ajudar clientes a concluir suas compras.`;
  const toneInstruction = toneMap[settings.communication_tone] || toneMap['formal'];

  let cartInfo = 'O cliente não possui itens abandonados no carrinho no momento.';
  if (abandonedCarts.length > 0) {
    cartInfo = 'O cliente abandonou os seguintes produtos no carrinho:\n';
    abandonedCarts.forEach(c => {
      cartInfo += `- Produto: ${c.product_name} | Valor: R$ ${c.amount} | Descrição: ${c.product_desc || 'N/A'}\n`;
    });
  }

  let pastSalesInfo = '';
  if (pastSales.length > 0) {
    pastSalesInfo = 'Histórico de compras e interações recentes do cliente:\n';
    pastSales.forEach(s => {
      pastSalesInfo += `- ${s.product_name} (Status: ${s.status}) - R$ ${s.amount} em ${new Date(s.created_at).toLocaleDateString('pt-BR')}\n`;
    });
  }

  const faqItems = settings.faq_items || [];
  let faqInfo = '';
  if (faqItems.length > 0) {
    faqInfo = 'Perguntas Frequentes (FAQ):\n';
    faqItems.forEach(item => {
      faqInfo += `Q: ${item.question}\nA: ${item.answer}\n\n`;
    });
  }

  const objectionHandlers = settings.objection_handlers || [];
  let objectionsInfo = '';
  if (objectionHandlers.length > 0) {
    objectionsInfo = 'Quebras de Objeções (Como responder a dúvidas ou hesitações):\n';
    objectionHandlers.forEach(obj => {
      objectionsInfo += `Objeção: ${obj.objection}\nResposta sugerida: ${obj.response}\n\n`;
    });
  }

  const rules = `
Regras e Instruções:
- Nome do Cliente: ${client.name || 'Não identificado'}.
- ${toneInstruction}
- O seu principal objetivo é entender por que o cliente não finalizou a compra e ajudá-lo a concluir.
- Você tem acesso a ferramentas para buscar informações sobre outros produtos se o cliente perguntar.
`;

  return [
    basePersona,
    rules,
    cartInfo,
    pastSalesInfo,
    faqInfo,
    objectionsInfo,
    settings.system_prompt_template ? `Instruções Extras Customizadas:\n${settings.system_prompt_template}` : ''
  ].filter(Boolean).join('\n\n');
}