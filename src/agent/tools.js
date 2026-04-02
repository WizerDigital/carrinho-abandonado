import { query } from '../config/db.js';

export const agentTools = [
  {
    type: 'function',
    function: {
      name: 'search_products',
      description: 'Busca informações sobre outros produtos oferecidos pela loja/tenant.',
      parameters: {
        type: 'object',
        properties: {
          search_term: { type: 'string', description: 'Termo de busca para encontrar o produto pelo nome ou descrição' }
        },
        required: ['search_term']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'encaminhar_atendimento_humano',
      description: 'Pausa o bot e encaminha o atendimento para um humano.',
      parameters: {
        type: 'object',
        properties: {
          motivo: { type: 'string', description: 'Motivo pelo qual o usu�rio quer falar com humano.' }
        },
        required: ['motivo']
      }
    }
  }
];

export async function executeTool(toolName, argsArgs, tenantId, contactId) {
  try {
    const args = JSON.parse(argsArgs);
    
    if (toolName === 'search_products') {
      console.log(`Buscando produtos pelo termo: ${args.search_term}`);
      const searchRes = await query(
        `SELECT name, description, price FROM products WHERE tenant_id = $1 AND (name ILIKE $2 OR description ILIKE $2) LIMIT 5`,
        [tenantId, `%${args.search_term}%`]
      );
      return JSON.stringify({ products: searchRes.rows });
    }

    if (toolName === 'encaminhar_atendimento_humano') {
      await query(
        `INSERT INTO conversation_summaries (tenant_id, contact_id, is_bot_paused, bot_paused_at) 
         VALUES ($1, $2, true, NOW()) 
         ON CONFLICT (tenant_id, contact_id) DO UPDATE SET is_bot_paused = true, bot_paused_at = NOW()`,
        [tenantId, contactId]
      );
      return JSON.stringify({ status: "sucesso", mensagem: "Atendimento humano solicitado e bot pausado." });
    }

    return JSON.stringify({ error: "Ferramenta n�o encontrada." });
  } catch (error) {
    console.error(`Error executing tool ${toolName}:`, error);
    return JSON.stringify({ error: "Erro ao executar ferramenta." });
  }
}
