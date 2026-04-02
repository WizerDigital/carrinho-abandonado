import { useState, useEffect } from 'react';
import api from '../api';
import { Webhook, Copy, CheckCircle } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export default function Integracoes() {
  const { addToast } = useToast();
  const [webhooks, setWebhooks] = useState([]);
  const [configModal, setConfigModal] = useState(null);
  const [generatedUrl, setGeneratedUrl] = useState('');

  const fetchWebhooks = async () => {
    try {
      const res = await api.get('/integrations/webhooks');
      setWebhooks(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const handleConfig = async (platform) => {
    try {
      const res = await api.get(`/integrations/url/${platform}`);
      setGeneratedUrl(res.data.webhookUrl);
      setConfigModal(platform);
    } catch (err) {
      console.error(err);
    }
  };

  const platforms = [
    { id: 'hotmart', name: 'Hotmart', color: 'bg-[#F04E23]', logo: 'H' },
    { id: 'kiwify', name: 'Kiwify', color: 'bg-[#0052FF]', logo: 'K' }
  ];

  return (
    <div className="p-4 md:p-6">
      <div className="mb-8">
        <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">Integrações Disponíveis</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {platforms.map(platform => (
            <div key={platform.id} className="bg-slate-800 rounded-xl p-4 md:p-6 border border-slate-700 flex flex-col items-center text-center">
              <div className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl ${platform.color} flex items-center justify-center text-white text-xl md:text-2xl font-bold mb-4 shadow-lg`}>
                {platform.logo}
              </div>
              <h3 className="text-lg md:text-xl font-semibold mb-4">{platform.name}</h3>
              <button 
                onClick={() => handleConfig(platform.id)}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 rounded-lg transition-colors"
              >
                Configurar
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg md:text-xl font-bold mb-4">Últimos Payloads Recebidos</h3>
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead className="bg-slate-900/50 border-b border-slate-700">
                <tr>
                  <th className="px-6 py-4 font-medium text-slate-400">Plataforma</th>
                  <th className="px-6 py-4 font-medium text-slate-400">Data</th>
                  <th className="px-6 py-4 font-medium text-slate-400">Payload (Resumo)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {webhooks.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="px-6 py-8 text-center text-slate-400">Nenhum payload recebido ainda</td>
                  </tr>
                ) : (
                  webhooks.map(webhook => (
                    <tr key={webhook.id} className="hover:bg-slate-700/50 transition-colors">
                      <td className="px-6 py-4 capitalize font-medium whitespace-nowrap">{webhook.platform}</td>
                      <td className="px-6 py-4 text-sm text-slate-400 whitespace-nowrap">
                        {new Date(webhook.created_at).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-slate-300 truncate max-w-md">
                        {JSON.stringify(webhook.payload).substring(0, 100)}...
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-slate-700">
            {webhooks.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-400">Nenhum payload recebido ainda</div>
            ) : (
              webhooks.map(webhook => (
                <div key={webhook.id} className="p-4 hover:bg-slate-700/30 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-white capitalize">{webhook.platform}</h3>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {new Date(webhook.created_at).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                    <code className="text-[10px] text-slate-300 font-mono break-all">
                      {JSON.stringify(webhook.payload).substring(0, 150)}...
                    </code>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {configModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-xl p-4 md:p-6 w-full max-w-lg border border-slate-700">
            <h3 className="text-lg md:text-xl font-bold mb-2 capitalize">Configurar {configModal}</h3>
            <p className="text-slate-400 text-xs md:text-sm mb-4 md:mb-6">
              Copie a URL abaixo e cole nas configurações de Webhook da plataforma {configModal}.
            </p>
            
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 md:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 md:gap-4 mb-6">
              <code className="text-xs md:text-sm text-blue-400 break-all w-full">{generatedUrl}</code>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(generatedUrl);
                  addToast({ type: 'success', message: 'URL copiada para a área de transferência!' });
                }}
                className="w-full sm:w-auto px-3 py-2 sm:py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors shrink-0"
              >
                Copiar
              </button>
            </div>

            <div className="flex justify-end">
              <button 
                onClick={() => setConfigModal(null)}
                className="w-full sm:w-auto px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
