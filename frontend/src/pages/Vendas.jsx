import { useState, useEffect } from 'react';
import api from '../api';
import { Plus } from 'lucide-react';

export default function Vendas() {
  const [sales, setSales] = useState([]);
  
  const fetchSales = async () => {
    try {
      const res = await api.get('/sales');
      setSales(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  const getStatusColor = (status) => {
    switch(status) {
      case 'aprovada': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'pendente': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'carrinho abandonado': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Vendas</h2>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-900/50 border-b border-slate-700">
            <tr>
              <th className="px-6 py-4 font-medium text-slate-400">Cliente</th>
              <th className="px-6 py-4 font-medium text-slate-400">Produto</th>
              <th className="px-6 py-4 font-medium text-slate-400">Valor</th>
              <th className="px-6 py-4 font-medium text-slate-400">Status</th>
              <th className="px-6 py-4 font-medium text-slate-400">Data</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {sales.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-8 text-center text-slate-400">Nenhuma venda registrada</td>
              </tr>
            ) : (
              sales.map(sale => (
                <tr key={sale.id} className="hover:bg-slate-700/50 transition-colors">
                  <td className="px-6 py-4">{sale.customer_name || '-'}</td>
                  <td className="px-6 py-4">{sale.product_name || '-'}</td>
                  <td className="px-6 py-4 font-medium">R$ {parseFloat(sale.amount).toFixed(2).replace('.', ',')}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(sale.status)}`}>
                      {sale.status.charAt(0).toUpperCase() + sale.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400">
                    {new Date(sale.created_at).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
