import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { Plus, Search, ChevronLeft, ChevronRight, Filter, X } from 'lucide-react';

export default function Clientes() {
  const [customers, setCustomers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', email: '', phone: '', type: 'lead' });
  
  // Estados para filtros e paginação
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const itemsPerPage = 20;

  const fetchCustomers = async () => {
    try {
      const res = await api.get('/customers');
      setCustomers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Lógica de filtragem
  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = filterType === 'todos' || customer.type === filterType;
    return matchesSearch && matchesType;
  });

  // Lógica de paginação
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCustomers = filteredCustomers.slice(startIndex, startIndex + itemsPerPage);

  // Resetar para primeira página ao filtrar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/customers', newCustomer);
      setShowModal(false);
      setNewCustomer({ name: '', email: '', phone: '', type: 'lead' });
      fetchCustomers();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-xl md:text-2xl font-bold">Clientes</h2>
        <div className="flex w-full sm:w-auto gap-2">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="md:hidden flex items-center gap-2 bg-slate-800 border border-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
          >
            <Filter size={18} className={showFilters ? 'text-blue-500' : 'text-slate-400'} />
            Filtros
            {(filterType !== 'todos' || searchTerm !== '') && (
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            )}
          </button>
          <button 
            onClick={() => setShowModal(true)}
            className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <Plus size={20} />
            Novo Cliente
          </button>
        </div>
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

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-3 relative">
            <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1 block">Busca</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="text" 
                placeholder="Buscar por nome ou e-mail..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1 block">Tipo</label>
            <select 
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="todos">Todos os Tipos</option>
              <option value="cliente">Cliente</option>
              <option value="lead">Lead</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead className="bg-slate-900/50 border-b border-slate-700">
              <tr>
                <th className="px-6 py-4 font-medium text-slate-400">Nome</th>
                <th className="px-6 py-4 font-medium text-slate-400">Email</th>
                <th className="px-6 py-4 font-medium text-slate-400">Telefone</th>
                <th className="px-6 py-4 font-medium text-slate-400">Tipo</th>
                <th className="px-6 py-4 font-medium text-slate-400 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {paginatedCustomers.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-slate-400">Nenhum cliente encontrado</td>
                </tr>
              ) : (
                paginatedCustomers.map(customer => (
                  <tr key={customer.id} className="hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4 font-medium whitespace-nowrap">{customer.name}</td>
                    <td className="px-6 py-4 text-slate-400 whitespace-nowrap">{customer.email || '-'}</td>
                    <td className="px-6 py-4 text-slate-400 whitespace-nowrap">{customer.phone || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                        customer.type === 'cliente' 
                          ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' 
                          : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                      }`}>
                        {customer.type.charAt(0).toUpperCase() + customer.type.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Link to={`/clientes/${customer.id}`} className="text-blue-500 hover:text-blue-400 font-medium text-sm transition-colors">
                        Ver Detalhes
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
          {paginatedCustomers.length === 0 ? (
            <div className="px-4 py-8 text-center text-slate-400">Nenhum cliente encontrado</div>
          ) : (
            paginatedCustomers.map(customer => (
              <div key={customer.id} className="p-4 hover:bg-slate-700/30 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div className="min-w-0">
                    <h3 className="font-bold text-white truncate">{customer.name}</h3>
                    <p className="text-xs text-slate-400 truncate">{customer.email || 'Sem e-mail'}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border shrink-0 ${
                    customer.type === 'cliente' 
                      ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' 
                      : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                  }`}>
                    {customer.type.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-4 gap-2">
                  <div className="text-sm text-slate-300">
                    <span className="text-slate-500 text-xs block">Telefone</span>
                    {customer.phone || '-'}
                  </div>
                  <div className="flex gap-2">
                    <Link to={`/clientes/${customer.id}`} className="text-blue-500 text-xs font-semibold px-3 py-1.5 bg-blue-500/10 rounded-lg hover:bg-blue-500/20 transition-colors">
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
            Mostrando <span className="text-white font-medium">{startIndex + 1}</span> a <span className="text-white font-medium">{Math.min(startIndex + itemsPerPage, filteredCustomers.length)}</span> de <span className="text-white font-medium">{filteredCustomers.length}</span> resultados
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

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-slate-700">
            <h3 className="text-xl font-bold mb-4">Novo Cliente</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Nome</label>
                <input
                  required
                  type="text"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newCustomer.name}
                  onChange={e => setNewCustomer({...newCustomer, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newCustomer.email}
                  onChange={e => setNewCustomer({...newCustomer, email: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Telefone</label>
                <input
                  type="text"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newCustomer.phone}
                  onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Tipo</label>
                <select
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newCustomer.type}
                  onChange={e => setNewCustomer({...newCustomer, type: e.target.value})}
                >
                  <option value="lead">Lead</option>
                  <option value="cliente">Cliente</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
