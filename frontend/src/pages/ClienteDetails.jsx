import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import { ChevronLeft, Package, Clock, MessageSquare, ArrowRight } from 'lucide-react';

export default function ClienteDetails() {
  const { id } = useParams();
  const [cliente, setCliente] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCliente = async () => {
      try {
        const res = await api.get(`/customers/${id}`);
        setCliente(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCliente();
  }, [id]);

  if (loading) return <div className="p-6 text-white">Carregando...</div>;
  if (!cliente) return <div className="p-6 text-white">Cliente não encontrado</div>;

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/clientes" className="p-2 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors">
          <ChevronLeft size={20} className="text-slate-400" />
        </Link>
        <h2 className="text-xl md:text-2xl font-bold">Detalhes do Cliente</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info Column */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-blue-500/20 text-blue-500 rounded-full flex items-center justify-center text-2xl font-bold">
                {cliente.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-lg">{cliente.name}</h3>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                  cliente.type === 'cliente' 
                    ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' 
                    : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                }`}>
                  {cliente.type.toUpperCase()}
                </span>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-500 uppercase font-bold tracking-wider">Email</label>
                <p className="text-slate-300">{cliente.email || 'Não informado'}</p>
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase font-bold tracking-wider">Telefone</label>
                <p className="text-slate-300">{cliente.phone || 'Não informado'}</p>
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase font-bold tracking-wider">Documento</label>
                <p className="text-slate-300">{cliente.document || 'Não informado'}</p>
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase font-bold tracking-wider">Cadastrado em</label>
                <p className="text-slate-300">{new Date(cliente.created_at).toLocaleString('pt-BR')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sales & History Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sales */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-700 flex items-center gap-2">
              <Package size={20} className="text-blue-500" />
              <h3 className="font-bold">Vendas Associadas</h3>
            </div>
            <div className="p-4">
              {cliente.sales && cliente.sales.length > 0 ? (
                <div className="space-y-4">
                  {cliente.sales.map(sale => (
                    <div key={sale.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                      <div>
                        <p className="font-medium text-white">{sale.product_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                            sale.status === 'aprovada' || sale.status === 'completa' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                            sale.status === 'pendente' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                            sale.status === 'carrinho abandonado' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                            'bg-red-500/10 text-red-500 border-red-500/20'
                          }`}>
                            {sale.status.toUpperCase()}
                          </span>
                          <span className="text-xs text-slate-400">{new Date(sale.created_at).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </div>
                      <div className="mt-3 sm:mt-0 flex items-center gap-4">
                        <span className="font-bold">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sale.amount)}
                        </span>
                        <Link to={`/vendas/${sale.id}`} className="text-blue-500 hover:text-blue-400 bg-blue-500/10 p-2 rounded-lg transition-colors">
                          <ArrowRight size={16} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-center py-4">Nenhuma venda encontrada para este cliente.</p>
              )}
            </div>
          </div>

          {/* History */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-700 flex items-center gap-2">
              <Clock size={20} className="text-blue-500" />
              <h3 className="font-bold">Histórico de Ações do Agente</h3>
            </div>
            <div className="p-4 max-h-[400px] overflow-y-auto">
              {cliente.agentActions && cliente.agentActions.length > 0 ? (
                <div className="space-y-4">
                  {cliente.agentActions.map((action, idx) => (
                    <div key={idx} className={`flex gap-3 ${action.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {action.role !== 'user' && (
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                          <MessageSquare size={14} className="text-blue-500" />
                        </div>
                      )}
                      <div className={`max-w-[80%] rounded-2xl p-3 ${
                        action.role === 'user' 
                          ? 'bg-slate-700 text-white rounded-tr-none' 
                          : 'bg-blue-600 text-white rounded-tl-none'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">{action.content}</p>
                        <span className="text-[10px] opacity-70 mt-1 block">
                          {new Date(action.created_at).toLocaleString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-center py-4">Nenhum histórico de conversa encontrado.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
