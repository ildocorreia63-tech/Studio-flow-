import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Check,
  Building2,
  ShieldCheck,
  Zap,
  Award,
  Users,
  CreditCard,
  Phone,
  ArrowRight,
  Copy,
  ExternalLink,
  QrCode as QrCodeIcon,
  Download,
  Share2,
  HelpCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Star,
  CheckCircle2,
  BarChart3,
  MessageSquare,
  Scissors
} from 'lucide-react';
import QRCode from 'qrcode';
import { PLANS, SubscriptionService } from '../services/subscription';
import { SaaSPlan, FeatureKey } from '../types';
import { getPublicPlansUrl } from '../utils/url';
import { StudioFlowLogo } from './StudioFlowLogo';

interface PublicSubscriptionLandingProps {
  onOpenSignup: (selectedPlan?: SaaSPlan) => void;
  onOpenLogin: () => void;
  onBackToApp?: () => void;
  isLoggedIn?: boolean;
  isSuperAdmin?: boolean;
}

const getFeatureLabel = (feat: FeatureKey | string): string => {
  switch (feat) {
    case 'AGENDA':
      return 'Agenda Geral & Gestão de Horários';
    case 'AGENDAMENTO_ONLINE':
      return 'Agendamento Online 24/7 com Link Próprio';
    case 'CLIENTES':
      return 'Ficha de Clientes & Histórico Completo';
    case 'PROFISSIONAIS':
      return 'Gestão de Barbeiros & Profissionais';
    case 'SERVICOS':
      return 'Catálogo de Serviços & Preços';
    case 'CAIXA':
      return 'Frente de Loja POS & Controle de Caixa';
    case 'VENDAS':
      return 'Módulo de Vendas & Emissão de Recibos';
    case 'COMISSOES':
      return 'Cálculo Automático de Comissões';
    case 'FINANCEIRO':
      return 'Gestão Financeira & Fluxo de Caixa';
    case 'FIDELIDADE':
      return 'Programa de Fidelidade de Clientes';
    case 'CRM':
      return 'CRM & Disparos de Lembretes WhatsApp';
    case 'MARKETING':
      return 'Campanhas de Marketing Automatizadas';
    case 'AUTOMACOES_CRM':
      return 'Automações Inteligentes de Clientes';
    case 'RELATORIOS':
      return 'Relatórios e Métricas Gerenciais';
    case 'GALERIA':
      return 'Galeria de Cortes & Portfólio de Fotos';
    case 'ANAMNESE':
      return 'Ficha de Anamnese Técnica VIP';
    case 'PWA':
      return 'Aplicativo PWA Instalável no Celular';
    default:
      return String(feat);
  }
};

export const PublicSubscriptionLanding: React.FC<PublicSubscriptionLandingProps> = ({
  onOpenSignup,
  onOpenLogin,
  onBackToApp,
  isLoggedIn = false,
  isSuperAdmin = false,
}) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [plansPageUrl, setPlansPageUrl] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  useEffect(() => {
    const url = getPublicPlansUrl();
    setPlansPageUrl(url);
    QRCode.toDataURL(url, { width: 300, margin: 2 })
      .then((qrUrl) => setQrDataUrl(qrUrl))
      .catch((err) => console.error('Erro ao gerar QR Code dos planos:', err));
  }, []);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(plansPageUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleShareWhatsApp = () => {
    const text = `Olá! Conheça a plataforma de gestão e agendamento online nº 1 para barbearias e salões: ${plansPageUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `qrcode_planos_studioflow.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const faqs = [
    {
      q: 'Preciso instalar algum programa no meu computador ou celular?',
      a: 'Não! O StudioFlow é uma plataforma 100% online na nuvem (SaaS). Você pode acessar de qualquer celular, tablet ou computador direto pelo navegador, sem ocupar espaço no seu dispositivo.',
    },
    {
      q: 'Como funciona o teste grátis de 14 dias?',
      a: 'Ao se cadastrar, você ganha acesso completo sem necessidade de cartão de crédito. Você pode configurar sua barbearia, cadastrar serviços, equipe e testar a página de agendamento online sem custo.',
    },
    {
      q: 'Meus clientes precisam baixar aplicativo para agendar?',
      a: 'Não! Seus clientes recebem um link exclusivo (ou escaneiam o QR Code no seu balcão) e agendam diretamente em poucos segundos pelo celular, sem precisar baixar nenhum app ou criar senhas difíceis.',
    },
    {
      q: 'Posso mudar de plano ou cancelar a qualquer momento?',
      a: 'Sim! Não temos contrato de fidelidade. Você pode fazer upgrade de plano à medida que sua equipe cresce ou solicitar alterações de forma flexível.',
    },
    {
      q: 'Como recebo suporte se tiver dúvidas?',
      a: 'Oferecemos suporte humanizado diretamente pelo WhatsApp e e-mail para ajudar você e sua equipe em cada etapa da configuração.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-purple-500 selection:text-white">
      {/* Top Sticky Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 lg:px-8 py-3 flex items-center justify-between shadow-lg">
        <StudioFlowLogo
          size="md"
          variant="horizontal"
          showSubtitle={true}
        />

        <div className="flex items-center space-x-2 sm:space-x-3">
          {onBackToApp && isLoggedIn && (
            <button
              onClick={onBackToApp}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 transition"
            >
              {isSuperAdmin ? 'Voltar ao Admin' : 'Voltar ao Meu Painel'}
            </button>
          )}

          <button
            onClick={onOpenLogin}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-purple-300 hover:text-white rounded-xl text-xs font-extrabold border border-purple-800/60 transition"
          >
            Já tenho conta / Entrar
          </button>

          <button
            onClick={() => onOpenSignup('professional')}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-extrabold shadow-md shadow-purple-900/40 transition flex items-center space-x-1.5"
          >
            <span>Testar Grátis</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto space-y-6">
          <div className="flex justify-center mb-2">
            <div className="p-2.5 rounded-3xl bg-slate-900/80 border-2 border-purple-500/40 shadow-2xl shadow-purple-950/80 inline-flex items-center space-x-3">
              <StudioFlowLogo variant="horizontal" size="lg" showSubtitle={true} />
            </div>
          </div>

          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-purple-900/60 border border-purple-700/60 text-purple-300 text-xs font-bold uppercase tracking-wider shadow-inner">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>SISTEMA COMPLETO DE GESTÃO PARA BARBEARIAS & SALÕES</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
            Automatize sua Barbearia e <span className="bg-gradient-to-r from-purple-400 via-purple-300 to-indigo-300 bg-clip-text text-transparent">Multiplique seus Lucros</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 font-medium leading-relaxed max-w-2xl mx-auto">
            Ofereça agendamento online 24 horas para seus clientes, controle de caixa frente de loja, comissões automáticas para os barbeiros e relatórios completos em uma única plataforma.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <button
              onClick={() => onOpenSignup('professional')}
              className="w-full sm:w-auto px-8 py-4 bg-purple-600 hover:bg-purple-500 text-white text-sm font-black rounded-2xl shadow-xl shadow-purple-900/50 hover:scale-105 transition flex items-center justify-center space-x-2"
            >
              <Building2 className="w-5 h-5" />
              <span>CRIAR MINHA BARBEARIA AGORA</span>
            </button>

            <button
              onClick={handleShareWhatsApp}
              className="w-full sm:w-auto px-6 py-4 bg-slate-800 hover:bg-slate-700 text-purple-200 text-sm font-bold rounded-2xl border border-slate-700 transition flex items-center justify-center space-x-2"
            >
              <Share2 className="w-4 h-4 text-emerald-400" />
              <span>DIVULGAR ESTA PÁGINA</span>
            </button>
          </div>

          {/* Social Proof Badges */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 font-semibold">
            <div className="flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>14 dias de teste grátis</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-purple-400" />
              <span>Sem necessidade de cartão</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Suporte técnico em português</span>
            </div>
          </div>
        </div>
      </section>

      {/* Share & QR Code Divulgação Box */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto mb-16">
        <div className="bg-gradient-to-r from-purple-950/80 via-slate-900 to-slate-900 p-6 sm:p-8 rounded-3xl border border-purple-800/60 shadow-2xl space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <Share2 className="w-5 h-5 text-purple-400" />
                <h2 className="text-lg font-black text-white">Link Público de Divulgação dos Planos</h2>
              </div>
              <p className="text-xs text-slate-300">
                Divulgue este link para proprietários de barbearias e salões interessados em se cadastrar.
              </p>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={handleShareWhatsApp}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center space-x-2 shadow-md"
              >
                <Phone className="w-4 h-4" />
                <span>Enviar no WhatsApp</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center pt-2">
            {/* Link Box */}
            <div className="md:col-span-2 space-y-3">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Link de Divulgação Direct
              </label>
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
                <span className="font-mono text-purple-300 font-bold truncate pr-2">{plansPageUrl}</span>
                <button
                  onClick={handleCopyLink}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-extrabold rounded-xl text-xs shrink-0 flex items-center gap-1.5 transition shadow-sm"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copiado!' : 'Copiar Link'}</span>
                </button>
              </div>
            </div>

            {/* QR Code */}
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 text-center space-y-2">
              <p className="text-[11px] font-bold text-slate-400 uppercase">QR Code da Página</p>
              {qrDataUrl && (
                <img src={qrDataUrl} alt="QR Code dos Planos" className="w-32 h-32 mx-auto rounded-xl border border-purple-500/30 p-1 bg-white" />
              )}
              <button
                onClick={handleDownloadQr}
                className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-purple-300 rounded-lg text-[11px] font-bold transition inline-flex items-center justify-center space-x-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar PNG</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Plans Section */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto py-12">
        <div className="text-center space-y-3 mb-10">
          <h2 className="text-2xl sm:text-4xl font-black text-white">Escolha o Plano Ideal para seu Negócio</h2>
          <p className="text-xs sm:text-sm text-slate-400 font-medium max-w-xl mx-auto">
            Sem contratos longos, sem taxas escondidas. Cancele ou altere a qualquer momento.
          </p>

          {/* Cycle Toggle */}
          <div className="pt-4 flex items-center justify-center space-x-3">
            <span className={`text-xs font-bold ${billingCycle === 'monthly' ? 'text-white' : 'text-slate-400'}`}>
              Mensal
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
              className="w-14 h-8 rounded-full bg-purple-900 border border-purple-600 p-1 transition relative"
            >
              <div
                className={`w-6 h-6 rounded-full bg-purple-400 shadow-md transition-transform ${
                  billingCycle === 'annual' ? 'translate-x-6 bg-amber-400' : 'translate-x-0'
                }`}
              />
            </button>
            <span className={`text-xs font-bold flex items-center gap-1.5 ${billingCycle === 'annual' ? 'text-amber-300' : 'text-slate-400'}`}>
              <span>Anual</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-black border border-amber-400/40">
                -20% DESCONTO
              </span>
            </span>
          </div>
        </div>

        {/* Plan Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {Object.values(PLANS).map((p) => {
            const isPopular = p.id === 'professional';

            return (
              <div
                key={p.id}
                className={`p-6 sm:p-8 rounded-3xl border transition-all flex flex-col justify-between space-y-6 ${
                  isPopular
                    ? 'bg-gradient-to-b from-purple-950 via-slate-900 to-slate-900 text-white border-2 border-purple-500 shadow-2xl shadow-purple-950/60 relative scale-105 z-10'
                    : 'bg-slate-900/90 text-slate-100 border-slate-800 shadow-lg hover:border-slate-700'
                }`}
              >
                {isPopular && (
                  <span className="absolute -top-3.5 right-6 bg-gradient-to-r from-amber-400 to-amber-500 text-purple-950 text-[10px] font-black uppercase px-4 py-1 rounded-full shadow-lg border border-amber-300">
                    MAIS POPULAR
                  </span>
                )}

                <div className="space-y-4">
                  <div>
                    <h3 className="font-black text-xl text-white">{p.name}</h3>
                    <p className="text-xs text-slate-400 mt-1 font-medium">{p.description}</p>
                  </div>

                  <div className="pt-2">
                    <span className="text-3xl sm:text-4xl font-black text-white">{p.priceMonthly}</span>
                    <span className="text-xs text-slate-400 font-medium"> / mês</span>
                  </div>

                  {/* Limits Summary */}
                  <div className={`p-4 rounded-2xl text-xs space-y-1.5 font-medium border ${
                    isPopular ? 'bg-purple-950/80 border-purple-800 text-purple-100' : 'bg-slate-950/80 border-slate-800 text-slate-300'
                  }`}>
                    <p className="flex items-center justify-between">
                      <span>Profissionais da Equipe:</span>
                      <strong className="text-white">
                        {p.limits.maxProfessionals === 999999 ? 'Ilimitados' : `Até ${p.limits.maxProfessionals}`}
                      </strong>
                    </p>
                    <p className="flex items-center justify-between">
                      <span>Base de Clientes:</span>
                      <strong className="text-white">
                        {p.limits.maxClients === 999999 ? 'Ilimitados' : `Até ${p.limits.maxClients}`}
                      </strong>
                    </p>
                    <p className="flex items-center justify-between">
                      <span>Agendamentos Mensais:</span>
                      <strong className="text-white">
                        {p.limits.maxMonthlyAppointments === 999999 ? 'Ilimitados' : `Até ${p.limits.maxMonthlyAppointments}`}
                      </strong>
                    </p>
                  </div>

                  {/* Feature Checklist */}
                  <ul className="space-y-3 pt-4 border-t border-slate-800 text-xs">
                    {p.features.map((feat) => (
                      <li key={feat} className="flex items-center space-x-2.5">
                        <Check className={`w-4 h-4 shrink-0 ${isPopular ? 'text-amber-400' : 'text-purple-400'}`} />
                        <span className="font-semibold text-slate-200">
                          {getFeatureLabel(feat)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => onOpenSignup(p.id as SaaSPlan)}
                  className={`w-full py-4 rounded-2xl font-black text-xs shadow-xl transition cursor-pointer flex items-center justify-center space-x-2 ${
                    isPopular
                      ? 'bg-amber-400 hover:bg-amber-300 text-purple-950 shadow-amber-500/20'
                      : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/30'
                  }`}
                >
                  <span>CRIAR CONTA GRÁTIS</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto py-16 border-t border-slate-900">
        <div className="text-center space-y-3 mb-12">
          <h2 className="text-2xl sm:text-3xl font-black text-white">Tudo que sua Barbearia Precisa em Um Só Lugar</h2>
          <p className="text-xs sm:text-sm text-slate-400 font-medium">
            Desenvolvido sob medida para barbeiros, cabeleireiros e donos de salões de beleza.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 bg-slate-900/60 rounded-3xl border border-slate-800 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-900/60 text-purple-300 flex items-center justify-center border border-purple-700/50">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-base text-white">Agendamento 24h</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Seus clientes agendam pelo link exclusivo a qualquer hora do dia sem precisar ligar ou mandar mensagem no WhatsApp.
            </p>
          </div>

          <div className="p-6 bg-slate-900/60 rounded-3xl border border-slate-800 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-900/60 text-purple-300 flex items-center justify-center border border-purple-700/50">
              <CreditCard className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-base text-white">Caixa & POS Frente de Loja</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Registre fechamentos de comandas, pagamentos em PIX, cartão ou dinheiro com emissão de comprovante.
            </p>
          </div>

          <div className="p-6 bg-slate-900/60 rounded-3xl border border-slate-800 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-900/60 text-purple-300 flex items-center justify-center border border-purple-700/50">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-base text-white">Comissões Automáticas</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Calcule comissões diferenciadas por barbeiro e serviço automaticamente ao fechar o comissionamento semanal ou mensal.
            </p>
          </div>

          <div className="p-6 bg-slate-900/60 rounded-3xl border border-slate-800 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-900/60 text-purple-300 flex items-center justify-center border border-purple-700/50">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-base text-white">Lembretes por WhatsApp</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Envie lembretes automáticos de agendamento para reduzir faltas dos clientes em até 80%.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto py-12 mb-12">
        <div className="text-center space-y-3 mb-8">
          <h2 className="text-2xl sm:text-3xl font-black text-white">Perguntas Frequentes (FAQ)</h2>
          <p className="text-xs text-slate-400">Tire suas dúvidas antes de começar</p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden transition"
              >
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full p-4 sm:p-5 text-left font-bold text-sm text-white flex items-center justify-between gap-3 hover:text-purple-300 transition"
                >
                  <span>{faq.q}</span>
                  {isOpen ? <ChevronUp className="w-5 h-5 text-purple-400 shrink-0" /> : <ChevronDown className="w-5 h-5 text-slate-500 shrink-0" />}
                </button>
                {isOpen && (
                  <div className="px-4 pb-5 sm:px-5 text-xs text-slate-300 leading-relaxed border-t border-slate-800/60 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Final CTA Banner */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto mb-20 text-center">
        <div className="bg-gradient-to-r from-purple-900 via-purple-950 to-indigo-950 p-8 sm:p-12 rounded-3xl border border-purple-700/80 shadow-2xl space-y-6">
          <h2 className="text-2xl sm:text-4xl font-black text-white">
            Pronto para Elevar o Nível da Sua Barbearia?
          </h2>
          <p className="text-xs sm:text-sm text-purple-200 max-w-xl mx-auto font-medium">
            Cadastre-se em menos de 2 minutos e aproveite 14 dias de acesso completo sem compromisso.
          </p>

          <div className="pt-2">
            <button
              onClick={() => onOpenSignup('professional')}
              className="px-8 py-4 bg-amber-400 hover:bg-amber-300 text-purple-950 text-sm font-black rounded-2xl shadow-xl transition inline-flex items-center space-x-2 cursor-pointer"
            >
              <Building2 className="w-5 h-5" />
              <span>CRIAR CONTA E COMEÇAR TESTE GRÁTIS</span>
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-8 text-center text-xs text-slate-500">
        <p>© 2026 StudioFlow SaaS — Todos os direitos reservados.</p>
        <p className="mt-1">Plataforma de Gestão Inteligente para Barbearias e Salões de Beleza.</p>
      </footer>
    </div>
  );
};
