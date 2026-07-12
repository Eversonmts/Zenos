-- Migração: Estrutura Administrativa ZenOS SaaS (20 Funcionalidades Admin)

-- 1. Tabela de Configurações Globais Administrativas (CAC, Rateio)
CREATE TABLE IF NOT EXISTS public.admin_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cac_value DECIMAL(10, 2) DEFAULT 0.00,
    marketing_costs DECIMAL(15, 2) DEFAULT 0.00,
    fee_operational_pct INTEGER DEFAULT 30, -- 30% custos operacionais
    fee_profit_pct INTEGER DEFAULT 50,      -- 50% lucro líquido
    fee_reserve_pct INTEGER DEFAULT 20,     -- 20% reserva
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabela de Log de Atividades de Usuário (DAU/MAU)
CREATE TABLE IF NOT EXISTS public.user_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    activity_date DATE DEFAULT CURRENT_DATE NOT NULL,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_activity_unique ON public.user_activity_logs (user_id, activity_date);

-- 3. Tabela de Webhooks do Gateway de Pagamento
CREATE TABLE IF NOT EXISTS public.gateway_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gateway TEXT NOT NULL, -- 'Stripe', 'MercadoPago'
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT DEFAULT 'processed', -- 'processed', 'error', 'pending'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabela de Tentativas de Cobrança e Dunning
CREATE TABLE IF NOT EXISTS public.dunning_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL,
    status TEXT NOT NULL, -- 'failed', 'recovered'
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabela de Recibos de Faturamento de Assinatura (Billing Receipts)
CREATE TABLE IF NOT EXISTS public.billing_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    status TEXT NOT NULL, -- 'paid', 'refunded'
    invoice_url TEXT,
    payment_method TEXT,
    billing_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Tabela de Quota de Uso do Usuário
CREATE TABLE IF NOT EXISTS public.user_usage_quotas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    resource_name TEXT NOT NULL, -- 'pots_count', 'transactions_count'
    current_count INTEGER DEFAULT 0,
    limit_count INTEGER DEFAULT 5,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_usage_quota_unique ON public.user_usage_quotas (user_id, resource_name);

-- 7. Tabela de Logs de Auditoria do Admin (Audit Trails)
CREATE TABLE IF NOT EXISTS public.admin_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- 'upgrade_plan', 'block_user', 'change_setting'
    entity TEXT, -- ID do alvo da ação
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Tabela de Suporte e Tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'open', -- 'open', 'resolved', 'closed'
    priority TEXT DEFAULT 'normal', -- 'high', 'normal', 'low'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Tabela de Health Check
CREATE TABLE IF NOT EXISTS public.system_health_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name TEXT NOT NULL,
    status TEXT NOT NULL, -- 'healthy', 'degraded', 'offline'
    latency_ms INTEGER NOT NULL,
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Atualização da tabela de Perfis com suporte a RBAC e Trial
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS admin_role TEXT CHECK (admin_role IN ('super_admin', 'finance_analyst', 'support')) DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE;

-- 11. Habilitar RLS nas novas tabelas
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gateway_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dunning_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_usage_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_health_checks ENABLE ROW LEVEL SECURITY;

-- 12. Políticas de RLS para Administradores no Supabase (Evitar filtro invisível do RLS)

-- Politica Auxiliar/Segura para validar se o requisitante é admin baseado no auth.jwt() ou tabela profiles
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- A. Políticas para tabela PROFILES
CREATE POLICY "Admins can select all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can delete any profile" ON public.profiles FOR DELETE TO authenticated USING (public.is_admin());

-- B. Políticas para tabela SUBSCRIPTIONS
CREATE POLICY "Admins can select all subscriptions" ON public.subscriptions FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can manage all subscriptions" ON public.subscriptions FOR ALL TO authenticated USING (public.is_admin());

-- C. Políticas para as novas tabelas Administrativas (Acesso apenas para Admins)
CREATE POLICY "Admins only admin_settings" ON public.admin_settings FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Admins only user_activity_logs" ON public.user_activity_logs FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Admins only gateway_webhooks" ON public.gateway_webhooks FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Admins only dunning_attempts" ON public.dunning_attempts FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Admins only billing_receipts" ON public.billing_receipts FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Admins only user_usage_quotas" ON public.user_usage_quotas FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Admins only admin_logs" ON public.admin_logs FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Admins only system_health_checks" ON public.system_health_checks FOR ALL TO authenticated USING (public.is_admin());

-- D. Políticas para SUPPORT_TICKETS (Usuários normais gerenciam seus próprios, admins gerenciam tudo)
CREATE POLICY "Users can manage support_tickets" ON public.support_tickets FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all support_tickets" ON public.support_tickets FOR ALL TO authenticated USING (public.is_admin());
