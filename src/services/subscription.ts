import {
  SaaSPlan,
  SubscriptionStatus,
  FeatureKey,
  PlanLimits,
  PlanDefinition,
  CompanySubscription,
  UsageStats,
  ActiveTab,
  Business,
} from '../types';
import { supabase, isSupabaseConfigured } from './supabase';
import { DB } from './db';
import { DEMO_BUSINESS_ID } from './seedData';
import { isPlatformOwner } from '../utils/auth';

const STORAGE_KEY_SUBSCRIPTIONS = 'sf_subscriptions';

export const PLANS: Record<SaaSPlan, PlanDefinition> = {
  basic: {
    id: 'basic',
    name: 'Básico',
    description: 'Ideal para profissionais autônomos ou pequenas barbearias e salões em início.',
    priceMonthly: 'R$ 39,90/mês',
    priceNumeric: 39.9,
    isActive: true,
    limits: {
      maxProfessionals: 2,
      maxClients: 50,
      maxMonthlyAppointments: 100,
      maxStorageMb: 500,
    },
    features: [
      'AGENDA',
      'AGENDAMENTO_ONLINE',
      'CLIENTES',
      'PROFISSIONAIS',
      'SERVICOS',
      'PWA',
    ],
  },
  professional: {
    id: 'professional',
    name: 'Profissional',
    description: 'Plano completo para estabelecimentos em crescimento acelerado.',
    priceMonthly: 'R$ 69,99/mês',
    priceNumeric: 69.99,
    isActive: true,
    limits: {
      maxProfessionals: 10,
      maxClients: 1000,
      maxMonthlyAppointments: 2000,
      maxStorageMb: 5000,
    },
    features: [
      'AGENDA',
      'AGENDAMENTO_ONLINE',
      'CLIENTES',
      'PROFISSIONAIS',
      'SERVICOS',
      'CAIXA',
      'VENDAS',
      'COMISSOES',
      'FINANCEIRO',
      'FIDELIDADE',
      'CRM',
      'MARKETING',
      'AUTOMACOES_CRM',
      'RELATORIOS',
      'GALERIA',
      'PWA',
    ],
  },
  premium: {
    id: 'premium',
    name: 'Premium Studio',
    description: 'Acesso total, recursos VIP, suporte prioritário e fichas técnicas.',
    priceMonthly: 'R$ 99,90/mês',
    priceNumeric: 99.9,
    isActive: true,
    limits: {
      maxProfessionals: 999999,
      maxClients: 999999,
      maxMonthlyAppointments: 999999,
      maxStorageMb: 50000,
    },
    features: [
      'AGENDA',
      'AGENDAMENTO_ONLINE',
      'CLIENTES',
      'PROFISSIONAIS',
      'SERVICOS',
      'CAIXA',
      'VENDAS',
      'COMISSOES',
      'FINANCEIRO',
      'FIDELIDADE',
      'CRM',
      'MARKETING',
      'AUTOMACOES_CRM',
      'RELATORIOS',
      'GALERIA',
      'ANAMNESE',
      'PWA',
    ],
  },
};

// In-Memory Cache
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const subscriptionCache: Map<string, CacheEntry<CompanySubscription>> = new Map();
const usageCache: Map<string, CacheEntry<UsageStats>> = new Map();
const CACHE_TTL_MS = 10000; // 10 seconds

export function invalidateSubscriptionCache(businessId?: string): void {
  if (businessId) {
    subscriptionCache.delete(businessId);
    usageCache.delete(businessId);
  } else {
    subscriptionCache.clear();
    usageCache.clear();
  }
}

export class SubscriptionService {
  /**
   * Returns plan definition by ID
   */
  static getPlanLimits(planId: SaaSPlan): PlanLimits {
    return (PLANS[planId] || PLANS.professional).limits;
  }

  /**
   * Helper to normalize status strings from DB/Local
   */
  static normalizeStatus(statusStr?: string): SubscriptionStatus {
    const s = (statusStr || '').toUpperCase();
    if (s === 'TRIAL' || s === 'TRIALING') return 'TRIAL';
    if (s === 'ACTIVE' || s === 'ATIVO') return 'ACTIVE';
    if (s === 'PAST_DUE' || s === 'PENDENTE') return 'PAST_DUE';
    if (s === 'CANCELLED' || s === 'CANCELED' || s === 'CANCELADO') return 'CANCELLED';
    if (s === 'EXPIRED' || s === 'EXPIRADO') return 'EXPIRED';
    if (s === 'SUSPENDED' || s === 'SUSPENSO') return 'SUSPENDED';
    return 'ACTIVE';
  }

  /**
   * Get current company subscription from Supabase or LocalStorage fallback
   */
  static async getCurrentSubscriptionAsync(businessId: string): Promise<CompanySubscription> {
    if (!businessId) {
      throw new Error('business_id é obrigatório para consultar assinatura.');
    }

    const cached = subscriptionCache.get(businessId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }

    let sub: CompanySubscription | null = null;

    // Check if business is demo business
    const isOwnerBiz = businessId === DEMO_BUSINESS_ID;

    if (isOwnerBiz) {
      sub = {
        id: `sub-owner-${businessId}`,
        business_id: businessId,
        plan_id: 'premium',
        status: 'ACTIVE',
        started_at: '2024-01-01T00:00:00.000Z',
        expires_at: null,
        trial_started_at: null,
        trial_ends_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      subscriptionCache.set(businessId, { data: sub, timestamp: Date.now() });
      return sub;
    }

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('business_id', businessId)
          .maybeSingle();

        if (!error && data) {
          sub = {
            id: data.id,
            business_id: data.business_id,
            plan_id: (data.plan_id?.toLowerCase() as SaaSPlan) || 'professional',
            status: SubscriptionService.normalizeStatus(data.status),
            started_at: data.started_at || data.created_at || new Date().toISOString(),
            expires_at: data.expires_at || null,
            trial_started_at: data.trial_started_at || null,
            trial_ends_at: data.trial_ends_at || null,
            created_at: data.created_at || new Date().toISOString(),
            updated_at: data.updated_at || new Date().toISOString(),
          };
        }
      } catch (err) {
        console.error('Error fetching subscription from Supabase:', err);
      }
    }

    if (!sub) {
      // LocalStorage fallback / Demo mode
      const raw = localStorage.getItem(STORAGE_KEY_SUBSCRIPTIONS);
      const list: CompanySubscription[] = raw ? JSON.parse(raw) : [];
      sub = list.find((s) => s.business_id === businessId) || null;

      if (!sub) {
        // Fallback to Business.plan property or default 14-day trial
        const biz = DB.getBusinessById(businessId);
        const plan = biz?.plan || 'professional';
        const now = new Date();
        const trialEnd = new Date(now.getTime() + 14 * 86400000);

        sub = {
          id: `sub-${businessId}`,
          business_id: businessId,
          plan_id: plan,
          status: 'TRIAL',
          started_at: now.toISOString(),
          expires_at: trialEnd.toISOString(),
          trial_started_at: now.toISOString(),
          trial_ends_at: trialEnd.toISOString(),
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        };

        // Save local default
        list.push(sub);
        localStorage.setItem(STORAGE_KEY_SUBSCRIPTIONS, JSON.stringify(list));
      }
    }

    // Check dynamic expiration if TRIAL or ACTIVE
    const nowTs = Date.now();
    if (sub.status === 'TRIAL' && sub.trial_ends_at) {
      if (new Date(sub.trial_ends_at).getTime() < nowTs) {
        sub.status = 'EXPIRED';
      }
    } else if (sub.status === 'ACTIVE' && sub.expires_at) {
      if (new Date(sub.expires_at).getTime() < nowTs) {
        sub.status = 'EXPIRED';
      }
    }

    subscriptionCache.set(businessId, { data: sub, timestamp: Date.now() });
    return sub;
  }

  /**
   * Get effective SaaS plan for company
   */
  static async getCurrentPlanAsync(businessId: string): Promise<SaaSPlan> {
    const sub = await SubscriptionService.getCurrentSubscriptionAsync(businessId);
    return sub.plan_id || 'professional';
  }

  /**
   * Check if a feature is enabled for company's plan and subscription status
   */
  static async hasFeatureAsync(businessId: string, feature: FeatureKey): Promise<boolean> {
    const sub = await SubscriptionService.getCurrentSubscriptionAsync(businessId);

    // Owners, admins and active subscriptions have 100% full feature access
    if (sub.status === 'ACTIVE' || sub.expires_at === null || sub.plan_id === 'premium') {
      return true;
    }

    // If subscription is SUSPENDED, block premium features (only basic views allowed)
    if (sub.status === 'SUSPENDED' && feature !== 'AGENDA' && feature !== 'CLIENTES') {
      return false;
    }

    const planDef = PLANS[sub.plan_id] || PLANS.professional;
    return planDef.features.includes(feature);
  }

  /**
   * Map NavigationTab to FeatureKey
   */
  static tabToFeature(tab: ActiveTab): FeatureKey | null {
    switch (tab) {
      case 'agenda':
        return 'AGENDA';
      case 'clientes':
        return 'CLIENTES';
      case 'profissionais':
        return 'PROFISSIONAIS';
      case 'servicos':
        return 'SERVICOS';
      case 'caixa':
        return 'CAIXA';
      case 'vendas':
        return 'VENDAS';
      case 'comissoes':
        return 'COMISSOES';
      case 'financeiro':
        return 'FINANCEIRO';
      case 'fidelidade':
        return 'FIDELIDADE';
      case 'marketing':
        return 'MARKETING';
      case 'relatorios':
        return 'RELATORIOS';
      case 'galeria':
        return 'GALERIA';
      case 'anamnese':
        return 'ANAMNESE';
      case 'agendamento_online':
        return 'AGENDAMENTO_ONLINE';
      case 'whatsapp':
        return 'CRM';
      case 'dashboard':
      case 'assinatura':
      case 'configuracoes':
      default:
        return null; // Always accessible
    }
  }

  /**
   * Fetch Usage Stats & Limits
   */
  static async getUsageAsync(businessId: string): Promise<UsageStats> {
    const cached = usageCache.get(businessId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }

    const sub = await SubscriptionService.getCurrentSubscriptionAsync(businessId);
    const limits = PLANS[sub.plan_id]?.limits || PLANS.professional.limits;

    const [clients, professionals, appointments] = await Promise.all([
      DB.getClientsAsync(businessId),
      DB.getProfessionalsAsync(businessId),
      DB.getAppointmentsAsync(businessId),
    ]);

    const clientCount = clients.length;
    const professionalCount = professionals.length;

    // Monthly appointments count for current month
    const now = new Date();
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthlyAppointmentCount = appointments.filter((a) =>
      a.date.startsWith(currentMonthPrefix)
    ).length;

    const stats: UsageStats = {
      clientCount,
      professionalCount,
      monthlyAppointmentCount,
      limits,
      clientUsagePercent: limits.maxClients === 999999 ? 0 : Math.min(100, Math.round((clientCount / limits.maxClients) * 100)),
      professionalUsagePercent: limits.maxProfessionals === 999999 ? 0 : Math.min(100, Math.round((professionalCount / limits.maxProfessionals) * 100)),
      appointmentUsagePercent: limits.maxMonthlyAppointments === 999999 ? 0 : Math.min(100, Math.round((monthlyAppointmentCount / limits.maxMonthlyAppointments) * 100)),
    };

    usageCache.set(businessId, { data: stats, timestamp: Date.now() });
    return stats;
  }

  /**
   * Limit validations
   */
  static async canCreateClientAsync(
    businessId: string
  ): Promise<{ allowed: boolean; reason?: string; current: number; limit: number }> {
    const usage = await SubscriptionService.getUsageAsync(businessId);
    if (usage.clientCount >= usage.limits.maxClients) {
      return {
        allowed: false,
        reason: `Limite de clientes atingido para o plano atual (${usage.clientCount} / ${usage.limits.maxClients}). Faça upgrade para cadastrar mais clientes.`,
        current: usage.clientCount,
        limit: usage.limits.maxClients,
      };
    }
    return { allowed: true, current: usage.clientCount, limit: usage.limits.maxClients };
  }

  static async canCreateProfessionalAsync(
    businessId: string
  ): Promise<{ allowed: boolean; reason?: string; current: number; limit: number }> {
    const usage = await SubscriptionService.getUsageAsync(businessId);
    if (usage.professionalCount >= usage.limits.maxProfessionals) {
      return {
        allowed: false,
        reason: `Limite de profissionais atingido no seu plano atual (${usage.professionalCount} / ${usage.limits.maxProfessionals}). Faça upgrade do seu plano para adicionar mais profissionais.`,
        current: usage.professionalCount,
        limit: usage.limits.maxProfessionals,
      };
    }
    return { allowed: true, current: usage.professionalCount, limit: usage.limits.maxProfessionals };
  }

  static async canCreateAppointmentAsync(
    businessId: string
  ): Promise<{ allowed: boolean; reason?: string; current: number; limit: number }> {
    const usage = await SubscriptionService.getUsageAsync(businessId);
    if (usage.monthlyAppointmentCount >= usage.limits.maxMonthlyAppointments) {
      return {
        allowed: false,
        reason: `Limite mensal de agendamentos atingido (${usage.monthlyAppointmentCount} / ${usage.limits.maxMonthlyAppointments}). Faça upgrade do plano para permitir novos agendamentos este mês.`,
        current: usage.monthlyAppointmentCount,
        limit: usage.limits.maxMonthlyAppointments,
      };
    }
    return { allowed: true, current: usage.monthlyAppointmentCount, limit: usage.limits.maxMonthlyAppointments };
  }

  /**
   * Validate plan change (payment check and anti-gaming downgrade protection)
   */
  static async validatePlanChangeAsync(
    businessId: string,
    newPlan: SaaSPlan,
    newStatus?: SubscriptionStatus
  ): Promise<{
    allowed: boolean;
    reason?: string;
    isDowngrade?: boolean;
    isUpgrade?: boolean;
    currentPlan: SaaSPlan;
    warningMessage?: string;
  }> {
    if (!businessId) {
      return { allowed: false, reason: 'ID da barbearia é obrigatório.', currentPlan: 'basic' };
    }

    const sub = await SubscriptionService.getCurrentSubscriptionAsync(businessId);
    const currentPlan: SaaSPlan = sub.plan_id || 'professional';

    const planRanks: Record<SaaSPlan, number> = {
      basic: 1,
      professional: 2,
      premium: 3,
    };

    const currentRank = planRanks[currentPlan] || 2;
    const newRank = planRanks[newPlan] || 2;
    const isDowngrade = newRank < currentRank;
    const isUpgrade = newRank > currentRank;

    // 1. Payment Verification Check for current month
    // If subscription status is suspended, expired, or delinquent, block changing to expensive plans or downgrading without payment clearance
    const targetStatus = newStatus || sub.status;
    if ((sub.status === 'EXPIRED' || sub.status === 'SUSPENDED' || sub.status === 'PAST_DUE') && targetStatus !== 'ACTIVE') {
      return {
        allowed: false,
        reason: `A assinatura atual da barbearia está com pagamento do mês pendente ou suspenso (Plano ${PLANS[currentPlan].name}). É necessário confirmar a quitação da mensalidade vigente antes de alterar o plano.`,
        currentPlan,
      };
    }

    // 2. Anti-Gaming Downgrade Verification
    // Prevent mid-month downgrade exploitation (using higher plan features then dropping back without paying)
    if (isDowngrade) {
      const usage = await SubscriptionService.getUsageAsync(businessId);
      const targetLimits = PLANS[newPlan].limits;

      // Validate professional limit on target lower plan
      if (usage.professionalCount > targetLimits.maxProfessionals) {
        return {
          allowed: false,
          reason: `Bloqueio de Downgrade: A barbearia possui ${usage.professionalCount} profissionais cadastrados, o que excede o limite máximo de ${targetLimits.maxProfessionals} do plano ${PLANS[newPlan].name}. Para migrar para este plano inferior, é necessário remover os profissionais excedentes primeiro.`,
          currentPlan,
          isDowngrade: true,
        };
      }

      // Validate client limit on target lower plan
      if (usage.clientCount > targetLimits.maxClients) {
        return {
          allowed: false,
          reason: `Bloqueio de Downgrade: A barbearia possui ${usage.clientCount} clientes cadastrados, excedendo o limite de ${targetLimits.maxClients} do plano ${PLANS[newPlan].name}.`,
          currentPlan,
          isDowngrade: true,
        };
      }

      return {
        allowed: true,
        currentPlan,
        isDowngrade: true,
        warningMessage: `Aviso de Downgrade: Mudança do plano ${PLANS[currentPlan].name} para ${PLANS[newPlan].name}. Verificado que a mensalidade do mês atual está quitada.`,
      };
    }

    return { allowed: true, currentPlan, isUpgrade };
  }

  /**
   * Update plan / subscription
   */
  static async updateBusinessSubscriptionAsync(
    businessId: string,
    newPlan: SaaSPlan
  ): Promise<CompanySubscription> {
    if (!businessId) throw new Error('business_id é obrigatório.');

    // Validate payment status and anti-gaming rules
    const validation = await SubscriptionService.validatePlanChangeAsync(businessId, newPlan);
    if (!validation.allowed) {
      throw new Error(validation.reason || 'Alteração de plano não permitida.');
    }

    const now = new Date();
    const oneYearFromNow = new Date(now.getTime() + 365 * 86400000);

    const updatedData: Partial<CompanySubscription> = {
      plan_id: newPlan,
      status: 'ACTIVE',
      started_at: now.toISOString(),
      expires_at: oneYearFromNow.toISOString(),
      updated_at: now.toISOString(),
    };

    // Update Business table first
    DB.updateBusiness(businessId, { plan: newPlan });

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('businesses')
          .update({ plan: newPlan, updated_at: now.toISOString() })
          .eq('id', businessId);

        const { data, error } = await supabase
          .from('subscriptions')
          .upsert(
            {
              business_id: businessId,
              plan_id: newPlan,
              status: 'ACTIVE',
              started_at: now.toISOString(),
              expires_at: oneYearFromNow.toISOString(),
              updated_at: now.toISOString(),
            },
            { onConflict: 'business_id' }
          )
          .select()
          .single();

        if (!error && data) {
          invalidateSubscriptionCache(businessId);
          return {
            id: data.id,
            business_id: data.business_id,
            plan_id: data.plan_id as SaaSPlan,
            status: 'ACTIVE',
            started_at: data.started_at,
            expires_at: data.expires_at,
            created_at: data.created_at,
            updated_at: data.updated_at,
          };
        }
      } catch (err) {
        console.error('Error updating subscription on Supabase:', err);
      }
    }

    // LocalStorage update
    const raw = localStorage.getItem(STORAGE_KEY_SUBSCRIPTIONS);
    const list: CompanySubscription[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex((s) => s.business_id === businessId);

    let result: CompanySubscription;
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updatedData };
      result = list[idx];
    } else {
      result = {
        id: `sub-${businessId}`,
        business_id: businessId,
        plan_id: newPlan,
        status: 'ACTIVE',
        started_at: now.toISOString(),
        expires_at: oneYearFromNow.toISOString(),
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };
      list.push(result);
    }

    localStorage.setItem(STORAGE_KEY_SUBSCRIPTIONS, JSON.stringify(list));
    invalidateSubscriptionCache(businessId);
    DB.syncSubscribersToVault();
    return result;
  }

  /**
   * Admin: Get all registered businesses with their subscription and usage stats
   */
  static async getAllBusinessesSubscriptionsAsync(): Promise<
    Array<{
      business: Business;
      subscription: CompanySubscription;
      usage?: UsageStats;
    }>
  > {
    const businesses = await DB.getBusinessesAsync();
    const results = await Promise.all(
      businesses.map(async (biz) => {
        const subscription = await SubscriptionService.getCurrentSubscriptionAsync(biz.id);
        let usage: UsageStats | undefined;
        try {
          usage = await SubscriptionService.getUsageAsync(biz.id);
        } catch {
          // Fallback if empty
        }
        return { business: biz, subscription, usage };
      })
    );
    return results;
  }

  /**
   * Admin: Update subscription plan and status for any business
   */
  static async adminUpdateSubscriptionAsync(
    businessId: string,
    newPlan: SaaSPlan,
    newStatus: SubscriptionStatus
  ): Promise<CompanySubscription> {
    if (!businessId) throw new Error('business_id é obrigatório.');

    // Validate payment status and anti-gaming rules
    const validation = await SubscriptionService.validatePlanChangeAsync(businessId, newPlan, newStatus);
    if (!validation.allowed) {
      throw new Error(validation.reason || 'Alteração de plano não permitida.');
    }

    const now = new Date();
    const oneYearFromNow = new Date(now.getTime() + 365 * 86400000);

    const updatedData: Partial<CompanySubscription> = {
      plan_id: newPlan,
      status: newStatus,
      updated_at: now.toISOString(),
    };

    // Update Business
    DB.updateBusiness(businessId, { plan: newPlan });

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('businesses')
          .update({ plan: newPlan, updated_at: now.toISOString() })
          .eq('id', businessId);

        await supabase
          .from('subscriptions')
          .upsert(
            {
              business_id: businessId,
              plan_id: newPlan,
              status: newStatus,
              updated_at: now.toISOString(),
            },
            { onConflict: 'business_id' }
          );
      } catch (err) {
        console.error('Error updating subscription on Supabase:', err);
      }
    }

    const raw = localStorage.getItem(STORAGE_KEY_SUBSCRIPTIONS);
    const list: CompanySubscription[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex((s) => s.business_id === businessId);

    let result: CompanySubscription;
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updatedData };
      result = list[idx];
    } else {
      result = {
        id: `sub-${businessId}`,
        business_id: businessId,
        plan_id: newPlan,
        status: newStatus,
        started_at: now.toISOString(),
        expires_at: oneYearFromNow.toISOString(),
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };
      list.push(result);
    }

    localStorage.setItem(STORAGE_KEY_SUBSCRIPTIONS, JSON.stringify(list));
    invalidateSubscriptionCache(businessId);
    DB.syncSubscribersToVault();
    return result;
  }

  /**
   * Admin: Quick manual update of subscription status (ACTIVE, SUSPENDED, TRIAL, PAST_DUE, EXPIRED)
   */
  static async adminUpdateSubscriptionStatusAsync(
    businessId: string,
    newStatus: SubscriptionStatus
  ): Promise<CompanySubscription> {
    if (!businessId) throw new Error('business_id é obrigatório.');

    const sub = await SubscriptionService.getCurrentSubscriptionAsync(businessId);
    const now = new Date();

    const updatedData: Partial<CompanySubscription> = {
      status: newStatus,
      updated_at: now.toISOString(),
    };

    // If activating and was expired/suspended, extend expiration if needed
    if (newStatus === 'ACTIVE') {
      const oneYearFromNow = new Date(now.getTime() + 365 * 86400000);
      updatedData.expires_at = oneYearFromNow.toISOString();
    }

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('subscriptions')
          .upsert(
            {
              business_id: businessId,
              plan_id: sub.plan_id || 'professional',
              status: newStatus,
              updated_at: now.toISOString(),
              expires_at: updatedData.expires_at || sub.expires_at,
            },
            { onConflict: 'business_id' }
          );
      } catch (err) {
        console.error('Error updating subscription status on Supabase:', err);
      }
    }

    const raw = localStorage.getItem(STORAGE_KEY_SUBSCRIPTIONS);
    const list: CompanySubscription[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex((s) => s.business_id === businessId);

    let result: CompanySubscription;
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updatedData };
      result = list[idx];
    } else {
      result = {
        id: `sub-${businessId}`,
        business_id: businessId,
        plan_id: sub.plan_id || 'professional',
        status: newStatus,
        started_at: now.toISOString(),
        expires_at: updatedData.expires_at || null,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };
      list.push(result);
    }

    localStorage.setItem(STORAGE_KEY_SUBSCRIPTIONS, JSON.stringify(list));
    invalidateSubscriptionCache(businessId);
    DB.syncSubscribersToVault();
    return result;
  }

  /**
   * Admin: Register new business with selected plan and logo
   */
  static async adminCreateBusinessWithSubscriptionAsync(
    data: {
      name: string;
      owner_name: string;
      email: string;
      phone: string;
      type?: any;
      slug?: string;
      logo_url?: string;
      address?: string;
      city?: string;
      state?: string;
      zip_code?: string;
    },
    planId: SaaSPlan = 'professional',
    status: SubscriptionStatus = 'ACTIVE'
  ): Promise<{ business: Business; subscription: CompanySubscription }> {
    const slug =
      data.slug ||
      data.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') ||
      'barbearia-' + Date.now();

    const createdBiz = DB.createBusiness({
      name: data.name,
      owner_name: data.owner_name,
      email: data.email,
      phone: data.phone,
      whatsapp: data.phone,
      address: data.address || '',
      city: data.city || '',
      state: data.state || '',
      zip_code: data.zip_code || '',
      type: data.type || 'Barbearia',
      slug,
      logo_url: data.logo_url || '',
      plan: planId,
    });

    // Create owner profile for authentication isolation
    DB.createProfile({
      business_id: createdBiz.id,
      name: data.owner_name,
      email: data.email || `dono-${createdBiz.id}@studioflow.app`,
      role: 'OWNER',
      phone: data.phone,
    });

    const sub = await SubscriptionService.adminUpdateSubscriptionAsync(
      createdBiz.id,
      planId,
      status
    );

    return { business: createdBiz, subscription: sub };
  }

  /**
   * Admin: Full update of subscriber business (logo, name, phone, email, slug, plan, status)
   */
  static async adminUpdateBusinessFullAsync(
    businessId: string,
    businessUpdates: Partial<Business>,
    planId: SaaSPlan,
    status: SubscriptionStatus
  ): Promise<{ business: Business; subscription: CompanySubscription }> {
    if (!businessId) throw new Error('business_id é obrigatório.');

    const updatedBiz = DB.updateBusiness(businessId, {
      ...businessUpdates,
      plan: planId,
    });

    const updatedSub = await SubscriptionService.adminUpdateSubscriptionAsync(
      businessId,
      planId,
      status
    );

    return { business: updatedBiz, subscription: updatedSub };
  }

  /**
   * Admin: Delete a subscriber business and wipe all its multi-tenant data
   */
  static async adminDeleteBusinessAsync(businessId: string): Promise<boolean> {
    if (!businessId) throw new Error('business_id é obrigatório.');

    if (isSupabaseConfigured) {
      try {
        await supabase.from('subscriptions').delete().eq('business_id', businessId);
        await supabase.from('businesses').delete().eq('id', businessId);
      } catch (err) {
        console.error('Error deleting business on Supabase:', err);
      }
    }

    const ok = DB.deleteBusiness(businessId);
    invalidateSubscriptionCache(businessId);
    return ok;
  }
}
