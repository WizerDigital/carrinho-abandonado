import { useState, useEffect } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { Settings, MessageSquare, Plus, Trash2, HelpCircle, ShieldAlert, Phone, Smartphone, Eye, Clock, AlertTriangle } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export default function Agente() {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [settings, setSettings] = useState({
    agent_name: 'Assistente',
    followup_enabled: false,
    followup_delay_minutes: 60,
    followup_message: '',
    personality: '',
    communication_tone: 'formal',
    active_products: [],
    faq_items: [],
    objection_handlers: [],
    system_prompt_template: ''
  });
  const [products, setProducts] = useState([]);
  const [wahaStatus, setWahaStatus] = useState('STOPPED');
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [wahaMe, setWahaMe] = useState(null);

  // Prompt Preview Modal State
  const [showPreview, setShowPreview] = useState(false);
  const [previewContactId, setPreviewContactId] = useState('');
  const [previewContent, setPreviewContent] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/agent-settings');
      setSettings({
        agent_name: res.data.agent_name || 'Assistente',
        followup_enabled: !!res.data.followup_enabled,
        followup_delay_minutes: res.data.followup_delay_minutes || 60,
        followup_message: res.data.followup_message || '',
        personality: res.data.personality || '',
        communication_tone: res.data.communication_tone || 'formal',
        active_products: res.data.active_products || [],
        faq_items: res.data.faq_items || [],
        objection_handlers: res.data.objection_handlers || [],
        system_prompt_template: res.data.system_prompt_template || ''
      });
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products');
      setProducts(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchWahaStatus = async () => {
    try {
      const res = await api.get('/agent-settings/waha/status');
      setWahaStatus(res.data.status);
      
      if (res.data.me) {
        if (typeof res.data.me === 'string') {
          setWahaMe(res.data.me);
        } else if (typeof res.data.me === 'object' && res.data.me.user) {
          setWahaMe(res.data.me.user);
        } else if (typeof res.data.me === 'object' && res.data.me.id) {
          setWahaMe(res.data.me.id);
        } else {
          setWahaMe(JSON.stringify(res.data.me));
        }
      } else {
        setWahaMe(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSubscription = async () => {
    try {
      const res = await api.get('/subscriptions/status');
      setSubscriptionStatus(res.data);
    } catch (err) {
      console.error('Failed to fetch subscription status', err);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchSettings(), fetchProducts(), fetchWahaStatus(), fetchSubscription()]);
      setLoading(false);
    };
    init();

    const interval = setInterval(fetchWahaStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/agent-settings', settings);
      addToast({ type: 'success', message: 'Configurações salvas com sucesso!' });
    } catch (err) {
      console.error(err);
      addToast({ type: 'error', message: 'Erro ao salvar as configurações.' });
    } finally {
      setSaving(false);
    }
  };

  const handleStartSession = async () => {
    if (subscriptionStatus?.plan === 'free' || subscriptionStatus?.isTrialing) {
      addToast({ type: 'error', message: 'Você precisa de um plano pago para conectar o WhatsApp.' });
      navigate('/assinatura');
      return;
    }

    try {
      await api.post('/agent-settings/waha/start');
      addToast({ type: 'success', message: 'Sessão iniciada com sucesso!' });
      await fetchWahaStatus();
      handleGetQR();
    } catch (err) {
      console.error(err);
      addToast({ type: 'error', message: 'Erro ao iniciar sessão do WhatsApp.' });
    }
  };

  const handleStopSession = async () => {
    try {
      await api.post('/agent-settings/waha/stop');
      addToast({ type: 'success', message: 'Sessão parada com sucesso!' });
      setQrCodeUrl(null);
      await fetchWahaStatus();
    } catch (err) {
      console.error(err);
      addToast({ type: 'error', message: 'Erro ao parar sessão.' });
    }
  };

  const handleGetQR = async () => {
    try {
      const res = await api.get('/agent-settings/waha/qr', { responseType: 'blob' });
      if (res.data) {
        const url = URL.createObjectURL(res.data);
        setQrCodeUrl(url);
      }
    } catch (err) {
      console.error('QR não disponível ainda');
    }
  };

  useEffect(() => {
    if (wahaStatus === 'SCAN_QR_CODE' && !qrCodeUrl) {
      handleGetQR();
    }
    if (wahaStatus === 'WORKING') {
      setQrCodeUrl(null);
    }
  }, [wahaStatus]);

  const toggleProduct = (productId) => {
    setSettings(prev => {
      const active = prev.active_products.includes(productId)
        ? prev.active_products.filter(id => id !== productId)
        : [...prev.active_products, productId];
      return { ...prev, active_products: active };
    });
  };

  const addFaqItem = () => {
    setSettings(prev => ({
      ...prev,
      faq_items: [...prev.faq_items, { question: '', answer: '' }]
    }));
  };

  const updateFaqItem = (index, field, value) => {
    const newFaq = [...settings.faq_items];
    newFaq[index][field] = value;
    setSettings(prev => ({ ...prev, faq_items: newFaq }));
  };

  const removeFaqItem = (index) => {
    const newFaq = [...settings.faq_items];
    newFaq.splice(index, 1);
    setSettings(prev => ({ ...prev, faq_items: newFaq }));
  };

  const addObjectionHandler = () => {
    setSettings(prev => ({
      ...prev,
      objection_handlers: [...prev.objection_handlers, { objection: '', response: '' }]
    }));
  };

  const updateObjectionHandler = (index, field, value) => {
    const newObj = [...settings.objection_handlers];
    newObj[index][field] = value;
    setSettings(prev => ({ ...prev, objection_handlers: newObj }));
  };

  const removeObjectionHandler = (index) => {
    const newObj = [...settings.objection_handlers];
    newObj.splice(index, 1);
    setSettings(prev => ({ ...prev, objection_handlers: newObj }));
  };

  const handlePreviewPrompt = async () => {
    if (!previewContactId) {
      addToast({ type: 'info', message: 'Digite um telefone/ID de contato para testar.' });
      return;
    }
    setLoadingPreview(true);
    try {
      const res = await api.get(`/agent-settings/prompt-preview/${previewContactId}`);
      setPreviewContent(res.data.prompt);
    } catch (err) {
      console.error(err);
      addToast({ type: 'error', message: 'Erro ao gerar preview. Salve as configurações primeiro se houver mudanças.' });
    } finally {
      setLoadingPreview(false);
    }
  };

  // Tabs State
  const [activeTab, setActiveTab] = useState('geral');

  if (loading) return <div className="p-6 text-white">Carregando configurações...</div>;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="text-blue-500" />
            Configurações do Agente
          </h2>
          <p className="text-slate-400 text-sm mt-1">Configure o comportamento, conhecimento e conexão do seu agente de IA.</p>
        </div>

        {/* WhatsApp Compact Status */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 flex items-center gap-4 shadow-lg shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${
              wahaStatus === 'WORKING' ? 'bg-green-500/20 text-green-500' : 
              wahaStatus === 'SCAN_QR_CODE' ? 'bg-yellow-500/20 text-yellow-500' : 
              'bg-slate-700 text-slate-400'
            }`}>
              <Smartphone size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">WhatsApp</p>
              <p className="font-bold text-sm flex items-center gap-2">
                {wahaStatus === 'WORKING' ? 'Conectado' : 
                 wahaStatus === 'SCAN_QR_CODE' ? 'Aguardando QR' : 
                 'Desconectado'}
              </p>
            </div>
          </div>
          
          <div className="border-l border-slate-700 pl-4">
            {wahaStatus !== 'WORKING' && wahaStatus !== 'SCAN_QR_CODE' && (
              <button onClick={handleStartSession} className="text-sm bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg transition-colors">
                Conectar
              </button>
            )}
            {(wahaStatus === 'WORKING' || wahaStatus === 'SCAN_QR_CODE') && (
              <button onClick={handleStopSession} className="text-sm bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg transition-colors">
                Desconectar
              </button>
            )}
          </div>
        </div>
      </div>

      {(subscriptionStatus?.plan === 'free' || subscriptionStatus?.isTrialing) && (
        <div className="bg-yellow-900/30 border border-yellow-700 rounded-xl p-4 mb-6 flex items-start gap-4">
          <AlertTriangle className="text-yellow-500 w-6 h-6 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-yellow-400 font-bold text-lg mb-1">Conexão Bloqueada (Período de Teste)</h3>
            <p className="text-yellow-200/80 mb-3 text-sm">
              Durante o período de teste grátis, não é possível conectar o WhatsApp para iniciar o agente. Para liberar essa funcionalidade, assine um de nossos planos.
            </p>
            <button 
              onClick={() => navigate('/assinatura')}
              className="bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
            >
              Ver Planos de Assinatura
            </button>
          </div>
        </div>
      )}

      {wahaStatus === 'SCAN_QR_CODE' && qrCodeUrl && (
        <div className="mb-6 bg-slate-800 p-4 rounded-xl border border-yellow-500/30 flex flex-col items-center">
          <p className="text-sm text-yellow-400 mb-3 font-medium">Escaneie o QR Code com o WhatsApp do atendente.</p>
          <div className="bg-white p-2 rounded-lg shadow-lg">
            <img src={qrCodeUrl} alt="QR Code WhatsApp" className="w-48 h-48" />
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-slate-700 mb-6 pb-2">
        <button 
          onClick={() => setActiveTab('geral')}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'geral' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
        >
          Geral
        </button>
        <button 
          onClick={() => setActiveTab('comportamento')}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'comportamento' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
        >
          Comportamento & Tom
        </button>
        <button 
          onClick={() => setActiveTab('conhecimento')}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'conhecimento' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
        >
          Base de Conhecimento
        </button>
        <button 
          onClick={() => setActiveTab('teste')}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'teste' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
        >
          Testar Prompt
        </button>
      </div>

      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6 min-h-[400px]">
        {/* TAB GERAL */}
        {activeTab === 'geral' && (
          <div className="space-y-6 max-w-2xl">
            <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <MessageSquare size={18} className="text-blue-500" />
                Identidade Básica
              </h3>
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nome do Agente</label>
                <input 
                  type="text"
                  value={settings.agent_name}
                  onChange={e => setSettings({...settings, agent_name: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  placeholder="Ex: Ana, João, Assistente..."
                />
              </div>
            </div>

            <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Phone size={18} className="text-purple-500" />
                Produtos Ativos (Recuperação)
              </h3>
              <p className="text-xs text-slate-400 mb-3">Se nenhum for selecionado, o agente atuará em todos os produtos recuperados.</p>
              <div className="space-y-2 max-h-48 overflow-y-auto bg-slate-900 p-3 rounded-lg border border-slate-700">
                {products.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center">Nenhum produto cadastrado.</p>
                ) : (
                  products.map(p => (
                    <label key={p.id} className="flex items-center space-x-3 cursor-pointer p-1 hover:bg-slate-800 rounded">
                      <input 
                        type="checkbox" 
                        checked={settings.active_products.includes(p.id)}
                        onChange={() => toggleProduct(p.id)}
                        className="form-checkbox bg-slate-800 border-slate-600 text-blue-500 rounded focus:ring-0 focus:ring-offset-0"
                      />
                      <span className="text-sm text-slate-300 truncate">{p.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB COMPORTAMENTO */}
        {activeTab === 'comportamento' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <MessageSquare size={18} className="text-blue-500" />
                  Personalidade
                </h3>
                
                <div className="mb-4">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tom de Comunicação</label>
                  <select 
                    value={settings.communication_tone}
                    onChange={e => setSettings({...settings, communication_tone: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  >
                    <option value="formal">Formal e Profissional</option>
                    <option value="amigavel">Amigável e Empático</option>
                    <option value="vendedor">Foco em Vendas/Persuasivo</option>
                    <option value="descontraido">Descontraído e Divertido</option>
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Base Persona</label>
                  <textarea 
                    value={settings.personality}
                    onChange={e => setSettings({...settings, personality: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white h-24 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    placeholder="Ex: Você é o assistente virtual da loja X..."
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Instruções Extras Customizadas</label>
                  <textarea 
                    value={settings.system_prompt_template}
                    onChange={e => setSettings({...settings, system_prompt_template: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white h-24 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    placeholder="Instruções adicionais injetadas no final do prompt..."
                  />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Clock size={18} className="text-pink-500" />
                    Retentativa (Follow-up)
                  </h3>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={settings.followup_enabled}
                      onChange={e => setSettings({...settings, followup_enabled: e.target.checked})}
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500"></div>
                  </label>
                </div>
                
                <p className="text-xs text-slate-400 mb-4">Envie uma mensagem automática se o cliente não responder após a primeira abordagem. (Executado apenas 1 vez por interação sem resposta).</p>

                {settings.followup_enabled && (
                  <>
                    <div className="mb-4">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Aguardar (Minutos)</label>
                      <input 
                        type="number"
                        min="1"
                        value={settings.followup_delay_minutes}
                        onChange={e => setSettings({...settings, followup_delay_minutes: parseInt(e.target.value) || 1})}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-pink-500 outline-none text-sm"
                        placeholder="Ex: 60 para 1 hora"
                      />
                    </div>

                    <div className="mb-4">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Mensagem de Follow-up</label>
                      <textarea 
                        value={settings.followup_message}
                        onChange={e => setSettings({...settings, followup_message: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white h-24 focus:ring-2 focus:ring-pink-500 outline-none text-sm"
                        placeholder="Ex: Oi, ainda está por aí? Posso te ajudar com alguma dúvida sobre o produto?"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB CONHECIMENTO */}
        {activeTab === 'conhecimento' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* FAQ */}
            <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <HelpCircle size={18} className="text-green-500" />
                  Perguntas Frequentes (FAQ)
                </h3>
                <button 
                  onClick={addFaqItem}
                  className="flex items-center gap-1 text-sm bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg transition-colors text-white"
                >
                  <Plus size={16} /> Adicionar
                </button>
              </div>
              
              <div className="space-y-4">
                {settings.faq_items.length === 0 ? (
                  <div className="text-center py-6 bg-slate-900/50 rounded-lg border border-slate-700 border-dashed">
                    <p className="text-slate-400 text-sm">Nenhuma pergunta cadastrada.</p>
                  </div>
                ) : (
                  settings.faq_items.map((item, idx) => (
                    <div key={idx} className="bg-slate-900 p-4 rounded-lg border border-slate-700 relative group">
                      <button 
                        onClick={() => removeFaqItem(idx)}
                        className="absolute top-2 right-2 text-slate-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={16} />
                      </button>
                      <input 
                        type="text"
                        placeholder="Pergunta (ex: Qual o prazo de entrega?)"
                        value={item.question}
                        onChange={e => updateFaqItem(idx, 'question', e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 mb-2 font-medium"
                      />
                      <textarea 
                        placeholder="Resposta sugerida..."
                        value={item.answer}
                        onChange={e => updateFaqItem(idx, 'answer', e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 h-16 resize-none"
                      />
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quebra de Objeções */}
            <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <ShieldAlert size={18} className="text-orange-500" />
                  Quebra de Objeções
                </h3>
                <button 
                  onClick={addObjectionHandler}
                  className="flex items-center gap-1 text-sm bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg transition-colors text-white"
                >
                  <Plus size={16} /> Adicionar
                </button>
              </div>
              
              <div className="space-y-4">
                {settings.objection_handlers.length === 0 ? (
                  <div className="text-center py-6 bg-slate-900/50 rounded-lg border border-slate-700 border-dashed">
                    <p className="text-slate-400 text-sm">Nenhuma objeção mapeada.</p>
                  </div>
                ) : (
                  settings.objection_handlers.map((item, idx) => (
                    <div key={idx} className="bg-slate-900 p-4 rounded-lg border border-slate-700 relative group">
                      <button 
                        onClick={() => removeObjectionHandler(idx)}
                        className="absolute top-2 right-2 text-slate-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={16} />
                      </button>
                      <input 
                        type="text"
                        placeholder="Objeção do Cliente (ex: Está muito caro)"
                        value={item.objection}
                        onChange={e => updateObjectionHandler(idx, 'objection', e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500 mb-2 font-medium"
                      />
                      <textarea 
                        placeholder="Como o agente deve contornar..."
                        value={item.response}
                        onChange={e => updateObjectionHandler(idx, 'response', e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500 h-16 resize-none"
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB TESTE */}
        {activeTab === 'teste' && (
          <div className="max-w-3xl">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Eye className="text-blue-500" /> Visualizar Prompt Gerado
            </h3>
            <p className="text-slate-400 text-sm mb-6">Teste como o sistema irá montar as instruções finais para o modelo de Inteligência Artificial usando os dados reais de um cliente.</p>
            
            <div className="flex gap-2 mb-4">
              <input 
                type="text"
                placeholder="Telefone do cliente (ex: 5511999999999)"
                value={previewContactId}
                onChange={e => setPreviewContactId(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500"
              />
              <button 
                onClick={handlePreviewPrompt}
                disabled={loadingPreview}
                className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-medium transition-colors"
              >
                {loadingPreview ? 'Gerando...' : 'Gerar Prompt'}
              </button>
            </div>

            <div className="bg-slate-900 rounded-lg border border-slate-700 p-4 overflow-y-auto font-mono text-sm text-slate-300 whitespace-pre-wrap min-h-[250px]">
              {previewContent || 'Insira um telefone e clique em Gerar Prompt para ver as instruções montadas (incluindo histórico, carrinhos abandonados, FAQ, etc).'}
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Bar for Save */}
      <div className="fixed bottom-0 left-0 md:left-64 right-0 p-4 bg-slate-900/80 backdrop-blur-md border-t border-slate-700 flex justify-end z-40">
        <button 
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50"
        >
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </div>

    </div>
  );
}