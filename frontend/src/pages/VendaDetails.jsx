import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import { ChevronLeft, User, DollarSign, ExternalLink, Activity } from 'lucide-react';

export default function VendaDetails() {
  const { id } = useParams();
  const [venda, setVenda] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVenda = async () => {
      try {
        const res = await api.get(`/sales/${id}`);
        setVenda(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchVenda();
  }, [id]);

  if (loading) return <div className="p-6 text-white">Carregando...</div>;
  if (!venda) return <div className="p-6 text-white">Venda não encontrada</div>;

  const statusColors = {
    'aprovada': 'bg-green-500/10 text-green-500 border-green-500/20',
    'completa': 'bg-green-500/10 text-green-500 border-green-500/20',
    'pendente': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    'carrinho abandonado': 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    'cancelada': 'bg-red-500/10 text-red-500 border-red-500/20',
    'reembolsada': 'bg-red-500/10 text-red-500 border-red-500/20',
    'chargeback': 'bg-red-500/10 text-red-500 border-red-500/20',
  };
  const statusColor = statusColors[venda.status] || 'bg-slate-500/10 text-slate-400 border-slate-500/20';

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/vendas" className="p-2 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors">
          <ChevronLeft size={20} className="text-slate-400" />
        </Link>
        <h2 className="text-xl md:text-2xl font-bold">Detalhes da Venda</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sale Info */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign size={20} className="text-green-500" />
              <h3 className="font-bold">Informações da Venda</h3>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusColor}`}>
              {venda.status.toUpperCase()}
            </span>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="text-xs text-slate-500 uppercase font-bold tracking-wider">Produto</label>
              <p className="text-lg font-medium text-white">{venda.product_name}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-500 uppercase font-bold tracking-wider">Valor</label>
                <p className="text-xl font-bold text-green-400">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(venda.amount)}
                </p>
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase font-bold tracking-wider">Data</label>
                <p className="text-slate-300">{new Date(venda.created_at).toLocaleString('pt-BR')}</p>
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase font-bold tracking-wider">ID Transação</label>
                <p className="text-slate-300 font-mono text-sm">{venda.transaction_id || 'N/A'}</p>
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase font-bold tracking-wider">Plataforma</label>
                <p className="text-slate-300 capitalize">{venda.platform || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Info */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User size={20} className="text-blue-500" />
              <h3 className="font-bold">Cliente Associado</h3>
            </div>
            {venda.customer_id && (
              <Link to={`/clientes/${venda.customer_id}`} className="text-xs font-medium text-blue-500 flex items-center gap-1 hover:text-blue-400 transition-colors">
                Ver Perfil <ExternalLink size={12} />
              </Link>
            )}
          </div>
          <div className="p-6">
            {venda.customer_id ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-blue-500/20 text-blue-500 rounded-full flex items-center justify-center text-xl font-bold">
                    {venda.customer_name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">{venda.customer_name}</h4>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 uppercase font-bold tracking-wider">Email</label>
                  <p className="text-slate-300">{venda.customer_email || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500 uppercase font-bold tracking-wider">Telefone</label>
                  <p className="text-slate-300">{venda.customer_phone || 'N/A'}</p>
                </div>
              </div>
            ) : (
              <p className="text-slate-400">Nenhum cliente associado a esta venda.</p>
            )}
          </div>
        </div>

        {/* Payload Info */}
        <div className="lg:col-span-2 bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-700 flex items-center gap-2">
            <Activity size={20} className="text-purple-500" />
            <h3 className="font-bold">Payload Original (Plataforma)</h3>
          </div>
          <div className="p-4">
            {venda.payload ? (
              <pre className="bg-slate-900 p-4 rounded-lg overflow-x-auto text-xs text-slate-300 font-mono border border-slate-700">
                {JSON.stringify(venda.payload, null, 2)}
              </pre>
            ) : (
              <p className="text-slate-400 text-sm">Nenhum payload original encontrado para esta transação.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
