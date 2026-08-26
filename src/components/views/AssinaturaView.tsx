import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Check,
  Sparkles,
  Zap,
  Award,
  Users,
  UserCheck,
  Calendar,
  Clock,
  Info,
  CheckCircle2,
  AlertCircle,
  Building2,
  Search,
  Plus,
  Edit3,
  ExternalLink,
  Phone,
  Mail,
  TrendingUp,
  X,
  CreditCard,
  DollarSign,
  Briefcase,
  Share2,
  Copy,
  Globe,
  QrCode as QrCodeIcon,
  Download,
  Trash2,
  AlertTriangle,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  CheckCircle,
  Database,
  Save,
  Upload,
  Shield,
  FileDown,
} from 'lucide-react';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import { Business, SaaSPlan, SubscriptionStatus, CompanySubscription, UsageStats, UserProfile } from '../../types';
import { SubscriptionService, PLANS } from '../../services/subscription';
import { StripeService, StripeConfigResponse } from '../../services/stripe';
import { DB } from '../../services/db';
import { isPlatformOwner } from '../../utils/auth';
import { getPublicPlansUrl } from '../../utils/url';

interface AssinaturaViewProps {
  business: Business;
  currentUser?: UserProfile | null;
  onRefreshBusiness?: () => void;
  onSelectBusiness?: (biz: Business) => void;
  onOpenPublicPlans?: () => void;
}

interface BusinessSubItem {
  business: Business;
  subscription: CompanySubscription;
  usage?: UsageStats;
}

export const AssinaturaView: React.FC<AssinaturaViewProps> = ({
  business,
  currentUser,
  onRefreshBusiness,
  onSelectBusiness,
  onOpenPublicPlans,
}) => {
  const isSaasAdmin = isPlatformOwner(currentUser, business);
  const canManageSubscription = currentUser?.role === 'OWNER' || currentUser?.role === 'ADMIN' || isSaasAdmin;
  const [viewMode, setViewMode] = useState<'my_plan' | 'saas_admin'>(() => {
    return isSaasAdmin ? 'saas_admin' : 'my_plan';
  });

  // Single business state
  const [subscription, setSubscription] = useState<CompanySubscription | null>(null);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingPlan, setUpdatingPlan] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // SaaS Admin state
  const [allSubscribed, setAllSubscribed] = useState<BusinessSubItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BusinessSubItem | null>(null);

  // Form states for Create Modal
  const [newBizName, setNewBizName] = useState('');
  const [newBizOwner, setNewBizOwner] = useState('');
  const [newBizEmail, setNewBizEmail] = useState('');
  const [newBizPhone, setNewBizPhone] = useState('');
  const [newBizPlan, setNewBizPlan] = useState<SaaSPlan>('professional');
  const [newBizStatus, setNewBizStatus] = useState<SubscriptionStatus>('ACTIVE');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states for Edit Modal
  const [editPlan, setEditPlan] = useState<SaaSPlan>('professional');
  const [editStatus, setEditStatus] = useState<SubscriptionStatus>('ACTIVE');

  // Delete Business Modal state
  const [deletingItem, setDeletingItem] = useState<BusinessSubItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Status Quick Update state
  const [updatingStatusBizId, setUpdatingStatusBizId] = useState<string | null>(null);

  // Public Plans Link & QR State
  const [plansPageCopied, setPlansPageCopied] = useState(false);
  const [plansPageQrUrl, setPlansPageQrUrl] = useState('');
  const [publicPlansUrl, setPublicPlansUrl] = useState('');

  // Stripe Integration States
  const [stripeConfig, setStripeConfig] = useState<StripeConfigResponse | null>(null);
  const [isStripeCheckingOut, setIsStripeCheckingOut] = useState(false);
  const [stripeCheckingOutPlanId, setStripeCheckingOutPlanId] = useState<string | null>(null);
  const [stripeLinkModal, setStripeLinkModal] = useState<{
    isOpen: boolean;
    url: string;
    bizName: string;
    planName: string;
    price: string;
  } | null>(null);
  const [isGeneratingStripeLink, setIsGeneratingStripeLink] = useState(false);
  const [stripeLinkCopied, setStripeLinkCopied] = useState(false);

  useEffect(() => {
    const url = getPublicPlansUrl();
    setPublicPlansUrl(url);
    QRCode.toDataURL(url, { width: 300, margin: 2 })
      .then((qrUrl) => setPlansPageQrUrl(qrUrl))
      .catch((err) => console.error('Erro ao gerar QR Code dos planos:', err));

    // Load Stripe Configuration
    StripeService.getConfigAsync().then((cfg) => {
      setStripeConfig(cfg);
    });

    // Check if returned from Stripe Checkout
    const searchParams = new URLSearchParams(window.location.search);
    const stripeSessionId = searchParams.get('stripe_session_id') || searchParams.get('session_id');
    const isStripeSuccess = searchParams.get('stripe_success') === 'true' || searchParams.get('success') === 'true';
    const returnPlanId = (searchParams.get('plan_id') as SaaSPlan) || 'professional';
    const returnBizId = searchParams.get('business_id') || business.id;

    if (stripeSessionId && isStripeSuccess) {
      handleStripeSuccessReturn(stripeSessionId, returnBizId, returnPlanId);
    }
  }, []);

  const handleStripeSuccessReturn = async (
    sessionId: string,
    bizId: string,
    planId: SaaSPlan
  ) => {
    try {
      setLoading(true);
      const verifyRes = await StripeService.verifySessionAsync(sessionId, bizId, planId);

      if (verifyRes.success) {
        // Activate subscription automatically
        await SubscriptionService.adminUpdateSubscriptionAsync(bizId, planId, 'ACTIVE');
        await SubscriptionService.adminUpdateSubscriptionStatusAsync(bizId, 'ACTIVE');

        // Confetti celebration
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
        });

        showToast(
          `🎉 Pagamento confirmado pelo Stripe! O plano ${PLANS[planId]?.name || 'Profissional'} foi ativado com sucesso!`
        );

        if (onRefreshBusiness) {
          onRefreshBusiness();
        }
      } else {
        alert('Não foi possível confirmar o pagamento da sessão Stripe. Verifique com o suporte.');
      }
    } catch (err) {
      console.error('Error handling Stripe success return:', err);
    } finally {
      // Clean query params from URL
      window.history.replaceState({}, document.title, window.location.pathname);
      loadData();
    }
  };

  const handleStripeCheckout = async (planId: SaaSPlan, targetBusiness = business) => {
    try {
      setIsStripeCheckingOut(true);
      setStripeCheckingOutPlanId(planId);

      const sessionRes = await StripeService.createCheckoutSessionAsync({
        planId,
        businessId: targetBusiness.id,
        businessName: targetBusiness.name,
        customerEmail: targetBusiness.email,
        successUrl: `${window.location.origin}/assinatura?stripe_session_id={CHECKOUT_SESSION_ID}&plan_id=${planId}&business_id=${targetBusiness.id}&stripe_success=true`,
        cancelUrl: `${window.location.origin}/assinatura?stripe_cancelled=true`,
      });

      if (sessionRes.url) {
        // Redirect directly to Stripe Checkout
        window.location.href = sessionRes.url;
      } else if (sessionRes.mockSession?.url) {
        // In dev / unconfigured mode: redirect or process directly
        window.location.href = sessionRes.mockSession.url;
      } else {
        alert(sessionRes.message || 'Erro ao iniciar sessão de pagamento no Stripe.');
      }
    } catch (err: any) {
      console.error('Error launching Stripe checkout:', err);
      alert(err.message || 'Erro ao conectar ao Stripe Checkout.');
    } finally {
      setIsStripeCheckingOut(false);
      setStripeCheckingOutPlanId(null);
    }
  };

  const handleGenerateStripeLinkForBusiness = async (bizItem: BusinessSubItem, planId: SaaSPlan) => {
    try {
      setIsGeneratingStripeLink(true);
      const planDef = PLANS[planId] || PLANS.professional;
      const sessionRes = await StripeService.createCheckoutSessionAsync({
        planId,
        businessId: bizItem.business.id,
        businessName: bizItem.business.name,
        customerEmail: bizItem.business.email,
        successUrl: `${window.location.origin}/assinatura?stripe_session_id={CHECKOUT_SESSION_ID}&plan_id=${planId}&business_id=${bizItem.business.id}&stripe_success=true`,
        cancelUrl: `${window.location.origin}/assinatura?stripe_cancelled=true`,
      });

      const finalUrl = sessionRes.url || sessionRes.mockSession?.url || '';
      if (finalUrl) {
        setStripeLinkModal({
          isOpen: true,
          url: finalUrl,
          bizName: bizItem.business.name,
          planName: planDef.name,
          price: planDef.priceMonthly,
        });
      } else {
        alert(sessionRes.message || 'Não foi possível gerar o link de cobrança do Stripe.');
      }
    } catch (err: any) {
      console.error('Error generating Stripe link:', err);
      alert(err.message || 'Erro ao gerar link de pagamento.');
    } finally {
      setIsGeneratingStripeLink(false);
    }
  };

  const handleCopyPlansLink = () => {
    navigator.clipboard.writeText(publicPlansUrl);
    setPlansPageCopied(true);
    setTimeout(() => setPlansPageCopied(false), 3000);
  };

  const handleSharePlansWhatsApp = () => {
    const text = `Olá! Conheça os planos e recursos do StudioFlow para automatizar sua barbearia: ${publicPlansUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleDownloadPlansQr = () => {
    if (!plansPageQrUrl) return;
    const link = document.createElement('a');
    link.href = plansPageQrUrl;
    link.download = `qrcode_planos_studioflow.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const sub = await SubscriptionService.getCurrentSubscriptionAsync(business.id);
      const usg = await SubscriptionService.getUsageAsync(business.id);
      setSubscription(sub);
      setUsage(usg);

      const allList = await SubscriptionService.getAllBusinessesSubscriptionsAsync();
      setAllSubscribed(allList);
    } catch (err) {
      console.error('Error loading subscription data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [business.id]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSelectPlan = async (planId: SaaSPlan) => {
    try {
      setUpdatingPlan(planId);
      const validation = await SubscriptionService.validatePlanChangeAsync(business.id, planId);
      
      if (!validation.allowed) {
        alert(validation.reason);
        setUpdatingPlan(null);
        return;
      }

      if (validation.warningMessage) {
        const confirmed = window.confirm(`${validation.warningMessage}\n\nDeseja confirmar a alteração do plano?`);
        if (!confirmed) {
          setUpdatingPlan(null);
          return;
        }
      }

      const updatedSub = await SubscriptionService.updateBusinessSubscriptionAsync(
        business.id,
        planId
      );
      setSubscription(updatedSub);
      const updatedUsage = await SubscriptionService.getUsageAsync(business.id);
      setUsage(updatedUsage);

      showToast(`Plano alterado para ${PLANS[planId].name} com sucesso!`);

      if (onRefreshBusiness) {
        onRefreshBusiness();
      }
      loadData();
    } catch (err: any) {
      console.error('Error updating plan:', err);
      alert(err.message || 'Ocorreu um erro ao atualizar o plano. Tente novamente.');
    } finally {
      setUpdatingPlan(null);
    }
  };

  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBizName.trim() || !newBizOwner.trim()) {
      alert('Por favor, preencha o nome da empresa e do responsável.');
      return;
    }

    try {
      setIsSubmitting(true);
      await SubscriptionService.adminCreateBusinessWithSubscriptionAsync(
        {
          name: newBizName,
          owner_name: newBizOwner,
          email: newBizEmail,
          phone: newBizPhone,
        },
        newBizPlan,
        newBizStatus
      );

      showToast(`Barbearia ${newBizName} cadastrada e ativada no plano ${PLANS[newBizPlan].name}!`);
      setIsCreateModalOpen(false);
      setNewBizName('');
      setNewBizOwner('');
      setNewBizEmail('');
      setNewBizPhone('');
      loadData();
    } catch (err) {
      console.error('Error creating business:', err);
      alert('Erro ao cadastrar barbearia.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEditSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      setIsSubmitting(true);

      const validation = await SubscriptionService.validatePlanChangeAsync(
        editingItem.business.id,
        editPlan,
        editStatus
      );

      if (!validation.allowed) {
        alert(validation.reason);
        setIsSubmitting(false);
        return;
      }

      if (validation.warningMessage) {
        const confirmed = window.confirm(`${validation.warningMessage}\n\nDeseja confirmar as alterações para a barbearia ${editingItem.business.name}?`);
        if (!confirmed) {
          setIsSubmitting(false);
          return;
        }
      }

      await SubscriptionService.adminUpdateSubscriptionAsync(
        editingItem.business.id,
        editPlan,
        editStatus
      );

      showToast(`Plano de ${editingItem.business.name} atualizado com sucesso!`);
      setEditingItem(null);
      if (onRefreshBusiness && editingItem.business.id === business.id) {
        onRefreshBusiness();
      }
      loadData();
    } catch (err: any) {
      console.error('Error updating subscription:', err);
      alert(err.message || 'Erro ao atualizar assinatura.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickStatusChange = async (
    bizItem: BusinessSubItem,
    newStatus: SubscriptionStatus
  ) => {
    try {
      setUpdatingStatusBizId(bizItem.business.id);
      await SubscriptionService.adminUpdateSubscriptionStatusAsync(
        bizItem.business.id,
        newStatus
      );

      const statusLabels: Record<SubscriptionStatus, string> = {
        ACTIVE: 'Ativa ✅',
        SUSPENDED: 'Suspensa ⏸️',
        TRIAL: 'Trial (Teste) ⏱️',
        PAST_DUE: 'Pendente de Pagamento ⚠️',
        EXPIRED: 'Expirada ❌',
        CANCELLED: 'Cancelada 🚫',
      };

      showToast(
        `Status de "${bizItem.business.name}" alterado para ${statusLabels[newStatus] || newStatus} com sucesso!`
      );

      if (onRefreshBusiness && bizItem.business.id === business.id) {
        onRefreshBusiness();
      }
      await loadData();
    } catch (err: any) {
      console.error('Error updating status:', err);
      alert(err.message || 'Erro ao atualizar status da assinatura.');
    } finally {
      setUpdatingStatusBizId(null);
    }
  };

  const handleConfirmDeleteBusiness = async () => {
    if (!deletingItem) return;
    const targetId = deletingItem.business.id;
    const targetName = deletingItem.business.name;

    try {
      setIsDeleting(true);
      await SubscriptionService.adminDeleteBusinessAsync(targetId);

      showToast(`Barbearia "${targetName}" e todos os seus dados foram excluídos permanentemente.`);
      setDeletingItem(null);

      const allList = await SubscriptionService.getAllBusinessesSubscriptionsAsync();
      setAllSubscribed(allList);

      // If the deleted business was the active one, switch to first available
      if (targetId === business.id && onSelectBusiness && allList.length > 0) {
        onSelectBusiness(allList[0].business);
      }

      if (onRefreshBusiness) {
        onRefreshBusiness();
      }
    } catch (err: any) {
      console.error('Error deleting business:', err);
      alert(err.message || 'Erro ao excluir barbearia.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportBackup = () => {
    try {
      const backupJson = DB.exportDatabaseBackup();
      const blob = new Blob([backupJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `studioflow_backup_assinantes_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('📦 Backup completo de dados e assinantes baixado com sucesso!');
    } catch (e: any) {
      alert(e.message || 'Erro ao exportar backup.');
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const result = DB.importDatabaseBackup(content);
        if (result.success) {
          showToast(`✅ ${result.message}`);
          await loadData();
          if (onRefreshBusiness) onRefreshBusiness();
        } else {
          alert(`Erro: ${result.message}`);
        }
      } catch (err: any) {
        alert(err.message || 'Falha ao ler arquivo de backup.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleForceSyncVault = async () => {
    try {
      DB.syncSubscribersToVault();
      DB.restoreSubscribersFromSnapshot();
      await loadData();
      showToast('🛡️ Cofre de persistência sincronizado e validado com sucesso!');
    } catch (e: any) {
      alert(e.message || 'Erro ao sincronizar cofre.');
    }
  };

  const currentPlanId: SaaSPlan = subscription?.plan_id || business.plan || 'professional';

  // SaaS Admin metrics
  const totalBusinesses = allSubscribed.length;
  const activeSubs = allSubscribed.filter(s => s.subscription.status === 'ACTIVE').length;
  const trialSubs = allSubscribed.filter(s => s.subscription.status === 'TRIAL').length;
  const totalMrr = allSubscribed.reduce((acc, curr) => {
    const p = PLANS[curr.subscription.plan_id || 'professional'];
    return acc + (p?.priceNumeric || 0);
  }, 0);

  // Filtered list
  const filteredSubscribed = allSubscribed.filter(item => {
    const matchesSearch =
      item.business.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.business.owner_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.business.email && item.business.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.business.phone && item.business.phone.includes(searchQuery));

    const matchesStatus =
      statusFilter === 'ALL' || item.subscription.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'TRIAL':
        return (
          <span className="bg-amber-100 text-amber-800 text-xs font-black uppercase px-2.5 py-1 rounded-full border border-amber-200 inline-flex items-center space-x-1">
            <Clock className="w-3 h-3 shrink-0" />
            <span>Trial (Teste)</span>
          </span>
        );
      case 'ACTIVE':
        return (
          <span className="bg-emerald-100 text-emerald-800 text-xs font-black uppercase px-2.5 py-1 rounded-full border border-emerald-200 inline-flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3 shrink-0" />
            <span>Ativa</span>
          </span>
        );
      case 'PAST_DUE':
        return (
          <span className="bg-amber-100 text-amber-900 text-xs font-black uppercase px-2.5 py-1 rounded-full border border-amber-300 inline-flex items-center space-x-1">
            <AlertCircle className="w-3 h-3 shrink-0" />
            <span>Pendente</span>
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="bg-rose-100 text-rose-800 text-xs font-black uppercase px-2.5 py-1 rounded-full border border-rose-200 inline-flex items-center space-x-1">
            <AlertCircle className="w-3 h-3 shrink-0" />
            <span>Expirada</span>
          </span>
        );
      case 'SUSPENDED':
        return (
          <span className="bg-gray-100 text-gray-800 text-xs font-black uppercase px-2.5 py-1 rounded-full border border-gray-300 inline-flex items-center space-x-1">
            <AlertCircle className="w-3 h-3 shrink-0" />
            <span>Suspensa</span>
          </span>
        );
      default:
        return (
          <span className="bg-emerald-100 text-emerald-800 text-xs font-black uppercase px-2.5 py-1 rounded-full border border-emerald-200 inline-flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3 shrink-0" />
            <span>Ativa</span>
          </span>
        );
    }
  };

  if (!canManageSubscription) {
    return (
      <div className="bg-white p-8 rounded-3xl border border-gray-200/80 shadow-xs max-w-2xl mx-auto space-y-6 text-center my-8">
        <div className="w-16 h-16 bg-purple-100 text-purple-700 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-gray-900">Gestão de Assinatura Centralizada</h2>
          <p className="text-xs text-gray-600 leading-relaxed max-w-md mx-auto">
            A gestão de licenças e planos do StudioFlow é gerenciada de forma centralizada pelo proprietário do estabelecimento. Para solicitar alterações no seu plano ou tirar dúvidas, entre em contato com nosso suporte comercial.
          </p>
        </div>
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs space-y-2 max-w-md mx-auto">
          <div className="flex items-center justify-between font-bold text-gray-800">
            <span>Estabelecimento:</span>
            <span className="text-purple-700">{business.name}</span>
          </div>
          <div className="flex items-center justify-between text-gray-600">
            <span>Plano Atual:</span>
            <span className="font-bold uppercase text-emerald-600">{business.plan || 'Professional'}</span>
          </div>
        </div>
        <a
          href="https://wa.me/5511988887777?text=Olá!%20Gostaria%20de%20solicitar%20alteração%20no%20plano%20da%20minha%20barbearia."
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3.5 rounded-2xl text-xs transition shadow-md"
        >
          <Phone className="w-4 h-4" />
          <span>Falar com o Suporte / Solicitar Upgrade</span>
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="bg-emerald-600 text-white p-4 rounded-2xl shadow-lg flex items-center justify-between text-xs font-bold animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-200" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-emerald-200 hover:text-white underline text-xs"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Top View Selector Tabs (Visible only for SUPER_ADMIN / SaaS Admin) */}
      {isSaasAdmin && (
        <div className="flex items-center justify-between bg-white p-2 rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setViewMode('saas_admin')}
              className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center space-x-2 transition cursor-pointer ${
                viewMode === 'saas_admin'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Barbearias Assinantes (SaaS Admin)</span>
              <span className="bg-purple-900/40 text-purple-100 text-[10px] px-2 py-0.5 rounded-full ml-1 font-black">
                {totalBusinesses}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('my_plan')}
              className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center space-x-2 transition cursor-pointer ${
                viewMode === 'my_plan'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Meu Plano & Limites</span>
            </button>
          </div>
        </div>
      )}

      {/* Banner de Isenção do Dono / Admin (Apenas Super Admin) */}
      {isSaasAdmin && (
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border border-emerald-500/50 p-4 sm:p-5 rounded-3xl text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-800/80 flex items-center justify-center border border-emerald-400/50 shrink-0">
              <Award className="w-6 h-6 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-black text-sm text-emerald-300 uppercase tracking-wider">Super Administrador SaaS</span>
                <span className="bg-emerald-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                  Isento de Assinatura
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                Como Super Administrador do StudioFlow, você possui acesso irrestrito para gerenciar todas as barbearias e licenças da plataforma.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Banner / Card para Divulgação da Página Pública de Assinaturas */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 p-6 rounded-3xl border border-purple-800/80 shadow-xl text-white space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Globe className="w-5 h-5 text-purple-400" />
              <h3 className="font-black text-base sm:text-lg">Página Pública de Vendas de Assinaturas (Frontpage)</h3>
            </div>
            <p className="text-xs text-purple-200">
              Utilize este link exclusivo e QR Code para divulgar a plataforma e convidar outras barbearias e salões a assinarem os planos SaaS.
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {onOpenPublicPlans && (
              <button
                type="button"
                onClick={onOpenPublicPlans}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-extrabold shadow-md transition flex items-center space-x-2 cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Testar Página Pública</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSharePlansWhatsApp}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold shadow-md transition flex items-center space-x-2 cursor-pointer"
            >
              <Phone className="w-4 h-4" />
              <span>Enviar no WhatsApp</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 items-center">
          <div className="md:col-span-2 space-y-2">
            <label className="text-[11px] font-bold text-purple-300 uppercase tracking-wider block">
              Link Exclusivo de Divulgação
            </label>
            <div className="p-3 bg-slate-950/90 rounded-2xl border border-purple-800/60 flex items-center justify-between text-xs">
              <span className="font-mono text-purple-200 font-bold truncate pr-2">{publicPlansUrl}</span>
              <button
                type="button"
                onClick={handleCopyPlansLink}
                className="px-3.5 py-2 bg-purple-700 hover:bg-purple-600 text-white font-extrabold rounded-xl text-xs shrink-0 flex items-center gap-1.5 transition cursor-pointer"
              >
                {plansPageCopied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{plansPageCopied ? 'Copiado!' : 'Copiar Link'}</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-950/80 p-3 rounded-2xl border border-purple-800/50 flex items-center space-x-3">
            {plansPageQrUrl && (
              <img src={plansPageQrUrl} alt="QR Code Planos" className="w-16 h-16 rounded-lg bg-white p-1 shrink-0 border border-purple-300" />
            )}
            <div className="space-y-1 min-w-0">
              <span className="text-xs font-bold text-white block">QR Code para Divulgação</span>
              <button
                type="button"
                onClick={handleDownloadPlansQr}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-purple-300 text-[10px] font-bold rounded-lg border border-slate-700 flex items-center space-x-1 cursor-pointer transition"
              >
                <Download className="w-3 h-3" />
                <span>Baixar Imagem PNG</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: SAAS ADMIN (ALL REGISTERED BARBER SHOPS & SUBSCRIPTIONS) */}
      {viewMode === 'saas_admin' && isSaasAdmin && (
        <div className="space-y-6">
          {/* SaaS Overview Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs space-y-1">
              <span className="text-gray-500 text-[11px] font-bold uppercase tracking-wider block">
                Total de Barbearias
              </span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-gray-900">{totalBusinesses}</span>
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[11px] text-gray-500 font-medium pt-1">
                Cadastradas na plataforma
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs space-y-1">
              <span className="text-gray-500 text-[11px] font-bold uppercase tracking-wider block">
                Assinaturas Ativas
              </span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-emerald-600">{activeSubs}</span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[11px] text-gray-500 font-medium pt-1">
                Planos pagos em dia
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs space-y-1">
              <span className="text-gray-500 text-[11px] font-bold uppercase tracking-wider block">
                Em Período de Teste
              </span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-amber-600">{trialSubs}</span>
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[11px] text-gray-500 font-medium pt-1">
                Avaliando o sistema (Trial)
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs space-y-1">
              <span className="text-gray-500 text-[11px] font-bold uppercase tracking-wider block">
                Receita Mensal (MRR)
              </span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-purple-950">
                  R$ {totalMrr.toFixed(2).replace('.', ',')}
                </span>
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[11px] text-gray-500 font-medium pt-1">
                Faturamento recorrente estim.
              </p>
            </div>
          </div>

          {/* Stripe Checkout & Recurring Billing Integration Card */}
          <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-950 p-6 rounded-3xl border border-purple-800/80 shadow-xl text-white space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center font-black text-xs">
                    <CreditCard className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-black text-base sm:text-lg flex items-center space-x-2">
                      <span>Processamento Automático Stripe Checkout</span>
                      {stripeConfig?.configured ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          🟢 Conectado ao Stripe
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          🟡 Modo Teste / Ativo
                        </span>
                      )}
                    </h3>
                  </div>
                </div>
                <p className="text-xs text-purple-200/90 leading-relaxed">
                  As assinaturas mensais são cobradas via Stripe Checkout com confirmação instantânea e liberação automática de recursos para o estabelecimento.
                </p>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <a
                  href="https://dashboard.stripe.com"
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-purple-200 hover:text-white rounded-xl text-xs font-extrabold border border-purple-700/60 transition flex items-center space-x-2"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Painel Stripe</span>
                </a>
              </div>
            </div>

            {/* Plan prices preview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-purple-800/40 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300">Plano Básico</span>
                  <span className="text-[10px] font-bold text-purple-400">Mensal</span>
                </div>
                <div className="text-lg font-black text-white">R$ 39,90<span className="text-xs font-normal text-slate-400">/mês</span></div>
                <p className="text-[10px] text-slate-400">Até 2 profissionais, 50 clientes</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-purple-950/60 border border-purple-600/60 space-y-1 relative">
                <span className="absolute -top-2 right-3 px-2 py-0.5 rounded-full bg-amber-400 text-purple-950 text-[9px] font-black uppercase">
                  Recomendado
                </span>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white">Plano Profissional</span>
                  <span className="text-[10px] font-bold text-amber-300">Mensal</span>
                </div>
                <div className="text-lg font-black text-amber-300">R$ 69,99<span className="text-xs font-normal text-slate-400">/mês</span></div>
                <p className="text-[10px] text-purple-200">Até 10 profissionais, 1.000 clientes, CRM</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-purple-800/40 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300">Plano Premium</span>
                  <span className="text-[10px] font-bold text-purple-400">Mensal</span>
                </div>
                <div className="text-lg font-black text-white">R$ 99,90<span className="text-xs font-normal text-slate-400">/mês</span></div>
                <p className="text-[10px] text-slate-400">Ilimitado + Anamnese + Suporte VIP</p>
              </div>
            </div>
          </div>

          {/* Card de Garantia de Persistência & Backup dos Assinantes */}
          <div className="bg-slate-900 border border-slate-700/80 p-5 sm:p-6 rounded-3xl text-white space-y-4 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-950 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-black text-sm sm:text-base text-white">
                      Cofre de Persistência & Backup dos Assinantes
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center space-x-1">
                      <Shield className="w-3 h-3" />
                      <span>Proteção Ativa 100%</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-300/90 mt-0.5">
                    Todos os cadastros e dados das barbearias assinantes estão salvos e blindados contra perdas em atualizações do sistema.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleForceSyncVault}
                  className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold border border-slate-700 transition flex items-center space-x-1.5 cursor-pointer"
                  title="Sincronizar e verificar integridade do cofre"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Sincronizar Cofre</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportBackup}
                  className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold shadow-sm transition flex items-center space-x-1.5 cursor-pointer"
                  title="Baixar cópia de segurança em formato JSON"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Baixar Backup (.JSON)</span>
                </button>

                <label className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-purple-300 hover:text-purple-200 rounded-xl text-xs font-bold border border-purple-800/60 transition flex items-center space-x-1.5 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Restaurar Backup</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportBackup}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Action Header & Search */}
          <div className="bg-white p-5 rounded-3xl border border-gray-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-gray-900">
                  Lista de Barbearias Assinantes
                </h3>
                <p className="text-xs text-gray-500">
                  Acompanhe e gerencie todos os estabelecimentos clientes do seu SaaS StudioFlow.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-3 bg-purple-700 hover:bg-purple-800 text-white rounded-2xl font-extrabold text-xs shadow-md transition flex items-center justify-center space-x-2 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>+ Cadastrar Nova Barbearia</span>
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  placeholder="Buscar por barbearia, dono, e-mail ou telefone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-500 outline-hidden"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-48 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:ring-2 focus:ring-purple-500 outline-hidden"
              >
                <option value="ALL">Todos os Status</option>
                <option value="ACTIVE">Apenas Ativas</option>
                <option value="TRIAL">Apenas Trial</option>
                <option value="PAST_DUE">Pendentes de Pagamento</option>
                <option value="SUSPENDED">Suspensas</option>
                <option value="EXPIRED">Expiradas</option>
              </select>
            </div>
          </div>

          {/* Subscribed Businesses Cards / List */}
          {filteredSubscribed.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-gray-200/80 shadow-xs text-center space-y-3">
              <Building2 className="w-12 h-12 text-gray-300 mx-auto" />
              <h4 className="text-sm font-bold text-gray-700">Nenhuma barbearia encontrada</h4>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                Tente ajustar a busca ou filtro de status acima para encontrar os cadastros.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSubscribed.map((item) => {
                const planDef = PLANS[item.subscription.plan_id || 'professional'];
                const isCurrentActive = item.business.id === business.id;

                return (
                  <div
                    key={item.business.id}
                    className={`bg-white p-6 rounded-3xl border transition shadow-xs space-y-4 flex flex-col justify-between ${
                      isCurrentActive
                        ? 'border-purple-300 ring-2 ring-purple-500/20 bg-purple-50/20'
                        : 'border-gray-200/80 hover:border-gray-300'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-extrabold text-base text-gray-900">
                              {item.business.name}
                            </h4>
                            {isCurrentActive && (
                              <span className="bg-purple-100 text-purple-800 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-purple-200">
                                Painel Aberto
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 font-medium mt-0.5">
                            Dono: <strong>{item.business.owner_name}</strong>
                          </p>
                        </div>

                        <div className="shrink-0">{getStatusBadge(item.subscription.status)}</div>
                      </div>

                      {/* Contact & Login Credentials Info */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600 bg-purple-50/50 p-3 rounded-2xl border border-purple-100/80">
                        <div className="flex items-center space-x-2">
                          <Phone className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                          <span className="font-medium truncate">{item.business.phone || 'Sem telefone'}</span>
                          {item.business.phone && (
                            <a
                              href={`https://wa.me/55${item.business.phone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-600 hover:underline font-bold text-[10px] shrink-0"
                            >
                              WhatsApp
                            </a>
                          )}
                        </div>

                        <div className="flex items-center space-x-2">
                          <Mail className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                          <span className="font-medium truncate">{item.business.email || 'admin@studioflow.app'}</span>
                        </div>

                        <div className="col-span-1 sm:col-span-2 pt-1 border-t border-purple-100 flex items-center justify-between text-[11px]">
                          <span className="text-gray-500 font-medium">
                            Senha de Acesso: <strong className="text-purple-900 font-black">123456</strong>
                          </span>
                          <span className="bg-purple-100/80 text-purple-900 font-extrabold px-2 py-0.5 rounded-md text-[10px]">
                            Painel Isolado 🔒
                          </span>
                        </div>
                      </div>

                      {/* Subscription Details & Usage */}
                      <div className="flex items-center justify-between text-xs pt-1">
                        <div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                            Plano Assinado
                          </span>
                          <span className="font-black text-purple-950 text-sm">
                            {planDef?.name || 'Profissional'}
                          </span>
                          <span className="text-[11px] text-gray-500 block font-medium">
                            {planDef?.priceMonthly}
                          </span>
                        </div>

                        {item.usage && (
                          <div className="text-right text-[11px] text-gray-600 space-y-0.5">
                            <p>
                              • Profissionais:{' '}
                              <strong>
                                {item.usage.professionalCount} /{' '}
                                {item.usage.limits.maxProfessionals === 999999 ? '∞' : item.usage.limits.maxProfessionals}
                              </strong>
                            </p>
                            <p>
                              • Clientes:{' '}
                              <strong>
                                {item.usage.clientCount} /{' '}
                                {item.usage.limits.maxClients === 999999 ? '∞' : item.usage.limits.maxClients}
                              </strong>
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Manual Status Controller (Active / Suspended) */}
                      <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200/90 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black uppercase text-gray-700 tracking-wider flex items-center space-x-1">
                            <span>Status da Assinatura</span>
                          </span>
                          {updatingStatusBizId === item.business.id && (
                            <span className="text-[10px] text-purple-700 font-bold flex items-center space-x-1 animate-pulse">
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              <span>Atualizando...</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {item.subscription.status === 'SUSPENDED' ? (
                            <button
                              type="button"
                              disabled={updatingStatusBizId === item.business.id}
                              onClick={() => handleQuickStatusChange(item, 'ACTIVE')}
                              className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs transition flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Reativar Barbearia (Ativa)</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={updatingStatusBizId === item.business.id}
                              onClick={() => handleQuickStatusChange(item, 'SUSPENDED')}
                              className="flex-1 py-2 px-3 bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-200 rounded-xl text-xs font-black transition flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                            >
                              <PauseCircle className="w-3.5 h-3.5 text-rose-700" />
                              <span>Suspender Assinatura</span>
                            </button>
                          )}

                          <select
                            disabled={updatingStatusBizId === item.business.id}
                            value={item.subscription.status || 'ACTIVE'}
                            onChange={(e) => handleQuickStatusChange(item, e.target.value as SubscriptionStatus)}
                            className="py-2 px-2.5 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-800 focus:ring-2 focus:ring-purple-500 outline-hidden shrink-0 cursor-pointer disabled:opacity-50"
                            aria-label="Mudar status manualmente"
                          >
                            <option value="ACTIVE">Ativa</option>
                            <option value="SUSPENDED">Suspensa</option>
                            <option value="TRIAL">Trial</option>
                            <option value="PAST_DUE">Pendente</option>
                            <option value="EXPIRED">Expirada</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={() => handleGenerateStripeLinkForBusiness(item, item.subscription.plan_id || 'professional')}
                        disabled={isGeneratingStripeLink}
                        className="py-2.5 px-3 bg-purple-50 hover:bg-purple-100 text-purple-950 border border-purple-200 rounded-xl text-xs font-black transition flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                        title="Gerar link de pagamento Stripe para esta barbearia"
                      >
                        <CreditCard className="w-3.5 h-3.5 text-purple-700" />
                        <span>Link Stripe</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingItem(item);
                          setEditPlan(item.subscription.plan_id || 'professional');
                          setEditStatus(item.subscription.status || 'ACTIVE');
                        }}
                        className="flex-1 py-2.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-extrabold transition flex items-center justify-center space-x-1.5 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-gray-600" />
                        <span>Editar Plano / Status</span>
                      </button>

                      {onSelectBusiness && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectBusiness(item.business);
                            showToast(`Painel alterado para a barbearia "${item.business.name}"`);
                          }}
                          className={`py-2.5 px-3 rounded-xl text-xs font-extrabold transition flex items-center justify-center space-x-1.5 cursor-pointer shrink-0 ${
                            isCurrentActive
                              ? 'bg-purple-100 text-purple-900 border border-purple-200'
                              : 'bg-purple-700 hover:bg-purple-800 text-white shadow-xs'
                          }`}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>{isCurrentActive ? 'Em Uso' : 'Acessar'}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setDeletingItem(item)}
                        className="py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 hover:border-rose-300 rounded-xl text-xs font-extrabold transition flex items-center justify-center space-x-1 cursor-pointer shrink-0"
                        title={`Excluir barbearia assinante "${item.business.name}"`}
                        aria-label={`Excluir barbearia assinante "${item.business.name}"`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Excluir</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW MODE 2: MY PLAN & RESOURCES */}
      {viewMode === 'my_plan' && (
        <div className="space-y-6">
          {/* Subscription Summary Card */}
          <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
              <div>
                <div className="flex items-center space-x-3 mb-1">
                  <h2 className="text-xl font-black text-gray-900">
                    Assinatura do Estabelecimento
                  </h2>
                  {getStatusBadge(subscription?.status)}
                </div>
                <p className="text-xs text-gray-500">
                  Gerencie seu plano comercial, acompanhe o consumo de recursos e o controle de pagamento do estabelecimento.
                </p>
              </div>

              <div className="bg-purple-50 border border-purple-100 p-3.5 rounded-2xl shrink-0 text-right">
                <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block">
                  Plano Atual & Valor
                </span>
                <span className="text-lg font-black text-purple-950 block">
                  {PLANS[currentPlanId]?.name || 'Profissional'}
                </span>
                <span className="text-xs font-extrabold text-purple-700">
                  {PLANS[currentPlanId]?.priceMonthly || 'R$ 89,90/mês'}
                </span>
              </div>
            </div>

            {/* Detailed Payment & Subscription Control Status Banner */}
            <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider block">
                    Controle de Pagamento & Mensalidade
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-black text-gray-900">
                      Valor da Assinatura: {PLANS[currentPlanId]?.priceMonthly || 'R$ 89,90/mês'}
                    </span>
                    <span className="text-gray-300">•</span>
                    <span className="text-xs font-bold text-gray-600">
                      Vencimento / Renovação: {subscription?.expires_at ? new Date(subscription.expires_at).toLocaleDateString('pt-BR') : 'Mensal Recorrente'}
                    </span>
                  </div>
                </div>

                {/* WhatsApp Support / Payment Action Button */}
                <a
                  href={`https://wa.me/5511999998888?text=${encodeURIComponent(
                    `Olá! Gostaria de consultar/regularizar a fatura da assinatura do StudioFlow para a minha barbearia "${business.name}" (Plano: ${PLANS[currentPlanId]?.name}, Status: ${subscription?.status || 'Ativo'}).`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold transition flex items-center justify-center space-x-2 shadow-xs shrink-0"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Suporte Financeiro / Pix</span>
                </a>
              </div>

              {/* Status Alert Messages */}
              {subscription?.status === 'PAST_DUE' && (
                <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl text-xs text-amber-900 flex items-start space-x-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-extrabold block">Assinatura com Pagamento Pendente / Atrasado</span>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      Sua mensalidade de <strong>{PLANS[currentPlanId]?.priceMonthly}</strong> está pendente. Para evitar a suspensão automática dos agendamentos, solicite a chave Pix ou suporte financeiro acima.
                    </p>
                  </div>
                </div>
              )}

              {subscription?.status === 'TRIAL' && (
                <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-xl text-xs text-blue-900 flex items-start space-x-2.5">
                  <Clock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-extrabold block">Período de Teste Grátis Ativo (Trial)</span>
                    <p className="text-[11px] text-blue-800 mt-0.5">
                      Sua barbearia está utilizando o período de teste gratuito com todos os recursos do plano <strong>{PLANS[currentPlanId]?.name}</strong> liberados.
                    </p>
                  </div>
                </div>
              )}

              {subscription?.status === 'ACTIVE' && (
                <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl text-xs text-emerald-900 flex items-start space-x-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-extrabold block">Assinatura Paga e Em Dia</span>
                    <p className="text-[11px] text-emerald-800 mt-0.5">
                      Sua assinatura está ativa e regularizada. Todos os recursos do plano {PLANS[currentPlanId]?.name} estão 100% disponíveis para seu estabelecimento.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Usage Gauges / Limits */}
            {usage && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-700 flex items-center space-x-1.5">
                      <UserCheck className="w-4 h-4 text-purple-600" />
                      <span>Profissionais</span>
                    </span>
                    <span className="font-black text-gray-900">
                      {usage.professionalCount} /{' '}
                      {usage.limits.maxProfessionals === 999999 ? '∞' : usage.limits.maxProfessionals}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        usage.professionalUsagePercent >= 90
                          ? 'bg-rose-500'
                          : usage.professionalUsagePercent >= 70
                          ? 'bg-amber-500'
                          : 'bg-purple-600'
                      }`}
                      style={{ width: `${usage.professionalUsagePercent}%` }}
                    />
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-700 flex items-center space-x-1.5">
                      <Users className="w-4 h-4 text-purple-600" />
                      <span>Clientes Cadastrados</span>
                    </span>
                    <span className="font-black text-gray-900">
                      {usage.clientCount} /{' '}
                      {usage.limits.maxClients === 999999 ? '∞' : usage.limits.maxClients}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        usage.clientUsagePercent >= 90
                          ? 'bg-rose-500'
                          : usage.clientUsagePercent >= 70
                          ? 'bg-amber-500'
                          : 'bg-purple-600'
                      }`}
                      style={{ width: `${usage.clientUsagePercent}%` }}
                    />
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-700 flex items-center space-x-1.5">
                      <Calendar className="w-4 h-4 text-purple-600" />
                      <span>Agendamentos no Mês</span>
                    </span>
                    <span className="font-black text-gray-900">
                      {usage.monthlyAppointmentCount} /{' '}
                      {usage.limits.maxMonthlyAppointments === 999999
                        ? '∞'
                        : usage.limits.maxMonthlyAppointments}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        usage.appointmentUsagePercent >= 90
                          ? 'bg-rose-500'
                          : usage.appointmentUsagePercent >= 70
                          ? 'bg-amber-500'
                          : 'bg-purple-600'
                      }`}
                      style={{ width: `${usage.appointmentUsagePercent}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Plans Comparison Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.values(PLANS).map((p) => {
              const isCurrent = currentPlanId === p.id;
              const isPopular = p.id === 'professional';

              return (
                <div
                  key={p.id}
                  className={`p-6 rounded-3xl border transition flex flex-col justify-between space-y-5 ${
                    isPopular
                      ? 'bg-gradient-to-b from-purple-950 to-indigo-950 text-white border-purple-700 shadow-xl relative'
                      : 'bg-white text-gray-900 border-gray-200 shadow-xs'
                  }`}
                >
                  {isPopular && (
                    <span className="absolute -top-3 right-6 bg-amber-400 text-purple-950 text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-xs">
                      Mais Recomendado
                    </span>
                  )}

                  <div className="space-y-4">
                    <div>
                      <h3 className="font-extrabold text-lg">{p.name}</h3>
                      <p
                        className={`text-xs mt-1 ${
                          isPopular ? 'text-purple-200' : 'text-gray-500'
                        }`}
                      >
                        {p.description}
                      </p>
                    </div>

                    <div className="pt-2">
                      <span className="text-3xl font-black">{p.priceMonthly}</span>
                    </div>

                    {/* Limits summary */}
                    <div
                      className={`p-3 rounded-2xl text-xs space-y-1 font-medium ${
                        isPopular
                          ? 'bg-purple-900/50 border border-purple-800/80 text-purple-100'
                          : 'bg-gray-50 border border-gray-100 text-gray-700'
                      }`}
                    >
                      <p>
                        • Profissionais:{' '}
                        <strong>
                          {p.limits.maxProfessionals === 999999
                            ? 'Ilimitados'
                            : `Até ${p.limits.maxProfessionals}`}
                        </strong>
                      </p>
                      <p>
                        • Clientes:{' '}
                        <strong>
                          {p.limits.maxClients === 999999
                            ? 'Ilimitados'
                            : `Até ${p.limits.maxClients}`}
                        </strong>
                      </p>
                      <p>
                        • Agendamentos/mês:{' '}
                        <strong>
                          {p.limits.maxMonthlyAppointments === 999999
                            ? 'Ilimitados'
                            : `Até ${p.limits.maxMonthlyAppointments}`}
                        </strong>
                      </p>
                    </div>

                    <ul className="space-y-2.5 pt-3 border-t border-gray-200/20 text-xs">
                      {p.features.map((feat) => (
                        <li key={feat} className="flex items-center space-x-2">
                          <Check
                            className={`w-4 h-4 shrink-0 ${
                              isPopular ? 'text-amber-300' : 'text-purple-700'
                            }`}
                          />
                          <span className="font-medium">{formatFeatureName(feat)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-2 pt-2">
                    {/* Primary Button: Stripe Checkout */}
                    <button
                      type="button"
                      onClick={() => handleStripeCheckout(p.id)}
                      disabled={isStripeCheckingOut}
                      className={`w-full py-3.5 rounded-2xl font-black text-xs shadow-md transition cursor-pointer flex items-center justify-center space-x-2 ${
                        isPopular
                          ? 'bg-amber-400 hover:bg-amber-300 text-purple-950 shadow-amber-500/20'
                          : 'bg-purple-700 hover:bg-purple-800 text-white shadow-purple-900/30'
                      } disabled:opacity-50`}
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>
                        {isStripeCheckingOut && stripeCheckingOutPlanId === p.id
                          ? 'CONECTANDO AO STRIPE...'
                          : isCurrent
                          ? 'RENOVAR / PAGAR NO STRIPE'
                          : 'ASSINAR COM STRIPE CHECKOUT'}
                      </span>
                    </button>

                    {/* Secondary Button: Manual Switch */}
                    {!isCurrent && (
                      <button
                        type="button"
                        onClick={() => handleSelectPlan(p.id)}
                        disabled={updatingPlan === p.id || isStripeCheckingOut}
                        className={`w-full py-2 rounded-xl font-bold text-[11px] transition cursor-pointer ${
                          isPopular
                            ? 'bg-purple-900/60 hover:bg-purple-900 text-purple-200 border border-purple-700/60'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        } disabled:opacity-50`}
                      >
                        {updatingPlan === p.id ? 'ALTERANDO...' : 'Trocar para este plano sem checkout'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL 1: CREATE NEW BARBER SHOP */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-black text-lg text-gray-900 flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-purple-600" />
                <span>Cadastrar Nova Barbearia</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBusiness} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-gray-700 mb-1">
                  Nome da Barbearia / Salão *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Barbearia Santos VIP"
                  value={newBizName}
                  onChange={(e) => setNewBizName(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-gray-700 mb-1">
                  Nome do Proprietário / Dono *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Santos"
                  value={newBizOwner}
                  onChange={(e) => setNewBizOwner(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-500 outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-gray-700 mb-1">
                    E-mail do Proprietário
                  </label>
                  <input
                    type="email"
                    placeholder="carlos@barbearia.com"
                    value={newBizEmail}
                    onChange={(e) => setNewBizEmail(e.target.value)}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-gray-700 mb-1">
                    WhatsApp Comercial
                  </label>
                  <input
                    type="tel"
                    placeholder="11999998888"
                    value={newBizPhone}
                    onChange={(e) => setNewBizPhone(e.target.value)}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-500 outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-gray-700 mb-1">
                    Plano Inicial
                  </label>
                  <select
                    value={newBizPlan}
                    onChange={(e) => setNewBizPlan(e.target.value as SaaSPlan)}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:ring-2 focus:ring-purple-500 outline-hidden"
                  >
                    <option value="basic">Básico (R$ 59,90)</option>
                    <option value="professional">Profissional (R$ 99,90)</option>
                    <option value="premium">Premium Studio (R$ 149,90)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-gray-700 mb-1">
                    Status da Assinatura
                  </label>
                  <select
                    value={newBizStatus}
                    onChange={(e) => setNewBizStatus(e.target.value as SubscriptionStatus)}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:ring-2 focus:ring-purple-500 outline-hidden"
                  >
                    <option value="ACTIVE">Ativa</option>
                    <option value="TRIAL">Trial (Período Teste)</option>
                    <option value="PAST_DUE">Pendente de Pagamento</option>
                    <option value="SUSPENDED">Suspensa</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-extrabold shadow-md transition cursor-pointer"
                >
                  {isSubmitting ? 'Cadastrando...' : 'Cadastrar Barbearia'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT SUBSCRIPTION FOR BARBER SHOP */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-black text-lg text-gray-900">
                  Alterar Plano & Status
                </h3>
                <p className="text-xs text-gray-500 font-medium">
                  {editingItem.business.name} ({editingItem.business.owner_name})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditSubscription} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-gray-700 mb-1">
                  Selecione o Plano SaaS
                </label>
                <div className="space-y-2">
                  {Object.values(PLANS).map((p) => (
                    <label
                      key={p.id}
                      className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition ${
                        editPlan === p.id
                          ? 'border-purple-600 bg-purple-50/50 ring-2 ring-purple-500/20'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <input
                          type="radio"
                          name="editPlan"
                          value={p.id}
                          checked={editPlan === p.id}
                          onChange={() => setEditPlan(p.id)}
                          className="text-purple-600 focus:ring-purple-500"
                        />
                        <div>
                          <span className="font-extrabold text-xs text-gray-900 block">{p.name}</span>
                          <span className="text-[11px] text-gray-500">{p.description}</span>
                        </div>
                      </div>
                      <span className="text-xs font-black text-purple-950 shrink-0">{p.priceMonthly}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-extrabold text-gray-700">
                    Status da Assinatura
                  </label>
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Controle Manual</span>
                </div>

                {/* Quick Presets for Admin */}
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setEditStatus('ACTIVE')}
                    className={`py-2 px-3 rounded-xl text-xs font-black transition flex items-center justify-center space-x-1.5 cursor-pointer border ${
                      editStatus === 'ACTIVE'
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                    }`}
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Definir como Ativa</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditStatus('SUSPENDED')}
                    className={`py-2 px-3 rounded-xl text-xs font-black transition flex items-center justify-center space-x-1.5 cursor-pointer border ${
                      editStatus === 'SUSPENDED'
                        ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                        : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200'
                    }`}
                  >
                    <PauseCircle className="w-3.5 h-3.5" />
                    <span>Suspender Acesso</span>
                  </button>
                </div>

                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as SubscriptionStatus)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:ring-2 focus:ring-purple-500 outline-hidden cursor-pointer"
                >
                  <option value="ACTIVE">✅ Ativa (Acesso Total / Mês Pago)</option>
                  <option value="SUSPENDED">⏸️ Suspensa (Acesso Bloqueado / Inadimplente)</option>
                  <option value="TRIAL">⏱️ Trial (Período de Testes)</option>
                  <option value="PAST_DUE">⚠️ Pendente de Pagamento</option>
                  <option value="EXPIRED">❌ Expirada (Prazo Finalizado)</option>
                </select>
              </div>

              <div className="p-3 bg-amber-50/90 rounded-2xl border border-amber-200 text-amber-950 space-y-1">
                <div className="flex items-center space-x-1.5 font-bold text-xs text-amber-900">
                  <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Validação de Mês Pago & Anti-Fraude</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-800">
                  Para alterar para um plano superior ou downgrade, o mês da assinatura precisa estar confirmado como pago (Ativa). Para migrações para um plano mais barato, os cadastros da barbearia devem respeitar os limites do novo plano.
                </p>
              </div>

              <div className="pt-3 flex items-center justify-between border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    const toDel = editingItem;
                    setEditingItem(null);
                    setDeletingItem(toDel);
                  }}
                  className="px-3 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition flex items-center space-x-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir Barbearia</span>
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-extrabold shadow-md transition cursor-pointer"
                  >
                    {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CONFIRM DELETE SUBSCRIBER BUSINESS */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 border border-rose-200 animate-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-rose-100 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-gray-900">
                    Excluir Barbearia Assinante
                  </h3>
                  <p className="text-xs text-rose-600 font-bold">
                    Ação permanente e irreversível
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3.5 bg-rose-50 rounded-2xl border border-rose-200 text-rose-950 space-y-2">
                <p className="font-bold text-gray-900">
                  Você está prestes a excluir o estabelecimento:
                </p>
                <div className="bg-white p-3 rounded-xl border border-rose-200 space-y-1">
                  <p className="font-black text-sm text-gray-900">
                    {deletingItem.business.name}
                  </p>
                  <p className="text-gray-600 font-medium">
                    Responsável: <strong>{deletingItem.business.owner_name}</strong>
                  </p>
                  <p className="text-gray-500">
                    Plano atual: <strong>{PLANS[deletingItem.subscription.plan_id || 'professional']?.name}</strong> • {deletingItem.business.email || 'Sem e-mail'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <span className="font-extrabold text-gray-800 block text-xs">
                  Os seguintes dados desta barbearia serão excluídos:
                </span>
                <ul className="space-y-1.5 text-[11px] text-gray-600 pl-1">
                  <li className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                    <span>Todos os <strong>clientes cadastrados</strong> e histórico de cortes</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                    <span>Agenda completa, horários e <strong>agendamentos online</strong></span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                    <span>Profissionais cadastrados, comissões e serviços</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                    <span>Fluxo de caixa, vendas registradas e financeiro</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                    <span>Cartões de fidelidade, fichas de anamnese e fotos da galeria</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                    <span>A assinatura SaaS e permissões de acesso do estabelecimento</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end space-x-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                disabled={isDeleting}
                className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmDeleteBusiness}
                disabled={isDeleting}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Excluindo...' : 'Sim, Excluir Barbearia'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: STRIPE CHECKOUT LINK GENERATOR MODAL */}
      {stripeLinkModal && stripeLinkModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 border border-purple-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-700 text-white flex items-center justify-center font-bold">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-gray-900">
                    Link do Stripe Checkout
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">
                    {stripeLinkModal.bizName} • {stripeLinkModal.planName} ({stripeLinkModal.price})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStripeLinkModal(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-purple-50 rounded-2xl border border-purple-200 text-purple-950 space-y-2">
                <div className="flex items-center justify-between text-xs font-black">
                  <span>Plano Selecionado</span>
                  <span className="text-purple-800 bg-white px-2.5 py-0.5 rounded-full border border-purple-200">
                    {stripeLinkModal.price}
                  </span>
                </div>
                <p className="text-xs text-purple-900 leading-relaxed">
                  Envie este link direto para o proprietário da barbearia efetuar o pagamento da assinatura mensal via Stripe Checkout. Assim que o pagamento for concluído, a assinatura é ativada automaticamente no sistema.
                </p>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-gray-700 mb-1">
                  Link de Checkout Direto
                </label>
                <div className="p-3 bg-gray-50 rounded-2xl border border-gray-300 flex items-center justify-between text-xs">
                  <span className="font-mono text-gray-700 truncate pr-2 select-all">
                    {stripeLinkModal.url}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(stripeLinkModal.url);
                      setStripeLinkCopied(true);
                      setTimeout(() => setStripeLinkCopied(false), 3000);
                    }}
                    className="px-3.5 py-2 bg-purple-700 hover:bg-purple-800 text-white font-extrabold rounded-xl text-xs shrink-0 flex items-center gap-1.5 transition cursor-pointer"
                  >
                    {stripeLinkCopied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{stripeLinkCopied ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  const text = `Olá! Segue o link seguro para ativar a assinatura do plano ${stripeLinkModal.planName} (${stripeLinkModal.price}) da barbearia ${stripeLinkModal.bizName} no StudioFlow:\n\n${stripeLinkModal.url}`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                }}
                className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs transition flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Enviar no WhatsApp</span>
              </button>

              <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setStripeLinkModal(null)}
                  className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={() => window.open(stripeLinkModal.url, '_blank')}
                  className="px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-black shadow-md transition flex items-center space-x-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir Checkout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function formatFeatureName(feat: string): string {
  switch (feat) {
    case 'AGENDA':
      return 'Agenda Inteligente & Grade de Horários';
    case 'AGENDAMENTO_ONLINE':
      return 'Agendamento Online 24/7 com QR Code';
    case 'CLIENTES':
      return 'Gestão Completa de Clientes';
    case 'PROFISSIONAIS':
      return 'Gestão de Equipe & Escala';
    case 'SERVICOS':
      return 'Catálogo de Serviços & Preços';
    case 'CAIXA':
      return 'Caixa & Frente de Loja (POS)';
    case 'VENDAS':
      return 'Gestão de Vendas & Comprovantes';
    case 'COMISSOES':
      return 'Cálculo Automático de Comissões';
    case 'FINANCEIRO':
      return 'Controle Financeiro & DRE';
    case 'FIDELIDADE':
      return 'Programa de Fidelidade Digital';
    case 'CRM':
      return 'CRM & Oportunidades Automáticas';
    case 'MARKETING':
      return 'Campanhas de Marketing & WhatsApp';
    case 'AUTOMACOES_CRM':
      return 'Automações Avançadas de CRM';
    case 'RELATORIOS':
      return 'Relatórios de Desempenho';
    case 'GALERIA':
      return 'Galeria de Trabalhos do Estúdio';
    case 'ANAMNESE':
      return 'Ficha de Anamnese Técnica VIP';
    case 'PWA':
      return 'Aplicativo PWA Mobile';
    default:
      return feat;
  }
}
