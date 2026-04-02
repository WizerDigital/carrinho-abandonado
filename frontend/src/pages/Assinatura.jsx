import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, CreditCard, Clock, AlertTriangle } from 'lucide-react';
import api from '../api';

const plans = [
  {
    id: 'starter',
    name: 'Básico',
    price: '199,90',
    description: 'Ideal para autônomos',
    features: [
      { name: '1 Profissional', included: true },
      { name: 'Até 300 interações de IA / mês', included: true },
      { name: 'Agendamento Online Automático', included: true },
      { name: 'Lembretes por WhatsApp', included: true },
      { name: 'Gestão de Múltiplos Profissionais', included: false }
    ],
    buttonText: 'Assinar Básico'
  },
  {
    id: 'pro',
    name: 'Profissional',
    price: '349,90',
    description: 'Ideal para pequenas clínicas',
    features: [
      { name: 'Até 3 Profissionais', included: true },
      { name: 'Até 1500 interações de IA / mês', included: true },
      { name: 'Agendamento Online Automático', included: true },
      { name: 'Lembretes por WhatsApp', included: true },
      { name: 'Gestão de Múltiplos Profissionais', included: true }
    ],
    buttonText: 'Assinar Profissional',
    popular: true
  },
  {
    id: 'scale',
    name: 'Premium',
    price: '549,90',
    description: 'Ideal para redes e clínicas maiores',
    features: [
      { name: 'Até 10 Profissionais', included: true },
      { name: 'Até 5000 interações de IA / mês', included: true },
      { name: 'Agendamento Online Automático', included: true },
      { name: 'Lembretes por WhatsApp', included: true },
      { name: 'Gestão de Múltiplos Profissionais', included: true }
    ],
    buttonText: 'Assinar Premium'
  }
];

export default function Assinatura() {
  const [status, setStatus] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statusRes, invoicesRes] = await Promise.all([
        api.get('/subscriptions/status'),
        api.get('/subscriptions/invoices')
      ]);
      setStatus(statusRes.data);
      setInvoices(invoicesRes.data);
    } catch (error) {
      console.error('Erro ao buscar dados da assinatura', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId) => {
    try {
      const res = await api.post('/subscriptions/create-checkout-session', { plan: planId });
      window.location.href = res.data.url;
    } catch (error) {
      console.error('Erro ao iniciar checkout', error);
    }
  };

  const handleManageBilling = async () => {
    try {
      const res = await api.post('/subscriptions/create-portal-session');
      window.location.href = res.data.url;
    } catch (error) {
      console.error('Erro ao abrir portal', error);
    }
  };

  if (loading) {
    return <div className="p-6 text-white">Carregando...</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto text-white">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Assinatura e Planos</h1>
          <p className="text-gray-400">Gerencie seu plano, método de pagamento e histórico de faturas.</p>
        </div>
        {status?.hasActiveSubscription && !status?.isTrialing && (
          <button 
            onClick={handleManageBilling}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors"
          >
            <CreditCard className="w-5 h-5" />
            Gerenciar Assinatura
          </button>
        )}
      </div>

      {/* Status Atual */}
      <div className="bg-gray-800 rounded-xl p-6 mb-12 border border-gray-700">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <CheckCircle className="text-green-500 w-6 h-6" />
          Status do Plano
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-gray-400 mb-1">Plano Atual</p>
            <p className="text-xl font-medium capitalize">{status?.plan === 'free' ? 'Período de Teste' : status?.plan}</p>
          </div>
          <div>
            <p className="text-gray-400 mb-1">Status</p>
            <p className="text-xl font-medium capitalize flex items-center gap-2">
              {status?.status === 'active' ? (
                <span className="text-green-400">Ativo</span>
              ) : status?.status === 'trialing' ? (
                <span className="text-yellow-400">Em Teste</span>
              ) : (
                <span className="text-red-400">Inativo/Cancelado</span>
              )}
            </p>
          </div>
          {status?.isTrialing && (
            <div>
              <p className="text-gray-400 mb-1 flex items-center gap-1"><Clock className="w-4 h-4"/> Fim do Teste</p>
              <p className="text-xl font-medium text-yellow-400">
                {new Date(status.trialEndsAt).toLocaleDateString('pt-BR')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-8 text-center">Escolha o plano ideal para você</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map(plan => (
            <div 
              key={plan.id} 
              className={`bg-gray-800 rounded-2xl p-8 border flex flex-col ${plan.popular ? 'border-blue-500 relative transform md:-translate-y-4' : 'border-gray-700'}`}
            >
              {plan.popular && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-blue-500 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  MAIS ESCOLHIDO
                </div>
              )}
              <div className="text-center mb-8">
                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <div className="flex justify-center items-baseline mb-2">
                  <span className="text-3xl font-bold">R$ {plan.price}</span>
                  <span className="text-gray-400 ml-1">/mês</span>
                </div>
                <p className="text-gray-400 text-sm">{plan.description}</p>
              </div>
              
              <div className="flex-1">
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-3">
                      {feature.included ? (
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                      )}
                      <span className={feature.included ? 'text-gray-300' : 'text-gray-500'}>
                        {feature.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={status?.plan === plan.id && status?.status === 'active'}
                className={`w-full py-3 rounded-lg font-medium transition-colors ${
                  status?.plan === plan.id && status?.status === 'active'
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : plan.popular 
                      ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                      : 'bg-gray-700 hover:bg-gray-600 text-white'
                }`}
              >
                {status?.plan === plan.id && status?.status === 'active' ? 'Plano Atual' : plan.buttonText}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Invoices History */}
      {invoices.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-6">Histórico de Faturas</h2>
          <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700">
            <table className="w-full text-left">
              <thead className="bg-gray-900 border-b border-gray-700">
                <tr>
                  <th className="p-4 font-medium text-gray-400">Data</th>
                  <th className="p-4 font-medium text-gray-400">Valor</th>
                  <th className="p-4 font-medium text-gray-400">Status</th>
                  <th className="p-4 font-medium text-gray-400">Fatura</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(invoice => (
                  <tr key={invoice.id} className="border-b border-gray-700 last:border-0 hover:bg-gray-750 transition-colors">
                    <td className="p-4 text-gray-300">
                      {new Date(invoice.created * 1000).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="p-4 text-gray-300">
                      R$ {(invoice.amount_paid / 100).toFixed(2).replace('.', ',')}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        invoice.status === 'paid' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {invoice.status === 'paid' ? 'Pago' : invoice.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <a 
                        href={invoice.hosted_invoice_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                      >
                        Visualizar
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
