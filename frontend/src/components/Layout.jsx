import { useState, useContext } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Users, 
  Package, 
  Link as LinkIcon, 
  LogOut,
  Menu,
  ChevronLeft
} from 'lucide-react';

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
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
  ];

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 overflow-hidden">
      {/* Sidebar */}
      <aside 
        className={`${collapsed ? 'w-20' : 'w-64'} bg-slate-800 transition-all duration-300 flex flex-col border-r border-slate-700`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-700">
          {!collapsed && <span className="font-bold text-xl truncate">Wizer Admin</span>}
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white"
          >
            {collapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>
        
        <nav className="flex-1 py-4 flex flex-col gap-2 px-3">
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
                {!collapsed && <span className="ml-3 truncate">{item.name}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-6 shrink-0">
          <h1 className="text-xl font-semibold truncate">
            {menuItems.find(m => m.path === location.pathname)?.name || 'Dashboard'}
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">{user?.email}</span>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-slate-900 p-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
