import { useState, useContext, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, ArrowRight, Bot, Smartphone, Webhook, X, Minimize2, Maximize2 } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../api';

export default function OnboardingModal() {
  const { user, updateUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [minimized, setMinimized] = useState(false);

  // Auto-open (un-minimize) when route changes, if not completed
  useEffect(() => {
    if (user && !user.onboarding_completed) {
      setMinimized(false);
    }
  }, [location.pathname, user]);

  // If onboarding is completed, do not render
  if (!user || user.onboarding_completed) return null;

  const steps = [
    {
      id: 1,
      title: 'Configurar Integração',
      description: 'Conecte sua plataforma (Hotmart, Kiwify, etc) copiando a URL de Webhook do sistema para começar a receber os eventos de abandono de carrinho.',
      icon: <Webhook className="text-purple-500" size={32} />,
      actionText: 'Ir para Integrações',
      action: () => navigate('/integracoes')
    },
    {
      id: 2,
      title: 'Configurar o Agente',
      description: 'Acesse as configurações do Agente, defina um nome para ele e cadastre ao menos uma quebra de objeção para ajudar nas vendas.',
      icon: <Bot className="text-emerald-500" size={32} />,
      actionText: 'Ir para Configurações do Agente',
      action: () => navigate('/agente')
    },
    {
      id: 3,
      title: 'Conectar WhatsApp',
      description: 'Ainda na página do Agente, conecte o número de WhatsApp que o seu Agente usará para conversar com os clientes lendo o QR Code.',
      icon: <Smartphone className="text-blue-500" size={32} />,
      actionText: 'Ir para Configurações do Agente',
      action: () => navigate('/agente')
    }
  ];

  const handleComplete = async () => {
    setLoading(true);
    try {
      await api.put('/auth/onboarding');
      updateUser({ onboarding_completed: true });
      addToast({ type: 'success', message: 'Tutorial concluído com sucesso! Bem-vindo.' });
    } catch (error) {
      console.error(error);
      addToast({ type: 'error', message: 'Erro ao concluir tutorial.' });
    } finally {
      setLoading(false);
    }
  };

  const step = steps[currentStep - 1];

  if (minimized) {
    return (
      <div className="fixed bottom-4 right-4 z-[100]">
        <button 
          onClick={() => setMinimized(false)}
          className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-xl flex items-center justify-center animate-bounce transition-colors"
          title="Continuar Tutorial"
        >
          <Bot size={24} />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-pink-500"></span>
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
      <div className="bg-slate-800 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-700 text-center relative">
          <button 
            onClick={() => setMinimized(true)}
            className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            title="Minimizar"
          >
            <Minimize2 size={20} />
          </button>
          <h2 className="text-2xl font-bold text-white mb-2">Bem-vindo ao Sistema!</h2>
          <p className="text-slate-400 text-sm">Siga estes passos primordiais para o sistema começar a trabalhar.</p>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-700 h-1.5">
          <div 
            className="bg-blue-500 h-1.5 transition-all duration-300"
            style={{ width: `${(currentStep / steps.length) * 100}%` }}
          ></div>
        </div>

        {/* Content */}
        <div className="p-8 flex-1 overflow-y-auto flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-slate-700 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
          {step.icon}
        </div>
        <h3 className="text-xl font-bold text-white mb-3">Passo {step.id}: {step.title}</h3>
        <p className="text-slate-300 mb-8 leading-relaxed">
          {step.description}
        </p>

        <button
          onClick={() => {
            step.action();
            setMinimized(true);
          }}
          className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-xl font-medium transition-colors mb-4 w-full justify-center"
        >
          {step.actionText} <ArrowRight size={18} />
        </button>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700 bg-slate-800/50 flex items-center justify-between gap-4">
          <div className="flex gap-2">
            {steps.map((s, idx) => (
              <div 
                key={s.id} 
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  idx + 1 === currentStep ? 'bg-blue-500' : 
                  idx + 1 < currentStep ? 'bg-blue-500/50' : 'bg-slate-600'
                }`}
              />
            ))}
          </div>

          <div className="flex gap-3">
            {currentStep > 1 && (
              <button 
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors text-sm font-medium"
              >
                Voltar
              </button>
            )}
            
            {currentStep < steps.length ? (
              <button 
                onClick={() => setCurrentStep(prev => prev + 1)}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
              >
                Próximo
              </button>
            ) : (
              <button 
                onClick={handleComplete}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors text-sm"
              >
                {loading ? 'Concluindo...' : (
                  <>
                    Concluir Tutorial <CheckCircle size={16} />
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}