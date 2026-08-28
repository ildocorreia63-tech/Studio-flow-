import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { MobileNav } from './components/MobileNav';
import { NewAppointmentModal } from './components/modals/NewAppointmentModal';
import { AuthModal } from './components/AuthModal';
import { OnboardingModal } from './components/OnboardingModal';
import { PublicBooking } from './components/PublicBooking';
import { PublicSubscriptionLanding } from './components/PublicSubscriptionLanding';

// Import Views
import { DashboardView } from './components/views/DashboardView';
import { AgendaView } from './components/views/AgendaView';
import { ClientesView } from './components/views/ClientesView';
import { ProfissionaisView } from './components/views/ProfissionaisView';
import { ServicosView } from './components/views/ServicosView';
import { VendasView } from './components/views/VendasView';
import { CaixaView } from './components/views/CaixaView';
import { FinanceiroView } from './components/views/FinanceiroView';
import { ComissoesView } from './components/views/ComissoesView';
import { FidelidadeView } from './components/views/FidelidadeView';
import { RelatoriosView } from './components/views/RelatoriosView';
import { GaleriaView } from './components/views/GaleriaView';
import { AnamneseView } from './components/views/AnamneseView';
import { AgendamentoOnlineView } from './components/views/AgendamentoOnlineView';
import { WhatsAppView } from './components/views/WhatsAppView';
import { MarketingView } from './components/views/MarketingView';
import { AssinaturaView } from './components/views/AssinaturaView';
import { ConfiguracoesView } from './components/views/ConfiguracoesView';

// Subscription & Feature Gating
import { SubscriptionAlertBanner } from './components/subscription/SubscriptionAlertBanner';
import { FeatureGuard } from './components/subscription/FeatureGuard';
import { SubscriptionService } from './services/subscription';

// PWA Components & Services
import { AppUpdateBanner } from './components/pwa/AppUpdateBanner';
import { OfflineNetworkBanner } from './components/pwa/OfflineNetworkBanner';
import { PwaInstallBanner } from './components/pwa/PwaInstallBanner';
import { PwaService } from './services/pwaService';

import { DB } from './services/db';
import { supabase, isSupabaseConfigured } from './services/supabase';
import { Business, UserProfile, NavigationTab, CompanySubscription, UsageStats, SaaSPlan } from './types';
import { isPlatformOwner } from './utils/auth';

export function App() {
  // Helper to parse current URL route for public booking and public plans pages
  const parseRoute = () => {
    if (typeof window === 'undefined') {
      return { isPlans: false, isBooking: false, bookingSlug: '' };
    }
    const path = window.location.pathname.toLowerCase();
    const search = window.location.search.toLowerCase();
    const hash = window.location.hash.toLowerCase();

    const isPlans =
      path === '/planos' ||
      path.startsWith('/planos/') ||
      path === '/assinar' ||
      path.startsWith('/assinar/') ||
      path === '/precos' ||
      path.startsWith('/precos/') ||
      search.includes('planos=true') ||
      search.includes('page=planos') ||
      search.includes('tab=planos') ||
      hash.startsWith('#/planos') ||
      hash.startsWith('#/assinar');

    let isBooking = false;
    let bookingSlug = '';

    if (path.startsWith('/agendar')) {
      const rawSlug = window.location.pathname.replace(/^\/agendar\/?/, '').trim();
      const cleanSlug = rawSlug.split('/')[0].split('?')[0].trim();
      if (cleanSlug) {
        isBooking = true;
        bookingSlug = cleanSlug;
      }
    } else if (search.includes('agendar=')) {
      const params = new URLSearchParams(window.location.search);
      const agendarVal = params.get('agendar')?.trim();
      if (agendarVal && agendarVal !== 'false') {
        isBooking = true;
        bookingSlug = agendarVal;
      }
    } else if (hash.startsWith('#/agendar')) {
      const rawSlug = window.location.hash.replace(/^#\/agendar\/?/, '').trim();
      const cleanSlug = rawSlug.split('/')[0].split('?')[0].trim();
      if (cleanSlug) {
        isBooking = true;
        bookingSlug = cleanSlug;
      }
    }

    return { isPlans, isBooking, bookingSlug };
  };

  const initialRoute = parseRoute();
  
  // Detection for returning users vs new visitors:
  const isLoggedOutSaved = typeof window !== 'undefined' && localStorage.getItem('sf_logged_out') === 'true';
  const hasAccountSaved = typeof window !== 'undefined' && localStorage.getItem('sf_has_account') === 'true';
  const hasSessionSaved = typeof window !== 'undefined' && Boolean(localStorage.getItem('sf_session_user_id'));

  const [isPublicMode, setIsPublicMode] = useState(initialRoute.isBooking);
  const [isPublicPlansMode, setIsPublicPlansMode] = useState(initialRoute.isPlans);
  const [slugFromPath, setSlugFromPath] = useState(initialRoute.bookingSlug);

  // App Auth & Business state
  const [currentBusiness, setCurrentBusiness] = useState<Business | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // User Theme Preference state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme_preference') as 'light' | 'dark' | null;
      if (saved === 'dark' || saved === 'light') return saved;
    }
    return 'light';
  });

  // Synchronize theme with currentUser profile when loaded
  useEffect(() => {
    if (currentUser?.theme_preference) {
      setTheme(currentUser.theme_preference);
    }
  }, [currentUser?.id, currentUser?.theme_preference]);

  // Apply theme to document DOM and localStorage
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme_preference', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme_preference', 'light');
      }
    }
  }, [theme]);

  const handleUpdateTheme = async (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    if (currentUser) {
      setCurrentUser((prev) => (prev ? { ...prev, theme_preference: newTheme } : prev));
      try {
        await DB.updateUserProfileTheme(currentUser.id, newTheme);
      } catch (err) {
        console.error('Error saving user theme preference:', err);
      }
    }
  };

  const handleToggleTheme = () => {
    const nextTheme: 'light' | 'dark' = theme === 'dark' ? 'light' : 'dark';
    handleUpdateTheme(nextTheme);
  };

  // Subscription state
  const [subscription, setSubscription] = useState<CompanySubscription | null>(null);
  const [usage, setUsage] = useState<UsageStats | null>(null);

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');

  // Modals state
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false);
  const [selectedPlanForOnboarding, setSelectedPlanForOnboarding] = useState<SaaSPlan>('professional');

  // PWA & SW state
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [canInstallPwa, setCanInstallPwa] = useState<boolean>(false);
  const [showInstallBanner, setShowInstallBanner] = useState<boolean>(true);

  // Listen for browser Back/Forward and URL changes
  useEffect(() => {
    const handleUrlChange = () => {
      const route = parseRoute();
      setIsPublicPlansMode(route.isPlans);
      setIsPublicMode(route.isBooking);
      setSlugFromPath(route.bookingSlug);
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  useEffect(() => {
    PwaService.registerServiceWorker((reg) => {
      setSwRegistration(reg);
    });

    PwaService.initInstallListener((canInstall) => {
      setCanInstallPwa(canInstall);
    });
  }, []);


  const loadSubscriptionInfo = async (bizId: string) => {
    try {
      const sub = await SubscriptionService.getCurrentSubscriptionAsync(bizId);
      const usg = await SubscriptionService.getUsageAsync(bizId);
      setSubscription(sub);
      setUsage(usg);
    } catch (err) {
      console.error('Error loading subscription info:', err);
    }
  };

  const handleLoginSuccess = (user: UserProfile, biz: Business) => {
    setCurrentUser(user);
    setCurrentBusiness(biz);
    localStorage.setItem('sf_session_user_id', user.id);
    localStorage.setItem('sf_session_biz_id', biz.id);
    localStorage.setItem('sf_has_account', 'true');
    localStorage.removeItem('sf_logged_out');
    setIsAuthOpen(false);
    setIsPublicPlansMode(false);
    loadSubscriptionInfo(biz.id);
    if (isPlatformOwner(user, biz)) {
      setActiveTab('assinatura');
    } else {
      setActiveTab('dashboard');
    }
    window.history.pushState({}, '', '/');
  };

  const handleLogout = async () => {
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error('Error signing out Supabase:', err);
      }
    }
    localStorage.removeItem('sf_session_user_id');
    localStorage.removeItem('sf_session_biz_id');
    localStorage.setItem('sf_logged_out', 'true');
    localStorage.setItem('sf_has_account', 'true');
    setCurrentUser(null);
    setCurrentBusiness(null);
    setIsPublicPlansMode(false);
    setIsAuthOpen(true);
    window.history.pushState({}, '', '/');
  };

  useEffect(() => {
    async function loadInitialSession() {
      // If user came via /agendar booking route, stay in booking mode
      if (initialRoute.isBooking) return;

      const isLoggedOut = localStorage.getItem('sf_logged_out') === 'true';
      const hasAccount = localStorage.getItem('sf_has_account') === 'true';
      const savedUserId = localStorage.getItem('sf_session_user_id');
      const savedBizId = localStorage.getItem('sf_session_biz_id');

      // 1. If Supabase configured and user was not logged out, attempt Supabase session restore
      if (isSupabaseConfigured && !isLoggedOut) {
        try {
          const { data } = await supabase.auth.getSession();
          if (data?.session?.user) {
            const userId = data.session.user.id;
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('id', userId)
              .single();

            if (profile && profile.business_id) {
              const { data: biz } = await supabase
                .from('businesses')
                .select('*')
                .eq('id', profile.business_id)
                .single();

              if (biz) {
                setCurrentUser(profile);
                setCurrentBusiness(biz);
                localStorage.setItem('sf_session_user_id', profile.id);
                localStorage.setItem('sf_session_biz_id', biz.id);
                localStorage.setItem('sf_has_account', 'true');
                localStorage.removeItem('sf_logged_out');
                setIsPublicPlansMode(false);
                loadSubscriptionInfo(biz.id);
                return;
              }
            }
          }
        } catch (err) {
          console.error('[Supabase Auth Session restore error]:', err);
        }
      }

      // 2. Local DB session restoration: if user has saved session and did NOT log out
      if (savedUserId && savedBizId && !isLoggedOut) {
        const businesses = DB.getBusinesses();
        const targetBiz = businesses.find((b) => b.id === savedBizId) || businesses[0];
        if (targetBiz) {
          const profiles = DB.getProfiles(targetBiz.id);
          const targetProfile = profiles.find((p) => p.id === savedUserId) || profiles[0];
          if (targetProfile) {
            setCurrentUser(targetProfile);
            setCurrentBusiness(targetBiz);
            setIsPublicPlansMode(false);
            loadSubscriptionInfo(targetBiz.id);
            return;
          }
        }
      }

      // 3. If user explicitly logged out or has registered account history on this browser -> Show Login screen
      if (isLoggedOut || hasAccount) {
        setCurrentUser(null);
        setCurrentBusiness(null);
        setIsPublicPlansMode(false);
        setIsAuthOpen(true);
        return;
      }

      // 4. If not logged in and not on plans route -> Open Subscriber Login Modal directly
      if (initialRoute.isPlans) {
        setIsPublicPlansMode(true);
        setIsAuthOpen(false);
      } else {
        setIsPublicPlansMode(false);
        setIsAuthOpen(true);
      }
    }

    loadInitialSession();
  }, []);

  useEffect(() => {
    if (currentBusiness?.id) {
      loadSubscriptionInfo(currentBusiness.id);
      PwaService.updateDynamicAppManifest(currentBusiness);
    }
  }, [activeTab, currentBusiness]);

  const isSaasOwner = isPlatformOwner(currentUser, currentBusiness);
  const canAccessAssinatura = isSaasOwner || currentUser?.role === 'OWNER' || currentUser?.role === 'ADMIN';

  useEffect(() => {
    if (activeTab === 'assinatura' && currentUser && currentBusiness && !canAccessAssinatura) {
      setActiveTab('dashboard');
    }
  }, [activeTab, currentUser, currentBusiness, canAccessAssinatura]);

  const handleNavigateToAssinatura = () => {
    if (canAccessAssinatura) {
      setActiveTab('assinatura');
    } else {
      window.open('https://wa.me/5511988887777?text=Olá!%20Gostaria%20de%20solicitar%20alteração%20no%20plano%20da%20minha%20barbearia.', '_blank');
    }
  };

  if (isPublicMode) {
    return (
      <PublicBooking
        businessSlug={slugFromPath || currentBusiness?.slug || 'studioflow-demo'}
        onBackToApp={() => {
          window.history.pushState({}, '', '/');
          setIsPublicMode(false);
          setIsPublicPlansMode(false);
        }}
      />
    );
  }

  if (isPublicPlansMode) {
    const isSuperAdmin = isPlatformOwner(currentUser, currentBusiness);
    return (
      <>
        <PublicSubscriptionLanding
          onOpenSignup={(plan?: SaaSPlan) => {
            if (plan) setSelectedPlanForOnboarding(plan);
            setIsOnboardingOpen(true);
          }}
          onOpenLogin={() => {
            setIsAuthOpen(true);
          }}
          onBackToApp={
            currentBusiness && currentUser
              ? () => {
                  window.history.pushState({}, '', '/');
                  setIsPublicPlansMode(false);
                  if (isSuperAdmin) {
                    setActiveTab('assinatura');
                  } else {
                    setActiveTab('dashboard');
                  }
                }
              : undefined
          }
          isLoggedIn={!!(currentBusiness && currentUser)}
          isSuperAdmin={isSuperAdmin}
        />

        <AuthModal
          isOpen={isAuthOpen}
          onLoginSuccess={handleLoginSuccess}
          onOpenSignup={() => {
            setIsAuthOpen(false);
            setIsOnboardingOpen(true);
          }}
          onViewLandingPage={() => {
            setIsAuthOpen(false);
            setIsPublicPlansMode(true);
          }}
          onClose={() => setIsAuthOpen(false)}
        />

        <OnboardingModal
          isOpen={isOnboardingOpen}
          initialPlan={selectedPlanForOnboarding}
          onComplete={(createdBiz, createdOwner) => {
            handleLoginSuccess(createdOwner, createdBiz);
            setIsOnboardingOpen(false);
          }}
          onClose={() => setIsOnboardingOpen(false)}
        />
      </>
    );
  }

  if (!currentBusiness || !currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <AuthModal
          isOpen={true}
          onLoginSuccess={handleLoginSuccess}
          onOpenSignup={() => setIsOnboardingOpen(true)}
          onViewLandingPage={() => {
            setIsPublicPlansMode(true);
            window.history.pushState({}, '', '/planos');
          }}
        />

        <OnboardingModal
          isOpen={isOnboardingOpen}
          initialPlan={selectedPlanForOnboarding}
          onComplete={(createdBiz, createdOwner) => {
            handleLoginSuccess(createdOwner, createdBiz);
            setIsOnboardingOpen(false);
          }}
          onClose={() => setIsOnboardingOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col md:flex-row text-slate-900 dark:text-slate-100 font-sans transition-colors">
      {/* Desktop Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentBusiness={currentBusiness}
        userRole={currentUser.role}
        currentUser={currentUser}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenNewAppointment={() => setIsNewAppointmentOpen(true)}
        onOpenBusinessSwitcher={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64 pb-20 lg:pb-0 overflow-x-hidden">
        {/* Top Header */}
        <Header
          currentBusiness={currentBusiness}
          currentUser={currentUser}
          activeTab={activeTab}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onOpenNewAppointment={() => setIsNewAppointmentOpen(true)}
          onOpenPublicBooking={() => {
            window.history.pushState({}, '', `/agendar/${currentBusiness.slug}`);
            setSlugFromPath(currentBusiness.slug);
            setIsPublicPlansMode(false);
            setIsPublicMode(true);
          }}
          onNavigateToTab={setActiveTab}
          onLogout={handleLogout}
        />

        {/* View Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {/* Network Offline Alert */}
          <OfflineNetworkBanner />

          {/* PWA Install Banner */}
          {showInstallBanner && canInstallPwa && (
            <PwaInstallBanner
              canInstall={canInstallPwa}
              business={currentBusiness}
              onDismiss={() => setShowInstallBanner(false)}
            />
          )}

          {/* App Version Update Banner */}
          {swRegistration && (
            <AppUpdateBanner
              registration={swRegistration}
              onApplyUpdate={(reg) => PwaService.applyUpdate(reg)}
              onDismiss={() => setSwRegistration(null)}
            />
          )}

          {/* Subscription Alert Banner */}
          <SubscriptionAlertBanner
            subscription={subscription}
            usage={usage}
            onNavigateToAssinatura={handleNavigateToAssinatura}
          />


          {activeTab === 'dashboard' && (
            <DashboardView
              business={currentBusiness}
              onOpenNewAppointment={() => setIsNewAppointmentOpen(true)}
              onNavigateToTab={setActiveTab}
            />
          )}

          {activeTab === 'agenda' && (
            <AgendaView
              business={currentBusiness}
              onOpenNewAppointment={() => setIsNewAppointmentOpen(true)}
            />
          )}

          {activeTab === 'clientes' && (
            <ClientesView
              business={currentBusiness}
              onOpenNewAppointment={() => setIsNewAppointmentOpen(true)}
            />
          )}

          {activeTab === 'profissionais' && (
            <ProfissionaisView business={currentBusiness} />
          )}

          {activeTab === 'servicos' && (
            <ServicosView business={currentBusiness} />
          )}

          {activeTab === 'vendas' && (
            <FeatureGuard
              businessId={currentBusiness.id}
              feature="VENDAS"
              featureTitle="Módulo de Vendas & Comprovantes"
              requiredPlan="professional"
              onNavigateToAssinatura={handleNavigateToAssinatura}
            >
              <VendasView business={currentBusiness} />
            </FeatureGuard>
          )}

          {activeTab === 'caixa' && (
            <FeatureGuard
              businessId={currentBusiness.id}
              feature="CAIXA"
              featureTitle="Caixa & Frente de Loja (POS)"
              requiredPlan="professional"
              onNavigateToAssinatura={handleNavigateToAssinatura}
            >
              <CaixaView business={currentBusiness} />
            </FeatureGuard>
          )}

          {activeTab === 'financeiro' && (
            <FeatureGuard
              businessId={currentBusiness.id}
              feature="FINANCEIRO"
              featureTitle="Controle Financeiro & DRE"
              requiredPlan="professional"
              onNavigateToAssinatura={handleNavigateToAssinatura}
            >
              <FinanceiroView business={currentBusiness} />
            </FeatureGuard>
          )}

          {activeTab === 'comissoes' && (
            <FeatureGuard
              businessId={currentBusiness.id}
              feature="COMISSOES"
              featureTitle="Cálculo Automático de Comissões"
              requiredPlan="professional"
              onNavigateToAssinatura={handleNavigateToAssinatura}
            >
              <ComissoesView business={currentBusiness} />
            </FeatureGuard>
          )}

          {activeTab === 'fidelidade' && (
            <FeatureGuard
              businessId={currentBusiness.id}
              feature="FIDELIDADE"
              featureTitle="Programa de Fidelidade Digital"
              requiredPlan="professional"
              onNavigateToAssinatura={handleNavigateToAssinatura}
            >
              <FidelidadeView business={currentBusiness} />
            </FeatureGuard>
          )}

          {activeTab === 'relatorios' && (
            <FeatureGuard
              businessId={currentBusiness.id}
              feature="RELATORIOS"
              featureTitle="Relatórios Gerenciais Avançados"
              requiredPlan="professional"
              onNavigateToAssinatura={handleNavigateToAssinatura}
            >
              <RelatoriosView business={currentBusiness} />
            </FeatureGuard>
          )}

          {activeTab === 'galeria' && (
            <FeatureGuard
              businessId={currentBusiness.id}
              feature="GALERIA"
              featureTitle="Galeria do Estúdio"
              requiredPlan="professional"
              onNavigateToAssinatura={handleNavigateToAssinatura}
            >
              <GaleriaView business={currentBusiness} />
            </FeatureGuard>
          )}

          {activeTab === 'anamnese' && (
            <FeatureGuard
              businessId={currentBusiness.id}
              feature="ANAMNESE"
              featureTitle="Ficha de Anamnese Técnica VIP"
              requiredPlan="premium"
              onNavigateToAssinatura={handleNavigateToAssinatura}
            >
              <AnamneseView business={currentBusiness} />
            </FeatureGuard>
          )}

          {(activeTab === 'agendamento_online' || (activeTab as string) === 'agendamento-online') && (
            <AgendamentoOnlineView
              business={currentBusiness}
              onOpenPublicBooking={() => {
                window.history.pushState({}, '', `/agendar/${currentBusiness.slug}`);
                setSlugFromPath(currentBusiness.slug);
                setIsPublicPlansMode(false);
                setIsPublicMode(true);
              }}
            />
          )}

          {activeTab === 'whatsapp' && (
            <FeatureGuard
              businessId={currentBusiness.id}
              feature="CRM"
              featureTitle="Lembretes & Disparos WhatsApp CRM"
              requiredPlan="professional"
              onNavigateToAssinatura={handleNavigateToAssinatura}
            >
              <WhatsAppView business={currentBusiness} />
            </FeatureGuard>
          )}

          {activeTab === 'marketing' && (
            <FeatureGuard
              businessId={currentBusiness.id}
              feature="MARKETING"
              featureTitle="Campanhas de Marketing Automatizadas"
              requiredPlan="professional"
              onNavigateToAssinatura={handleNavigateToAssinatura}
            >
              <MarketingView business={currentBusiness} />
            </FeatureGuard>
          )}

          {activeTab === 'assinatura' && (
            <AssinaturaView
              business={currentBusiness}
              currentUser={currentUser}
              onRefreshBusiness={() => loadSubscriptionInfo(currentBusiness.id)}
              onSelectBusiness={(biz) => setCurrentBusiness(biz)}
              onOpenPublicPlans={() => {
                window.history.pushState({}, '', '/planos');
                setIsPublicPlansMode(true);
              }}
            />
          )}

          {activeTab === 'configuracoes' && (
            <ConfiguracoesView
              business={currentBusiness}
              currentUser={currentUser}
              theme={theme}
              onUpdateTheme={handleUpdateTheme}
              onUpdateBusiness={setCurrentBusiness}
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}
        </main>
      </div>

      {/* Mobile Navigation */}
      <MobileNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userRole={currentUser.role}
        currentUser={currentUser}
        currentBusiness={currentBusiness}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenNewAppointment={() => setIsNewAppointmentOpen(true)}
        onLogout={handleLogout}
      />

      {/* New Appointment Modal */}
      <NewAppointmentModal
        isOpen={isNewAppointmentOpen}
        onClose={() => setIsNewAppointmentOpen(false)}
        businessId={currentBusiness.id}
        onSuccess={() => {
          loadSubscriptionInfo(currentBusiness.id);
          setActiveTab((prev) => prev);
        }}
      />
    </div>
  );
}

export default App;
