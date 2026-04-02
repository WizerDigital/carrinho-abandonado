import { useState, useContext, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import OnboardingModal from './OnboardingModal';
import PWAInstallPrompt from './PWAInstallPrompt';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Users, 
  Package, 
  Link as LinkIcon, 
  LogOut,
  Menu,
  ChevronLeft,
  Bot,
  UserCircle,
  CreditCard,
  ChevronDown
} from 'lucide-react';

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { logout, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { name: 'Vendas', icon: ShoppingCart, path: '/vendas' },
    { name: 'Clientes', icon: Users, path: '/clientes' },
    { name: 'Produtos', icon: Package, path: '/produtos' },
    { name: 'Integrações', icon: LinkIcon, path: '/integracoes' },
    { name: 'Agente', icon: Bot, path: '/agente' },
  ];

  const allPageTitles = {
    '/': 'Dashboard',
    '/vendas': 'Vendas',
    '/clientes': 'Clientes',
    '/produtos': 'Produtos',
    '/integracoes': 'Integrações',
    '/agente': 'Agente',
    '/minha-conta': 'Minha Conta',
    '/assinatura': 'Assinatura',
  };

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuOpen && !event.target.closest('.user-dropdown')) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen]);

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 overflow-hidden">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar (Desktop) */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          md:relative md:translate-x-0
          ${collapsed ? 'md:w-20' : 'w-64'} 
          bg-slate-800 flex flex-col border-r border-slate-700
          pb-20 md:pb-0
        `}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <span className={`font-bold text-xl truncate ${collapsed ? 'md:hidden' : 'block'}`}>
              Wizer Admin
            </span>
          </div>
          
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:block p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white"
          >
            {collapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>
        
        <nav className="flex-1 py-4 flex flex-col gap-2 px-3 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link 
                key={item.path} 
                to={item.path}
                className={`flex items-center p-3 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
                title={collapsed ? item.name : ''}
              >
                <Icon size={20} className="shrink-0" />
                <span className={`ml-3 truncate ${collapsed ? 'md:hidden' : 'block'}`}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen">
        {/* Header */}
        <header className="h-16 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4 md:px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 -ml-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white"
            >
              <Menu size={24} />
            </button>
            <h1 className="text-lg md:text-xl font-semibold truncate">
              {allPageTitles[location.pathname] || 'Dashboard'}
            </h1>
          </div>
          
          <div className="flex items-center gap-3 md:gap-4 relative user-dropdown">
            <button 
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 p-1.5 md:p-2 hover:bg-slate-700 rounded-lg transition-colors group"
            >
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                {user?.name ? user.name[0].toUpperCase() : (user?.email?.[0].toUpperCase() || 'U')}
              </div>
              <div className="hidden sm:flex flex-col items-start text-left">
                <span className="text-sm font-medium text-slate-100 leading-tight truncate max-w-[150px]">
                  {user?.name || user?.email?.split('@')[0]}
                </span>
                <span className="text-[11px] text-slate-400 leading-tight truncate max-w-[150px]">
                  {user?.email}
                </span>
              </div>
              <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {userMenuOpen && (
               <div className="absolute top-full right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-2 z-[60]">
                <div className="px-4 py-3 border-b border-slate-700 sm:hidden">
                  <p className="text-sm font-medium text-white truncate">{user?.name || user?.email?.split('@')[0]}</p>
                  <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                </div>
                
                <div className="py-1">
                  <Link 
                    to="/minha-conta"
                    className="flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                  >
                    <UserCircle size={18} />
                    Minha Conta
                  </Link>
                  <Link 
                    to="/assinatura"
                    className="flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                  >
                    <CreditCard size={18} />
                    Assinatura
                  </Link>
                </div>
                
                <div className="border-t border-slate-700 mt-1 pt-1">
                  <button 
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                  >
                    <LogOut size={18} />
                    Sair da conta
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-slate-900 pb-20 md:pb-0 relative">
          <Outlet />
          <OnboardingModal />
          <PWAInstallPrompt />
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-800 border-t border-slate-700 flex items-center justify-around px-2 z-50">
          {[
            { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
            { name: 'Vendas', icon: ShoppingCart, path: '/vendas' },
            { name: 'Clientes', icon: Users, path: '/clientes' },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${
                  isActive ? 'text-blue-500' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon size={20} />
                <span className="text-[10px] font-medium">{item.name}</span>
                {isActive && <div className="absolute bottom-1 w-1 h-1 rounded-full bg-blue-500" />}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
