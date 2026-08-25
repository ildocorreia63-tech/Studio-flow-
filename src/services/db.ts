/**
 * STUDIOFLOW - Unified Local/Server Database Engine
 * Handles full multi-tenancy, RLS emulation, schedule conflicts,
 * loyalty stamp mechanics, cash registers, commissions, and audit logs.
 */

import {
  Business,
  BusinessHours,
  UserProfile,
  Professional,
  Client,
  Service,
  Appointment,
  Sale,
  CashRegister,
  CashTransaction,
  Expense,
  Commission,
  LoyaltyProgram,
  LoyaltyCard,
  LoyaltyTransaction,
  GalleryItem,
  Anamnese,
  AuditLog,
  NotificationItem,
  BlockedTime,
  AppointmentStatus,
  PaymentMethod,
  CashTransactionType,
  ExpenseCategory,
  MarketingCampaign,
  CampaignStatus,
  CampaignType,
  CampaignSegment,
  CrmAutomationRule,
  CrmTask,
  CrmNotification,
  CrmOpportunity,
  CrmEventType,
  CrmActionType,
  CrmTaskStatus,
  CrmTaskPriority,
} from '../types';

import { supabase, isSupabaseConfigured } from './supabase';
import { SubscriptionService, invalidateSubscriptionCache } from './subscription';

export function normalizeStatusToUI(statusStr: string): AppointmentStatus {
  const upper = (statusStr || '').toUpperCase();
  if (upper === 'SCHEDULED' || upper === 'AGENDADO') return 'AGENDADO';
  if (upper === 'CONFIRMED' || upper === 'CONFIRMADO') return 'CONFIRMADO';
  if (upper === 'IN_PROGRESS' || upper === 'EM_ATENDIMENTO' || upper === 'EM_ANDAMENTO') return 'EM_ATENDIMENTO';
  if (upper === 'COMPLETED' || upper === 'CONCLUÍDO' || upper === 'CONCLUIDO') return 'CONCLUÍDO';
  if (upper === 'CANCELED' || upper === 'CANCELLED' || upper === 'CANCELADO') return 'CANCELADO';
  if (upper === 'NO_SHOW' || upper === 'NÃO_COMPARECEU' || upper === 'NAO_COMPARECEU') return 'NO_SHOW';
  return 'AGENDADO';
}

export function normalizeStatusToDB(status: AppointmentStatus): string {
  switch (status) {
    case 'AGENDADO': return 'SCHEDULED';
    case 'CONFIRMADO': return 'CONFIRMED';
    case 'EM_ATENDIMENTO': return 'IN_PROGRESS';
    case 'CONCLUÍDO': return 'COMPLETED';
    case 'CANCELADO': return 'CANCELED';
    case 'NO_SHOW': return 'NO_SHOW';
    default: return 'SCHEDULED';
  }
}

import {
  DEMO_BUSINESS_ID,
  initialBusiness,
  initialBusinessHours,
  initialProfiles,
  initialProfessionals,
  initialServices,
  initialClients,
  initialAppointments,
  initialLoyaltyProgram,
  initialLoyaltyCards,
  initialCashRegister,
  initialCashTransactions,
  initialExpenses,
  initialCommissions,
  initialGallery,
  initialAnamnese,
  initialMarketingCampaigns,
  initialCrmAutomationRules,
  initialCrmTasks,
  initialCrmNotifications,
} from './seedData';

const STORAGE_KEYS = {
  BUSINESSES: 'sf_businesses',
  HOURS: 'sf_business_hours',
  PROFILES: 'sf_user_profiles',
  PROFESSIONALS: 'sf_professionals',
  SERVICES: 'sf_services',
  CLIENTS: 'sf_clients',
  APPOINTMENTS: 'sf_appointments',
  SALES: 'sf_sales',
  CASH_REGISTERS: 'sf_cash_registers',
  CASH_TRANSACTIONS: 'sf_cash_transactions',
  EXPENSES: 'sf_expenses',
  COMMISSIONS: 'sf_commissions',
  LOYALTY_PROGRAMS: 'sf_loyalty_programs',
  LOYALTY_CARDS: 'sf_loyalty_cards',
  LOYALTY_TRANSACTIONS: 'sf_loyalty_txs',
  GALLERY: 'sf_gallery',
  ANAMNESE: 'sf_anamnese',
  MARKETING_CAMPAIGNS: 'sf_marketing_campaigns',
  CRM_AUTOMATION_RULES: 'sf_crm_automation_rules',
  CRM_TASKS: 'sf_crm_tasks',
  CRM_NOTIFICATIONS: 'sf_crm_notifications',
  AUDIT_LOGS: 'sf_audit_logs',
  NOTIFICATIONS: 'sf_notifications',
  BLOCKED_TIMES: 'sf_blocked_times',
  CURRENT_USER: 'sf_current_user',
};

// Helper: load from localStorage with fallback seed
function loadStorage<T>(key: string, seed: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(`Error loading ${key}`, e);
  }
  localStorage.setItem(key, JSON.stringify(seed));
  return seed;
}

// Helper: save to localStorage with automatic QuotaExceeded fallback
function saveStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e: any) {
    console.error(`Error saving ${key}:`, e);
    // If localStorage quota exceeded, clear non-critical logs and try again
    if (e?.name === 'QuotaExceededError' || e?.code === 22 || e?.code === 1014) {
      try {
        localStorage.removeItem(STORAGE_KEYS.AUDIT_LOGS);
        localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS);
        localStorage.removeItem(STORAGE_KEYS.CRM_NOTIFICATIONS);
        localStorage.setItem(key, JSON.stringify(value));
        console.log(`Saved ${key} after clearing non-critical storage.`);
      } catch (retryErr) {
        console.error(`Retry saveStorage for ${key} failed:`, retryErr);
      }
    }
  }
}

// Helper time calculation
export function parseTimeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

export function addMinutesToTime(timeStr: string, minutes: number): string {
  const total = parseTimeToMinutes(timeStr) + minutes;
  const h = Math.floor(total / 60)
    .toString()
    .padStart(2, '0');
  const m = (total % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

export class DB {
  // --- Initialize Storage ---
  static init() {
    loadStorage(STORAGE_KEYS.BUSINESSES, [initialBusiness]);
    loadStorage(STORAGE_KEYS.HOURS, initialBusinessHours);
    loadStorage(STORAGE_KEYS.PROFILES, initialProfiles);
    loadStorage(STORAGE_KEYS.PROFESSIONALS, initialProfessionals);
    loadStorage(STORAGE_KEYS.SERVICES, initialServices);
    loadStorage(STORAGE_KEYS.CLIENTS, initialClients);
    loadStorage(STORAGE_KEYS.APPOINTMENTS, initialAppointments);
    loadStorage(STORAGE_KEYS.SALES, []);
    loadStorage(STORAGE_KEYS.CASH_REGISTERS, [initialCashRegister]);
    loadStorage(STORAGE_KEYS.CASH_TRANSACTIONS, initialCashTransactions);
    loadStorage(STORAGE_KEYS.EXPENSES, initialExpenses);
    loadStorage(STORAGE_KEYS.COMMISSIONS, initialCommissions);
    loadStorage(STORAGE_KEYS.LOYALTY_PROGRAMS, [initialLoyaltyProgram]);
    loadStorage(STORAGE_KEYS.LOYALTY_CARDS, initialLoyaltyCards);
    loadStorage(STORAGE_KEYS.LOYALTY_TRANSACTIONS, []);
    loadStorage(STORAGE_KEYS.GALLERY, initialGallery);
    loadStorage(STORAGE_KEYS.ANAMNESE, initialAnamnese);
    loadStorage(STORAGE_KEYS.MARKETING_CAMPAIGNS, initialMarketingCampaigns);
    loadStorage(STORAGE_KEYS.CRM_AUTOMATION_RULES, initialCrmAutomationRules);
    loadStorage(STORAGE_KEYS.CRM_TASKS, initialCrmTasks);
    loadStorage(STORAGE_KEYS.CRM_NOTIFICATIONS, initialCrmNotifications);
    loadStorage(STORAGE_KEYS.AUDIT_LOGS, []);
    loadStorage(STORAGE_KEYS.NOTIFICATIONS, []);
    loadStorage(STORAGE_KEYS.BLOCKED_TIMES, []);

    // Migration: update existing stored profiles & businesses from Gabriel Santos to Ildo Correia de Lima
    try {
      const storedProfiles = loadStorage<UserProfile[]>(STORAGE_KEYS.PROFILES, initialProfiles);
      let profilesChanged = false;
      const updatedProfiles = storedProfiles.map(p => {
        if (p.name === 'Gabriel Santos') {
          profilesChanged = true;
          return { ...p, name: 'Ildo Correia de Lima' };
        }
        return p;
      });
      if (profilesChanged) {
        saveStorage(STORAGE_KEYS.PROFILES, updatedProfiles);
      }

      const storedBusinesses = loadStorage<Business[]>(STORAGE_KEYS.BUSINESSES, [initialBusiness]);
      let bizChanged = false;
      const updatedBiz = storedBusinesses.map(b => {
        if (b.owner_name === 'Gabriel Santos') {
          bizChanged = true;
          return { ...b, owner_name: 'Ildo Correia de Lima' };
        }
        return b;
      });
      if (bizChanged) {
        saveStorage(STORAGE_KEYS.BUSINESSES, updatedBiz);
      }
    } catch (e) {
      console.warn('Migration error:', e);
    }
  }

  // --- Reset to Demo Data ---
  static resetDemoData() {
    localStorage.clear();
    DB.init();
  }

  // --- Audit Log ---
  static logAudit(businessId: string, userName: string, action: string, entity: string, details: string) {
    const logs = loadStorage<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []);
    const newLog: AuditLog = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      business_id: businessId,
      user_name: userName,
      action,
      entity,
      details,
      created_at: new Date().toISOString(),
    };
    logs.unshift(newLog);
    saveStorage(STORAGE_KEYS.AUDIT_LOGS, logs);
  }

  // --- Business Operations ---
  static getBusinesses(): Business[] {
    return loadStorage<Business[]>(STORAGE_KEYS.BUSINESSES, [initialBusiness]);
  }

  static getBusinessById(id: string): Business | undefined {
    return DB.getBusinesses().find((b) => b.id === id);
  }

  static getBusinessBySlug(slug: string): Business | undefined {
    return DB.getBusinesses().find((b) => b.slug.toLowerCase() === slug.toLowerCase());
  }

  static createBusiness(data: Omit<Business, 'id' | 'created_at' | 'updated_at'>): Business {
    const businesses = DB.getBusinesses();
    const id = 'biz-' + Date.now();
    const newBiz: Business = {
      ...data,
      id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    businesses.push(newBiz);
    saveStorage(STORAGE_KEYS.BUSINESSES, businesses);

    // Initialize business hours for new business
    const hours: BusinessHours[] = [0, 1, 2, 3, 4, 5, 6].map((day) => ({
      id: `bh-${id}-${day}`,
      business_id: id,
      day_of_week: day,
      open_time: '09:00',
      close_time: '19:00',
      is_open: day !== 0,
    }));
    const currentHours = loadStorage<BusinessHours[]>(STORAGE_KEYS.HOURS, []);
    saveStorage(STORAGE_KEYS.HOURS, [...currentHours, ...hours]);

    // Initialize loyalty program
    const programs = loadStorage<LoyaltyProgram[]>(STORAGE_KEYS.LOYALTY_PROGRAMS, []);
    programs.push({
      id: `loyalty-${id}`,
      business_id: id,
      is_active: true,
      required_stamps: 10,
      reward_description: '1 Atendimento Grátis',
      discount_type: 'free_service',
      discount_value: 100,
      validity_days: 90,
    });
    saveStorage(STORAGE_KEYS.LOYALTY_PROGRAMS, programs);

    DB.logAudit(id, data.owner_name, 'CRIOU_EMPRESA', 'Business', `Empresa ${data.name} criada.`);
    return newBiz;
  }

  static updateBusiness(id: string, updates: Partial<Business>): Business {
    const businesses = DB.getBusinesses();
    const idx = businesses.findIndex((b) => b.id === id);
    if (idx === -1) throw new Error('Empresa não encontrada');
    businesses[idx] = {
      ...businesses[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    saveStorage(STORAGE_KEYS.BUSINESSES, businesses);
    DB.logAudit(id, 'Admin', 'ATUALIZOU_EMPRESA', 'Business', `Configurações atualizadas.`);
    return businesses[idx];
  }

  static deleteBusiness(id: string): boolean {
    const businesses = DB.getBusinesses();
    const target = businesses.find((b) => b.id === id);
    if (!target) return false;

    // Filter out the business
    const filteredBusinesses = businesses.filter((b) => b.id !== id);
    if (filteredBusinesses.length === 0) {
      const fallbackBiz: Business = {
        ...initialBusiness,
        id: 'biz-' + Date.now(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      saveStorage(STORAGE_KEYS.BUSINESSES, [fallbackBiz]);
    } else {
      saveStorage(STORAGE_KEYS.BUSINESSES, filteredBusinesses);
    }

    // Cascade delete associated records across all multi-tenant tables
    const filterOutBiz = <T extends { business_id?: string }>(key: string, initialSeed: T[]) => {
      const all = loadStorage<T[]>(key, initialSeed);
      const filtered = all.filter((item) => item.business_id !== id);
      saveStorage(key, filtered);
    };

    filterOutBiz(STORAGE_KEYS.HOURS, initialBusinessHours);
    filterOutBiz(STORAGE_KEYS.PROFILES, initialProfiles);
    filterOutBiz(STORAGE_KEYS.PROFESSIONALS, initialProfessionals);
    filterOutBiz(STORAGE_KEYS.SERVICES, initialServices);
    filterOutBiz(STORAGE_KEYS.CLIENTS, initialClients);
    filterOutBiz(STORAGE_KEYS.APPOINTMENTS, initialAppointments);
    filterOutBiz(STORAGE_KEYS.SALES, []);
    filterOutBiz(STORAGE_KEYS.CASH_REGISTERS, [initialCashRegister]);
    filterOutBiz(STORAGE_KEYS.CASH_TRANSACTIONS, initialCashTransactions);
    filterOutBiz(STORAGE_KEYS.EXPENSES, initialExpenses);
    filterOutBiz(STORAGE_KEYS.COMMISSIONS, initialCommissions);
    filterOutBiz(STORAGE_KEYS.LOYALTY_PROGRAMS, [initialLoyaltyProgram]);
    filterOutBiz(STORAGE_KEYS.LOYALTY_CARDS, initialLoyaltyCards);
    filterOutBiz(STORAGE_KEYS.LOYALTY_TRANSACTIONS, []);
    filterOutBiz(STORAGE_KEYS.GALLERY, initialGallery);
    filterOutBiz(STORAGE_KEYS.ANAMNESE, initialAnamnese);
    filterOutBiz(STORAGE_KEYS.MARKETING_CAMPAIGNS, initialMarketingCampaigns);
    filterOutBiz(STORAGE_KEYS.CRM_AUTOMATION_RULES, initialCrmAutomationRules);
    filterOutBiz(STORAGE_KEYS.CRM_TASKS, initialCrmTasks);
    filterOutBiz(STORAGE_KEYS.CRM_NOTIFICATIONS, initialCrmNotifications);
    filterOutBiz(STORAGE_KEYS.BLOCKED_TIMES, []);
    filterOutBiz(STORAGE_KEYS.AUDIT_LOGS, []);

    // Remove from subscriptions storage as well
    try {
      const rawSubs = localStorage.getItem('sf_subscriptions');
      if (rawSubs) {
        const subs: any[] = JSON.parse(rawSubs);
        const filteredSubs = subs.filter((s) => s.business_id !== id);
        localStorage.setItem('sf_subscriptions', JSON.stringify(filteredSubs));
      }
    } catch (e) {
      console.error('Error removing subscription from localStorage:', e);
    }

    invalidateSubscriptionCache(id);
    return true;
  }

  // --- Business Hours ---
  static getBusinessHours(businessId: string): BusinessHours[] {
    const all = loadStorage<BusinessHours[]>(STORAGE_KEYS.HOURS, initialBusinessHours);
    return all.filter((h) => h.business_id === businessId);
  }

  static saveBusinessHours(businessId: string, hours: BusinessHours[]) {
    const all = loadStorage<BusinessHours[]>(STORAGE_KEYS.HOURS, initialBusinessHours);
    const filtered = all.filter((h) => h.business_id !== businessId);
    saveStorage(STORAGE_KEYS.HOURS, [...filtered, ...hours]);
  }

  // --- Users / Profiles ---
  static getProfiles(businessId: string): UserProfile[] {
    const profiles = loadStorage<UserProfile[]>(STORAGE_KEYS.PROFILES, initialProfiles);
    let updated = false;
    const sanitized = profiles.map((p) => {
      const email = p.email?.toLowerCase().trim();
      if ((email === 'admin@studioflow.app' || email === '1980burguer@gmail.com') && p.role !== 'SUPER_ADMIN') {
        updated = true;
        return { ...p, role: 'SUPER_ADMIN' as const };
      }
      return p;
    });
    if (updated) {
      saveStorage(STORAGE_KEYS.PROFILES, sanitized);
    }
    return sanitized.filter((p) => p.business_id === businessId);
  }

  static createProfile(profile: Omit<UserProfile, 'id' | 'created_at'>): UserProfile {
    const profiles = loadStorage<UserProfile[]>(STORAGE_KEYS.PROFILES, initialProfiles);
    const newP: UserProfile = {
      ...profile,
      id: 'usr-' + Date.now(),
      created_at: new Date().toISOString(),
    };
    profiles.push(newP);
    saveStorage(STORAGE_KEYS.PROFILES, profiles);
    return newP;
  }

  // --- Professionals ---
  static getProfessionals(businessId: string): Professional[] {
    const all = loadStorage<Professional[]>(STORAGE_KEYS.PROFESSIONALS, initialProfessionals);
    return all.filter((p) => p.business_id === businessId);
  }

  static saveProfessional(prof: Omit<Professional, 'id' | 'created_at'> & { id?: string }): Professional {
    const all = loadStorage<Professional[]>(STORAGE_KEYS.PROFESSIONALS, initialProfessionals);
    if (prof.id) {
      const idx = all.findIndex((p) => p.id === prof.id);
      if (idx !== -1) {
        all[idx] = { ...all[idx], ...prof };
        saveStorage(STORAGE_KEYS.PROFESSIONALS, all);
        return all[idx];
      }
    }
    const newProf: Professional = {
      ...prof,
      id: 'prof-' + Date.now(),
      created_at: new Date().toISOString(),
    };
    all.push(newProf);
    saveStorage(STORAGE_KEYS.PROFESSIONALS, all);
    DB.logAudit(prof.business_id, 'Admin', 'CRIOU_PROFISSIONAL', 'Professional', `Profissional ${prof.name} cadastrado.`);
    return newProf;
  }

  static deleteProfessional(businessId: string, profId: string) {
    const all = loadStorage<Professional[]>(STORAGE_KEYS.PROFESSIONALS, initialProfessionals);
    const filtered = all.filter((p) => !(p.id === profId && p.business_id === businessId));
    saveStorage(STORAGE_KEYS.PROFESSIONALS, filtered);
  }

  // --- Services ---
  static getServices(businessId: string): Service[] {
    const all = loadStorage<Service[]>(STORAGE_KEYS.SERVICES, initialServices);
    return all.filter((s) => s.business_id === businessId);
  }

  static saveService(service: Omit<Service, 'id' | 'created_at'> & { id?: string }): Service {
    const all = loadStorage<Service[]>(STORAGE_KEYS.SERVICES, initialServices);
    if (service.id) {
      const idx = all.findIndex((s) => s.id === service.id);
      if (idx !== -1) {
        all[idx] = { ...all[idx], ...service };
        saveStorage(STORAGE_KEYS.SERVICES, all);
        return all[idx];
      }
    }
    const newSrv: Service = {
      ...service,
      id: 'srv-' + Date.now(),
      created_at: new Date().toISOString(),
    };
    all.push(newSrv);
    saveStorage(STORAGE_KEYS.SERVICES, all);
    DB.logAudit(service.business_id, 'Admin', 'CRIOU_SERVICO', 'Service', `Serviço ${service.name} cadastrado.`);
    return newSrv;
  }

  static deleteService(businessId: string, serviceId: string) {
    const all = loadStorage<Service[]>(STORAGE_KEYS.SERVICES, initialServices);
    const filtered = all.filter((s) => !(s.id === serviceId && s.business_id === businessId));
    saveStorage(STORAGE_KEYS.SERVICES, filtered);
  }

  // --- Clients ---
  static getClients(businessId: string): Client[] {
    const all = loadStorage<Client[]>(STORAGE_KEYS.CLIENTS, initialClients);
    return all.filter((c) => c.business_id === businessId);
  }

  static getClientById(businessId: string, clientId: string): Client | undefined {
    return DB.getClients(businessId).find((c) => c.id === clientId);
  }

  static saveClient(client: Omit<Client, 'id' | 'created_at' | 'updated_at'> & { id?: string }): Client {
    const all = loadStorage<Client[]>(STORAGE_KEYS.CLIENTS, initialClients);
    if (client.id) {
      const idx = all.findIndex((c) => c.id === client.id);
      if (idx !== -1) {
        all[idx] = {
          ...all[idx],
          ...client,
          updated_at: new Date().toISOString(),
        };
        saveStorage(STORAGE_KEYS.CLIENTS, all);
        return all[idx];
      }
    }
    const newCli: Client = {
      ...client,
      id: 'cli-' + Date.now(),
      total_appointments: client.total_appointments || 0,
      total_spent: client.total_spent || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    all.push(newCli);
    saveStorage(STORAGE_KEYS.CLIENTS, all);

    // Ensure loyalty card exists for client
    DB.getOrCreateLoyaltyCard(client.business_id, newCli.id, newCli.name);

    DB.logAudit(client.business_id, 'Admin', 'CRIOU_CLIENTE', 'Client', `Cliente ${client.name} cadastrado.`);
    return newCli;
  }

  static deleteClient(businessId: string, clientId: string) {
    const all = loadStorage<Client[]>(STORAGE_KEYS.CLIENTS, initialClients);
    const filtered = all.filter((c) => !(c.id === clientId && c.business_id === businessId));
    saveStorage(STORAGE_KEYS.CLIENTS, filtered);
  }

  // --- Async Supabase Integrations with LocalStorage Cache ---

  static async getClientsAsync(businessId: string): Promise<Client[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .eq('business_id', businessId)
          .order('name', { ascending: true });

        if (!error && data) {
          const formatted: Client[] = data.map((c: any) => ({
            id: c.id,
            business_id: c.business_id,
            name: c.name,
            phone: c.phone,
            whatsapp: c.whatsapp || c.phone,
            email: c.email || '',
            birth_date: c.birth_date || '',
            notes: c.notes || '',
            total_appointments: c.total_appointments || 0,
            total_spent: Number(c.total_spent || 0),
            created_at: c.created_at,
            updated_at: c.updated_at,
          }));
          const all = loadStorage<Client[]>(STORAGE_KEYS.CLIENTS, []);
          const otherBizClients = all.filter((c) => c.business_id !== businessId);
          saveStorage(STORAGE_KEYS.CLIENTS, [...otherBizClients, ...formatted]);
          return formatted;
        }
      } catch (err) {
        console.error('Error fetching clients from Supabase:', err);
      }
    }
    return DB.getClients(businessId);
  }

  static async saveClientAsync(client: Omit<Client, 'id' | 'created_at' | 'updated_at'> & { id?: string }): Promise<Client> {
    if (!client.id) {
      const check = await SubscriptionService.canCreateClientAsync(client.business_id);
      if (!check.allowed) {
        throw new Error(check.reason || 'Limite de clientes atingido.');
      }
    }

    const localSaved = DB.saveClient(client);
    invalidateSubscriptionCache(client.business_id);

    if (isSupabaseConfigured) {
      try {
        const payload: any = {
          business_id: client.business_id,
          name: client.name,
          phone: client.phone,
          whatsapp: client.whatsapp || client.phone,
          email: client.email || null,
          birth_date: client.birth_date || null,
          notes: client.notes || null,
          updated_at: new Date().toISOString(),
        };

        if (client.id) {
          payload.id = client.id;
          await supabase.from('clients').upsert(payload);
        } else {
          const { data } = await supabase.from('clients').insert(payload).select().single();
          if (data) {
            return {
              ...localSaved,
              id: data.id,
            };
          }
        }
      } catch (err) {
        console.error('Error saving client to Supabase:', err);
      }
    }

    return localSaved;
  }

  static async deleteClientAsync(businessId: string, clientId: string): Promise<void> {
    DB.deleteClient(businessId, clientId);

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('clients')
          .delete()
          .eq('id', clientId)
          .eq('business_id', businessId);
      } catch (err) {
        console.error('Error deleting client from Supabase:', err);
      }
    }
  }

  static async getProfessionalsAsync(businessId: string): Promise<Professional[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('professionals')
          .select('*')
          .eq('business_id', businessId)
          .order('name', { ascending: true });

        if (!error && data) {
          const formatted: Professional[] = data.map((p: any) => ({
            id: p.id,
            business_id: p.business_id,
            name: p.name,
            phone: p.phone || '',
            whatsapp: p.phone || '',
            email: p.email || '',
            specialty: p.role || p.specialty || 'Geral',
            commission_rate: Number(p.commission_rate || 0),
            status: p.is_active ? 'active' : 'inactive',
            created_at: p.created_at,
          }));
          const all = loadStorage<Professional[]>(STORAGE_KEYS.PROFESSIONALS, []);
          const otherBizProfs = all.filter((p) => p.business_id !== businessId);
          saveStorage(STORAGE_KEYS.PROFESSIONALS, [...otherBizProfs, ...formatted]);
          return formatted;
        }
      } catch (err) {
        console.error('Error fetching professionals from Supabase:', err);
      }
    }
    return DB.getProfessionals(businessId);
  }

  static async saveProfessionalAsync(prof: Omit<Professional, 'id' | 'created_at'> & { id?: string }): Promise<Professional> {
    if (!prof.id) {
      const check = await SubscriptionService.canCreateProfessionalAsync(prof.business_id);
      if (!check.allowed) {
        throw new Error(check.reason || 'Limite de profissionais atingido.');
      }
    }

    const localSaved = DB.saveProfessional(prof);
    invalidateSubscriptionCache(prof.business_id);

    if (isSupabaseConfigured) {
      try {
        const payload: any = {
          business_id: prof.business_id,
          name: prof.name,
          phone: prof.phone || null,
          email: prof.email || null,
          role: prof.specialty || 'Geral',
          commission_rate: prof.commission_rate,
          is_active: prof.status === 'active',
          updated_at: new Date().toISOString(),
        };

        if (prof.id) {
          payload.id = prof.id;
          await supabase.from('professionals').upsert(payload);
        } else {
          const { data } = await supabase.from('professionals').insert(payload).select().single();
          if (data) {
            return {
              ...localSaved,
              id: data.id,
            };
          }
        }
      } catch (err) {
        console.error('Error saving professional to Supabase:', err);
      }
    }

    return localSaved;
  }

  static async deleteProfessionalAsync(businessId: string, profId: string): Promise<void> {
    DB.deleteProfessional(businessId, profId);

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('professionals')
          .delete()
          .eq('id', profId)
          .eq('business_id', businessId);
      } catch (err) {
        console.error('Error deleting professional from Supabase:', err);
      }
    }
  }

  static async getServicesAsync(businessId: string): Promise<Service[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('services')
          .select('*')
          .eq('business_id', businessId)
          .order('name', { ascending: true });

        if (!error && data) {
          const formatted: Service[] = data.map((s: any) => ({
            id: s.id,
            business_id: s.business_id,
            category: s.category || 'Barbearia',
            name: s.name,
            description: s.description || '',
            price: Number(s.price || 0),
            duration_minutes: Number(s.duration_minutes || 30),
            commission_rate: 40,
            active: s.is_active ?? true,
            created_at: s.created_at,
          }));
          const all = loadStorage<Service[]>(STORAGE_KEYS.SERVICES, []);
          const otherBizServices = all.filter((s) => s.business_id !== businessId);
          saveStorage(STORAGE_KEYS.SERVICES, [...otherBizServices, ...formatted]);
          return formatted;
        }
      } catch (err) {
        console.error('Error fetching services from Supabase:', err);
      }
    }
    return DB.getServices(businessId);
  }

  static async saveServiceAsync(service: Omit<Service, 'id' | 'created_at'> & { id?: string }): Promise<Service> {
    const localSaved = DB.saveService(service);

    if (isSupabaseConfigured) {
      try {
        const payload: any = {
          business_id: service.business_id,
          name: service.name,
          description: service.description || '',
          price: service.price,
          duration_minutes: service.duration_minutes,
          category: service.category || 'Geral',
          is_active: service.active ?? true,
          updated_at: new Date().toISOString(),
        };

        if (service.id) {
          payload.id = service.id;
          await supabase.from('services').upsert(payload);
        } else {
          const { data } = await supabase.from('services').insert(payload).select().single();
          if (data) {
            return {
              ...localSaved,
              id: data.id,
            };
          }
        }
      } catch (err) {
        console.error('Error saving service to Supabase:', err);
      }
    }

    return localSaved;
  }

  static async deleteServiceAsync(businessId: string, serviceId: string): Promise<void> {
    DB.deleteService(businessId, serviceId);

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('services')
          .delete()
          .eq('id', serviceId)
          .eq('business_id', businessId);
      } catch (err) {
        console.error('Error deleting service from Supabase:', err);
      }
    }
  }

  static async getAppointmentsAsync(businessId: string): Promise<Appointment[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('appointments')
          .select('*')
          .eq('business_id', businessId)
          .order('date', { ascending: false });

        if (!error && data) {
          const formatted: Appointment[] = data.map((a: any) => ({
            id: a.id,
            business_id: a.business_id,
            client_id: a.client_id || '',
            client_name: a.client_name,
            client_whatsapp: a.client_phone || '',
            professional_id: a.professional_id,
            professional_name: a.professional_name || 'Profissional',
            service_id: a.service_id || '',
            service_name: a.service_name || 'Serviço',
            date: a.date,
            start_time: a.start_time ? a.start_time.slice(0, 5) : '00:00',
            end_time: a.end_time ? a.end_time.slice(0, 5) : '00:30',
            duration_minutes: a.duration_minutes || 30,
            price: Number(a.price || 0),
            commission_amount: Number(a.commission_amount || 0),
            status: normalizeStatusToUI(a.status),
            notes: a.notes || '',
            created_at: a.created_at,
            updated_at: a.updated_at,
          }));
          const all = loadStorage<Appointment[]>(STORAGE_KEYS.APPOINTMENTS, []);
          const otherBizApts = all.filter((a) => a.business_id !== businessId);
          saveStorage(STORAGE_KEYS.APPOINTMENTS, [...otherBizApts, ...formatted]);
          return formatted;
        }
      } catch (err) {
        console.error('Error fetching appointments from Supabase:', err);
      }
    }
    return DB.getAppointments(businessId);
  }

  static async createAppointmentAsync(data: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>): Promise<Appointment> {
    const check = await SubscriptionService.canCreateAppointmentAsync(data.business_id);
    if (!check.allowed) {
      throw new Error(check.reason || 'Limite mensal de agendamentos atingido.');
    }

    const conflict = DB.checkScheduleConflict({
      business_id: data.business_id,
      professional_id: data.professional_id,
      date: data.date,
      start_time: data.start_time,
      end_time: data.end_time,
    });

    if (conflict.hasConflict) {
      throw new Error(conflict.reason || 'Conflito de horário detectado.');
    }

    const localSaved = DB.createAppointment(data);
    invalidateSubscriptionCache(data.business_id);

    if (isSupabaseConfigured) {
      try {
        const payload: any = {
          business_id: data.business_id,
          client_id: data.client_id || null,
          client_name: data.client_name,
          client_phone: data.client_whatsapp,
          professional_id: data.professional_id,
          professional_name: data.professional_name,
          service_id: data.service_id || null,
          service_name: data.service_name,
          date: data.date,
          start_time: data.start_time,
          end_time: data.end_time,
          duration_minutes: data.duration_minutes,
          price: data.price,
          status: normalizeStatusToDB(data.status),
          notes: data.notes || null,
        };

        const { data: inserted, error } = await supabase.from('appointments').insert(payload).select().single();
        if (error) {
          throw new Error(error.message);
        }
        if (inserted) {
          return {
            ...localSaved,
            id: inserted.id,
          };
        }
      } catch (err: any) {
        console.error('Error creating appointment in Supabase:', err);
        throw err;
      }
    }

    return localSaved;
  }

  static async getLoyaltyProgramAsync(businessId: string): Promise<LoyaltyProgram> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('loyalty_programs')
          .select('*')
          .eq('business_id', businessId)
          .maybeSingle();

        if (!error && data) {
          const prog: LoyaltyProgram = {
            id: data.id,
            business_id: data.business_id,
            is_active: data.is_active ?? true,
            required_stamps: data.required_stamps || 10,
            reward_description: data.reward_description || '1 Atendimento Grátis',
            discount_type: data.discount_type || 'free_service',
            discount_value: Number(data.discount_value || 100),
            validity_days: data.validity_days || 90,
          };
          DB.saveLoyaltyProgram(prog);
          return prog;
        }
      } catch (err) {
        console.error('Error fetching loyalty program from Supabase:', err);
      }
    }
    return DB.getLoyaltyProgram(businessId);
  }

  static async saveLoyaltyProgramAsync(program: Partial<LoyaltyProgram> & { business_id: string }): Promise<LoyaltyProgram> {
    const local = DB.getLoyaltyProgram(program.business_id);
    const updatedLocal = { ...local, ...program };
    DB.saveLoyaltyProgram(updatedLocal);

    if (isSupabaseConfigured) {
      try {
        const payload: any = {
          business_id: program.business_id,
          required_stamps: program.required_stamps || 10,
          reward_description: program.reward_description || '1 Atendimento Grátis',
          discount_type: program.discount_type || 'free_service',
          discount_value: program.discount_value || 100,
          validity_days: program.validity_days || 90,
          is_active: program.is_active ?? true,
        };

        const { data, error } = await supabase
          .from('loyalty_programs')
          .upsert(payload, { onConflict: 'business_id' })
          .select()
          .maybeSingle();

        if (!error && data) {
          const resProg: LoyaltyProgram = {
            id: data.id,
            business_id: data.business_id,
            is_active: data.is_active,
            required_stamps: data.required_stamps,
            reward_description: data.reward_description,
            discount_type: data.discount_type,
            discount_value: Number(data.discount_value),
            validity_days: data.validity_days,
          };
          DB.saveLoyaltyProgram(resProg);
          return resProg;
        }
      } catch (err) {
        console.error('Error saving loyalty program to Supabase:', err);
      }
    }

    return updatedLocal;
  }

  static async getLoyaltyCardsAsync(businessId: string): Promise<LoyaltyCard[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('loyalty_cards')
          .select('*, clients(name)')
          .eq('business_id', businessId);

        if (!error && data) {
          const formatted: LoyaltyCard[] = data.map((c: any) => ({
            id: c.id,
            business_id: c.business_id,
            client_id: c.client_id,
            client_name: c.clients?.name || 'Cliente',
            current_stamps: Number(c.current_stamps || 0),
            total_completed: Number(c.total_rewards_earned || 0),
            reward_available: Boolean(c.reward_available),
            created_at: c.updated_at || new Date().toISOString(),
            updated_at: c.updated_at || new Date().toISOString(),
          }));
          const all = loadStorage<LoyaltyCard[]>(STORAGE_KEYS.LOYALTY_CARDS, []);
          const otherBizCards = all.filter((card) => card.business_id !== businessId);
          saveStorage(STORAGE_KEYS.LOYALTY_CARDS, [...otherBizCards, ...formatted]);
          return formatted;
        }
      } catch (err) {
        console.error('Error fetching loyalty cards from Supabase:', err);
      }
    }
    return DB.getLoyaltyCards(businessId);
  }

  static async getOrCreateLoyaltyCardAsync(businessId: string, clientId: string, clientName: string): Promise<LoyaltyCard> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('loyalty_cards')
          .select('*')
          .eq('business_id', businessId)
          .eq('client_id', clientId)
          .maybeSingle();

        if (!error && data) {
          return {
            id: data.id,
            business_id: data.business_id,
            client_id: data.client_id,
            client_name: clientName,
            current_stamps: Number(data.current_stamps || 0),
            total_completed: Number(data.total_rewards_earned || 0),
            reward_available: Boolean(data.reward_available),
            created_at: data.updated_at || new Date().toISOString(),
            updated_at: data.updated_at || new Date().toISOString(),
          };
        } else {
          const { data: inserted, error: insertErr } = await supabase
            .from('loyalty_cards')
            .insert({
              business_id: businessId,
              client_id: clientId,
              current_stamps: 0,
              total_rewards_earned: 0,
              reward_available: false,
              updated_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (!insertErr && inserted) {
            return {
              id: inserted.id,
              business_id: inserted.business_id,
              client_id: inserted.client_id,
              client_name: clientName,
              current_stamps: 0,
              total_completed: 0,
              reward_available: false,
              created_at: inserted.updated_at,
              updated_at: inserted.updated_at,
            };
          }
        }
      } catch (err) {
        console.error('Error in getOrCreateLoyaltyCardAsync:', err);
      }
    }

    return DB.getOrCreateLoyaltyCard(businessId, clientId, clientName);
  }

  static async addLoyaltyStampAsync(businessId: string, clientId: string, appointmentId?: string): Promise<void> {
    DB.addLoyaltyStamp(businessId, clientId, appointmentId);

    if (isSupabaseConfigured) {
      try {
        const program = await DB.getLoyaltyProgramAsync(businessId);
        if (!program.is_active) return;

        // Check if card exists in Supabase
        const card = await DB.getOrCreateLoyaltyCardAsync(businessId, clientId, 'Cliente');

        // Fetch fresh card status from local storage which was updated by DB.addLoyaltyStamp
        const localCards = DB.getLoyaltyCards(businessId);
        const localCard = localCards.find((c) => c.client_id === clientId);

        const currentStamps = localCard ? localCard.current_stamps : card.current_stamps;
        const rewardAvailable = localCard ? localCard.reward_available : card.reward_available;
        const totalCompleted = localCard ? localCard.total_completed : card.total_completed;

        await supabase
          .from('loyalty_cards')
          .upsert(
            {
              id: card.id,
              business_id: businessId,
              client_id: clientId,
              current_stamps: currentStamps,
              reward_available: rewardAvailable,
              total_rewards_earned: totalCompleted,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'business_id,client_id' }
          );
      } catch (err) {
        console.error('Error adding loyalty stamp to Supabase:', err);
      }
    }
  }

  static async redeemLoyaltyRewardAsync(businessId: string, clientId: string): Promise<LoyaltyCard> {
    const localUpdated = DB.redeemLoyaltyReward(businessId, clientId);

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('loyalty_cards')
          .update({
            current_stamps: 0,
            reward_available: false,
            updated_at: new Date().toISOString(),
          })
          .eq('business_id', businessId)
          .eq('client_id', clientId);
      } catch (err) {
        console.error('Error redeeming loyalty reward in Supabase:', err);
      }
    }

    return localUpdated;
  }

  static async updateAppointmentStatusAsync(
    businessId: string,
    appointmentId: string,
    newStatus: AppointmentStatus,
    paymentMethod?: PaymentMethod
  ): Promise<Appointment> {
    const localUpdated = DB.updateAppointmentStatus(businessId, appointmentId, newStatus, paymentMethod);

    if (isSupabaseConfigured) {
      try {
        const dbStatus = normalizeStatusToDB(newStatus);
        await supabase
          .from('appointments')
          .update({
            status: dbStatus,
            payment_status: newStatus === 'CONCLUÍDO' ? 'PAID' : 'PENDING',
            updated_at: new Date().toISOString(),
          })
          .eq('id', appointmentId)
          .eq('business_id', businessId);

        if (newStatus === 'CONCLUÍDO') {
          await DB.recordAppointmentPaymentAsync(localUpdated, paymentMethod || 'pix');
          if (localUpdated.client_id) {
            await DB.addLoyaltyStampAsync(businessId, localUpdated.client_id, appointmentId);
          }
        }
      } catch (err) {
        console.error('Error updating appointment status in Supabase:', err);
      }
    }

    return localUpdated;
  }

  // --- Schedule Conflict Check Engine ---
  static checkScheduleConflict(params: {
    business_id: string;
    professional_id: string;
    date: string; // YYYY-MM-DD
    start_time: string; // HH:mm
    end_time: string; // HH:mm
    exclude_appointment_id?: string;
  }): { hasConflict: boolean; reason?: string } {
    const newStart = parseTimeToMinutes(params.start_time);
    const newEnd = parseTimeToMinutes(params.end_time);

    // 1. Check Business Hours
    const dateObj = new Date(params.date + 'T12:00:00');
    const dayOfWeek = dateObj.getDay();
    const hours = DB.getBusinessHours(params.business_id);
    const dayConfig = hours.find((h) => h.day_of_week === dayOfWeek);

    if (dayConfig && !dayConfig.is_open) {
      return {
        hasConflict: true,
        reason: 'O estabelecimento encontra-se fechado nesta data.',
      };
    }

    if (dayConfig && dayConfig.is_open) {
      const openMins = parseTimeToMinutes(dayConfig.open_time);
      const closeMins = parseTimeToMinutes(dayConfig.close_time);
      if (newStart < openMins || newEnd > closeMins) {
        return {
          hasConflict: true,
          reason: `Horário fora do expediente do estabelecimento (${dayConfig.open_time} às ${dayConfig.close_time}).`,
        };
      }
    }

    // 2. Check Blocked Times
    const blockedTimes = loadStorage<BlockedTime[]>(STORAGE_KEYS.BLOCKED_TIMES, []);
    const profBlocked = blockedTimes.filter(
      (b) =>
        b.business_id === params.business_id &&
        b.professional_id === params.professional_id &&
        b.date === params.date
    );

    for (const block of profBlocked) {
      const bStart = parseTimeToMinutes(block.start_time);
      const bEnd = parseTimeToMinutes(block.end_time);
      // Overlap condition: max(start1, start2) < min(end1, end2)
      if (Math.max(newStart, bStart) < Math.min(newEnd, bEnd)) {
        return {
          hasConflict: true,
          reason: `O profissional possui um bloqueio de horário: ${block.reason} (${block.start_time} - ${block.end_time}).`,
        };
      }
    }

    // 3. Check Overlapping Appointments
    const appointments = DB.getAppointments(params.business_id);
    const activeApts = appointments.filter((a) => {
      if (a.id === params.exclude_appointment_id) return false;
      if (a.professional_id !== params.professional_id) return false;
      if (a.date !== params.date) return false;
      // Ignore CANCELLED appointments
      if (a.status === 'CANCELADO') return false;
      return true;
    });

    for (const apt of activeApts) {
      const aStart = parseTimeToMinutes(apt.start_time);
      const aEnd = parseTimeToMinutes(apt.end_time);

      if (Math.max(newStart, aStart) < Math.min(newEnd, aEnd)) {
        return {
          hasConflict: true,
          reason: `Este profissional já possui um atendimento neste horário com ${apt.client_name} (${apt.start_time} - ${apt.end_time}).`,
        };
      }
    }

    return { hasConflict: false };
  }

  // --- Appointments ---
  static getAppointments(businessId: string): Appointment[] {
    const all = loadStorage<Appointment[]>(STORAGE_KEYS.APPOINTMENTS, initialAppointments);
    return all.filter((a) => a.business_id === businessId);
  }

  static createAppointment(data: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>): Appointment {
    // Check Conflict first
    const conflict = DB.checkScheduleConflict({
      business_id: data.business_id,
      professional_id: data.professional_id,
      date: data.date,
      start_time: data.start_time,
      end_time: data.end_time,
    });

    if (conflict.hasConflict) {
      throw new Error(conflict.reason || 'Conflito de horário detectado.');
    }

    const all = loadStorage<Appointment[]>(STORAGE_KEYS.APPOINTMENTS, initialAppointments);
    const newApt: Appointment = {
      ...data,
      id: 'apt-' + Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    all.push(newApt);
    saveStorage(STORAGE_KEYS.APPOINTMENTS, all);

    // Update Client Stats
    const clients = loadStorage<Client[]>(STORAGE_KEYS.CLIENTS, initialClients);
    const clientIdx = clients.findIndex((c) => c.id === data.client_id && c.business_id === data.business_id);
    if (clientIdx !== -1) {
      clients[clientIdx].last_appointment_at = data.date;
      saveStorage(STORAGE_KEYS.CLIENTS, clients);
    }

    DB.logAudit(
      data.business_id,
      'Atendimento',
      'CRIOU_AGENDAMENTO',
      'Appointment',
      `Agendamento para ${data.client_name} dia ${data.date} às ${data.start_time}.`
    );

    return newApt;
  }

  static updateAppointmentStatus(
    businessId: string,
    appointmentId: string,
    newStatus: AppointmentStatus,
    paymentMethod?: PaymentMethod
  ): Appointment {
    const all = loadStorage<Appointment[]>(STORAGE_KEYS.APPOINTMENTS, initialAppointments);
    const idx = all.findIndex((a) => a.id === appointmentId && a.business_id === businessId);
    if (idx === -1) throw new Error('Agendamento não encontrado');

    const apt = all[idx];
    const prevStatus = apt.status;
    apt.status = newStatus;
    apt.updated_at = new Date().toISOString();
    all[idx] = apt;
    saveStorage(STORAGE_KEYS.APPOINTMENTS, all);

    // Business Rule: If status becomes CONCLUÍDO
    if (newStatus === 'CONCLUÍDO' && prevStatus !== 'CONCLUÍDO') {
      const method = paymentMethod || 'pix';

      // 1. Record Sale & Cash Entry
      DB.recordAppointmentPayment(apt, method);

      // 2. Generate Commission for Professional
      DB.generateCommission(apt);

      // 3. Add Loyalty Stamp
      DB.addLoyaltyStamp(businessId, apt.client_id, apt.id);

      // 4. Trigger CRM Post-Service Automation
      DB.processPostServiceAutomationAsync(businessId, apt.client_id, apt.id).catch((err) =>
        console.error('Error running CRM post-service automation:', err)
      );
    }

    DB.logAudit(
      businessId,
      'Agenda',
      'ALTEROU_STATUS_AGENDAMENTO',
      'Appointment',
      `Agendamento ${apt.client_name} alterado de ${prevStatus} para ${newStatus}.`
    );

    return apt;
  }

  // --- Record Payment & Cash Entry ---
  static recordAppointmentPayment(apt: Appointment, paymentMethod: PaymentMethod) {
    const openRegister = DB.getOpenCashRegister(apt.business_id);
    if (!openRegister) {
      console.warn('Caixa fechado no momento do pagamento do agendamento.');
    } else {
      // Add Cash Transaction Entry
      const txs = loadStorage<CashTransaction[]>(STORAGE_KEYS.CASH_TRANSACTIONS, initialCashTransactions);
      const newTx: CashTransaction = {
        id: 'tx-' + Date.now(),
        cash_register_id: openRegister.id,
        business_id: apt.business_id,
        type: 'ENTRY',
        description: `Agendamento Concluído: ${apt.service_name} (${apt.client_name})`,
        amount: apt.price,
        payment_method: paymentMethod,
        created_at: new Date().toISOString(),
      };
      txs.push(newTx);
      saveStorage(STORAGE_KEYS.CASH_TRANSACTIONS, txs);

      // Update Cash Register summary
      openRegister.sales_summary[paymentMethod] += apt.price;
      openRegister.sales_summary.total += apt.price;
      openRegister.final_amount_expected += apt.price;

      const registers = loadStorage<CashRegister[]>(STORAGE_KEYS.CASH_REGISTERS, [initialCashRegister]);
      const regIdx = registers.findIndex((r) => r.id === openRegister.id);
      if (regIdx !== -1) {
        registers[regIdx] = openRegister;
        saveStorage(STORAGE_KEYS.CASH_REGISTERS, registers);
      }
    }

    // Record Sale
    const sales = loadStorage<Sale[]>(STORAGE_KEYS.SALES, []);
    const newSale: Sale = {
      id: 'sale-' + Date.now(),
      business_id: apt.business_id,
      client_id: apt.client_id,
      client_name: apt.client_name,
      professional_id: apt.professional_id,
      appointment_id: apt.id,
      total_amount: apt.price,
      discount: 0,
      final_amount: apt.price,
      payment_method: paymentMethod,
      status: 'PAGO',
      created_at: new Date().toISOString(),
      items: [
        {
          id: 'item-' + Date.now(),
          sale_id: '',
          item_type: 'service',
          item_id: apt.service_id,
          name: apt.service_name,
          quantity: 1,
          unit_price: apt.price,
          total_price: apt.price,
        },
      ],
    };
    sales.push(newSale);
    saveStorage(STORAGE_KEYS.SALES, sales);

    // Update Client Totals
    const clients = loadStorage<Client[]>(STORAGE_KEYS.CLIENTS, initialClients);
    const cliIdx = clients.findIndex((c) => c.id === apt.client_id);
    if (cliIdx !== -1) {
      clients[cliIdx].total_appointments = (clients[cliIdx].total_appointments || 0) + 1;
      clients[cliIdx].total_spent = (clients[cliIdx].total_spent || 0) + apt.price;
      saveStorage(STORAGE_KEYS.CLIENTS, clients);
    }
  }

  static getSales(businessId: string): Sale[] {
    const all = loadStorage<Sale[]>(STORAGE_KEYS.SALES, []);
    return all.filter((s) => s.business_id === businessId);
  }

  static async getSalesAsync(businessId: string, startDate?: string, endDate?: string): Promise<Sale[]> {
    if (isSupabaseConfigured) {
      try {
        let query = supabase
          .from('sales')
          .select('*, sale_items(*), payments(*)')
          .eq('business_id', businessId)
          .neq('status', 'CANCELED')
          .order('created_at', { ascending: false });

        if (startDate) {
          query = query.gte('created_at', `${startDate}T00:00:00`);
        }
        if (endDate) {
          query = query.lte('created_at', `${endDate}T23:59:59`);
        }

        const { data, error } = await query;

        if (!error && data) {
          const formatted: Sale[] = data.map((s: any) => ({
            id: s.id,
            business_id: s.business_id,
            client_id: s.client_id || undefined,
            client_name: s.client_name || undefined,
            professional_id: s.professional_id || undefined,
            appointment_id: s.appointment_id || undefined,
            total_amount: Number(s.total_amount || 0),
            discount: Number(s.discount || 0),
            final_amount: Number(s.final_amount || 0),
            payment_method: s.payments && s.payments.length > 0 ? (s.payments[0].method?.toLowerCase() as PaymentMethod) : 'pix',
            payments: (s.payments || []).map((p: any) => ({
              id: p.id,
              method: (p.method?.toLowerCase() || 'pix') as PaymentMethod,
              amount: Number(p.amount || 0),
            })),
            status: s.status === 'COMPLETED' ? 'PAGO' : (s.status as any),
            created_at: s.created_at,
            items: (s.sale_items || []).map((i: any) => ({
              id: i.id,
              sale_id: i.sale_id,
              item_type: i.item_type?.toLowerCase() === 'service' ? 'service' : 'product',
              item_id: i.item_id || '',
              name: i.name,
              quantity: Number(i.quantity || 1),
              unit_price: Number(i.unit_price || 0),
              total_price: Number(i.total_price || 0),
            })),
          }));

          saveStorage(STORAGE_KEYS.SALES, formatted);
          return formatted;
        }
      } catch (err) {
        console.error('Error fetching sales from Supabase:', err);
      }
    }
    let local = DB.getSales(businessId).filter((s) => s.status !== 'CANCELADO');
    if (startDate) local = local.filter((s) => (s.created_at || '').slice(0, 10) >= startDate);
    if (endDate) local = local.filter((s) => (s.created_at || '').slice(0, 10) <= endDate);
    return local;
  }

  static async createSaleAsync(data: {
    business_id: string;
    client_id?: string;
    client_name?: string;
    professional_id?: string;
    appointment_id?: string;
    items: { item_type: 'service' | 'product'; item_id?: string; name: string; quantity: number; unit_price: number }[];
    payments: { method: PaymentMethod; amount: number }[];
    discount?: number;
    idempotency_key?: string;
  }): Promise<Sale> {
    const subtotal = data.items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
    const discountVal = data.discount || 0;
    const finalAmount = Math.max(0, subtotal - discountVal);
    const primaryMethod = data.payments.length > 0 ? data.payments[0].method : 'pix';
    const idempotencyKey = data.idempotency_key || `sale-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const localSale: Sale = {
      id: 'sale-' + Date.now(),
      business_id: data.business_id,
      client_id: data.client_id,
      client_name: data.client_name,
      professional_id: data.professional_id,
      appointment_id: data.appointment_id,
      total_amount: subtotal,
      discount: discountVal,
      final_amount: finalAmount,
      payment_method: primaryMethod,
      payments: data.payments,
      status: 'PAGO',
      created_at: new Date().toISOString(),
      items: data.items.map((i, idx) => ({
        id: `item-${Date.now()}-${idx}`,
        sale_id: '',
        item_type: i.item_type,
        item_id: i.item_id || '',
        name: i.name,
        quantity: i.quantity,
        unit_price: i.unit_price,
        total_price: i.unit_price * i.quantity,
      })),
    };

    if (isSupabaseConfigured) {
      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('process_sale_transaction', {
          p_idempotency_key: idempotencyKey,
          p_client_id: data.client_id || null,
          p_client_name: data.client_name || null,
          p_professional_id: data.professional_id || null,
          p_appointment_id: data.appointment_id || null,
          p_items: data.items.map((item) => ({
            item_type: item.item_type,
            item_id: item.item_id || null,
            name: item.name,
            quantity: item.quantity,
            unit_price: item.unit_price,
          })),
          p_payments: data.payments.map((p) => ({
            method: p.method,
            amount: p.amount,
          })),
          p_discount: discountVal,
        });

        if (rpcErr) {
          console.error('Error in process_sale_transaction RPC:', rpcErr);
          throw new Error(rpcErr.message);
        }

        if (rpcRes && rpcRes.success) {
          return {
            ...localSale,
            id: rpcRes.sale_id,
          };
        }
      } catch (err) {
        console.error('Error in createSaleAsync RPC:', err);
        throw err;
      }
    }

    // Fallback for offline / demo mode
    const currentSales = loadStorage<Sale[]>(STORAGE_KEYS.SALES, []);
    currentSales.push(localSale);
    saveStorage(STORAGE_KEYS.SALES, currentSales);

    const openRegister = DB.getOpenCashRegister(data.business_id);
    if (openRegister) {
      data.payments.forEach((p) => {
        DB.addCashTransaction({
          cash_register_id: openRegister.id,
          business_id: data.business_id,
          type: 'ENTRY',
          description: `Venda (${data.items.map((i) => i.name).join(', ')})`,
          amount: p.amount,
          payment_method: p.method,
        });
      });
    }

    return localSale;
  }

  static async recordAppointmentPaymentAsync(apt: Appointment, paymentMethod: PaymentMethod): Promise<void> {
    if (isSupabaseConfigured) {
      try {
        const idempotencyKey = `apt-pay-${apt.id}`;
        const items = [
          {
            item_type: 'service',
            item_id: apt.service_id || null,
            name: apt.service_name,
            quantity: 1,
            unit_price: apt.price,
          },
        ];
        const payments = [
          {
            method: paymentMethod,
            amount: apt.price,
          },
        ];

        const { error: rpcErr } = await supabase.rpc('process_sale_transaction', {
          p_idempotency_key: idempotencyKey,
          p_client_id: apt.client_id || null,
          p_client_name: apt.client_name || null,
          p_professional_id: apt.professional_id || null,
          p_appointment_id: apt.id,
          p_items: items,
          p_payments: payments,
          p_discount: 0,
        });

        if (rpcErr) {
          console.error('RPC Error in recordAppointmentPaymentAsync:', rpcErr);
          throw new Error(rpcErr.message);
        }

        return;
      } catch (err) {
        console.error('Error in recordAppointmentPaymentAsync:', err);
        throw err;
      }
    }

    // Local fallback
    DB.recordAppointmentPayment(apt, paymentMethod);
    DB.generateCommission(apt);
  }

  static async generateCommissionAsync(apt: Appointment, saleId?: string): Promise<void> {
    DB.generateCommission(apt);

    if (isSupabaseConfigured) {
      try {
        const { data: prof } = await supabase
          .from('professionals')
          .select('commission_rate')
          .eq('id', apt.professional_id)
          .maybeSingle();

        const rate = prof?.commission_rate ? Number(prof.commission_rate) : 40;
        const amount = (apt.price * rate) / 100;

        if (saleId) {
          const { data: existing } = await supabase
            .from('commissions')
            .select('id')
            .eq('business_id', apt.business_id)
            .eq('sale_id', saleId)
            .maybeSingle();

          if (existing) return;
        }

        await supabase.from('commissions').insert({
          business_id: apt.business_id,
          professional_id: apt.professional_id,
          sale_id: saleId || null,
          amount,
          rate,
          status: 'PENDING',
        });
      } catch (err) {
        console.error('Error generating commission in Supabase:', err);
      }
    }
  }

  // --- Commission Engine ---
  static generateCommission(apt: Appointment) {
    const commissions = loadStorage<Commission[]>(STORAGE_KEYS.COMMISSIONS, initialCommissions);
    // Prevent Duplicate Commission
    const existing = commissions.find((c) => c.appointment_id === apt.id);
    if (existing) return;

    // Fetch professional rate or service rate
    const profs = DB.getProfessionals(apt.business_id);
    const prof = profs.find((p) => p.id === apt.professional_id);
    const rate = prof ? prof.commission_rate : 40;
    const amount = (apt.price * rate) / 100;

    const newComm: Commission = {
      id: 'com-' + Date.now(),
      business_id: apt.business_id,
      professional_id: apt.professional_id,
      professional_name: apt.professional_name,
      appointment_id: apt.id,
      service_name: apt.service_name,
      service_price: apt.price,
      percentage: rate,
      amount,
      date: apt.date,
      status: 'PENDENTE',
      created_at: new Date().toISOString(),
    };

    commissions.push(newComm);
    saveStorage(STORAGE_KEYS.COMMISSIONS, commissions);
  }

  static getCommissions(businessId: string): Commission[] {
    const all = loadStorage<Commission[]>(STORAGE_KEYS.COMMISSIONS, initialCommissions);
    return all.filter((c) => c.business_id === businessId);
  }

  static async getCommissionsAsync(businessId: string): Promise<Commission[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('commissions')
          .select('*, professionals(name), sales(total_amount, appointment_id)')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false });

        if (!error && data) {
          const formatted: Commission[] = data.map((c: any) => ({
            id: c.id,
            business_id: c.business_id,
            professional_id: c.professional_id,
            professional_name: c.professionals?.name || 'Profissional',
            appointment_id: c.sales?.appointment_id || undefined,
            sale_id: c.sale_id || undefined,
            service_name: 'Atendimento Concluído',
            service_price: Number(c.sales?.total_amount || 0),
            percentage: Number(c.rate || 40),
            amount: Number(c.amount || 0),
            date: c.created_at ? c.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
            status: c.status === 'PAID' ? 'PAGO' : 'PENDENTE',
            created_at: c.created_at,
          }));

          saveStorage(STORAGE_KEYS.COMMISSIONS, formatted);
          return formatted;
        }
      } catch (err) {
        console.error('Error fetching commissions from Supabase:', err);
      }
    }
    return DB.getCommissions(businessId);
  }

  static payCommission(businessId: string, commissionId: string) {
    const all = loadStorage<Commission[]>(STORAGE_KEYS.COMMISSIONS, initialCommissions);
    const idx = all.findIndex((c) => c.id === commissionId && c.business_id === businessId);
    if (idx !== -1) {
      all[idx].status = 'PAGO';
      saveStorage(STORAGE_KEYS.COMMISSIONS, all);
      DB.logAudit(businessId, 'Financeiro', 'PAGOU_COMISSAO', 'Commission', `Comissão de ${all[idx].professional_name} no valor de R$ ${all[idx].amount.toFixed(2)} paga.`);
    }
  }

  static async payCommissionAsync(businessId: string, commissionId: string): Promise<void> {
    DB.payCommission(businessId, commissionId);

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('commissions')
          .update({
            status: 'PAID',
            paid_at: new Date().toISOString(),
          })
          .eq('id', commissionId)
          .eq('business_id', businessId);
      } catch (err) {
        console.error('Error paying commission in Supabase:', err);
      }
    }
  }

  // --- Loyalty Program Engine ---
  static getLoyaltyProgram(businessId: string): LoyaltyProgram {
    const all = loadStorage<LoyaltyProgram[]>(STORAGE_KEYS.LOYALTY_PROGRAMS, [initialLoyaltyProgram]);
    let prog = all.find((p) => p.business_id === businessId);
    if (!prog) {
      prog = {
        id: `loyalty-${businessId}`,
        business_id: businessId,
        is_active: true,
        required_stamps: 10,
        reward_description: '1 Atendimento Grátis',
        discount_type: 'free_service',
        discount_value: 100,
        validity_days: 90,
      };
      all.push(prog);
      saveStorage(STORAGE_KEYS.LOYALTY_PROGRAMS, all);
    }
    return prog;
  }

  static saveLoyaltyProgram(program: Partial<LoyaltyProgram> & { business_id: string }) {
    const all = loadStorage<LoyaltyProgram[]>(STORAGE_KEYS.LOYALTY_PROGRAMS, [initialLoyaltyProgram]);
    const idx = all.findIndex((p) => p.business_id === program.business_id);
    if (idx !== -1) {
      all[idx] = { ...all[idx], ...program };
    } else {
      const newP: LoyaltyProgram = {
        id: 'loyalty-prog-' + Date.now(),
        business_id: program.business_id,
        is_active: program.is_active ?? true,
        required_stamps: program.required_stamps || 10,
        reward_description: program.reward_description || '1 Atendimento Grátis',
        discount_type: program.discount_type || 'free_service',
        discount_value: program.discount_value || 100,
        validity_days: program.validity_days || 90,
      };
      all.push(newP);
    }
    saveStorage(STORAGE_KEYS.LOYALTY_PROGRAMS, all);
  }

  static getLoyaltyCards(businessId: string): LoyaltyCard[] {
    const all = loadStorage<LoyaltyCard[]>(STORAGE_KEYS.LOYALTY_CARDS, initialLoyaltyCards);
    return all.filter((c) => c.business_id === businessId);
  }

  static getOrCreateLoyaltyCard(businessId: string, clientId: string, clientName: string): LoyaltyCard {
    const cards = DB.getLoyaltyCards(businessId);
    let card = cards.find((c) => c.client_id === clientId);
    if (!card) {
      const allCards = loadStorage<LoyaltyCard[]>(STORAGE_KEYS.LOYALTY_CARDS, initialLoyaltyCards);
      card = {
        id: 'loyalty-card-' + clientId,
        business_id: businessId,
        client_id: clientId,
        client_name: clientName,
        current_stamps: 0,
        total_completed: 0,
        reward_available: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      allCards.push(card);
      saveStorage(STORAGE_KEYS.LOYALTY_CARDS, allCards);
    }
    return card;
  }

  static addLoyaltyStamp(businessId: string, clientId: string, appointmentId?: string) {
    const program = DB.getLoyaltyProgram(businessId);
    if (!program.is_active) return;

    // Prevent duplicate stamp for same appointment
    if (appointmentId) {
      const txs = loadStorage<LoyaltyTransaction[]>(STORAGE_KEYS.LOYALTY_TRANSACTIONS, []);
      const dup = txs.find((t) => t.appointment_id === appointmentId && t.action === 'STAMP');
      if (dup) return;
    }

    const client = DB.getClientById(businessId, clientId);
    const clientName = client ? client.name : 'Cliente';
    const card = DB.getOrCreateLoyaltyCard(businessId, clientId, clientName);

    const allCards = loadStorage<LoyaltyCard[]>(STORAGE_KEYS.LOYALTY_CARDS, initialLoyaltyCards);
    const cardIdx = allCards.findIndex((c) => c.id === card.id);

    if (cardIdx !== -1) {
      const newStamps = allCards[cardIdx].current_stamps + 1;
      let rewardAvailable = allCards[cardIdx].reward_available;
      let completedCount = allCards[cardIdx].total_completed;

      if (newStamps >= program.required_stamps) {
        rewardAvailable = true;
        completedCount += 1;
      }

      allCards[cardIdx] = {
        ...allCards[cardIdx],
        current_stamps: newStamps,
        reward_available: rewardAvailable,
        total_completed: completedCount,
        updated_at: new Date().toISOString(),
      };
      saveStorage(STORAGE_KEYS.LOYALTY_CARDS, allCards);

      // Record transaction
      const txs = loadStorage<LoyaltyTransaction[]>(STORAGE_KEYS.LOYALTY_TRANSACTIONS, []);
      txs.push({
        id: 'loyalty-tx-' + Date.now(),
        business_id: businessId,
        client_id: clientId,
        appointment_id: appointmentId,
        stamps_added: 1,
        action: 'STAMP',
        description: `Ponto de fidelidade adicionado (${newStamps}/${program.required_stamps})`,
        created_at: new Date().toISOString(),
      });
      saveStorage(STORAGE_KEYS.LOYALTY_TRANSACTIONS, txs);
    }
  }

  static redeemLoyaltyReward(businessId: string, clientId: string): LoyaltyCard {
    const allCards = loadStorage<LoyaltyCard[]>(STORAGE_KEYS.LOYALTY_CARDS, initialLoyaltyCards);
    const cardIdx = allCards.findIndex((c) => c.client_id === clientId && c.business_id === businessId);

    if (cardIdx === -1 || !allCards[cardIdx].reward_available) {
      throw new Error('Cliente não possui recompensa disponível para resgate.');
    }

    // Reset card stamps for new cycle
    allCards[cardIdx] = {
      ...allCards[cardIdx],
      current_stamps: 0,
      reward_available: false,
      updated_at: new Date().toISOString(),
    };
    saveStorage(STORAGE_KEYS.LOYALTY_CARDS, allCards);

    // Record Redeem Transaction
    const txs = loadStorage<LoyaltyTransaction[]>(STORAGE_KEYS.LOYALTY_TRANSACTIONS, []);
    txs.push({
      id: 'loyalty-tx-' + Date.now(),
      business_id: businessId,
      client_id: clientId,
      stamps_added: 0,
      action: 'REDEEM',
      description: 'Recompensa de Fidelidade Resgatada (100% de desconto aplicado)',
      created_at: new Date().toISOString(),
    });
    saveStorage(STORAGE_KEYS.LOYALTY_TRANSACTIONS, txs);

    DB.logAudit(businessId, 'Fidelidade', 'RESGATOU_RECOMPENSA', 'LoyaltyCard', `Recompensa resgatada para cliente ID ${clientId}.`);

    return allCards[cardIdx];
  }

  // --- Cash Register Engine ---
  static getCashRegisters(businessId: string): CashRegister[] {
    const all = loadStorage<CashRegister[]>(STORAGE_KEYS.CASH_REGISTERS, [initialCashRegister]);
    return all.filter((c) => c.business_id === businessId);
  }

  static getOpenCashRegister(businessId: string): CashRegister | undefined {
    return DB.getCashRegisters(businessId).find((c) => c.status === 'OPEN');
  }

  static async getOpenCashRegisterAsync(businessId: string): Promise<CashRegister | undefined> {
    if (isSupabaseConfigured) {
      try {
        const { data: reg, error } = await supabase
          .from('cash_registers')
          .select('*')
          .eq('business_id', businessId)
          .eq('status', 'OPEN')
          .maybeSingle();

        if (!error && reg) {
          const { data: moveData } = await supabase
            .from('cash_movements')
            .select('*')
            .eq('cash_register_id', reg.id);

          let dinheiro = 0, pix = 0, debito = 0, credito = 0;
          let expected = Number(reg.initial_amount || 0);

          (moveData || []).forEach((m: any) => {
            const amt = Number(m.amount || 0);
            const desc = (m.description || '').toLowerCase();
            const isAdd = m.type === 'IN' || m.type === 'SUPRIMENTO' || m.type === 'ENTRY';
            
            if (isAdd) {
              expected += amt;
              if (desc.includes('dinheiro')) dinheiro += amt;
              else if (desc.includes('pix')) pix += amt;
              else if (desc.includes('debito') || desc.includes('débito')) debito += amt;
              else if (desc.includes('credito') || desc.includes('crédito')) credito += amt;
              else pix += amt; // default to pix if not specified
            } else {
              expected -= amt;
            }
          });

          const formattedReg: CashRegister = {
            id: reg.id,
            business_id: reg.business_id,
            opened_at: reg.opened_at,
            initial_amount: Number(reg.initial_amount || 0),
            final_amount_expected: expected,
            status: 'OPEN',
            opened_by_name: 'Usuário',
            sales_summary: {
              dinheiro,
              pix,
              debito,
              credito,
              total: dinheiro + pix + debito + credito,
            },
          };
          return formattedReg;
        } else {
          return undefined;
        }
      } catch (err) {
        console.error('Error fetching open cash register from Supabase:', err);
      }
    }
    return DB.getOpenCashRegister(businessId);
  }

  static openCashRegister(businessId: string, initialAmount: number, openedByName: string): CashRegister {
    const existing = DB.getOpenCashRegister(businessId);
    if (existing) throw new Error('Já existe um caixa aberto para este estabelecimento.');

    const all = loadStorage<CashRegister[]>(STORAGE_KEYS.CASH_REGISTERS, [initialCashRegister]);
    const newReg: CashRegister = {
      id: 'cash-reg-' + Date.now(),
      business_id: businessId,
      opened_at: new Date().toISOString(),
      initial_amount: initialAmount,
      final_amount_expected: initialAmount,
      status: 'OPEN',
      opened_by_name: openedByName,
      sales_summary: {
        dinheiro: 0,
        pix: 0,
        debito: 0,
        credito: 0,
        total: 0,
      },
    };
    all.push(newReg);
    saveStorage(STORAGE_KEYS.CASH_REGISTERS, all);
    DB.logAudit(businessId, openedByName, 'ABRIU_CAIXA', 'CashRegister', `Caixa aberto com valor inicial R$ ${initialAmount.toFixed(2)}.`);
    return newReg;
  }

  static async openCashRegisterAsync(businessId: string, initialAmount: number, openedByName: string): Promise<CashRegister> {
    const localReg = DB.openCashRegister(businessId, initialAmount, openedByName);

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('cash_registers')
          .insert({
            business_id: businessId,
            initial_amount: initialAmount,
            status: 'OPEN',
            opened_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (!error && data) {
          return {
            ...localReg,
            id: data.id,
          };
        }
      } catch (err) {
        console.error('Error opening cash register in Supabase:', err);
      }
    }

    return localReg;
  }

  static closeCashRegister(
    businessId: string,
    registerId: string,
    finalAmountReported: number
  ): CashRegister {
    const all = loadStorage<CashRegister[]>(STORAGE_KEYS.CASH_REGISTERS, [initialCashRegister]);
    const idx = all.findIndex((r) => r.id === registerId && r.business_id === businessId);
    if (idx === -1) throw new Error('Caixa não encontrado');

    const reg = all[idx];
    const diff = finalAmountReported - reg.final_amount_expected;

    reg.status = 'CLOSED';
    reg.closed_at = new Date().toISOString();
    reg.final_amount_reported = finalAmountReported;
    reg.difference = diff;

    all[idx] = reg;
    saveStorage(STORAGE_KEYS.CASH_REGISTERS, all);

    DB.logAudit(
      businessId,
      'Caixa',
      'FECHOU_CAIXA',
      'CashRegister',
      `Caixa fechado. Informado R$ ${finalAmountReported.toFixed(2)}, Esperado R$ ${reg.final_amount_expected.toFixed(2)}, Diferença: R$ ${diff.toFixed(2)}.`
    );

    return reg;
  }

  static async closeCashRegisterAsync(businessId: string, registerId: string, finalAmountReported: number): Promise<CashRegister> {
    const localReg = DB.closeCashRegister(businessId, registerId, finalAmountReported);

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('cash_registers')
          .update({
            status: 'CLOSED',
            closed_at: new Date().toISOString(),
            final_amount: finalAmountReported,
          })
          .eq('id', registerId)
          .eq('business_id', businessId);
      } catch (err) {
        console.error('Error closing cash register in Supabase:', err);
      }
    }

    return localReg;
  }

  static getCashTransactions(cashRegisterId: string): CashTransaction[] {
    const all = loadStorage<CashTransaction[]>(STORAGE_KEYS.CASH_TRANSACTIONS, initialCashTransactions);
    return all.filter((t) => t.cash_register_id === cashRegisterId);
  }

  static async getCashTransactionsAsync(cashRegisterId: string): Promise<CashTransaction[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('cash_movements')
          .select('*')
          .eq('cash_register_id', cashRegisterId)
          .order('created_at', { ascending: false });

        if (!error && data) {
          const formatted: CashTransaction[] = data.map((m: any) => ({
            id: m.id,
            cash_register_id: m.cash_register_id,
            business_id: m.business_id,
            type: m.type === 'IN' ? 'ENTRY' : m.type === 'OUT' ? 'EXIT' : (m.type as CashTransactionType),
            description: m.description,
            amount: Number(m.amount || 0),
            created_at: m.created_at,
          }));
          return formatted;
        }
      } catch (err) {
        console.error('Error fetching cash movements from Supabase:', err);
      }
    }
    return DB.getCashTransactions(cashRegisterId);
  }

  static addCashTransaction(tx: Omit<CashTransaction, 'id' | 'created_at'>): CashTransaction {
    const all = loadStorage<CashTransaction[]>(STORAGE_KEYS.CASH_TRANSACTIONS, initialCashTransactions);
    const newTx: CashTransaction = {
      ...tx,
      id: 'tx-' + Date.now(),
      created_at: new Date().toISOString(),
    };
    all.push(newTx);
    saveStorage(STORAGE_KEYS.CASH_TRANSACTIONS, all);

    // Update expected cash
    const registers = loadStorage<CashRegister[]>(STORAGE_KEYS.CASH_REGISTERS, [initialCashRegister]);
    const regIdx = registers.findIndex((r) => r.id === tx.cash_register_id);
    if (regIdx !== -1) {
      if (tx.type === 'ENTRY' || tx.type === 'SUPRIMENTO') {
        registers[regIdx].final_amount_expected += tx.amount;
      } else if (tx.type === 'EXIT' || tx.type === 'SANGRIA') {
        registers[regIdx].final_amount_expected -= tx.amount;
      }
      saveStorage(STORAGE_KEYS.CASH_REGISTERS, registers);
    }

    return newTx;
  }

  static async addCashTransactionAsync(tx: Omit<CashTransaction, 'id' | 'created_at'>): Promise<CashTransaction> {
    const localTx = DB.addCashTransaction(tx);

    if (isSupabaseConfigured) {
      try {
        const dbType = (tx.type === 'ENTRY' || tx.type === 'SUPRIMENTO') ? 'IN' : 'OUT';
        const { data, error } = await supabase
          .from('cash_movements')
          .insert({
            business_id: tx.business_id,
            cash_register_id: tx.cash_register_id,
            type: dbType,
            amount: tx.amount,
            description: `${tx.description}${tx.payment_method ? ` (${tx.payment_method})` : ''}`,
          })
          .select()
          .single();

        if (!error && data) {
          return {
            ...localTx,
            id: data.id,
          };
        }
      } catch (err) {
        console.error('Error adding cash movement in Supabase:', err);
      }
    }

    return localTx;
  }

  // --- Expenses ---
  static getExpenses(businessId: string): Expense[] {
    const all = loadStorage<Expense[]>(STORAGE_KEYS.EXPENSES, initialExpenses);
    return all.filter((e) => e.business_id === businessId);
  }

  static deleteExpense(businessId: string, id: string): void {
    const all = loadStorage<Expense[]>(STORAGE_KEYS.EXPENSES, initialExpenses);
    const filtered = all.filter((e) => !(e.id === id && e.business_id === businessId));
    saveStorage(STORAGE_KEYS.EXPENSES, filtered);
  }

  static saveExpense(expense: Omit<Expense, 'id' | 'created_at'> & { id?: string }): Expense {
    const all = loadStorage<Expense[]>(STORAGE_KEYS.EXPENSES, initialExpenses);
    if (expense.id) {
      const idx = all.findIndex((e) => e.id === expense.id);
      if (idx !== -1) {
        all[idx] = { ...all[idx], ...expense };
        saveStorage(STORAGE_KEYS.EXPENSES, all);
        return all[idx];
      }
    }
    const newExp: Expense = {
      ...expense,
      id: 'exp-' + Date.now(),
      created_at: new Date().toISOString(),
    };
    all.push(newExp);
    saveStorage(STORAGE_KEYS.EXPENSES, all);
    return newExp;
  }

  static async getExpensesAsync(businessId: string, startDate?: string, endDate?: string): Promise<Expense[]> {
    if (isSupabaseConfigured) {
      try {
        let query = supabase
          .from('expenses')
          .select('*')
          .eq('business_id', businessId)
          .order('due_date', { ascending: false });

        if (startDate) query = query.gte('due_date', startDate);
        if (endDate) query = query.lte('due_date', endDate);

        const { data, error } = await query;
        if (!error && data) {
          const formatted: Expense[] = data.map((e: any) => ({
            id: e.id,
            business_id: e.business_id,
            category: (e.category || 'Outros') as ExpenseCategory,
            description: e.description,
            amount: Number(e.amount || 0),
            date: e.due_date || (e.created_at ? e.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10)),
            status: e.status === 'PAID' ? 'PAGO' : 'PENDENTE',
            created_at: e.created_at,
          }));
          return formatted;
        }
      } catch (err) {
        console.error('Error fetching expenses from Supabase:', err);
      }
    }
    let local = DB.getExpenses(businessId);
    if (startDate) local = local.filter((e) => e.date >= startDate);
    if (endDate) local = local.filter((e) => e.date <= endDate);
    return local;
  }

  static async saveExpenseAsync(expense: Omit<Expense, 'id' | 'created_at'> & { id?: string }): Promise<Expense> {
    const localExp = DB.saveExpense(expense);

    if (isSupabaseConfigured) {
      try {
        const payload = {
          business_id: expense.business_id,
          description: expense.description,
          amount: expense.amount,
          category: expense.category || 'Outros',
          due_date: expense.date || new Date().toISOString().slice(0, 10),
          status: expense.status === 'PAGO' ? 'PAID' : 'PENDING',
          paid_date: expense.status === 'PAGO' ? (expense.date || new Date().toISOString().slice(0, 10)) : null,
        };

        if (expense.id && expense.id.length > 20) {
          const { data, error } = await supabase
            .from('expenses')
            .update(payload)
            .eq('id', expense.id)
            .eq('business_id', expense.business_id)
            .select()
            .single();

          if (!error && data) {
            return {
              ...localExp,
              id: data.id,
            };
          }
        } else {
          const { data, error } = await supabase
            .from('expenses')
            .insert(payload)
            .select()
            .single();

          if (!error && data) {
            return {
              ...localExp,
              id: data.id,
            };
          }
        }
      } catch (err) {
        console.error('Error saving expense in Supabase:', err);
      }
    }

    return localExp;
  }

  static async deleteExpenseAsync(businessId: string, id: string): Promise<void> {
    DB.deleteExpense(businessId, id);

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('expenses')
          .delete()
          .eq('id', id)
          .eq('business_id', businessId);
      } catch (err) {
        console.error('Error deleting expense in Supabase:', err);
      }
    }
  }

  // --- Gallery & Anamnese ---
  static getGallery(businessId: string): GalleryItem[] {
    const all = loadStorage<GalleryItem[]>(STORAGE_KEYS.GALLERY, initialGallery);
    return all.filter((g) => g.business_id === businessId);
  }

  static saveGalleryItem(item: Omit<GalleryItem, 'id' | 'created_at'>): GalleryItem {
    const all = loadStorage<GalleryItem[]>(STORAGE_KEYS.GALLERY, initialGallery);
    const newG: GalleryItem = {
      ...item,
      id: 'gal-' + Date.now(),
      created_at: new Date().toISOString(),
    };
    all.push(newG);
    saveStorage(STORAGE_KEYS.GALLERY, all);
    return newG;
  }

  static deleteGalleryItem(businessId: string, id: string) {
    const all = loadStorage<GalleryItem[]>(STORAGE_KEYS.GALLERY, initialGallery);
    const filtered = all.filter((g) => !(g.id === id && g.business_id === businessId));
    saveStorage(STORAGE_KEYS.GALLERY, filtered);
  }

  static getAnamnese(businessId: string, clientId: string): Anamnese | undefined {
    const all = loadStorage<Anamnese[]>(STORAGE_KEYS.ANAMNESE, initialAnamnese);
    return all.find((a) => a.business_id === businessId && a.client_id === clientId);
  }

  static saveAnamnese(anamnese: Omit<Anamnese, 'id' | 'updated_at'> & { id?: string }): Anamnese {
    const all = loadStorage<Anamnese[]>(STORAGE_KEYS.ANAMNESE, initialAnamnese);
    const idx = all.findIndex((a) => a.business_id === anamnese.business_id && a.client_id === anamnese.client_id);
    if (idx !== -1) {
      all[idx] = {
        ...all[idx],
        ...anamnese,
        updated_at: new Date().toISOString(),
      };
      saveStorage(STORAGE_KEYS.ANAMNESE, all);
      return all[idx];
    }
    const newA: Anamnese = {
      ...anamnese,
      id: 'ana-' + Date.now(),
      updated_at: new Date().toISOString(),
    };
    all.push(newA);
    saveStorage(STORAGE_KEYS.ANAMNESE, all);
    return newA;
  }

  static generateId(): string {
    return 'id-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
  }

  static updateBusinessDetails(businessId: string, details: Partial<Business>): Business | undefined {
    return DB.updateBusiness(businessId, details);
  }

  static updateBusinessPlan(businessId: string, plan: any): Business | undefined {
    return DB.updateBusiness(businessId, { plan });
  }

  static resetDatabase(): void {
    Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
    DB.init();
  }

  static getAnamneseRecords(businessId: string, clientId: string): Anamnese[] {
    const rec = DB.getAnamnese(businessId, clientId);
    return rec ? [rec] : [];
  }

  static saveAnamneseRecord(data: Omit<Anamnese, 'id' | 'updated_at'> & { id?: string }): Anamnese {
    return DB.saveAnamnese(data);
  }

  // --- Public Slot Generator for Online Booking ---
  static getAvailableSlots(params: {
    business_id: string;
    professional_id: string;
    service_id: string;
    date: string; // YYYY-MM-DD
  }): string[] {
    const { business_id, professional_id, service_id, date } = params;

    const services = DB.getServices(business_id);
    const service = services.find((s) => s.id === service_id);
    const durationMinutes = service ? service.duration_minutes : 30;

    const dateObj = new Date(date + 'T12:00:00');
    const dayOfWeek = dateObj.getDay();
    const hours = DB.getBusinessHours(business_id);
    const dayConfig = hours.find((h) => h.day_of_week === dayOfWeek);

    if (!dayConfig || !dayConfig.is_open) {
      return [];
    }

    const openMins = parseTimeToMinutes(dayConfig.open_time);
    const closeMins = parseTimeToMinutes(dayConfig.close_time);

    const availableSlots: string[] = [];
    const step = 30; // 30 min intervals

    for (let currentMins = openMins; currentMins + durationMinutes <= closeMins; currentMins += step) {
      const h = Math.floor(currentMins / 60)
        .toString()
        .padStart(2, '0');
      const m = (currentMins % 60).toString().padStart(2, '0');
      const slotStartTime = `${h}:${m}`;
      const slotEndTime = addMinutesToTime(slotStartTime, durationMinutes);

      const conflict = DB.checkScheduleConflict({
        business_id,
        professional_id,
        date,
        start_time: slotStartTime,
        end_time: slotEndTime,
      });

      if (!conflict.hasConflict) {
        availableSlots.push(slotStartTime);
      }
    }

    return availableSlots;
  }

  // --- Marketing & CRM Campaigns Engine ---
  static getMarketingCampaigns(businessId: string): MarketingCampaign[] {
    const all = loadStorage<MarketingCampaign[]>(STORAGE_KEYS.MARKETING_CAMPAIGNS, initialMarketingCampaigns);
    return all.filter((c) => c.business_id === businessId);
  }

  static async getMarketingCampaignsAsync(businessId: string): Promise<MarketingCampaign[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('marketing_campaigns')
          .select('*')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false });

        if (!error && data) {
          const formatted: MarketingCampaign[] = data.map((c: any) => ({
            id: c.id,
            business_id: c.business_id,
            title: c.title || c.name || 'Sem título',
            description: c.description || '',
            campaign_type: (c.campaign_type || c.type || 'REACTIVATION') as CampaignType,
            segment: (c.segment || c.target_audience || 'TODOS') as CampaignSegment,
            message_template: c.message_template || c.message || '',
            status: (c.status || 'DRAFT') as CampaignStatus,
            start_date: c.start_date || null,
            end_date: c.end_date || null,
            advance_days: Number(c.advance_days || 0),
            sent_count: Number(c.sent_count || 0),
            created_at: c.created_at || new Date().toISOString(),
            updated_at: c.updated_at || c.created_at || new Date().toISOString(),
          }));
          return formatted;
        }
      } catch (err) {
        console.error('Error fetching marketing campaigns from Supabase:', err);
      }
    }
    return DB.getMarketingCampaigns(businessId);
  }

  static saveMarketingCampaign(campaign: Omit<MarketingCampaign, 'id' | 'created_at'> & { id?: string }): MarketingCampaign {
    const all = loadStorage<MarketingCampaign[]>(STORAGE_KEYS.MARKETING_CAMPAIGNS, initialMarketingCampaigns);
    if (campaign.id) {
      const idx = all.findIndex((c) => c.id === campaign.id);
      if (idx !== -1) {
        all[idx] = {
          ...all[idx],
          ...campaign,
          updated_at: new Date().toISOString(),
        };
        saveStorage(STORAGE_KEYS.MARKETING_CAMPAIGNS, all);
        return all[idx];
      }
    }
    const newCamp: MarketingCampaign = {
      ...campaign,
      id: 'camp-' + Date.now(),
      sent_count: campaign.sent_count || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    all.push(newCamp);
    saveStorage(STORAGE_KEYS.MARKETING_CAMPAIGNS, all);
    return newCamp;
  }

  static async saveMarketingCampaignAsync(campaign: Omit<MarketingCampaign, 'id' | 'created_at'> & { id?: string }): Promise<MarketingCampaign> {
    const localCamp = DB.saveMarketingCampaign(campaign);

    if (isSupabaseConfigured) {
      try {
        const payload = {
          business_id: campaign.business_id,
          title: campaign.title,
          description: campaign.description || null,
          campaign_type: campaign.campaign_type || 'REACTIVATION',
          segment: campaign.segment || 'TODOS',
          target_audience: campaign.segment || 'TODOS',
          message_template: campaign.message_template,
          status: campaign.status || 'DRAFT',
          start_date: campaign.start_date || null,
          end_date: campaign.end_date || null,
          advance_days: campaign.advance_days || 0,
          sent_count: campaign.sent_count || 0,
          updated_at: new Date().toISOString(),
        };

        if (campaign.id && campaign.id.length > 20) {
          const { data, error } = await supabase
            .from('marketing_campaigns')
            .update(payload)
            .eq('id', campaign.id)
            .eq('business_id', campaign.business_id)
            .select()
            .single();

          if (!error && data) {
            return {
              ...localCamp,
              id: data.id,
            };
          }
        } else {
          const { data, error } = await supabase
            .from('marketing_campaigns')
            .insert({
              ...payload,
              created_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (!error && data) {
            return {
              ...localCamp,
              id: data.id,
            };
          }
        }
      } catch (err) {
        console.error('Error saving marketing campaign to Supabase:', err);
      }
    }

    return localCamp;
  }

  static async updateCampaignStatusAsync(businessId: string, campaignId: string, status: CampaignStatus): Promise<void> {
    const all = loadStorage<MarketingCampaign[]>(STORAGE_KEYS.MARKETING_CAMPAIGNS, initialMarketingCampaigns);
    const idx = all.findIndex((c) => c.id === campaignId && c.business_id === businessId);
    if (idx !== -1) {
      all[idx].status = status;
      all[idx].updated_at = new Date().toISOString();
      saveStorage(STORAGE_KEYS.MARKETING_CAMPAIGNS, all);
    }

    if (isSupabaseConfigured && campaignId.length > 20) {
      try {
        await supabase
          .from('marketing_campaigns')
          .update({
            status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', campaignId)
          .eq('business_id', businessId);
      } catch (err) {
        console.error('Error updating campaign status in Supabase:', err);
      }
    }
  }

  static async logCampaignClientActionAsync(
    businessId: string,
    campaignId: string,
    clientId: string,
    clientName: string,
    action: 'OPENED_WHATSAPP'
  ): Promise<void> {
    const campaigns = loadStorage<MarketingCampaign[]>(STORAGE_KEYS.MARKETING_CAMPAIGNS, initialMarketingCampaigns);
    const cIdx = campaigns.findIndex((c) => c.id === campaignId && c.business_id === businessId);
    if (cIdx !== -1) {
      campaigns[cIdx].sent_count = (campaigns[cIdx].sent_count || 0) + 1;
      saveStorage(STORAGE_KEYS.MARKETING_CAMPAIGNS, campaigns);

      if (isSupabaseConfigured && campaignId.length > 20) {
        try {
          await supabase
            .from('marketing_campaigns')
            .update({ sent_count: campaigns[cIdx].sent_count })
            .eq('id', campaignId)
            .eq('business_id', businessId);
        } catch (err) {
          console.error('Error updating sent_count in Supabase:', err);
        }
      }
    }

    DB.logAudit(
      businessId,
      'Marketing',
      'OPENED_WHATSAPP',
      'MarketingCampaign',
      `WhatsApp aberto para cliente ${clientName} na campanha ID ${campaignId}.`
    );
  }

  // --- FASE 5C: CRM AUTOMATION ENGINE, TASKS & NOTIFICATIONS ---

  static async getCrmAutomationRulesAsync(businessId: string): Promise<CrmAutomationRule[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('crm_automation_rules')
          .select('*')
          .eq('business_id', businessId)
          .order('created_at', { ascending: true });

        if (!error && data && data.length > 0) {
          const formatted: CrmAutomationRule[] = data.map((r: any) => ({
            id: r.id,
            business_id: r.business_id,
            name: r.name,
            event_type: r.event_type as CrmEventType,
            is_active: r.is_active ?? true,
            period_days: Number(r.period_days || 0),
            message_template: r.message_template || '',
            action_type: (r.action_type || 'CREATE_TASK') as CrmActionType,
            created_at: r.created_at,
            updated_at: r.updated_at,
          }));
          saveStorage(STORAGE_KEYS.CRM_AUTOMATION_RULES, formatted);
          return formatted;
        }
      } catch (err) {
        console.error('Error fetching CRM automation rules from Supabase:', err);
      }
    }
    const all = loadStorage<CrmAutomationRule[]>(STORAGE_KEYS.CRM_AUTOMATION_RULES, initialCrmAutomationRules);
    return all.filter((r) => r.business_id === businessId);
  }

  static async saveCrmAutomationRuleAsync(
    businessId: string,
    rule: Partial<CrmAutomationRule> & { name: string; event_type: CrmEventType }
  ): Promise<CrmAutomationRule> {
    const all = loadStorage<CrmAutomationRule[]>(STORAGE_KEYS.CRM_AUTOMATION_RULES, initialCrmAutomationRules);
    let savedRule: CrmAutomationRule;

    if (rule.id) {
      const idx = all.findIndex((r) => r.id === rule.id && r.business_id === businessId);
      if (idx !== -1) {
        all[idx] = {
          ...all[idx],
          ...rule,
          updated_at: new Date().toISOString(),
        };
        savedRule = all[idx];
      } else {
        savedRule = {
          id: rule.id,
          business_id: businessId,
          name: rule.name,
          event_type: rule.event_type,
          is_active: rule.is_active ?? true,
          period_days: rule.period_days || 0,
          message_template: rule.message_template || '',
          action_type: rule.action_type || 'CREATE_TASK',
          created_at: new Date().toISOString(),
        };
        all.push(savedRule);
      }
    } else {
      savedRule = {
        id: 'rule-' + Date.now(),
        business_id: businessId,
        name: rule.name,
        event_type: rule.event_type,
        is_active: rule.is_active ?? true,
        period_days: rule.period_days || 0,
        message_template: rule.message_template || '',
        action_type: rule.action_type || 'CREATE_TASK',
        created_at: new Date().toISOString(),
      };
      all.push(savedRule);
    }

    saveStorage(STORAGE_KEYS.CRM_AUTOMATION_RULES, all);

    if (isSupabaseConfigured) {
      try {
        const payload = {
          business_id: businessId,
          name: savedRule.name,
          event_type: savedRule.event_type,
          is_active: savedRule.is_active,
          period_days: savedRule.period_days,
          message_template: savedRule.message_template,
          action_type: savedRule.action_type,
          updated_at: new Date().toISOString(),
        };

        if (savedRule.id.length > 20) {
          const { data } = await supabase
            .from('crm_automation_rules')
            .update(payload)
            .eq('id', savedRule.id)
            .eq('business_id', businessId)
            .select()
            .single();
          if (data) savedRule.id = data.id;
        } else {
          const { data } = await supabase
            .from('crm_automation_rules')
            .insert(payload)
            .select()
            .single();
          if (data) savedRule.id = data.id;
        }
      } catch (err) {
        console.error('Error saving CRM rule to Supabase:', err);
      }
    }

    DB.logAudit(businessId, 'CRM', 'SALVOU_REGRA_AUTOMACAO', 'CrmAutomationRule', `Regra "${savedRule.name}" configurada.`);
    return savedRule;
  }

  static async toggleCrmAutomationRuleStatusAsync(
    businessId: string,
    ruleId: string,
    isActive: boolean
  ): Promise<void> {
    const all = loadStorage<CrmAutomationRule[]>(STORAGE_KEYS.CRM_AUTOMATION_RULES, initialCrmAutomationRules);
    const idx = all.findIndex((r) => r.id === ruleId && r.business_id === businessId);
    if (idx !== -1) {
      all[idx].is_active = isActive;
      all[idx].updated_at = new Date().toISOString();
      saveStorage(STORAGE_KEYS.CRM_AUTOMATION_RULES, all);
    }

    if (isSupabaseConfigured && ruleId.length > 20) {
      try {
        await supabase
          .from('crm_automation_rules')
          .update({ is_active: isActive, updated_at: new Date().toISOString() })
          .eq('id', ruleId)
          .eq('business_id', businessId);
      } catch (err) {
        console.error('Error toggling rule status in Supabase:', err);
      }
    }
  }

  static async getCrmTasksAsync(businessId: string): Promise<CrmTask[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('crm_tasks')
          .select('*')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false });

        if (!error && data) {
          const formatted: CrmTask[] = data.map((t: any) => ({
            id: t.id,
            business_id: t.business_id,
            client_id: t.client_id || null,
            client_name: t.client_name,
            rule_id: t.rule_id || null,
            origin_event: t.origin_event as CrmEventType,
            title: t.title,
            description: t.description || '',
            status: (t.status || 'PENDING') as CrmTaskStatus,
            priority: (t.priority || 'NORMAL') as CrmTaskPriority,
            due_date: t.due_date || null,
            assigned_to: t.assigned_to || null,
            dedup_key: t.dedup_key || '',
            created_at: t.created_at,
            updated_at: t.updated_at,
          }));
          saveStorage(STORAGE_KEYS.CRM_TASKS, formatted);
          return formatted;
        }
      } catch (err) {
        console.error('Error fetching CRM tasks from Supabase:', err);
      }
    }
    const all = loadStorage<CrmTask[]>(STORAGE_KEYS.CRM_TASKS, initialCrmTasks);
    return all.filter((t) => t.business_id === businessId);
  }

  static async saveCrmTaskAsync(
    businessId: string,
    task: Partial<CrmTask> & { title: string; client_name: string; origin_event: CrmEventType }
  ): Promise<CrmTask> {
    const all = loadStorage<CrmTask[]>(STORAGE_KEYS.CRM_TASKS, initialCrmTasks);
    let savedTask: CrmTask;

    if (task.id) {
      const idx = all.findIndex((t) => t.id === task.id && t.business_id === businessId);
      if (idx !== -1) {
        all[idx] = {
          ...all[idx],
          ...task,
          updated_at: new Date().toISOString(),
        };
        savedTask = all[idx];
      } else {
        savedTask = {
          id: task.id,
          business_id: businessId,
          client_id: task.client_id || null,
          client_name: task.client_name,
          rule_id: task.rule_id || null,
          origin_event: task.origin_event,
          title: task.title,
          description: task.description || '',
          status: task.status || 'PENDING',
          priority: task.priority || 'NORMAL',
          due_date: task.due_date || null,
          assigned_to: task.assigned_to || null,
          dedup_key: task.dedup_key || `${businessId}:${task.client_id || 'manual'}:${task.origin_event}:${Date.now()}`,
          created_at: new Date().toISOString(),
        };
        all.push(savedTask);
      }
    } else {
      savedTask = {
        id: 'task-' + Date.now(),
        business_id: businessId,
        client_id: task.client_id || null,
        client_name: task.client_name,
        rule_id: task.rule_id || null,
        origin_event: task.origin_event,
        title: task.title,
        description: task.description || '',
        status: task.status || 'PENDING',
        priority: task.priority || 'NORMAL',
        due_date: task.due_date || null,
        assigned_to: task.assigned_to || null,
        dedup_key: task.dedup_key || `${businessId}:${task.client_id || 'manual'}:${task.origin_event}:${Date.now()}`,
        created_at: new Date().toISOString(),
      };
      all.push(savedTask);
    }

    saveStorage(STORAGE_KEYS.CRM_TASKS, all);

    if (isSupabaseConfigured) {
      try {
        const payload = {
          business_id: businessId,
          client_id: savedTask.client_id || null,
          client_name: savedTask.client_name,
          rule_id: savedTask.rule_id || null,
          origin_event: savedTask.origin_event,
          title: savedTask.title,
          description: savedTask.description,
          status: savedTask.status,
          priority: savedTask.priority,
          due_date: savedTask.due_date,
          assigned_to: savedTask.assigned_to,
          dedup_key: savedTask.dedup_key,
          updated_at: new Date().toISOString(),
        };

        if (savedTask.id.length > 20) {
          const { data } = await supabase
            .from('crm_tasks')
            .update(payload)
            .eq('id', savedTask.id)
            .eq('business_id', businessId)
            .select()
            .single();
          if (data) savedTask.id = data.id;
        } else {
          const { data } = await supabase
            .from('crm_tasks')
            .insert(payload)
            .select()
            .single();
          if (data) savedTask.id = data.id;
        }
      } catch (err) {
        console.error('Error saving CRM task to Supabase:', err);
      }
    }

    return savedTask;
  }

  static async updateCrmTaskStatusAsync(
    businessId: string,
    taskId: string,
    status: CrmTaskStatus
  ): Promise<void> {
    const all = loadStorage<CrmTask[]>(STORAGE_KEYS.CRM_TASKS, initialCrmTasks);
    const idx = all.findIndex((t) => t.id === taskId && t.business_id === businessId);
    if (idx !== -1) {
      all[idx].status = status;
      all[idx].updated_at = new Date().toISOString();
      saveStorage(STORAGE_KEYS.CRM_TASKS, all);
    }

    if (isSupabaseConfigured && taskId.length > 20) {
      try {
        await supabase
          .from('crm_tasks')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', taskId)
          .eq('business_id', businessId);
      } catch (err) {
        console.error('Error updating task status in Supabase:', err);
      }
    }
  }

  static async getCrmNotificationsAsync(businessId: string): Promise<CrmNotification[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('crm_notifications')
          .select('*')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false })
          .limit(50);

        if (!error && data) {
          const formatted: CrmNotification[] = data.map((n: any) => ({
            id: n.id,
            business_id: n.business_id,
            client_id: n.client_id || null,
            title: n.title,
            message: n.message,
            type: n.type || 'opportunity',
            read: n.read ?? false,
            created_at: n.created_at,
          }));
          saveStorage(STORAGE_KEYS.CRM_NOTIFICATIONS, formatted);
          return formatted;
        }
      } catch (err) {
        console.error('Error fetching CRM notifications from Supabase:', err);
      }
    }
    const all = loadStorage<CrmNotification[]>(STORAGE_KEYS.CRM_NOTIFICATIONS, initialCrmNotifications);
    return all.filter((n) => n.business_id === businessId);
  }

  static async markCrmNotificationAsReadAsync(businessId: string, notificationId: string): Promise<void> {
    const all = loadStorage<CrmNotification[]>(STORAGE_KEYS.CRM_NOTIFICATIONS, initialCrmNotifications);
    const idx = all.findIndex((n) => n.id === notificationId && n.business_id === businessId);
    if (idx !== -1) {
      all[idx].read = true;
      saveStorage(STORAGE_KEYS.CRM_NOTIFICATIONS, all);
    }

    if (isSupabaseConfigured && notificationId.length > 20) {
      try {
        await supabase
          .from('crm_notifications')
          .update({ read: true })
          .eq('id', notificationId)
          .eq('business_id', businessId);
      } catch (err) {
        console.error('Error marking notification as read in Supabase:', err);
      }
    }
  }

  static async createCrmNotificationAsync(
    businessId: string,
    notif: Partial<CrmNotification> & { title: string; message: string }
  ): Promise<CrmNotification> {
    const all = loadStorage<CrmNotification[]>(STORAGE_KEYS.CRM_NOTIFICATIONS, initialCrmNotifications);
    const newN: CrmNotification = {
      id: 'notif-' + Date.now(),
      business_id: businessId,
      client_id: notif.client_id || null,
      title: notif.title,
      message: notif.message,
      type: notif.type || 'opportunity',
      read: false,
      created_at: new Date().toISOString(),
    };
    all.unshift(newN);
    saveStorage(STORAGE_KEYS.CRM_NOTIFICATIONS, all);

    if (isSupabaseConfigured) {
      try {
        const payload = {
          business_id: businessId,
          client_id: notif.client_id || null,
          title: notif.title,
          message: notif.message,
          type: notif.type || 'opportunity',
          read: false,
        };
        const { data } = await supabase.from('crm_notifications').insert(payload).select().single();
        if (data) newN.id = data.id;
      } catch (err) {
        console.error('Error creating CRM notification in Supabase:', err);
      }
    }

    return newN;
  }

  static async runCrmAutomationEngineAsync(businessId: string): Promise<{
    opportunities: CrmOpportunity[];
    tasks: CrmTask[];
  }> {
    const rules = await DB.getCrmAutomationRulesAsync(businessId);
    const activeRules = rules.filter((r) => r.is_active);
    const clients = await DB.getClientsAsync(businessId);
    const appointments = await DB.getAppointmentsAsync(businessId);
    const loyaltyCards = await DB.getLoyaltyCardsAsync(businessId);
    const existingTasks = await DB.getCrmTasksAsync(businessId);

    const business = DB.getBusinesses().find((b) => b.id === businessId) || initialBusiness;
    const businessName = business.name || 'StudioFlow';

    const opportunities: CrmOpportunity[] = [];
    const currentYearMonth = new Date().toISOString().slice(0, 7);
    const now = new Date();

    for (const client of clients) {
      const clientApts = appointments.filter((a) => a.client_id === client.id || a.client_whatsapp === client.phone);
      const completedApts = clientApts.filter((a) => a.status === 'CONCLUÍDO');
      const scheduledFutureApts = clientApts.filter(
        (a) => (a.status === 'AGENDADO' || a.status === 'CONFIRMADO') && new Date(a.date) >= new Date(now.toISOString().slice(0, 10))
      );

      let lastVisitDate: string | null = null;
      let daysSinceLastVisit: number | undefined = undefined;
      let lastServiceName = 'Atendimento';

      if (completedApts.length > 0) {
        const sorted = [...completedApts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        lastVisitDate = sorted[0].date;
        lastServiceName = sorted[0].service_name;
        const diffMs = now.getTime() - new Date(lastVisitDate).getTime();
        daysSinceLastVisit = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      }

      const totalSpent = client.total_spent || 0;
      const card = loyaltyCards.find((c) => c.client_id === client.id);
      const loyaltyRewardAvailable = Boolean(card && (card.reward_available || card.current_stamps >= 10));

      let isBirthdayMonth = false;
      if (client.birth_date) {
        const parts = client.birth_date.split('-');
        if (parts.length >= 2) {
          const m = parts[1];
          const currentM = (now.getMonth() + 1).toString().padStart(2, '0');
          isBirthdayMonth = m === currentM;
        }
      }

      for (const rule of activeRules) {
        let isEligible = false;
        let category: CrmOpportunity['category'] = 'Reativar';
        let reason = '';
        let priority: CrmTaskPriority = 'NORMAL';

        switch (rule.event_type) {
          case 'CUSTOMER_AT_RISK':
            if (daysSinceLastVisit !== undefined && daysSinceLastVisit >= (rule.period_days || 45) && daysSinceLastVisit <= 90) {
              isEligible = true;
              category = 'Reativar';
              reason = `Cliente sem visita há ${daysSinceLastVisit} dias (Em Risco)`;
              priority = 'HIGH';
            }
            break;

          case 'CUSTOMER_INACTIVE':
            if (daysSinceLastVisit !== undefined && daysSinceLastVisit > 90) {
              isEligible = true;
              category = 'Reativar';
              reason = `Cliente inativo há ${daysSinceLastVisit} dias`;
              priority = 'HIGH';
            }
            break;

          case 'CUSTOMER_HIGH_VALUE':
            if (totalSpent >= 300) {
              isEligible = true;
              category = 'VIP';
              reason = `Cliente de alto valor com gasto acumulado de R$ ${totalSpent.toFixed(2)}`;
              priority = 'HIGH';
            }
            break;

          case 'BIRTHDAY_APPROACHING':
            if (isBirthdayMonth) {
              isEligible = true;
              category = 'Aniversário';
              reason = 'Aniversariante no mês corrente';
              priority = 'NORMAL';
            }
            break;

          case 'LOYALTY_REWARD_AVAILABLE':
            if (loyaltyRewardAvailable) {
              isEligible = true;
              category = 'Fidelidade';
              reason = 'Possui recompensa do cartão fidelidade pronta para resgate';
              priority = 'URGENT';
            }
            break;

          case 'CUSTOMER_WITHOUT_FUTURE_APPOINTMENT':
            if (completedApts.length > 0 && scheduledFutureApts.length === 0) {
              isEligible = true;
              category = 'Sem próximo agendamento';
              reason = 'Concluiu atendimento mas não possui novo agendamento marcado';
              priority = 'NORMAL';
            }
            break;

          case 'APPOINTMENT_COMPLETED':
            if (daysSinceLastVisit !== undefined && daysSinceLastVisit <= 7) {
              isEligible = true;
              category = 'Pós-atendimento';
              reason = 'Atendimento concluído nos últimos 7 dias';
              priority = 'NORMAL';
            }
            break;

          default:
            break;
        }

        if (isEligible) {
          const messageFormatted = rule.message_template
            .replace(/\{\{nome\}\}/g, client.name)
            .replace(/\{\{empresa\}\}/g, businessName)
            .replace(/\{\{servico\}\}/g, lastServiceName);

          opportunities.push({
            id: `opp-${client.id}-${rule.event_type}`,
            client_id: client.id,
            client_name: client.name,
            client_phone: client.whatsapp || client.phone,
            category,
            reason,
            event_type: rule.event_type,
            last_visit_date: lastVisitDate,
            days_since_last_visit: daysSinceLastVisit,
            total_spent: totalSpent,
            priority,
            message_template: messageFormatted,
            rule_id: rule.id,
          });

          // Deduplication mechanism
          const dedupKey = `${businessId}:${client.id}:${rule.event_type}:${currentYearMonth}`;
          const existing = existingTasks.find(
            (t) => t.dedup_key === dedupKey || (t.client_id === client.id && t.origin_event === rule.event_type && (t.status === 'PENDING' || t.status === 'IN_PROGRESS'))
          );

          if (!existing && rule.action_type === 'CREATE_TASK') {
            const newTask = await DB.saveCrmTaskAsync(businessId, {
              client_id: client.id,
              client_name: client.name,
              rule_id: rule.id,
              origin_event: rule.event_type,
              title: `${category}: ${client.name}`,
              description: `${reason}. Mensagem sugerida: "${messageFormatted}"`,
              status: 'PENDING',
              priority,
              due_date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
              assigned_to: 'Equipe CRM',
              dedup_key: dedupKey,
            });

            await DB.createCrmNotificationAsync(businessId, {
              client_id: client.id,
              title: `Oportunidade CRM: ${category}`,
              message: `${client.name}: ${reason}`,
              type: 'opportunity',
            });

            existingTasks.push(newTask);
          }
        }
      }
    }

    return { opportunities, tasks: existingTasks };
  }

  static async processPostServiceAutomationAsync(
    businessId: string,
    clientId: string,
    _appointmentId: string
  ): Promise<void> {
    const clients = await DB.getClientsAsync(businessId);
    const client = clients.find((c) => c.id === clientId);
    if (client) {
      const appointments = await DB.getAppointmentsAsync(businessId);
      const clientApts = appointments.filter((a) => (a.client_id === clientId || a.client_whatsapp === client.phone) && a.status === 'CONCLUÍDO');
      const totalCount = clientApts.length;
      const totalSpentCalculated = clientApts.reduce((acc, a) => acc + (a.price || 0), 0);

      await DB.saveClientAsync({
        ...client,
        id: client.id,
        business_id: businessId,
        total_appointments: totalCount,
        total_spent: totalSpentCalculated,
      });
    }

    await DB.runCrmAutomationEngineAsync(businessId);
  }

  // Backup & Restore Utilities
  static exportDBBackup(): string {
    const backup: Record<string, any> = {};
    Object.entries(STORAGE_KEYS).forEach(([_, storageKey]) => {
      try {
        const item = localStorage.getItem(storageKey);
        if (item) {
          backup[storageKey] = JSON.parse(item);
        }
      } catch (e) {
        console.error(`Error backing up key ${storageKey}`, e);
      }
    });
    return JSON.stringify({
      version: '1.0',
      exportedAt: new Date().toISOString(),
      data: backup
    }, null, 2);
  }

  static importDBBackup(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      const data = parsed.data || parsed;
      Object.entries(data).forEach(([key, val]) => {
        try {
          localStorage.setItem(key, JSON.stringify(val));
        } catch (e) {
          console.error(`Error restoring key ${key}`, e);
        }
      });
      return true;
    } catch (e) {
      console.error('Error importing backup:', e);
      return false;
    }
  }
}

// Auto-run DB init on import
DB.init();
