import { useState, useEffect } from 'react';
import api from '../api';
import { Package, Users, ShoppingCart, AlertCircle, RefreshCw, Filter, X } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Dashboard() {
  const [stats, setStats] = useState({
    total_products: 0,
    total_customers: 0,
    total_sales_count: 0,
    total_sales_amount: 0,
    total_abandoned: 0,
    total_recovered_count: 0,
    total_recovered_amount: 0,
    chart_data: []
  });
  const [loading, setLoading] = useState(true);
  
  // Default to last 30 days
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showFilters, setShowFilters] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await api.get('/dashboard/stats', {
        params: { startDate, endDate }
      });
      setStats(res.data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [startDate, endDate]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const cards = [
    { title: 'Receita Total', value: formatCurrency(stats.total_sales_amount), icon: ShoppingCart, color: 'text-green-500', bg: 'bg-green-500/10' },
    { title: 'Vendas Aprovadas', value: stats.total_sales_count, icon: ShoppingCart, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { title: 'Vendas Recuperadas', value: stats.total_recovered_count, icon: RefreshCw, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { title: 'Valor Recuperado', value: formatCurrency(stats.total_recovered_amount), icon: RefreshCw, color: 'text-teal-500', bg: 'bg-teal-500/10' },
    { title: 'Carrinhos Abandonados', value: stats.total_abandoned, icon: AlertCircle, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { title: 'Clientes', value: stats.total_customers, icon: Users, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { title: 'Produtos', value: stats.total_products, icon: Package, color: 'text-pink-500', bg: 'bg-pink-500/10' },
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-700 p-3 rounded-lg shadow-xl">
          <p className="text-slate-300 mb-2 font-medium">
            {format(new Date(label), "dd 'de' MMM, yyyy", { locale: ptBR })}
          </p>
          <p className="text-emerald-400 text-sm">
            Vendas: {formatCurrency(payload[0].value)}
          </p>
          <p className="text-orange-400 text-sm">
            Abandonos: {payload[1].value}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6">
      {/* Header and Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-xl md:text-2xl font-bold">Dashboard</h2>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors w-full sm:w-auto justify-center"
          >
            <Filter size={18} className={showFilters ? 'text-blue-500' : 'text-slate-400'} />
            Filtros
          </button>
        </div>
      </div>

      {/* Filters Container */}
      <div className={`
        ${showFilters ? 'block' : 'hidden'}
        bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-6 transition-all
      `}>
        <div className="flex items-center justify-between mb-4 md:hidden">
          <h3 className="font-bold flex items-center gap-2">
            <Filter size={18} /> Filtros de Data
          </h3>
          <button onClick={() => setShowFilters(false)} className="p-1 hover:bg-slate-700 rounded-full">
            <X size={20} />
          </button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1 block">Data Inicial</label>
            <input 
              type="date" 
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1 block">Data Final</label>
            <input 
              type="date" 
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="hidden md:block">
            {loading && <span className="text-sm text-slate-400">Atualizando...</span>}
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 mb-8">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="bg-slate-800 rounded-xl p-4 md:p-6 border border-slate-700 flex items-center gap-4 hover:bg-slate-700/50 transition-colors">
              <div className={`p-3 md:p-4 rounded-lg ${card.bg} ${card.color} shrink-0`}>
                <Icon size={24} className="md:w-6 md:h-6 w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs md:text-sm text-slate-400 font-medium truncate">{card.title}</p>
                <p className="text-xl md:text-2xl font-bold text-white mt-1 truncate">
                  {loading ? '...' : card.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-3 bg-slate-800 rounded-xl border border-slate-700 p-4 md:p-6">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            Desempenho de Vendas e Abandonos
          </h3>
          
          <div className="h-[300px] md:h-[400px] w-full">
            {loading && stats.chart_data.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-slate-500">
                Carregando gráfico...
              </div>
            ) : stats.chart_data.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-slate-500">
                Nenhum dado no período selecionado
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.chart_data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorAbandoned" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#94a3b8" 
                    fontSize={12}
                    tickFormatter={(val) => format(new Date(val), "dd MMM", { locale: ptBR })}
                    minTickGap={30}
                  />
                  <YAxis 
                    yAxisId="left"
                    stroke="#94a3b8" 
                    fontSize={12}
                    tickFormatter={(val) => `R$ ${val}`}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    stroke="#94a3b8" 
                    fontSize={12}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="top" height={36}/>
                  <Area 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="sales" 
                    name="Receita de Vendas"
                    stroke="#10b981" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorSales)" 
                  />
                  <Area 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="abandoned_count" 
                    name="Qtd Abandonos"
                    stroke="#f97316" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorAbandoned)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}