/**
 * STUDIOFLOW V1.0 - Types & Interfaces
 */

export type UserRole = 'SUPER_ADMIN' | 'OWNER' | 'ADMIN' | 'RECEPTIONIST' | 'PROFESSIONAL';

export type BusinessType =
  | 'Barbearia'
  | 'Salão'
  | 'Barbearia + Salão'
  | 'Estética'
  | 'Manicure'
  | 'Studio'
  | 'Outro';

export type SubscriptionPlanId = 'basic' | 'professional' | 'premium';
export type SaaSPlan = SubscriptionPlanId;
export type NavigationTab = ActiveTab;
export type AnamneseRecord = Anamnese;

export type SubscriptionStatus =
  | 'TRIAL'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'SUSPENDED';

export type FeatureKey =
  | 'AGENDA'
  | 'AGENDAMENTO_ONLINE'
  | 'CLIENTES'
  | 'PROFISSIONAIS'
  | 'SERVICOS'
  | 'CAIXA'
  | 'VENDAS'
  | 'COMISSOES'
  | 'FINANCEIRO'
  | 'FIDELIDADE'
  | 'CRM'
  | 'MARKETING'
  | 'AUTOMACOES_CRM'
  | 'RELATORIOS'
  | 'GALERIA'
  | 'ANAMNESE'
  | 'PWA';

export interface PlanLimits {
  maxProfessionals: number;
  maxClients: number;
  maxMonthlyAppointments: number;
  maxStorageMb?: number;
}

export interface PlanDefinition {
  id: SaaSPlan;
  name: string;
  description: string;
  priceMonthly: string;
  priceNumeric: number;
  isActive: boolean;
  limits: PlanLimits;
  features: FeatureKey[];
}

export interface CompanySubscription {
  id: string;
  business_id: string;
  plan_id: SaaSPlan;
  status: SubscriptionStatus;
  started_at: string;
  expires_at?: string | null;
  trial_started_at?: string | null;
  trial_ends_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UsageStats {
  clientCount: number;
  professionalCount: number;
  monthlyAppointmentCount: number;
  limits: PlanLimits;
  clientUsagePercent: number;
  professionalUsagePercent: number;
  appointmentUsagePercent: number;
}

export interface Business {
  id: string;
  name: string;
  type: BusinessType;
  owner_name: string;
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  logo_url?: string;
  slug: string;
  plan: SubscriptionPlanId;
  created_at: string;
  updated_at: string;
  // Settings
  cancellation_policy?: string;
  min_advance_time_hours?: number;
  slot_duration_minutes?: number;
}

export interface BusinessHours {
  id: string;
  business_id: string;
  day_of_week: number; // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  open_time: string; // "08:00"
  close_time: string; // "19:00"
  is_open: boolean;
}

export interface UserProfile {
  id: string;
  business_id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  avatar_url?: string;
  professional_id?: string;
  theme_preference?: 'light' | 'dark';
  created_at: string;
}

export interface Professional {
  id: string;
  business_id: string;
  name: string;
  photo_url?: string;
  phone: string;
  whatsapp: string;
  email: string;
  specialty: string;
  commission_rate: number; // percentage e.g. 40
  status: 'active' | 'inactive';
  created_at: string;
}

export interface Client {
  id: string;
  business_id: string;
  name: string;
  phone: string;
  whatsapp: string;
  email?: string;
  birth_date?: string; // YYYY-MM-DD
  address?: string;
  notes?: string;
  total_appointments?: number;
  total_spent?: number;
  last_appointment_at?: string;
  created_at: string;
  updated_at: string;
}

export type ServiceCategory =
  | 'Barbearia'
  | 'Cabelo'
  | 'Manicure'
  | 'Pedicure'
  | 'Sobrancelha'
  | 'Estética'
  | 'Outros';

export interface Service {
  id: string;
  business_id: string;
  category: ServiceCategory;
  name: string;
  description?: string;
  price: number;
  duration_minutes: number;
  commission_rate: number; // percentage
  image_url?: string;
  active: boolean;
  created_at: string;
}

export type AppointmentStatus =
  | 'AGENDADO'
  | 'CONFIRMADO'
  | 'EM_ATENDIMENTO'
  | 'CONCLUÍDO'
  | 'CANCELADO'
  | 'NO_SHOW';

export interface Appointment {
  id: string;
  business_id: string;
  client_id: string;
  client_name: string;
  client_whatsapp: string;
  professional_id: string;
  professional_name: string;
  service_id: string;
  service_name: string;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  duration_minutes: number;
  price: number;
  commission_amount: number;
  status: AppointmentStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type PaymentMethod = 'dinheiro' | 'pix' | 'debito' | 'credito';

export interface SalePayment {
  id?: string;
  method: PaymentMethod;
  amount: number;
}

export interface Sale {
  id: string;
  business_id: string;
  client_id?: string;
  client_name?: string;
  professional_id?: string;
  appointment_id?: string;
  total_amount: number;
  discount: number;
  final_amount: number;
  payment_method: PaymentMethod;
  payments?: SalePayment[];
  status: 'PENDENTE' | 'PAGO' | 'CANCELADO';
  created_at: string;
  items: SaleItem[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  item_type: 'service' | 'product';
  item_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface CashRegister {
  id: string;
  business_id: string;
  opened_at: string;
  closed_at?: string;
  initial_amount: number;
  final_amount_expected: number;
  final_amount_reported?: number;
  difference?: number;
  status: 'OPEN' | 'CLOSED';
  opened_by_name: string;
  sales_summary: {
    dinheiro: number;
    pix: number;
    debito: number;
    credito: number;
    total: number;
  };
}

export type CashTransactionType = 'ENTRY' | 'EXIT' | 'SANGRIA' | 'SUPRIMENTO';

export interface CashTransaction {
  id: string;
  cash_register_id: string;
  business_id: string;
  type: CashTransactionType;
  description: string;
  amount: number;
  payment_method?: PaymentMethod;
  created_at: string;
}

export type ExpenseCategory =
  | 'Aluguel'
  | 'Água'
  | 'Energia'
  | 'Internet'
  | 'Produtos'
  | 'Salários'
  | 'Marketing'
  | 'Impostos'
  | 'Outros';

export interface Expense {
  id: string;
  business_id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  date: string;
  status: 'PAGO' | 'PENDENTE';
  created_at: string;
}

export interface Commission {
  id: string;
  business_id: string;
  professional_id: string;
  professional_name: string;
  appointment_id?: string;
  service_name?: string;
  service_price: number;
  percentage: number;
  amount: number;
  date: string;
  status: 'PENDENTE' | 'PAGO';
  created_at: string;
}

export interface LoyaltyProgram {
  id: string;
  business_id: string;
  is_active: boolean;
  required_stamps: number; // e.g., 10
  reward_description: string; // e.g., "1 Corte Masculino grátis"
  discount_type: 'free_service' | 'fixed' | 'percent';
  discount_value: number; // 100 for free_service or fixed amount
  validity_days: number;
}

export interface LoyaltyCard {
  id: string;
  business_id: string;
  client_id: string;
  client_name: string;
  current_stamps: number;
  total_completed: number;
  reward_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoyaltyTransaction {
  id: string;
  business_id: string;
  client_id: string;
  appointment_id?: string;
  stamps_added: number;
  action: 'STAMP' | 'REDEEM';
  description: string;
  created_at: string;
}

export interface Anamnese {
  id: string;
  business_id: string;
  client_id: string;
  hair_type?: string;
  chemical_history?: string;
  allergies?: string;
  preferences?: string;
  skincare_concerns?: string;
  notes?: string;
  updated_at: string;
}

export interface GalleryItem {
  id: string;
  business_id: string;
  title: string;
  category: 'Cortes' | 'Barbas' | 'Cabelos' | 'Unhas' | 'Sobrancelhas' | 'Estética';
  image_url: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  business_id: string;
  user_name: string;
  action: string;
  entity: string;
  details: string;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  business_id: string;
  title: string;
  message: string;
  type: 'appointment' | 'loyalty' | 'cash' | 'system';
  read: boolean;
  created_at: string;
}

export type CampaignStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

export type CampaignType = 'REACTIVATION' | 'BIRTHDAY' | 'RELATIONSHIP' | 'PROMOTIONAL';

export type CampaignSegment =
  | 'TODOS'
  | 'NOVOS'
  | 'ATIVOS'
  | 'EM_RISCO'
  | 'INATIVOS'
  | 'NUNCA_VISITARAM'
  | 'ALTO_VALOR'
  | 'ANIVERSARIANTES';

export interface MarketingCampaign {
  id: string;
  business_id: string;
  title: string;
  description?: string;
  campaign_type: CampaignType;
  segment: CampaignSegment;
  message_template: string;
  status: CampaignStatus;
  start_date?: string | null;
  end_date?: string | null;
  advance_days?: number;
  sent_count?: number;
  created_at: string;
  updated_at?: string;
}

export interface CampaignClientLog {
  id: string;
  business_id: string;
  campaign_id: string;
  client_id: string;
  client_name: string;
  action: 'OPENED_WHATSAPP';
  created_at: string;
}

// --- FASE 5C CRM AUTOMATIONS TYPES ---

export type CrmEventType =
  | 'APPOINTMENT_COMPLETED'
  | 'CUSTOMER_AT_RISK'
  | 'CUSTOMER_INACTIVE'
  | 'CUSTOMER_HIGH_VALUE'
  | 'BIRTHDAY_APPROACHING'
  | 'LOYALTY_REWARD_AVAILABLE'
  | 'CUSTOMER_WITHOUT_FUTURE_APPOINTMENT';

export type CrmActionType = 'CREATE_TASK' | 'OPEN_WHATSAPP' | 'SHOW_NOTIFICATION';

export type CrmTaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type CrmTaskPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface CrmAutomationRule {
  id: string;
  business_id: string;
  name: string;
  event_type: CrmEventType;
  is_active: boolean;
  period_days: number;
  message_template: string;
  action_type: CrmActionType;
  created_at: string;
  updated_at?: string;
}

export interface CrmTask {
  id: string;
  business_id: string;
  client_id?: string | null;
  client_name: string;
  rule_id?: string | null;
  origin_event: CrmEventType;
  title: string;
  description: string;
  status: CrmTaskStatus;
  priority: CrmTaskPriority;
  due_date?: string | null;
  assigned_to?: string | null;
  dedup_key: string;
  created_at: string;
  updated_at?: string;
}

export interface CrmNotification {
  id: string;
  business_id: string;
  client_id?: string | null;
  title: string;
  message: string;
  type: 'opportunity' | 'task' | 'system';
  read: boolean;
  created_at: string;
}

export interface CrmOpportunity {
  id: string;
  client_id: string;
  client_name: string;
  client_phone: string;
  category: 'Reativar' | 'Aniversário' | 'VIP' | 'Fidelidade' | 'Pós-atendimento' | 'Sem próximo agendamento';
  reason: string;
  event_type: CrmEventType;
  last_visit_date?: string | null;
  days_since_last_visit?: number;
  total_spent: number;
  priority: CrmTaskPriority;
  message_template: string;
  rule_id?: string;
}

export interface BlockedTime {
  id: string;
  business_id: string;
  professional_id: string;
  date: string;
  start_time: string;
  end_time: string;
  reason: string;
}

export type ActiveTab =
  | 'dashboard'
  | 'agenda'
  | 'clientes'
  | 'profissionais'
  | 'servicos'
  | 'vendas'
  | 'caixa'
  | 'financeiro'
  | 'comissoes'
  | 'fidelidade'
  | 'relatorios'
  | 'galeria'
  | 'anamnese'
  | 'agendamento_online'
  | 'whatsapp'
  | 'marketing'
  | 'assinatura'
  | 'configuracoes';
