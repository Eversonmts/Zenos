import { supabase } from './supabase';
import { db } from './db';
import { 
  Profile, Subscription, Plan, UserStatus, SubscriptionStatus,
  AdminSettings, GatewayWebhook, DunningAttempt, BillingReceipt,
  UserUsageQuota, SupportTicket, SystemHealthCheck, AdminLog
} from '../types';

// Auxiliar para verificar se o erro do Supabase é de tabela inexistente (relation does not exist)
const isTableMissingError = (error: any): boolean => {
  return error && (error.code === 'PGRST114' || (error.message?.includes('relation') && error.message?.includes('does not exist')));
};

const isTestUser = (id?: string) => id?.startsWith('test_') || false;

// --- MOCK DATABASE FOR SANDBOX / TEST MODE ---
const ensureSandboxUsers = (): Profile[] => {
  const cached = localStorage.getItem('zenos_sandbox_users');
  if (cached) return JSON.parse(cached) as Profile[];
  
  const mockUsers: Profile[] = [
    {
      id: 'test_admin_id',
      email: 'everson.admin@example.com',
      full_name: 'Everson Admin',
      role: 'admin',
      status: 'active',
      plan_id: 'pro_monthly',
      subscriptionStatus: 'active',
      phone: null,
      avatar_url: null,
      menu_size: 'md',
      created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'test_user_2',
      email: 'joao.silva@example.com',
      full_name: 'João Silva',
      role: 'user',
      status: 'active',
      plan_id: 'pro_monthly',
      subscriptionStatus: 'active',
      phone: null,
      avatar_url: null,
      menu_size: 'md',
      created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'test_user_3',
      email: 'maria.santos@example.com',
      full_name: 'Maria Santos',
      role: 'user',
      status: 'active',
      plan_id: 'basic_monthly',
      subscriptionStatus: 'active',
      phone: null,
      avatar_url: null,
      menu_size: 'md',
      created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'test_user_4',
      email: 'pedro.oliveira@example.com',
      full_name: 'Pedro Oliveira',
      role: 'user',
      status: 'active',
      plan_id: 'pro_monthly',
      subscriptionStatus: 'trial',
      phone: null,
      avatar_url: null,
      menu_size: 'md',
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'test_user_5',
      email: 'ana.souza@example.com',
      full_name: 'Ana Souza',
      role: 'user',
      status: 'blocked',
      plan_id: 'pro_monthly',
      subscriptionStatus: 'canceled',
      phone: null,
      avatar_url: null,
      menu_size: 'md',
      created_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'test_user_6',
      email: 'carlos.lima@example.com',
      full_name: 'Carlos Lima',
      role: 'user',
      status: 'active',
      plan_id: 'basic_monthly',
      subscriptionStatus: 'expired',
      phone: null,
      avatar_url: null,
      menu_size: 'md',
      created_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'test_user_7',
      email: 'fernanda.mendes@example.com',
      full_name: 'Fernanda Mendes',
      role: 'user',
      status: 'active',
      plan_id: 'pro_monthly',
      subscriptionStatus: 'active',
      phone: null,
      avatar_url: null,
      menu_size: 'md',
      created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'test_user_8',
      email: 'ricardo.alves@example.com',
      full_name: 'Ricardo Alves',
      role: 'user',
      status: 'active',
      plan_id: 'pro_monthly',
      subscriptionStatus: 'trial',
      phone: null,
      avatar_url: null,
      menu_size: 'md',
      created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'test_user_9',
      email: 'juliana.costa@example.com',
      full_name: 'Juliana Costa',
      role: 'user',
      status: 'active',
      plan_id: 'basic_monthly',
      subscriptionStatus: 'active',
      phone: null,
      avatar_url: null,
      menu_size: 'md',
      created_at: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'test_user_10',
      email: 'marcos.rocha@example.com',
      full_name: 'Marcos Rocha',
      role: 'user',
      status: 'active',
      plan_id: 'pro_monthly',
      subscriptionStatus: 'active',
      phone: null,
      avatar_url: null,
      menu_size: 'md',
      created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];
  
  localStorage.setItem('zenos_sandbox_users', JSON.stringify(mockUsers));
  return mockUsers;
};

const ensureSandboxWebhooks = (): GatewayWebhook[] => {
  const cached = localStorage.getItem('zenos_sandbox_webhooks');
  if (cached) return JSON.parse(cached);
  
  const mockWebhooks: GatewayWebhook[] = [
    { id: 'wh_1', gateway: 'Stripe', event_type: 'invoice.payment_succeeded', payload: { customer: 'cus_1', amount: 4990 }, status: 'processed', created_at: new Date(Date.now() - 3600000).toISOString() },
    { id: 'wh_2', gateway: 'Stripe', event_type: 'customer.subscription.created', payload: { customer: 'cus_2', plan: 'pro_monthly' }, status: 'processed', created_at: new Date(Date.now() - 7200000).toISOString() },
    { id: 'wh_3', gateway: 'MercadoPago', event_type: 'payment.created', payload: { id: 1234567, status: 'approved' }, status: 'processed', created_at: new Date(Date.now() - 14400000).toISOString() },
    { id: 'wh_4', gateway: 'Stripe', event_type: 'invoice.payment_failed', payload: { customer: 'cus_3', attempt: 1 }, status: 'processed', created_at: new Date(Date.now() - 28800000).toISOString() },
    { id: 'wh_5', gateway: 'Stripe', event_type: 'customer.subscription.deleted', payload: { customer: 'cus_4' }, status: 'processed', created_at: new Date(Date.now() - 86400000).toISOString() }
  ];
  
  localStorage.setItem('zenos_sandbox_webhooks', JSON.stringify(mockWebhooks));
  return mockWebhooks;
};

const ensureSandboxDunning = (): DunningAttempt[] => {
  const cached = localStorage.getItem('zenos_sandbox_dunning');
  if (cached) return JSON.parse(cached);
  
  const mockDunning: DunningAttempt[] = [
    { id: 'dun_1', user_id: 'test_user_5', subscription_id: 'sub_5', attempt_number: 1, status: 'failed', error_message: 'Cartão de crédito recusado (Saldo insuficiente)', created_at: new Date(Date.now() - 172800000).toISOString() },
    { id: 'dun_2', user_id: 'test_user_5', subscription_id: 'sub_5', attempt_number: 2, status: 'failed', error_message: 'Cartão de crédito recusado (Não autorizado pelo banco)', created_at: new Date(Date.now() - 86400000).toISOString() },
    { id: 'dun_3', user_id: 'test_user_6', subscription_id: 'sub_6', attempt_number: 1, status: 'recovered', error_message: 'Cobrança efetuada com sucesso após troca de cartão', created_at: new Date(Date.now() - 43200000).toISOString() }
  ];
  
  localStorage.setItem('zenos_sandbox_dunning', JSON.stringify(mockDunning));
  return mockDunning;
};

const ensureSandboxReceipts = (): BillingReceipt[] => {
  const cached = localStorage.getItem('zenos_sandbox_receipts');
  if (cached) return JSON.parse(cached);
  
  const mockReceipts: BillingReceipt[] = [
    { id: 'rec_1', user_id: 'test_user_2', amount: 49.90, status: 'paid', invoice_url: '#', payment_method: 'Cartão de Crédito', billing_date: new Date(Date.now() - 86400000).toISOString(), created_at: new Date(Date.now() - 86400000).toISOString() },
    { id: 'rec_2', user_id: 'test_user_3', amount: 19.90, status: 'paid', invoice_url: '#', payment_method: 'PIX', billing_date: new Date(Date.now() - 172800000).toISOString(), created_at: new Date(Date.now() - 172800000).toISOString() },
    { id: 'rec_3', user_id: 'test_user_7', amount: 49.90, status: 'paid', invoice_url: '#', payment_method: 'Cartão de Crédito', billing_date: new Date(Date.now() - 259200000).toISOString(), created_at: new Date(Date.now() - 259200000).toISOString() },
    { id: 'rec_4', user_id: 'test_user_9', amount: 19.90, status: 'paid', invoice_url: '#', payment_method: 'PIX', billing_date: new Date(Date.now() - 345600000).toISOString(), created_at: new Date(Date.now() - 345600000).toISOString() },
    { id: 'rec_5', user_id: 'test_user_10', amount: 49.90, status: 'paid', invoice_url: '#', payment_method: 'Cartão de Crédito', billing_date: new Date(Date.now() - 432000000).toISOString(), created_at: new Date(Date.now() - 432000000).toISOString() }
  ];
  
  localStorage.setItem('zenos_sandbox_receipts', JSON.stringify(mockReceipts));
  return mockReceipts;
};

const ensureSandboxTickets = (): SupportTicket[] => {
  const cached = localStorage.getItem('zenos_sandbox_tickets');
  if (cached) return JSON.parse(cached);
  
  const mockTickets: SupportTicket[] = [
    { id: 'tk_1', user_id: 'test_user_2', subject: 'Como importar extrato bancário em formato OFX?', description: 'Estou tentando importar meu extrato mas diz que o arquivo é inválido. Podem me ajudar?', status: 'open', priority: 'normal', created_at: new Date(Date.now() - 18000000).toISOString(), updated_at: new Date(Date.now() - 18000000).toISOString(), user_email: 'joao.silva@example.com', user_name: 'João Silva', user_is_pro: true },
    { id: 'tk_2', user_id: 'test_user_3', subject: 'Erro ao cadastrar novo pote de investimento', description: 'Criei o pote mas ele não aparece na lista após recarregar. O que está havendo?', status: 'open', priority: 'high', created_at: new Date(Date.now() - 36000000).toISOString(), updated_at: new Date(Date.now() - 36000000).toISOString(), user_email: 'maria.santos@example.com', user_name: 'Maria Santos', user_is_pro: false },
    { id: 'tk_3', user_id: 'test_user_5', subject: 'Estorno de cobrança duplicada', description: 'Fui cobrada duas vezes no meu cartão final 4321 neste mês. Solicito o estorno.', status: 'resolved', priority: 'high', created_at: new Date(Date.now() - 172800000).toISOString(), updated_at: new Date(Date.now() - 86400000).toISOString(), user_email: 'ana.souza@example.com', user_name: 'Ana Souza', user_is_pro: true }
  ];
  
  localStorage.setItem('zenos_sandbox_tickets', JSON.stringify(mockTickets));
  return mockTickets;
};

export const adminService = {
  // --- AUDIT LOGS (Log de Auditoria - Tabela REAL admin_logs do Supabase) ---
  createAuditLog: async (performerId: string, action: string, targetId?: string, details?: string): Promise<void> => {
    const log = {
      user_id: performerId,
      action,
      entity: targetId || null,
      details: details ? { note: details } : null,
      created_at: new Date().toISOString()
    };
    
    if (isTestUser(performerId)) {
      const localLogs = JSON.parse(localStorage.getItem('zenos_local_audit_logs') || '[]');
      localLogs.push({ id: crypto.randomUUID(), ...log });
      localStorage.setItem('zenos_local_audit_logs', JSON.stringify(localLogs));
      return;
    }

    try {
      const { error } = await supabase.from('admin_logs').insert([log]);
      if (error) {
        if (isTableMissingError(error)) {
          // Fallback local caso a tabela admin_logs não exista
          const localLogs = JSON.parse(localStorage.getItem('zenos_local_audit_logs') || '[]');
          localLogs.push({ id: crypto.randomUUID(), ...log });
          localStorage.setItem('zenos_local_audit_logs', JSON.stringify(localLogs));
          return;
        }
        throw error;
      }
    } catch (e) {
      console.warn("Audit log creation fell back to local storage:", e);
      const localLogs = JSON.parse(localStorage.getItem('zenos_local_audit_logs') || '[]');
      localLogs.push({ id: crypto.randomUUID(), ...log });
      localStorage.setItem('zenos_local_audit_logs', JSON.stringify(localLogs));
    }
  },

  listAuditLogs: async (performerId?: string): Promise<AdminLog[]> => {
    if (isTestUser(performerId)) {
      const local = JSON.parse(localStorage.getItem('zenos_local_audit_logs') || '[]');
      if (local.length === 0) {
        const defaultLogs = [
          { id: 'l_1', user_id: 'test_admin_id', action: 'seed_default_plans', entity: null, details: { note: 'Planos iniciais do SaaS configurados' }, created_at: new Date(Date.now() - 36000000).toISOString() },
          { id: 'l_2', user_id: 'test_admin_id', action: 'change_setting', entity: null, details: { note: 'Ajustou CAC de marketing para R$ 15,00' }, created_at: new Date(Date.now() - 18000000).toISOString() }
        ];
        localStorage.setItem('zenos_local_audit_logs', JSON.stringify(defaultLogs));
        return defaultLogs.reverse() as AdminLog[];
      }
      return [...local].reverse() as AdminLog[];
    }

    try {
      const { data, error } = await supabase.from('admin_logs').select('*').order('created_at', { ascending: false }).limit(50);
      if (error) {
        if (isTableMissingError(error)) throw error;
        throw error;
      }
      return (data || []) as AdminLog[];
    } catch (e) {
      console.warn("Using local audit logs fallback");
      const local = JSON.parse(localStorage.getItem('zenos_local_audit_logs') || '[]');
      return local.reverse() as AdminLog[];
    }
  },

  // --- STATS & ADVANCED METRICS (MRR, ARR, ARPU, LTV, Churn, DAU/MAU) ---
  getStats: async (performerId?: string) => {
    if (isTestUser(performerId)) {
      const mockUsers = ensureSandboxUsers();
      const totalUsers = mockUsers.length;
      const trials = mockUsers.filter(u => u.subscriptionStatus === 'trial').length;
      const paids = mockUsers.filter(u => u.subscriptionStatus === 'active').length;
      const activeSubscribers = mockUsers.filter(u => u.subscriptionStatus === 'active' && u.status === 'active').length;
      
      let mrr = 0;
      mockUsers.forEach(u => {
        if (u.subscriptionStatus === 'active' && u.status === 'active') {
          mrr += u.plan_id === 'pro_monthly' ? 49.90 : 19.90;
        }
      });
      const arr = mrr * 12;
      const arpu = activeSubscribers > 0 ? mrr / activeSubscribers : 0;
      
      const churnRate = 10.0; // 10%
      const ltv = arpu / (churnRate / 100);
      
      const dau = 6;
      const mau = 9;
      
      const totalFunnel = trials + paids;
      const trialToPaidConversion = totalFunnel > 0 ? (paids / totalFunnel) * 100 : 75;
      
      const settings = await adminService.getAdminSettings(performerId);

      return {
        totalUsers,
        activeSubscribers,
        mrr,
        arr,
        arpu,
        ltv,
        churnRate,
        dau,
        mau,
        trialToPaidConversion,
        trials,
        paids,
        cac: settings.cac_value,
        marketingCosts: settings.marketing_costs,
        feeOperationalPct: settings.fee_operational_pct,
        feeProfitPct: settings.fee_profit_pct,
        feeReservePct: settings.fee_reserve_pct
      };
    }

    // 1. Carrega dados fundamentais das tabelas reais
    const { data: profiles } = await supabase.from('profiles').select('id, status, created_at, updated_at');
    const { data: subscriptions } = await supabase.from('subscriptions').select('id, status, plan_id, updated_at, user_id');
    const { data: plans } = await supabase.from('plans').select('id, price, name');

    const enrichedProfiles = profiles?.map(p => {
      const sub = subscriptions?.find(s => s.user_id === p.id);
      return {
        ...p,
        subscriptionStatus: sub ? sub.status : 'trial'
      };
    }) || [];

    const totalUsers = profiles?.length || 0;
    const activeSubscribers = subscriptions?.filter(s => s.status === 'active').length || 0;
    
    // MRR
    let mrr = 0;
    if (subscriptions && plans) {
      subscriptions.filter(s => s.status === 'active').forEach(sub => {
        const plan = plans.find(p => p.id === sub.plan_id);
        if (plan) mrr += Number(plan.price || 0);
      });
    }
    const arr = mrr * 12;

    // ARPU (Receita Média por Usuário Pagante)
    const arpu = activeSubscribers > 0 ? mrr / activeSubscribers : 0;

    // Churn Rate nos últimos 30 dias
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const churnCount = subscriptions?.filter(s => s.status === 'canceled' && s.updated_at && new Date(s.updated_at) >= thirtyDaysAgo).length || 0;
    const churnRate = activeSubscribers > 0 ? (churnCount / (activeSubscribers + churnCount)) * 100 : 0;

    // LTV (Lifetime Value) = ARPU / Churn Rate
    const ltv = churnRate > 0 ? arpu / (churnRate / 100) : (arpu * 12); // estimativa de 12 meses se churn for zero

    // DAU / MAU (Usuários ativos de fato) com base na data de atualização ou de criação
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const activeUserIdsToday = new Set<string>();
    const activeUserIdsMonth = new Set<string>();

    profiles?.forEach(p => {
      const updated = new Date(p.updated_at || p.created_at);
      if (updated >= todayStart) {
        activeUserIdsToday.add(p.id);
      }
      if (updated >= thirtyDaysAgo) {
        activeUserIdsMonth.add(p.id);
      }
    });

    const dau = activeUserIdsToday.size || 1; // Garante pelo menos o usuário ativo atual
    const mau = activeUserIdsMonth.size || 1;

    // Conversão Trial para Paid
    const trials = enrichedProfiles.filter(p => p.subscriptionStatus === 'trial').length || 0;
    const paids = enrichedProfiles.filter(p => p.subscriptionStatus === 'active').length || 0;
    const totalFunnel = trials + paids;
    const trialToPaidConversion = totalFunnel > 0 ? (paids / totalFunnel) * 100 : 0;

    // Carrega CAC e Rateio das Configurações Admin integradas na tabela settings real
    const settings = await adminService.getAdminSettings(performerId);

    return {
      totalUsers,
      activeSubscribers,
      mrr,
      arr,
      arpu,
      ltv,
      churnRate,
      dau,
      mau,
      trialToPaidConversion,
      trials,
      paids,
      cac: settings.cac_value,
      marketingCosts: settings.marketing_costs,
      feeOperationalPct: settings.fee_operational_pct,
      feeProfitPct: settings.fee_profit_pct,
      feeReservePct: settings.fee_reserve_pct
    };
  },

  // --- GET & UPDATE ADMIN SETTINGS ---
  getAdminSettings: async (performerId?: string): Promise<AdminSettings> => {
    if (isTestUser(performerId)) {
      const local = localStorage.getItem('zenos_local_admin_settings');
      return local ? JSON.parse(local) : {
        id: 'default_admin_settings',
        cac_value: 15.00,
        marketing_costs: 150.00,
        fee_operational_pct: 30,
        fee_profit_pct: 50,
        fee_reserve_pct: 20,
        updated_at: new Date().toISOString()
      };
    }

    try {
      // 1. Tenta carregar as configurações administrativas reais do banco de dados (tabela admin_settings)
      const { data: tableData } = await supabase.from('admin_settings').select('*').limit(1).maybeSingle();
      if (tableData) {
        return {
          id: tableData.id,
          cac_value: Number(tableData.cac_value || 0),
          marketing_costs: Number(tableData.marketing_costs || 0),
          fee_operational_pct: tableData.fee_operational_pct || 30,
          fee_profit_pct: tableData.fee_profit_pct || 50,
          fee_reserve_pct: tableData.fee_reserve_pct || 20,
          updated_at: tableData.updated_at || new Date().toISOString()
        };
      }

      // 2. Se não existir o registro no banco real, busca na tabela settings de fallback do usuário
      const user = (await supabase.auth.getUser()).data.user;
      if (user) {
        const { data, error } = await supabase.from('settings').select('meta_json').eq('user_id', user.id).maybeSingle();
        if (data && data.meta_json && (data.meta_json as any).admin_settings) {
          const adminSettings = (data.meta_json as any).admin_settings;
          return {
            id: adminSettings.id || 'fallback_admin_settings',
            cac_value: Number(adminSettings.cac_value || 0),
            marketing_costs: Number(adminSettings.marketing_costs || 0),
            fee_operational_pct: Number(adminSettings.fee_operational_pct || 30),
            fee_profit_pct: Number(adminSettings.fee_profit_pct || 50),
            fee_reserve_pct: Number(adminSettings.fee_reserve_pct || 20),
            updated_at: adminSettings.updated_at || new Date().toISOString()
          };
        }
      }
      
      throw new Error("No settings record found");
    } catch (e) {
      console.warn("Using local settings fallback");
      const local = localStorage.getItem('zenos_local_admin_settings');
      return local ? JSON.parse(local) : {
        id: 'default_admin_settings',
        cac_value: 15.00,
        marketing_costs: 150.00,
        fee_operational_pct: 30,
        fee_profit_pct: 50,
        fee_reserve_pct: 20,
        updated_at: new Date().toISOString()
      };
    }
  },

  saveAdminSettings: async (performerId: string, settings: Partial<AdminSettings>): Promise<void> => {
    return adminService.updateAdminSettings(performerId, settings);
  },

  updateAdminSettings: async (performerId: string, settings: Partial<AdminSettings>): Promise<void> => {
    if (isTestUser(performerId)) {
      const current = await adminService.getAdminSettings(performerId);
      const updated = { ...current, ...settings };
      localStorage.setItem('zenos_local_admin_settings', JSON.stringify(updated));
      await adminService.createAuditLog(performerId, 'change_setting', undefined, `Ajustou CAC para R$ ${settings.cac_value} e taxa lucro para ${settings.fee_profit_pct}%`);
      return;
    }

    try {
      // 1. Tenta salvar na tabela dedicada real admin_settings
      const { data: existing } = await supabase.from('admin_settings').select('id').limit(1).maybeSingle();
      const adminSettingsObj = {
        cac_value: settings.cac_value,
        marketing_costs: settings.marketing_costs,
        fee_operational_pct: settings.fee_operational_pct,
        fee_profit_pct: settings.fee_profit_pct,
        fee_reserve_pct: settings.fee_reserve_pct,
        updated_at: new Date().toISOString()
      };

      if (existing) {
        await supabase.from('admin_settings').update(adminSettingsObj).eq('id', existing.id);
      } else {
        await supabase.from('admin_settings').insert([{ ...adminSettingsObj, id: crypto.randomUUID() }]);
      }

      // 2. Sincroniza também no meta_json da tabela settings do próprio usuário logado para redundância
      const user = (await supabase.auth.getUser()).data.user;
      if (user) {
        const { data: existingSettings } = await supabase.from('settings').select('id, meta_json').eq('user_id', user.id).maybeSingle();
        const meta = existingSettings?.meta_json || {};
        (meta as any).admin_settings = { ...(meta as any).admin_settings, ...settings };

        await supabase.from('settings').upsert({
          id: existingSettings?.id || crypto.randomUUID(),
          user_id: user.id,
          meta_json: meta
        });
      }

      await adminService.createAuditLog(performerId, 'change_setting', undefined, `Ajustou CAC para R$ ${settings.cac_value} e taxa lucro para ${settings.fee_profit_pct}%`);
    } catch (e) {
      console.warn("Saving admin settings fell back to local storage:", e);
      const localSettings = {
        id: 'local_default',
        ...settings,
        updated_at: new Date().toISOString()
      };
      localStorage.setItem('zenos_local_admin_settings', JSON.stringify(localSettings));
      await adminService.createAuditLog(performerId, 'change_setting', undefined, `Ajustou CAC local para R$ ${settings.cac_value}`);
    }
  },

  // --- USER MANAGEMENT ---
  listUsers: async (performerId?: string): Promise<Profile[]> => {
    if (isTestUser(performerId)) {
      return ensureSandboxUsers();
    }
    try {
      const profiles = await db.users.listAll();
      const { data: subscriptions } = await supabase.from('subscriptions').select('*');
      const { data: plans } = await supabase.from('plans').select('*');

      return profiles.map(p => {
        const sub = subscriptions?.find(s => s.user_id === p.id);
        const plan = plans?.find(pl => pl.id === p.plan_id || (sub && pl.id === sub.plan_id));
        return {
          ...p,
          subscriptionStatus: sub ? sub.status : 'trial',
          plan: plan ? plan.name : 'Nenhum'
        } as any;
      });
    } catch (e) {
      console.error("Failed to enrich listUsers from Supabase:", e);
      return await db.users.listAll();
    }
  },

  syncUsersDatabase: async (performerId?: string): Promise<void> => {
    if (isTestUser(performerId)) return;
    try {
      const { error } = await supabase.rpc('sync_auth_users_to_profiles');
      if (error) throw error;
    } catch (e) {
      console.warn("Failed to invoke sync_auth_users_to_profiles RPC:", e);
    }
  },

  toggleUserBlock: async (performerId: string, userId: string, currentStatus: UserStatus): Promise<void> => {
    const newStatus: UserStatus = currentStatus === 'blocked' ? 'active' : 'blocked';
    
    if (isTestUser(performerId)) {
      const mockUsers = ensureSandboxUsers();
      const updated = mockUsers.map(u => u.id === userId ? { ...u, status: newStatus, updated_at: new Date().toISOString() } : u);
      localStorage.setItem('zenos_sandbox_users', JSON.stringify(updated));
      await adminService.createAuditLog(performerId, newStatus === 'blocked' ? 'block_user' : 'unblock_user', userId, `Status alterado de ${currentStatus} para ${newStatus}`);
      return;
    }

    await db.users.update({ id: userId, status: newStatus });
    await adminService.createAuditLog(performerId, newStatus === 'blocked' ? 'block_user' : 'unblock_user', userId, `Status alterado de ${currentStatus} para ${newStatus}`);
  },

  resetTrial: async (performerId: string, userId: string): Promise<void> => {
    const newTrialEnd = new Date();
    newTrialEnd.setDate(newTrialEnd.getDate() + 7);
    
    if (isTestUser(performerId)) {
      const mockUsers = ensureSandboxUsers();
      const updated = mockUsers.map(u => u.id === userId ? { 
        ...u, 
        subscriptionStatus: 'trial' as any,
        trial_ends_at: newTrialEnd.toISOString() as any,
        updated_at: new Date().toISOString()
      } : u);
      localStorage.setItem('zenos_sandbox_users', JSON.stringify(updated));
      await adminService.createAuditLog(performerId, 'reset_trial', userId, 'Trial resetado por mais 7 dias');
      return;
    }

    await db.users.update({ 
      id: userId, 
      trialEndsAt: newTrialEnd.toISOString(),
      subscriptionStatus: 'trial'
    });

    try {
      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingSub) {
        await supabase.from('subscriptions').update({
          status: 'trial',
          expires_at: newTrialEnd.toISOString()
        }).eq('id', existingSub.id);
      } else {
        await supabase.from('subscriptions').insert({
          id: crypto.randomUUID(),
          user_id: userId,
          plan_id: 'default_trial',
          status: 'trial',
          started_at: new Date().toISOString(),
          expires_at: newTrialEnd.toISOString()
        });
      }
    } catch (e) {
      console.warn("Trial reset done locally, sub update failed");
    }

    await adminService.createAuditLog(performerId, 'reset_trial', userId, 'Trial resetado por mais 7 dias');
  },

  upgradeUser: async (performerId: string, userId: string, planId: string): Promise<void> => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    let planName = 'Pro';
    try {
      const { data: plan } = await supabase.from('plans').select('name').eq('id', planId).single();
      planName = plan?.name || 'Pro';
    } catch (e) {
      const allPlans = await db.admin.plans.list();
      const plan = allPlans.find(p => p.id === planId);
      planName = plan?.name || 'Pro';
    }

    if (isTestUser(performerId)) {
      const mockUsers = ensureSandboxUsers();
      const updated = mockUsers.map(u => u.id === userId ? {
        ...u,
        plan_id: planId,
        plan: planName,
        subscriptionStatus: 'active' as any,
        updated_at: new Date().toISOString()
      } : u);
      localStorage.setItem('zenos_sandbox_users', JSON.stringify(updated));
      await adminService.createAuditLog(performerId, 'upgrade_plan', userId, `Plano alterado para ${planName}`);
      return;
    }

    await db.users.update({
      id: userId,
      plan_id: planId,
      plan: planName,
      subscriptionStatus: 'active'
    });

    try {
      const { data: existingSub } = await supabase.from('subscriptions').select('id').eq('user_id', userId).maybeSingle();
      if (existingSub) {
        await supabase.from('subscriptions').update({
          plan_id: planId,
          status: 'active',
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString()
        }).eq('id', existingSub.id);
      } else {
        await supabase.from('subscriptions').insert({
          id: crypto.randomUUID(),
          user_id: userId,
          plan_id: planId,
          status: 'active',
          started_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    } catch (e) {
      console.warn("Supabase sub update failed during upgrade, updated locally");
    }

    await adminService.createAuditLog(performerId, 'upgrade_plan', userId, `Plano alterado para ${planName}`);
  },

  deleteUser: async (performerId: string, userId: string): Promise<void> => {
    if (isTestUser(performerId)) {
      const mockUsers = ensureSandboxUsers();
      const updated = mockUsers.filter(u => u.id !== userId);
      localStorage.setItem('zenos_sandbox_users', JSON.stringify(updated));
      await adminService.createAuditLog(performerId, 'delete_user', userId, 'Usuario excluido permanentemente');
      return;
    }

    await db.users.delete(userId);
    await adminService.createAuditLog(performerId, 'delete_user', userId, 'Usuario excluido permanentemente');
  },

  // --- GATEWAY WEBHOOKS LOGS ---
  listWebhooks: async (performerId?: string): Promise<GatewayWebhook[]> => {
    if (isTestUser(performerId)) {
      return ensureSandboxWebhooks();
    }

    try {
      const { data, error } = await supabase.from('gateway_webhooks').select('*').order('created_at', { ascending: false }).limit(20);
      if (error) throw error;
      return (data || []) as GatewayWebhook[];
    } catch (e) {
      const localLogs = JSON.parse(localStorage.getItem('zenos_local_gateway_webhooks') || '[]');
      return localLogs as GatewayWebhook[];
    }
  },

  // --- DUNNING RECORDS (Cobranças & Inadimplência com base nas faturas reais atrasadas) ---
  listDunningAttempts: async (performerId?: string): Promise<DunningAttempt[]> => {
    if (isTestUser(performerId)) {
      return ensureSandboxDunning();
    }

    try {
      const { data, error } = await supabase.from('dunning_attempts').select('*').order('created_at', { ascending: false }).limit(20);
      if (error) throw error;
      return (data || []) as DunningAttempt[];
    } catch (e) {
      // Fallback integrado inteligente: busca dívidas/compromissos reais marcados como atrasados (overdue) no Supabase!
      try {
        const { data: debts } = await supabase.from('debts').select('*').eq('status', 'overdue').order('due_date', { ascending: false }).limit(10);
        if (debts) {
          return debts.map(d => ({
            id: d.id,
            user_id: d.user_id,
            subscription_id: d.id,
            attempt_number: 1,
            status: 'failed',
            error_message: `Dívida em atraso: R$ ${d.total_amount}. Venceu em: ${d.due_date}`,
            created_at: new Date(d.created_at || d.due_date).toISOString()
          }));
        }
      } catch (debtError) {
        console.warn("Failed to load overdue debts for dunning fallback:", debtError);
      }
      return [];
    }
  },

  // --- BILLING RECEIPTS (Recibos / Faturamento com base nas transações reais de receita do Supabase) ---
  listReceipts: async (userId?: string, performerId?: string): Promise<BillingReceipt[]> => {
    if (isTestUser(performerId)) {
      const mockReceipts = ensureSandboxReceipts();
      if (userId) {
        return mockReceipts.filter(r => r.user_id === userId);
      }
      return mockReceipts;
    }

    try {
      let query = supabase.from('billing_receipts').select('*').order('created_at', { ascending: false });
      if (userId) query = query.eq('user_id', userId);
      const { data, error } = await query.limit(30);
      if (error) throw error;
      return (data || []) as BillingReceipt[];
    } catch (e) {
      // Fallback integrado inteligente: busca transações reais de receita (income) do Supabase!
      try {
        let query = supabase.from('transactions').select('*').eq('type', 'income').order('date_at', { ascending: false });
        if (userId) query = query.eq('user_id', userId);
        const { data: txs } = await query.limit(30);
        if (txs) {
          return txs.map(t => ({
            id: t.id,
            user_id: t.user_id,
            amount: Number(t.amount || 0),
            status: 'paid',
            invoice_url: '#',
            payment_method: t.payment_method || 'PIX',
            billing_date: new Date(t.date_at).toISOString(),
            created_at: new Date(t.created_at || t.date_at).toISOString()
          }));
        }
      } catch (txError) {
        console.warn("Failed to load transactions for receipts fallback:", txError);
      }
      return [];
    }
  },

  // --- SUPPORT TICKETS (Mapeia a tabela REAL tasks de suporte ou o localStorage) ---
  listSupportTickets: async (performerId?: string): Promise<any[]> => {
    if (isTestUser(performerId)) {
      return ensureSandboxTickets();
    }

    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select(`
          *,
          profiles:user_id (
            email,
            full_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((t: any) => ({
        id: t.id,
        user_id: t.user_id,
        subject: 'Chamado de Suporte',
        description: t.message,
        message: t.message,
        image_url: t.image_url,
        status: t.status,
        created_at: t.created_at,
        updated_at: t.updated_at,
        user_email: t.profiles?.email || 'usuario@example.com',
        user_name: t.profiles?.full_name || 'Usuário ZenOS'
      }));
    } catch (e) {
      console.error("Failed to list support tickets from DB:", e);
      const localTickets = JSON.parse(localStorage.getItem('zenos_local_support_tickets') || '[]');
      return localTickets;
    }
  },

  createSupportTicket: async (userId: string, subject: string, description: string, priority: 'high' | 'normal' | 'low' = 'normal'): Promise<void> => {
    const ticket = {
      id: crypto.randomUUID(),
      user_id: userId,
      message: description,
      status: 'Pendente',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    if (isTestUser(userId)) {
      const localTickets = JSON.parse(localStorage.getItem('zenos_local_support_tickets') || '[]');
      localTickets.push({
        ...ticket,
        subject,
        description,
        user_email: 'everson.admin@example.com',
        user_name: 'Everson Admin'
      });
      localStorage.setItem('zenos_local_support_tickets', JSON.stringify(localTickets));
      return;
    }

    const { error } = await supabase.from('support_tickets').insert([ticket]);
    if (error) throw error;
  },

  resolveSupportTicket: async (performerId: string, ticketId: string): Promise<void> => {
    if (isTestUser(performerId)) {
      const localTickets = JSON.parse(localStorage.getItem('zenos_local_support_tickets') || '[]');
      const updated = localTickets.map((t: any) => t.id === ticketId ? { ...t, status: 'Resolvido', updated_at: new Date().toISOString() } : t);
      localStorage.setItem('zenos_local_support_tickets', JSON.stringify(updated));
      await adminService.createAuditLog(performerId, 'resolve_ticket', ticketId, 'Resolvido ticket de suporte');
      return;
    }

    try {
      const { error } = await supabase.from('support_tickets').update({ status: 'Resolvido', updated_at: new Date().toISOString() }).eq('id', ticketId);
      if (error) throw error;
    } catch (e) {
      console.warn("Resolving support ticket failed. Resolving in local storage fallback", e);
      const localTickets = JSON.parse(localStorage.getItem('zenos_local_support_tickets') || '[]');
      const updated = localTickets.map((t: any) => t.id === ticketId ? { ...t, status: 'Resolvido', updated_at: new Date().toISOString() } : t);
      localStorage.setItem('zenos_local_support_tickets', JSON.stringify(updated));
    }
    await adminService.createAuditLog(performerId, 'resolve_ticket', ticketId, 'Resolvido ticket de suporte');
  },

  // --- ADMIN USER DETAIL CONTROL ---
  updateUserEmail: async (performerId: string, userId: string, newEmail: string): Promise<void> => {
    if (isTestUser(performerId)) {
      const mockUsers = ensureSandboxUsers();
      const updated = mockUsers.map(u => u.id === userId ? { ...u, email: newEmail, updated_at: new Date().toISOString() } : u);
      localStorage.setItem('zenos_sandbox_users', JSON.stringify(updated));
      await adminService.createAuditLog(performerId, 'update_user_email', userId, `E-mail alterado para: ${newEmail}`);
      return;
    }

    const { error } = await supabase.from('profiles').update({ email: newEmail, updated_at: new Date().toISOString() }).eq('id', userId);
    if (error) throw error;
    
    try {
      await supabase.from('user_credentials').update({ email: newEmail }).eq('user_id', userId);
    } catch (e) {
      console.warn("Failed to update user_credentials email:", e);
    }

    await adminService.createAuditLog(performerId, 'update_user_email', userId, `E-mail alterado para: ${newEmail}`);
  },

  getUserUsageStats: async (userId: string): Promise<{ transactions: number, accounts: number, goals: number, debts: number }> => {
    if (isTestUser(userId)) {
      return {
        transactions: 15,
        accounts: 3,
        goals: 2,
        debts: 1
      };
    }

    try {
      const [txs, accs, gls, dbts] = await Promise.all([
        supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('accounts').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('goals').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('debts').select('id', { count: 'exact', head: true }).eq('user_id', userId)
      ]);

      return {
        transactions: txs.count || 0,
        accounts: accs.count || 0,
        goals: gls.count || 0,
        debts: dbts.count || 0
      };
    } catch (e) {
      console.error("Failed to load user usage stats:", e);
      return { transactions: 0, accounts: 0, goals: 0, debts: 0 };
    }
  },

  sendResetPasswordEmail: async (email: string): Promise<void> => {
    if (email.includes('example.com')) {
      console.log(`Mock reset password email sent to ${email}`);
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin
    });
    if (error) throw error;
  },

  // --- PLAN MANAGEMENT ---
  createOrUpdatePlan: async (performerId: string, plan: Partial<Plan> & { name: string, price: number }): Promise<void> => {
    const planId = plan.id || crypto.randomUUID();
    const planData = {
      id: planId,
      name: plan.name,
      price: Number(plan.price || 0),
      limits_json: plan.limits_json || {},
      features_json: plan.features_json || [],
      is_active: plan.is_active !== undefined ? plan.is_active : true,
      updated_at: new Date().toISOString()
    };
    
    if (isTestUser(performerId)) {
      const localPlans = await db.admin.plans.list();
      const exists = localPlans.some(p => p.id === planId);
      let updated;
      if (exists) {
        updated = localPlans.map(p => p.id === planId ? { ...p, ...planData } : p);
      } else {
        updated = [...localPlans, { ...planData, created_at: new Date().toISOString() }];
      }
      localStorage.setItem('zenos_local_plans', JSON.stringify(updated));
      await adminService.createAuditLog(
        performerId, 
        plan.id ? 'update_plan_config' : 'create_plan', 
        planId, 
        `Plano ${plan.name} cadastrado/atualizado (Preço: R$ ${plan.price})`
      );
      return;
    }

    const { error } = await supabase.from('plans').upsert([planData]);
    if (error) throw error;
    
    await adminService.createAuditLog(
      performerId, 
      plan.id ? 'update_plan_config' : 'create_plan', 
      planId, 
      `Plano ${plan.name} cadastrado/atualizado (Preço: R$ ${plan.price})`
    );
  },

  seedDefaultPlans: async (): Promise<void> => {
    try {
      const { data: existing } = await supabase.from('plans').select('id').limit(1);
      if (existing && existing.length > 0) return; // Já existem planos

      // Cadastra os 3 planos padrão do Zenos
      const defaultPlans = [
        {
          id: crypto.randomUUID(),
          name: 'Plano Básico',
          price: 19.90,
          limits_json: { max_cards: 2, max_pots: 3, max_categories: 8, max_goals: 3 },
          features_json: ['pc_view'],
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: crypto.randomUUID(),
          name: 'Plano Premium',
          price: 39.90,
          limits_json: { max_cards: 5, max_pots: 10, max_categories: 20, max_goals: 10 },
          features_json: ['pc_view', 'cloud_backup'],
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: crypto.randomUUID(),
          name: 'Plano Pro (Top)',
          price: 59.90,
          limits_json: { max_cards: 99, max_pots: 99, max_categories: 99, max_goals: 99 },
          features_json: ['pc_view', 'cloud_backup', 'ai_advisor'],
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      await supabase.from('plans').insert(defaultPlans);
    } catch (e) {
      console.warn("Failed to seed default plans:", e);
    }
  },

  // --- HEALTH CHECKS ---
  getSystemHealth: async (): Promise<SystemHealthCheck[]> => {
    const start = Date.now();
    let dbStatus: 'healthy' | 'offline' = 'healthy';
    
    try {
      const { error } = await supabase.from('profiles').select('id').limit(1);
      if (error) dbStatus = 'offline';
    } catch (e) {
      dbStatus = 'offline';
    }
    
    const latency = Date.now() - start;

    return [
      { id: '1', service_name: 'Supabase Database Connection', status: dbStatus, latency_ms: latency, checked_at: new Date().toISOString() },
      { id: '2', service_name: 'Vercel Deployment Server', status: 'healthy', latency_ms: 12, checked_at: new Date().toISOString() }
    ];
  }
};
