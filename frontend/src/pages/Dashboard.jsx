import { useState, useEffect } from 'react';
import api from '../api';
import { Package, Users, ShoppingCart, AlertCircle } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    total_products: 0,
    total_customers: 0,
    total_sales_count: 0,
    total_sales_amount: 0,
    total_abandoned: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/dashboard/stats');
        setStats(res.data);
      } catch (err) {
        console.error('Error fetching stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="p-6">Carregando...</div>;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const cards = [
    { title: 'Receita Total', value: formatCurrency(stats.total_sales_amount), icon: ShoppingCart, color: 'text-green-500', bg: 'bg-green-500/10' },
    { title: 'Vendas Aprovadas', value: stats.total_sales_count, icon: ShoppingCart, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { title: 'Carrinhos Abandonados', value: stats.total_abandoned, icon: AlertCircle, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { title: 'Clientes', value: stats.total_customers, icon: Users, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { title: 'Produtos', value: stats.total_products, icon: Package, color: 'text-pink-500', bg: 'bg-pink-500/10' },
  ];

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="bg-slate-800 rounded-xl p-6 border border-slate-700 flex items-center gap-4">
              <div className={`p-4 rounded-lg ${card.bg} ${card.color}`}>
                <Icon size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-400 font-medium">{card.title}</p>
                <p className="text-2xl font-bold text-white mt-1">{card.value}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
