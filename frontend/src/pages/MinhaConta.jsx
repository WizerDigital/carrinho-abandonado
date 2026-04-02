import { useState, useContext, useEffect } from 'react';
import { User, Mail, Lock, Shield, CheckCircle } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../api';

export default function MinhaConta() {
  const { user, updateUser } = useContext(AuthContext);
  const { addToast } = useToast();
  
  const [formData, setFormData] = useState({
    email: user?.email || '',
    password: '',
    confirmPassword: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.email) {
      setFormData(prev => ({ ...prev, email: user.email }));
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password && formData.password !== formData.confirmPassword) {
      addToast({ type: 'error', message: 'As senhas não coincidem.' });
      return;
    }

    setSaving(true);
    try {
      const payload = { email: formData.email };
      if (formData.password) {
        payload.password = formData.password;
      }
      
      await api.put('/auth/me', payload);
      updateUser({ email: formData.email });
      
      addToast({ type: 'success', message: 'Dados atualizados com sucesso!' });
      
      if (formData.password) {
        setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
      }
    } catch (err) {
      console.error(err);
      addToast({ 
        type: 'error', 
        message: err.response?.data?.error || 'Erro ao atualizar dados.' 
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6">
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <User className="text-blue-500" /> Minha Conta
        </h2>
        <p className="text-slate-400 text-sm mt-1">Gerencie seus dados de acesso ao sistema.</p>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 max-w-2xl">
        <div className="p-6 border-b border-slate-700 flex items-center gap-3">
          <Shield className="text-purple-500" />
          <h3 className="text-lg font-bold text-white">Dados de Acesso</h3>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
              <Mail size={16} className="text-slate-400" /> E-mail
            </label>
            <input
              type="email"
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="seu@email.com"
            />
          </div>

          <div className="pt-4 border-t border-slate-700">
            <h4 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
              <Lock size={16} className="text-slate-400" /> Alterar Senha
            </h4>
            <p className="text-xs text-slate-500 mb-4">Deixe em branco se não quiser alterar a senha atual.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Nova Senha</label>
                <input
                  type="password"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Confirmar Nova Senha</label>
                <input
                  type="password"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-700 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Salvando...' : (
                <>
                  <CheckCircle size={18} /> Salvar Alterações
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}