import { useState, useEffect } from 'react';
import api from '../api';
import { Plus, Search, ChevronLeft, ChevronRight, Filter, X } from 'lucide-react';

export default function Produtos() {
  const [products, setProducts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', description: '', price: '' });

  // Estados para filtros e paginação
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const itemsPerPage = 20;

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products');
      setProducts(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Lógica de filtragem
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = filterStatus === 'todos' || (product.status || 'ativo') === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Lógica de paginação
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

  // Resetar para primeira página ao filtrar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/products', newProduct);
      setShowModal(false);
      setNewProduct({ name: '', description: '', price: '' });
      fetchProducts();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl md:text-2xl font-bold">Produtos</h2>
        <div className="flex w-full sm:w-auto gap-2">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="md:hidden flex items-center gap-2 bg-slate-800 border border-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
          >
            <Filter size={18} className={showFilters ? 'text-blue-500' : 'text-slate-400'} />
            Filtros
            {(filterStatus !== 'todos' || searchTerm !== '') && (
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            )}
          </button>
          <button 
            onClick={() => setShowModal(true)}
            className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <Plus size={20} />
            Novo Produto
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
                placeholder="Buscar por nome ou descrição..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1 block">Status</label>
            <select 
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="todos">Todos os Status</option>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
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
                <th className="px-6 py-4 font-medium text-slate-400">Preço</th>
                <th className="px-6 py-4 font-medium text-slate-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan="3" className="px-6 py-8 text-center text-slate-400">Nenhum produto encontrado</td>
                </tr>
              ) : (
                paginatedProducts.map(product => (
                  <tr key={product.id} className="hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4 font-medium whitespace-nowrap">{product.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">R$ {parseFloat(product.price).toFixed(2).replace('.', ',')}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                        (product.status || 'ativo') === 'ativo' 
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                          : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                      }`}>
                        {(product.status || 'ativo').charAt(0).toUpperCase() + (product.status || 'ativo').slice(1)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-slate-700">
          {paginatedProducts.length === 0 ? (
            <div className="px-4 py-8 text-center text-slate-400">Nenhum produto encontrado</div>
          ) : (
            paginatedProducts.map(product => (
              <div key={product.id} className="p-4 hover:bg-slate-700/30 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div className="min-w-0">
                    <h3 className="font-bold text-white truncate text-lg">{product.name}</h3>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                      (product.status || 'ativo') === 'ativo' 
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                        : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                    }`}>
                      {(product.status || 'ativo').toUpperCase()}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-slate-500 text-[10px] block uppercase tracking-wider font-semibold">Preço</span>
                    <span className="text-xl font-bold text-white">R$ {parseFloat(product.price).toFixed(2).replace('.', ',')}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="flex-1 text-blue-500 text-xs font-semibold py-2.5 bg-blue-500/10 rounded-lg hover:bg-blue-500/20 transition-colors border border-blue-500/20">
                    Editar
                  </button>
                  <button className="px-4 text-slate-400 text-xs font-semibold py-2.5 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors border border-slate-600">
                    Remover
                  </button>
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
            Mostrando <span className="text-white font-medium">{startIndex + 1}</span> a <span className="text-white font-medium">{Math.min(startIndex + itemsPerPage, filteredProducts.length)}</span> de <span className="text-white font-medium">{filteredProducts.length}</span> resultados
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
            <h3 className="text-xl font-bold mb-4">Novo Produto</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Nome</label>
                <input
                  required
                  type="text"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newProduct.name}
                  onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Descrição</label>
                <textarea
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newProduct.description}
                  onChange={e => setNewProduct({...newProduct, description: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Preço (R$)</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newProduct.price}
                  onChange={e => setNewProduct({...newProduct, price: e.target.value})}
                />
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
