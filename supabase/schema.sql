-- ====================================================================
-- STUDIOFLOW V1.0 - SUPABASE POSTGRESQL SCHEMA & MULTI-TENANT RLS POLICIES
-- ====================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================================================
-- 1. TABELAS DE ORGANIZAÇÃO & AUTENTICAÇÃO
-- ====================================================================

-- Business / Estabelecimentos
CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    type VARCHAR(50) DEFAULT 'barbearia',
    phone VARCHAR(50),
    whatsapp VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(10),
    logo_url TEXT,
    plan VARCHAR(50) DEFAULT 'professional',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Profiles (Vinculados ao Supabase Auth user_id via id = auth.uid())
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'OWNER', -- OWNER, ADMIN, PROFESSIONAL, RECEPTIONIST
    phone VARCHAR(50),
    avatar_url TEXT,
    theme_preference VARCHAR(20) DEFAULT 'light', -- 'light' or 'dark'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Business Settings
CREATE TABLE IF NOT EXISTS public.business_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID UNIQUE NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    online_booking_enabled BOOLEAN DEFAULT TRUE,
    require_prepayment BOOLEAN DEFAULT FALSE,
    cancellation_policy TEXT,
    notification_whatsapp BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Business Hours
CREATE TABLE IF NOT EXISTS public.business_hours (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL, -- 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
    is_open BOOLEAN DEFAULT TRUE,
    open_time TIME,
    close_time TIME,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID UNIQUE NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    plan_id VARCHAR(50) NOT NULL DEFAULT 'professional',
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, past_due, canceled
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================================================================
-- 2. CADASTROS DE BASE (PROFISSIONAIS, SERVIÇOS, CLIENTES)
-- ====================================================================

-- Profissionais
CREATE TABLE IF NOT EXISTS public.professionals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(100),
    phone VARCHAR(50),
    email VARCHAR(255),
    avatar VARCHAR(255),
    commission_rate NUMERIC(5,2) DEFAULT 0,
    color VARCHAR(20) DEFAULT '#7c3aed',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Serviços
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL DEFAULT 0,
    duration_minutes INT NOT NULL DEFAULT 30,
    category VARCHAR(100) DEFAULT 'Geral',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clientes
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    whatsapp VARCHAR(50),
    email VARCHAR(255),
    birth_date DATE,
    notes TEXT,
    total_spent NUMERIC(10,2) DEFAULT 0,
    total_appointments INT DEFAULT 0,
    last_visit TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================================================================
-- 3. AGENDA & AGENDAMENTOS
-- ====================================================================

-- Agendamentos
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    client_name VARCHAR(255) NOT NULL,
    client_phone VARCHAR(50) NOT NULL,
    professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
    professional_name VARCHAR(255),
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    service_name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_minutes INT DEFAULT 30,
    price NUMERIC(10,2) NOT NULL DEFAULT 0,
    status VARCHAR(50) DEFAULT 'SCHEDULED', -- SCHEDULED, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELED, NO_SHOW
    notes TEXT,
    payment_status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, PAID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index de conflito de agenda
CREATE INDEX IF NOT EXISTS idx_appointments_conflict 
ON public.appointments (business_id, professional_id, date, start_time, status);

-- ====================================================================
-- 4. CAIXA, VENDAS & FINANCEIRO
-- ====================================================================

-- Registros/Sessões de Caixa (Open/Close)
CREATE TABLE IF NOT EXISTS public.cash_registers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    opened_by UUID REFERENCES public.user_profiles(id),
    closed_by UUID REFERENCES public.user_profiles(id),
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closed_at TIMESTAMP WITH TIME ZONE,
    initial_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    final_amount NUMERIC(10,2),
    status VARCHAR(20) DEFAULT 'OPEN', -- OPEN, CLOSED
    notes TEXT
);

-- Movimentações de Caixa
CREATE TABLE IF NOT EXISTS public.cash_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    cash_register_id UUID REFERENCES public.cash_registers(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL, -- IN (Suprimento / Entrada), OUT (Sangria / Saída)
    amount NUMERIC(10,2) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vendas
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    client_name VARCHAR(255),
    professional_id UUID REFERENCES public.professionals(id) ON DELETE SET NULL,
    total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    discount NUMERIC(10,2) DEFAULT 0,
    final_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    status VARCHAR(50) DEFAULT 'COMPLETED', -- COMPLETED, CANCELED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Itens de Venda
CREATE TABLE IF NOT EXISTS public.sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    item_type VARCHAR(50) NOT NULL, -- SERVICE, PRODUCT
    item_id UUID,
    name VARCHAR(255) NOT NULL,
    quantity INT DEFAULT 1,
    unit_price NUMERIC(10,2) NOT NULL,
    total_price NUMERIC(10,2) NOT NULL
);

-- Pagamentos da Venda
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    method VARCHAR(50) NOT NULL, -- PIX, CREDIT_CARD, DEBIT_CARD, CASH, LOYALTY
    amount NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Despesas/Contas a Pagar
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    category VARCHAR(100) DEFAULT 'Outros',
    due_date DATE NOT NULL,
    paid_date DATE,
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, PAID, OVERDUE
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comissões
CREATE TABLE IF NOT EXISTS public.commissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
    sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL,
    rate NUMERIC(5,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, PAID
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================================================================
-- 5. FIDELIDADE, ANAMNESE, GALERIA & MARKETING
-- ====================================================================

-- Programa de Fidelidade
CREATE TABLE IF NOT EXISTS public.loyalty_programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID UNIQUE NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    required_stamps INT DEFAULT 10,
    reward_description VARCHAR(255) DEFAULT '1 Corte Grátis',
    discount_type VARCHAR(50) DEFAULT 'free_service',
    discount_value NUMERIC(10,2) DEFAULT 100,
    validity_days INT DEFAULT 90,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cartões de Fidelidade do Cliente
CREATE TABLE IF NOT EXISTS public.loyalty_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    current_stamps INT DEFAULT 0,
    total_rewards_earned INT DEFAULT 0,
    reward_available BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(business_id, client_id)
);

-- Ficha de Anamnese
CREATE TABLE IF NOT EXISTS public.anamnesis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    allergies TEXT,
    hair_type VARCHAR(100),
    chemical_history TEXT,
    preferences TEXT,
    notes TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.anamnesis_fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    anamnesis_id UUID NOT NULL REFERENCES public.anamnesis(id) ON DELETE CASCADE,
    field_name VARCHAR(255) NOT NULL,
    field_value TEXT
);

-- Galeria de Fotos / Portfólio
CREATE TABLE IF NOT EXISTS public.gallery_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    title VARCHAR(255),
    description TEXT,
    image_url TEXT NOT NULL,
    client_name VARCHAR(255),
    service_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Campanhas de Marketing
CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    message_template TEXT NOT NULL,
    target_audience VARCHAR(100) DEFAULT 'TODOS',
    segment VARCHAR(100) DEFAULT 'TODOS',
    campaign_type VARCHAR(50) DEFAULT 'REACTIVATION',
    status VARCHAR(50) DEFAULT 'DRAFT',
    start_date DATE,
    end_date DATE,
    advance_days INT DEFAULT 0,
    sent_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Regras de Automação CRM (Fase 5C)
CREATE TABLE IF NOT EXISTS public.crm_automation_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    period_days INT DEFAULT 0,
    message_template TEXT NOT NULL,
    action_type VARCHAR(50) DEFAULT 'CREATE_TASK',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tarefas CRM (Fase 5C)
CREATE TABLE IF NOT EXISTS public.crm_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    client_name VARCHAR(255) NOT NULL,
    rule_id UUID REFERENCES public.crm_automation_rules(id) ON DELETE SET NULL,
    origin_event VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'PENDING',
    priority VARCHAR(50) DEFAULT 'NORMAL',
    due_date DATE,
    assigned_to VARCHAR(255),
    dedup_key VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notificações Internas CRM (Fase 5C)
CREATE TABLE IF NOT EXISTS public.crm_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'opportunity',
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================================================================
-- 6. SEGURANÇA MULTI-TENANT (ROW LEVEL SECURITY - RLS)
-- ====================================================================

-- Função para obter o business_id do usuário autenticado no Supabase Auth
CREATE OR REPLACE FUNCTION public.get_auth_business_id()
RETURNS UUID AS $$
  SELECT business_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Habilitar RLS nas tabelas
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anamnesis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anamnesis_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_notifications ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS RLS: BUSINESSES
CREATE POLICY "Users can view their own business" ON public.businesses
  FOR SELECT USING (id = public.get_auth_business_id());

CREATE POLICY "Users can update their own business" ON public.businesses
  FOR UPDATE USING (id = public.get_auth_business_id());

CREATE POLICY "Authenticated user can create a business" ON public.businesses
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- POLÍTICAS RLS: USER PROFILES
CREATE POLICY "User can view profiles in same business" ON public.user_profiles
  FOR SELECT USING (business_id = public.get_auth_business_id() OR id = auth.uid());

CREATE POLICY "User can insert own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "User can update own profile" ON public.user_profiles
  FOR UPDATE USING (id = auth.uid());

-- MACRO PARA CRIAR POLÍTICAS DE RLS PADRÃO BASEADAS EM business_id
-- (Aplica-se a: clients, professionals, services, appointments, sales, expenses, etc.)

-- CLIENTES
CREATE POLICY "Tenant select clients" ON public.clients FOR SELECT USING (business_id = public.get_auth_business_id());
CREATE POLICY "Tenant insert clients" ON public.clients FOR INSERT WITH CHECK (business_id = public.get_auth_business_id());
CREATE POLICY "Tenant update clients" ON public.clients FOR UPDATE USING (business_id = public.get_auth_business_id());
CREATE POLICY "Tenant delete clients" ON public.clients FOR DELETE USING (business_id = public.get_auth_business_id());

-- PROFISSIONAIS
CREATE POLICY "Tenant select professionals" ON public.professionals FOR SELECT USING (business_id = public.get_auth_business_id());
CREATE POLICY "Tenant insert professionals" ON public.professionals FOR INSERT WITH CHECK (business_id = public.get_auth_business_id());
CREATE POLICY "Tenant update professionals" ON public.professionals FOR UPDATE USING (business_id = public.get_auth_business_id());
CREATE POLICY "Tenant delete professionals" ON public.professionals FOR DELETE USING (business_id = public.get_auth_business_id());

-- SERVIÇOS
CREATE POLICY "Tenant select services" ON public.services FOR SELECT USING (business_id = public.get_auth_business_id());
CREATE POLICY "Tenant insert services" ON public.services FOR INSERT WITH CHECK (business_id = public.get_auth_business_id());
CREATE POLICY "Tenant update services" ON public.services FOR UPDATE USING (business_id = public.get_auth_business_id());
CREATE POLICY "Tenant delete services" ON public.services FOR DELETE USING (business_id = public.get_auth_business_id());

-- AGENDAMENTOS
CREATE POLICY "Tenant select appointments" ON public.appointments FOR SELECT USING (business_id = public.get_auth_business_id());
CREATE POLICY "Tenant insert appointments" ON public.appointments FOR INSERT WITH CHECK (business_id = public.get_auth_business_id());
CREATE POLICY "Tenant update appointments" ON public.appointments FOR UPDATE USING (business_id = public.get_auth_business_id());
CREATE POLICY "Tenant delete appointments" ON public.appointments FOR DELETE USING (business_id = public.get_auth_business_id());

-- VENDAS & ITENS & PAGAMENTOS
CREATE POLICY "Tenant select sales" ON public.sales FOR SELECT USING (business_id = public.get_auth_business_id());
CREATE POLICY "Tenant insert sales" ON public.sales FOR INSERT WITH CHECK (business_id = public.get_auth_business_id());
CREATE POLICY "Tenant update sales" ON public.sales FOR UPDATE USING (business_id = public.get_auth_business_id());

CREATE POLICY "Tenant select sale_items" ON public.sale_items FOR SELECT USING (business_id = public.get_auth_business_id());
CREATE POLICY "Tenant insert sale_items" ON public.sale_items FOR INSERT WITH CHECK (business_id = public.get_auth_business_id());

CREATE POLICY "Tenant select payments" ON public.payments FOR SELECT USING (business_id = public.get_auth_business_id());
CREATE POLICY "Tenant insert payments" ON public.payments FOR INSERT WITH CHECK (business_id = public.get_auth_business_id());

-- CAIXA
CREATE POLICY "Tenant select cash_registers" ON public.cash_registers FOR SELECT USING (business_id = public.get_auth_business_id());
CREATE POLICY "Tenant insert cash_registers" ON public.cash_registers FOR INSERT WITH CHECK (business_id = public.get_auth_business_id());
CREATE POLICY "Tenant update cash_registers" ON public.cash_registers FOR UPDATE USING (business_id = public.get_auth_business_id());

-- MOVIMENTAÇÕES DE CAIXA
CREATE POLICY "Tenant select cash_movements" ON public.cash_movements FOR SELECT USING (business_id = public.get_auth_business_id());
CREATE POLICY "Tenant insert cash_movements" ON public.cash_movements FOR INSERT WITH CHECK (business_id = public.get_auth_business_id());

-- DESPESAS
CREATE POLICY "Tenant select expenses" ON public.expenses FOR SELECT USING (business_id = public.get_auth_business_id());
CREATE POLICY "Tenant insert expenses" ON public.expenses FOR INSERT WITH CHECK (business_id = public.get_auth_business_id());
CREATE POLICY "Tenant update expenses" ON public.expenses FOR UPDATE USING (business_id = public.get_auth_business_id());
CREATE POLICY "Tenant delete expenses" ON public.expenses FOR DELETE USING (business_id = public.get_auth_business_id());

-- COMISSÕES
CREATE POLICY "Tenant select commissions" ON public.commissions FOR SELECT USING (business_id = public.get_auth_business_id());
CREATE POLICY "Tenant insert commissions" ON public.commissions FOR INSERT WITH CHECK (business_id = public.get_auth_business_id());
CREATE POLICY "Tenant update commissions" ON public.commissions FOR UPDATE USING (business_id = public.get_auth_business_id());

-- FIDELIDADE
CREATE POLICY "Tenant select loyalty_programs" ON public.loyalty_programs FOR SELECT USING (business_id = public.get_auth_business_id());
CREATE POLICY "Tenant insert loyalty_programs" ON public.loyalty_programs FOR INSERT WITH CHECK (business_id = public.get_auth_business_id());
CREATE POLICY "Tenant update loyalty_programs" ON public.loyalty_programs FOR UPDATE USING (business_id = public.get_auth_business_id());

CREATE POLICY "Tenant select loyalty_cards" ON public.loyalty_cards FOR SELECT USING (business_id = public.get_auth_business_id());
CREATE POLICY "Tenant insert loyalty_cards" ON public.loyalty_cards FOR INSERT WITH CHECK (business_id = public.get_auth_business_id());
CREATE POLICY "Tenant update loyalty_cards" ON public.loyalty_cards FOR UPDATE USING (business_id = public.get_auth_business_id());

-- ANAMNESE
CREATE POLICY "Tenant select anamnesis" ON public.anamnesis FOR SELECT USING (business_id = public.get_auth_business_id());
CREATE POLICY "Tenant insert anamnesis" ON public.anamnesis FOR INSERT WITH CHECK (business_id = public.get_auth_business_id());
CREATE POLICY "Tenant update anamnesis" ON public.anamnesis FOR UPDATE USING (business_id = public.get_auth_business_id());

-- GALERIA & MARKETING
CREATE POLICY "Tenant select gallery_items" ON public.gallery_items FOR SELECT USING (business_id = public.get_auth_business_id());
CREATE POLICY "Tenant insert gallery_items" ON public.gallery_items FOR INSERT WITH CHECK (business_id = public.get_auth_business_id());
CREATE POLICY "Tenant delete gallery_items" ON public.gallery_items FOR DELETE USING (business_id = public.get_auth_business_id());

CREATE POLICY "Tenant select marketing_campaigns" ON public.marketing_campaigns FOR SELECT USING (business_id = public.get_auth_business_id());
CREATE POLICY "Tenant insert marketing_campaigns" ON public.marketing_campaigns FOR INSERT WITH CHECK (business_id = public.get_auth_business_id());
CREATE POLICY "Tenant update marketing_campaigns" ON public.marketing_campaigns FOR UPDATE USING (business_id = public.get_auth_business_id());
CREATE POLICY "Tenant delete marketing_campaigns" ON public.marketing_campaigns FOR DELETE USING (business_id = public.get_auth_business_id());

-- CRM AUTOMATION RULES
CREATE POLICY "Tenant select crm_automation_rules" ON public.crm_automation_rules FOR SELECT USING (business_id = public.get_auth_business_id());
CREATE POLICY "Tenant insert crm_automation_rules" ON public.crm_automation_rules FOR INSERT WITH CHECK (business_id = public.get_auth_business_id());
CREATE POLICY "Tenant update crm_automation_rules" ON public.crm_automation_rules FOR UPDATE USING (business_id = public.get_auth_business_id());
CREATE POLICY "Tenant delete crm_automation_rules" ON public.crm_automation_rules FOR DELETE USING (business_id = public.get_auth_business_id());

-- CRM TASKS
CREATE POLICY "Tenant select crm_tasks" ON public.crm_tasks FOR SELECT USING (business_id = public.get_auth_business_id());
CREATE POLICY "Tenant insert crm_tasks" ON public.crm_tasks FOR INSERT WITH CHECK (business_id = public.get_auth_business_id());
CREATE POLICY "Tenant update crm_tasks" ON public.crm_tasks FOR UPDATE USING (business_id = public.get_auth_business_id());
CREATE POLICY "Tenant delete crm_tasks" ON public.crm_tasks FOR DELETE USING (business_id = public.get_auth_business_id());

-- CRM NOTIFICATIONS
CREATE POLICY "Tenant select crm_notifications" ON public.crm_notifications FOR SELECT USING (business_id = public.get_auth_business_id());
CREATE POLICY "Tenant insert crm_notifications" ON public.crm_notifications FOR INSERT WITH CHECK (business_id = public.get_auth_business_id());
CREATE POLICY "Tenant update crm_notifications" ON public.crm_notifications FOR UPDATE USING (business_id = public.get_auth_business_id());
CREATE POLICY "Tenant delete crm_notifications" ON public.crm_notifications FOR DELETE USING (business_id = public.get_auth_business_id());

-- AGENDAMENTO PÚBLICO (Acesso Anônimo Aberto apenas para leitura de estabelecimento, horários, profissionais e criação de agendamento online)
CREATE POLICY "Public read business by slug" ON public.businesses FOR SELECT TO anon USING (true);
CREATE POLICY "Public read services" ON public.services FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "Public read professionals" ON public.professionals FOR SELECT TO anon USING (is_active = true);

-- Função de validação rigorosa para criação de agendamentos (proteção contra forgery e sobreposição)
CREATE OR REPLACE FUNCTION public.validate_appointment_insert()
RETURNS TRIGGER AS $$
DECLARE
    v_service_price NUMERIC;
    v_prof_business_id UUID;
    v_service_business_id UUID;
    v_conflict_count INT;
BEGIN
    -- 1. Se criado por usuário anônimo (cliente público), forçar valores seguros para campos internos
    IF auth.role() = 'anon' THEN
        NEW.status := 'SCHEDULED';
        NEW.payment_status := 'PENDING';
    END IF;

    -- 2. Validar se o profissional pertence ao mesmo business_id informado
    SELECT business_id INTO v_prof_business_id FROM public.professionals WHERE id = NEW.professional_id;
    IF v_prof_business_id IS NULL OR v_prof_business_id <> NEW.business_id THEN
        RAISE EXCEPTION 'Profissional inválido ou não pertence a este estabelecimento.';
    END IF;

    -- 3. Validar se o serviço pertence ao mesmo business_id e travar o preço real do serviço
    IF NEW.service_id IS NOT NULL THEN
        SELECT business_id, price INTO v_service_business_id, v_service_price FROM public.services WHERE id = NEW.service_id;
        IF v_service_business_id IS NULL OR v_service_business_id <> NEW.business_id THEN
            RAISE EXCEPTION 'Serviço inválido ou não pertence a este estabelecimento.';
        END IF;
        
        -- Travar valor oficial do serviço para requisições anônimas
        IF auth.role() = 'anon' AND v_service_price IS NOT NULL THEN
            NEW.price := v_service_price;
        END IF;
    END IF;

    -- 4. Prevenção de conflito de horário para o mesmo profissional na mesma data
    SELECT COUNT(*) INTO v_conflict_count
    FROM public.appointments
    WHERE business_id = NEW.business_id
      AND professional_id = NEW.professional_id
      AND date = NEW.date
      AND status NOT IN ('CANCELED', 'CANCELADO')
      AND (id IS NULL OR id <> NEW.id)
      AND GREATEST(NEW.start_time, start_time) < LEAST(NEW.end_time, end_time);

    IF v_conflict_count > 0 THEN
        RAISE EXCEPTION 'Conflito de horário detectado: este profissional já possui atendimento neste intervalo.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_validate_appointment_insert ON public.appointments;
CREATE TRIGGER trg_validate_appointment_insert
BEFORE INSERT ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.validate_appointment_insert();

-- Política RLS Restritiva para inserção pública de agendamento
DROP POLICY IF EXISTS "Public insert appointment" ON public.appointments;
CREATE POLICY "Public insert appointment" ON public.appointments 
  FOR INSERT TO anon 
  WITH CHECK (
    business_id IS NOT NULL 
    AND professional_id IS NOT NULL 
    AND service_id IS NOT NULL 
    AND date >= CURRENT_DATE
  );

-- ====================================================================
-- 7. FASE 3C: OPERAÇÃO FINANCEIRA ATÔMICA & IDEMPOTÊNCIA (RPC)
-- ====================================================================

ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_idempotency ON public.sales (business_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.process_sale_transaction(
    p_idempotency_key TEXT DEFAULT NULL,
    p_client_id UUID DEFAULT NULL,
    p_client_name TEXT DEFAULT NULL,
    p_professional_id UUID DEFAULT NULL,
    p_appointment_id UUID DEFAULT NULL,
    p_items JSONB DEFAULT '[]'::jsonb,
    p_payments JSONB DEFAULT '[]'::jsonb,
    p_discount NUMERIC DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_business_id UUID;
    v_existing_sale_id UUID;
    v_cash_register_id UUID;
    v_sale_id UUID;
    v_subtotal NUMERIC := 0;
    v_final_amount NUMERIC := 0;
    v_payments_total NUMERIC := 0;
    v_item RECORD;
    v_payment RECORD;
    v_official_price NUMERIC;
    v_item_price NUMERIC;
    v_item_qty INT;
    v_comm_rate NUMERIC := 40;
    v_comm_amount NUMERIC := 0;
BEGIN
    -- 1. Validar usuário e obter business_id do token
    v_business_id := public.get_auth_business_id();
    IF v_business_id IS NULL THEN
        RAISE EXCEPTION 'Não autorizado ou estabelecimento não configurado para o usuário atual.';
    END IF;

    -- 2. Proteção de Idempotência (Duplo clique / Reenvio)
    IF p_idempotency_key IS NOT NULL AND TRIM(p_idempotency_key) <> '' THEN
        SELECT id INTO v_existing_sale_id
        FROM public.sales
        WHERE business_id = v_business_id AND idempotency_key = TRIM(p_idempotency_key);

        IF FOUND THEN
            RETURN jsonb_build_object(
                'success', true,
                'sale_id', v_existing_sale_id,
                'already_processed', true,
                'message', 'Operação já processada anteriormente.'
            );
        END IF;
    END IF;

    -- 3. Confirmar se existe caixa aberto para a empresa
    SELECT id INTO v_cash_register_id
    FROM public.cash_registers
    WHERE business_id = v_business_id AND status = 'OPEN'
    LIMIT 1;

    IF v_cash_register_id IS NULL THEN
        RAISE EXCEPTION 'Não existe caixa aberto para este estabelecimento. Abra o caixa para registrar movimentações.';
    END IF;

    -- 4. Validar itens e calcular subtotal (conferindo com preço oficial do serviço)
    IF jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'A venda deve conter pelo menos um item.';
    END IF;

    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
        item_type text,
        item_id uuid,
        name text,
        quantity int,
        unit_price numeric
    )
    LOOP
        v_item_qty := COALESCE(v_item.quantity, 1);
        IF v_item_qty <= 0 THEN
            RAISE EXCEPTION 'A quantidade do item deve ser maior que zero.';
        END IF;

        v_item_price := COALESCE(v_item.unit_price, 0);

        -- Validar preço oficial se for serviço cadastrado
        IF UPPER(COALESCE(v_item.item_type, 'SERVICE')) = 'SERVICE' AND v_item.item_id IS NOT NULL THEN
            SELECT price INTO v_official_price
            FROM public.services
            WHERE id = v_item.item_id AND business_id = v_business_id;

            IF FOUND THEN
                v_item_price := v_official_price;
            END IF;
        END IF;

        IF v_item_price < 0 THEN
            RAISE EXCEPTION 'O preço do item não pode ser negativo.';
        END IF;

        v_subtotal := v_subtotal + (v_item_price * v_item_qty);
    END LOOP;

    v_final_amount := GREATEST(0, v_subtotal - COALESCE(p_discount, 0));

    -- 5. Validar pagamentos
    IF jsonb_array_length(p_payments) = 0 THEN
        RAISE EXCEPTION 'Deve haver pelo menos uma forma de pagamento.';
    END IF;

    FOR v_payment IN SELECT * FROM jsonb_to_recordset(p_payments) AS x(
        method text,
        amount numeric
    )
    LOOP
        IF COALESCE(v_payment.amount, 0) <= 0 THEN
            RAISE EXCEPTION 'O valor do pagamento deve ser maior que zero.';
        END IF;
        v_payments_total := v_payments_total + v_payment.amount;
    END LOOP;

    -- Garantir que a soma dos pagamentos seja igual ao total da venda
    IF ABS(v_payments_total - v_final_amount) > 0.01 THEN
        RAISE EXCEPTION 'A soma dos pagamentos (R$ %) não corresponde ao valor total final da venda (R$ %).', v_payments_total, v_final_amount;
    END IF;

    -- 6. Criar Registro de Venda
    INSERT INTO public.sales (
        business_id,
        appointment_id,
        client_id,
        client_name,
        professional_id,
        total_amount,
        discount,
        final_amount,
        status,
        idempotency_key
    ) VALUES (
        v_business_id,
        p_appointment_id,
        p_client_id,
        p_client_name,
        p_professional_id,
        v_subtotal,
        COALESCE(p_discount, 0),
        v_final_amount,
        'COMPLETED',
        p_idempotency_key
    )
    RETURNING id INTO v_sale_id;

    -- 7. Criar Itens da Venda
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
        item_type text,
        item_id uuid,
        name text,
        quantity int,
        unit_price numeric
    )
    LOOP
        v_item_qty := COALESCE(v_item.quantity, 1);
        v_item_price := COALESCE(v_item.unit_price, 0);

        IF UPPER(COALESCE(v_item.item_type, 'SERVICE')) = 'SERVICE' AND v_item.item_id IS NOT NULL THEN
            SELECT price INTO v_official_price
            FROM public.services
            WHERE id = v_item.item_id AND business_id = v_business_id;

            IF FOUND THEN
                v_item_price := v_official_price;
            END IF;
        END IF;

        INSERT INTO public.sale_items (
            sale_id,
            business_id,
            item_type,
            item_id,
            name,
            quantity,
            unit_price,
            total_price
        ) VALUES (
            v_sale_id,
            v_business_id,
            UPPER(COALESCE(v_item.item_type, 'SERVICE')),
            v_item.item_id,
            v_item.name,
            v_item_qty,
            v_item_price,
            (v_item_price * v_item_qty)
        );
    END LOOP;

    -- 8. Criar Pagamentos e Movimentações de Caixa
    FOR v_payment IN SELECT * FROM jsonb_to_recordset(p_payments) AS x(
        method text,
        amount numeric
    )
    LOOP
        INSERT INTO public.payments (
            sale_id,
            business_id,
            method,
            amount
        ) VALUES (
            v_sale_id,
            v_business_id,
            UPPER(v_payment.method),
            v_payment.amount
        );

        INSERT INTO public.cash_movements (
            business_id,
            cash_register_id,
            type,
            amount,
            description
        ) VALUES (
            v_business_id,
            v_cash_register_id,
            'IN',
            v_payment.amount,
            'Venda Recebida (' || UPPER(v_payment.method) || ')'
        );
    END LOOP;

    -- 9. Criar Comissão se profissional for informado
    IF p_professional_id IS NOT NULL THEN
        SELECT commission_rate INTO v_comm_rate
        FROM public.professionals
        WHERE id = p_professional_id AND business_id = v_business_id;

        IF v_comm_rate IS NULL THEN
            v_comm_rate := 40;
        END IF;

        v_comm_amount := (v_final_amount * v_comm_rate) / 100.0;

        INSERT INTO public.commissions (
            business_id,
            professional_id,
            sale_id,
            amount,
            rate,
            status
        ) VALUES (
            v_business_id,
            p_professional_id,
            v_sale_id,
            v_comm_amount,
            v_comm_rate,
            'PENDING'
        );
    END IF;

    -- 10. Atualizar Estatísticas do Cliente
    IF p_client_id IS NOT NULL THEN
        UPDATE public.clients
        SET total_spent = COALESCE(total_spent, 0) + v_final_amount,
            total_appointments = COALESCE(total_appointments, 0) + (CASE WHEN p_appointment_id IS NOT NULL THEN 1 ELSE 0 END)
        WHERE id = p_client_id AND business_id = v_business_id;
    END IF;

    -- 11. Atualizar Agendamento se vinculado
    IF p_appointment_id IS NOT NULL THEN
        UPDATE public.appointments
        SET status = 'CONCLUÍDO',
            payment_status = 'PAID',
            updated_at = NOW()
        WHERE id = p_appointment_id AND business_id = v_business_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'sale_id', v_sale_id,
        'final_amount', v_final_amount
    );
END;
$$;

-- ====================================================================
-- 8. PUSH NOTIFICATIONS SUBSCRIPTIONS
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage push subscriptions in their business" ON public.push_subscriptions;
CREATE POLICY "Users can manage push subscriptions in their business"
ON public.push_subscriptions
FOR ALL
USING (
  business_id IN (
    SELECT business_id FROM public.user_profiles WHERE id = auth.uid()
  )
)
WITH CHECK (
  business_id IN (
    SELECT business_id FROM public.user_profiles WHERE id = auth.uid()
  )
);

-- ====================================================================
-- 9. AUDIT LOGS FOR OBSERVABILITY & HARDENING
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read and insert audit logs for their business" ON public.audit_logs;
CREATE POLICY "Users can read and insert audit logs for their business"
ON public.audit_logs
FOR ALL
USING (
  business_id IN (
    SELECT business_id FROM public.user_profiles WHERE id = auth.uid()
  )
)
WITH CHECK (
  business_id IN (
    SELECT business_id FROM public.user_profiles WHERE id = auth.uid()
  )
);




