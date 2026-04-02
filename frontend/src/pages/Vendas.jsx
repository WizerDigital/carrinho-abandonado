import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { Search, ChevronLeft, ChevronRight, Filter, X } from 'lucide-react';

export default function Vendas() {
  const [sales, setSales] = useState([]);
  
  // Estados para filtros e paginação
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const itemsPerPage = 20;
  
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

  // Lógica de filtragem
  const filteredSales = sales.filter(sale => {
    const matchesSearch = (sale.customer_name && sale.customer_name.toLowerCase().includes(searchTerm.toLowerCase())) || 
                         (sale.product_name && sale.product_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = filterStatus === 'todos' || sale.status === filterStatus;
    
    // Filtros extras
    const amount = parseFloat(sale.amount);
    const matchesMinAmount = minAmount === '' || amount >= parseFloat(minAmount);
    const matchesMaxAmount = maxAmount === '' || amount <= parseFloat(maxAmount);
    
    const saleDate = new Date(sale.created_at).toISOString().split('T')[0];
    const matchesStartDate = startDate === '' || saleDate >= startDate;
    const matchesEndDate = endDate === '' || saleDate <= endDate;
    
    return matchesSearch && matchesStatus && matchesMinAmount && matchesMaxAmount && matchesStartDate && matchesEndDate;
  });

  // Lógica de paginação
  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSales = filteredSales.slice(startIndex, startIndex + itemsPerPage);

  // Resetar para primeira página ao filtrar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, minAmount, maxAmount, startDate, endDate]);

  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('todos');
    setMinAmount('');
    setMaxAmount('');
    setStartDate('');
    setEndDate('');
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'aprovada': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'pendente': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'carrinho abandonado': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl md:text-2xl font-bold">Vendas</h2>
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className="md:hidden flex items-center gap-2 bg-slate-800 border border-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
        >
          <Filter size={18} className={showFilters ? 'text-blue-500' : 'text-slate-400'} />
          Filtros
          {(filterStatus !== 'todos' || searchTerm !== '' || minAmount !== '' || maxAmount !== '' || startDate !== '' || endDate !== '') && (
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          )}
        </button>
      </div>

      {/* Container de Filtros */}
      <div className={`
        ${showFilters ? 'block' : 'hidden md:block'}
        bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-6 transition-all
      `}>
        <div className="flex items-center justify-between mb-4 md:hidden">
          <h3 className="font-bold flex items-center gap-2">
            <Filter size={18} /> Opções de Filtro
          </h3>
          <button onClick={() => setShowFilters(false)} className="p-1 hover:bg-slate-700 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Busca Principal */}
          <div className="md:col-span-2 lg:col-span-2 relative">
            <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1 block">Busca</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="text" 
                placeholder="Cliente ou produto..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1 block">Status</label>
            <select 
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="todos">Todos os Status</option>
              <option value="aprovada">Aprovada</option>
              <option value="pendente">Pendente</option>
              <option value="carrinho abandonado">Carrinho Abandonado</option>
            </select>
          </div>

          {/* Valor */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1 block">Valor Mín</label>
              <input 
                type="number" 
                placeholder="R$"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1 block">Valor Máx</label>
              <input 
                type="number" 
                placeholder="R$"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
              />
            </div>
          </div>

          {/* Data */}
          <div className="grid grid-cols-2 gap-2 md:col-span-2 lg:col-span-1">
            <div>
              <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1 block">De</label>
              <input 
                type="date" 
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1 block">Até</label>
              <input 
                type="date" 
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Limpar Filtros */}
          <div className="flex items-end">
            <button 
              onClick={clearFilters}
              className="w-full bg-slate-700 hover:bg-slate-600 text-slate-300 py-2 rounded-lg text-xs font-bold transition-colors uppercase tracking-widest border border-slate-600"
            >
              Limpar Filtros
            </button>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead className="bg-slate-900/50 border-b border-slate-700">
              <tr>
                <th className="px-6 py-4 font-medium text-slate-400">Cliente</th>
                <th className="px-6 py-4 font-medium text-slate-400">Produto</th>
                <th className="px-6 py-4 font-medium text-slate-400">Valor</th>
                <th className="px-6 py-4 font-medium text-slate-400">Status</th>
                <th className="px-6 py-4 font-medium text-slate-400">Data</th>
                <th className="px-6 py-4 font-medium text-slate-400 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {paginatedSales.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-400">Nenhuma venda encontrada</td>
                </tr>
              ) : (
                paginatedSales.map(sale => (
                  <tr key={sale.id} className="hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">{sale.customer_name || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{sale.product_name || '-'}</td>
                    <td className="px-6 py-4 font-medium whitespace-nowrap">R$ {parseFloat(sale.amount).toFixed(2).replace('.', ',')}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(sale.status)}`}>
                        {sale.status.charAt(0).toUpperCase() + sale.status.slice(1)}
                      </span>
                      {sale.recovered_cart && (
                        <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-medium border bg-emerald-500/10 text-emerald-500 border-emerald-500/20" title="Recuperada de carrinho abandonado">
                          Recuperada
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-400 whitespace-nowrap">
                      {new Date(sale.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Link to={`/vendas/${sale.id}`} className="text-blue-500 hover:text-blue-400 font-medium text-sm transition-colors">
                        Detalhes
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-slate-700">
          {paginatedSales.length === 0 ? (
            <div className="px-4 py-8 text-center text-slate-400">Nenhuma venda encontrada</div>
          ) : (
            paginatedSales.map(sale => (
              <div key={sale.id} className="p-4 hover:bg-slate-700/30 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div className="min-w-0">
                    <h3 className="font-bold text-white truncate">{sale.customer_name || 'Cliente Desconhecido'}</h3>
                    <p className="text-xs text-slate-400 truncate">{sale.product_name || 'Produto'}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border shrink-0 ${getStatusColor(sale.status)}`}>
                      {sale.status.toUpperCase()}
                    </span>
                    {sale.recovered_cart && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium border shrink-0 bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                        RECUPERADA
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <div className="flex flex-col">
                    <span className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold">Valor</span>
                    <span className="text-base font-bold text-white">R$ {parseFloat(sale.amount).toFixed(2).replace('.', ',')}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-slate-500 text-[10px] block uppercase tracking-wider font-semibold">Data</span>
                      <span className="text-xs text-slate-400">{new Date(sale.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <Link to={`/vendas/${sale.id}`} className="text-blue-500 text-xs font-semibold px-3 py-1.5 bg-blue-500/10 rounded-lg hover:bg-blue-500/20 transition-colors">
                      Detalhes
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-400 order-2 sm:order-1">
            Mostrando <span className="text-white font-medium">{startIndex + 1}</span> a <span className="text-white font-medium">{Math.min(startIndex + itemsPerPage, filteredSales.length)}</span> de <span className="text-white font-medium">{filteredSales.length}</span> resultados
          </p>
          <div className="flex items-center gap-2 order-1 sm:order-2">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex items-center gap-1">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === i + 1 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
