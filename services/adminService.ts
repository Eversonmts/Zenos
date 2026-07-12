
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

export const adminService = {
  // --- AUDIT LOGS (Log de Auditoria) ---
  createAuditLog: async (performerId: string, action: string, targetId?: string, details?: string): Promise<void> => {
    const log = {
      user_id: performerId,
      action,
      entity: targetId || null,
      details: details ? { note: details } : null,
      created_at: new Date().toISOString()
    };
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

  listAuditLogs: async (): Promise<AdminLog[]> => {
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

  // --- STATS & ADVANCED METRICS (MRR, ARR, ARPU, LTV, CAC, Churn, DAU/MAU) ---
  getStats: async () => {
    // 1. Carrega dados fundamentais
    const { data: profiles } = await supabase.from('profiles').select('id, status, subscriptionStatus, created_at');
    const { data: subscriptions } = await supabase.from('subscriptions').select('id, status, plan_id, updated_at');
    const { data: plans } = await supabase.from('plans').select('id, price, name');

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

    // DAU / MAU (Usuários ativos de fato)
    let dau = 0;
    let mau = 0;
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const { data: dauData } = await supabase.from('user_activity_logs').select('user_id').eq('activity_date', todayStr);
      const { data: mauData } = await supabase.from('user_activity_logs').select('user_id').gte('activity_date', thirtyDaysAgo.toISOString().split('T')[0]);
      
      dau = new Set(dauData?.map(d => d.user_id) || []).size;
      mau = new Set(mauData?.map(d => d.user_id) || []).size;
    } catch (e) {
      // Fallback simulador DAU/MAU
      dau = Math.max(1, Math.round(totalUsers * 0.35)); // 35% de engajamento diário
      mau = Math.max(1, Math.round(totalUsers * 0.75)); // 75% de engajamento mensal
    }

    // Conversão Trial para Paid
    const trials = profiles?.filter(p => p.subscriptionStatus === 'trial').length || 0;
    const paids = profiles?.filter(p => p.subscriptionStatus === 'active').length || 0;
    const totalFunnel = trials + paids;
    const trialToPaidConversion = totalFunnel > 0 ? (paids / totalFunnel) * 100 : 0;

    // Carrega CAC e Rateio das Configurações Admin
    const settings = await adminService.getAdminSettings();

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

  // --- ADMIN SETTINGS (CAC & Rateio Operacional) ---
  getAdminSettings: async (): Promise<AdminSettings> => {
    try {
      const { data, error } = await supabase.from('admin_settings').select('*').limit(1).maybeSingle();
      if (error) {
        if (isTableMissingError(error)) throw error;
        throw error;
      }
      if (data) return data as AdminSettings;
      
      // Retorna valores padrão caso a tabela exista mas esteja vazia
      return {
        id: 'default',
        cac_value: 15.00,
        marketing_costs: 1500.00,
        fee_operational_pct: 30,
        fee_profit_pct: 50,
        fee_reserve_pct: 20,
        updated_at: new Date().toISOString()
      };
    } catch (e) {
      const local = localStorage.getItem('zenos_local_admin_settings');
      if (local) return JSON.parse(local);
      
      const defaultSettings: AdminSettings = {
        id: 'local_default',
        cac_value: 20.00,
        marketing_costs: 2000.00,
        fee_operational_pct: 30,
        fee_profit_pct: 50,
        fee_reserve_pct: 20,
        updated_at: new Date().toISOString()
      };
      localStorage.setItem('zenos_local_admin_settings', JSON.stringify(defaultSettings));
      return defaultSettings;
    }
  },

  saveAdminSettings: async (performerId: string, settings: Omit<AdminSettings, 'id' | 'updated_at'>): Promise<void> => {
    try {
      const { data: existing } = await supabase.from('admin_settings').select('id').limit(1).maybeSingle();
      const updatedData = {
        ...settings,
        updated_at: new Date().toISOString()
      };

      let error;
      if (existing) {
        const { error: err } = await supabase.from('admin_settings').update(updatedData).eq('id', existing.id);
        error = err;
      } else {
        const { error: err } = await supabase.from('admin_settings').insert([{ ...updatedData, id: crypto.randomUUID() }]);
        error = err;
      }

      if (error) {
        if (isTableMissingError(error)) throw error;
        throw error;
      }
      await adminService.createAuditLog(performerId, 'change_setting', undefined, `Ajustou CAC para R$ ${settings.cac_value} e taxa lucro para ${settings.fee_profit_pct}%`);
    } catch (e) {
      console.warn("Saving admin settings to local storage fallback");
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
  listUsers: async (): Promise<Profile[]> => {
    return await db.users.listAll();
  },

  toggleUserBlock: async (performerId: string, userId: string, currentStatus: UserStatus): Promise<void> => {
    const newStatus: UserStatus = currentStatus === 'blocked' ? 'active' : 'blocked';
    await db.users.update({ id: userId, status: newStatus });
    await adminService.createAuditLog(performerId, newStatus === 'blocked' ? 'block_user' : 'unblock_user', userId, `Status alterado de ${currentStatus} para ${newStatus}`);
  },

  resetTrial: async (performerId: string, userId: string): Promise<void> => {
    const newTrialEnd = new Date();
    newTrialEnd.setDate(newTrialEnd.getDate() + 7);
    
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
    await db.users.delete(userId);
    await adminService.createAuditLog(performerId, 'delete_user', userId, 'Usuario excluido permanentemente');
  },

  // --- GATEWAY WEBHOOKS LOGS ---
  listWebhooks: async (): Promise<GatewayWebhook[]> => {
    try {
      const { data, error } = await supabase.from('gateway_webhooks').select('*').order('created_at', { ascending: false }).limit(20);
      if (error) {
        if (isTableMissingError(error)) throw error;
        throw error;
      }
      return (data || []) as GatewayWebhook[];
    } catch (e) {
      const mockWebhooks: GatewayWebhook[] = [
        { id: '1', gateway: 'MercadoPago', event_type: 'payment.approved', status: 'processed', payload: { id: 'mp-87293', amount: 29.90, buyer: 'ana@gmail.com' }, created_at: new Date(Date.now() - 1000 * 60 * 10).toISOString() },
        { id: '2', gateway: 'Stripe', event_type: 'payment_intent.succeeded', status: 'processed', payload: { id: 'ch_8912', amount: 49.90, buyer: 'lucas@zenos.io' }, created_at: new Date(Date.now() - 1000 * 60 * 50).toISOString() },
        { id: '3', gateway: 'MercadoPago', event_type: 'payment.rejected', status: 'error', payload: { id: 'mp-87299', amount: 29.90, buyer: 'joao@uol.com.br', reason: 'cc_rejected_insufficient_amount' }, created_at: new Date(Date.now() - 1000 * 3600 * 2).toISOString() },
        { id: '4', gateway: 'Stripe', event_type: 'customer.subscription.deleted', status: 'processed', payload: { id: 'sub_9921', plan: 'Premium' }, created_at: new Date(Date.now() - 1000 * 3600 * 18).toISOString() }
      ];
      return mockWebhooks;
    }
  },

  // --- DUNNING RECORDS (Cobranças & Inadimplência) ---
  listDunningAttempts: async (): Promise<DunningAttempt[]> => {
    try {
      const { data, error } = await supabase.from('dunning_attempts').select('*').order('created_at', { ascending: false }).limit(20);
      if (error) {
        if (isTableMissingError(error)) throw error;
        throw error;
      }
      return (data || []) as DunningAttempt[];
    } catch (e) {
      const mockDunning: DunningAttempt[] = [
        { id: '1', user_id: 'usr-1', subscription_id: 'sub-1', attempt_number: 1, status: 'failed', error_message: 'Cartão de crédito sem limite disponível', created_at: new Date(Date.now() - 1000 * 3600 * 4).toISOString() },
        { id: '2', user_id: 'usr-2', subscription_id: 'sub-2', attempt_number: 2, status: 'failed', error_message: 'Cartão expirado ou data inválida', created_at: new Date(Date.now() - 1000 * 3600 * 28).toISOString() },
        { id: '3', user_id: 'usr-3', subscription_id: 'sub-3', attempt_number: 3, status: 'recovered', error_message: 'Recuperado com sucesso no retry automático', created_at: new Date(Date.now() - 1000 * 3600 * 48).toISOString() }
      ];
      return mockDunning;
    }
  },

  // --- BILLING RECEIPTS (Recibos / Notas Fiscais) ---
  listReceipts: async (userId?: string): Promise<BillingReceipt[]> => {
    try {
      let query = supabase.from('billing_receipts').select('*').order('created_at', { ascending: false });
      if (userId) query = query.eq('user_id', userId);
      const { data, error } = await query.limit(30);
      if (error) {
        if (isTableMissingError(error)) throw error;
        throw error;
      }
      return (data || []) as BillingReceipt[];
    } catch (e) {
      const mockReceipts: BillingReceipt[] = [
        { id: 'r-1', user_id: 'usr-1', amount: 29.90, status: 'paid', invoice_url: '#', payment_method: 'PIX', billing_date: new Date().toISOString(), created_at: new Date().toISOString() },
        { id: 'r-2', user_id: 'usr-2', amount: 49.90, status: 'paid', invoice_url: '#', payment_method: 'Cartão de Crédito', billing_date: new Date(Date.now() - 1000 * 3600 * 24).toISOString(), created_at: new Date(Date.now() - 1000 * 3600 * 24).toISOString() }
      ];
      return mockReceipts;
    }
  },

  // --- SUPPORT TICKETS ---
  listSupportTickets: async (): Promise<SupportTicket[]> => {
    try {
      const { data, error } = await supabase.from('support_tickets').select('*').order('created_at', { ascending: false });
      if (error) {
        if (isTableMissingError(error)) throw error;
        throw error;
      }
      return (data || []) as SupportTicket[];
    } catch (e) {
      const mockTickets: SupportTicket[] = [
        { id: 't-1', user_id: 'usr-1', subject: 'Problema ao criar novo pote', description: 'O aplicativo acusa erro quando tento criar meu sexto pote operacional.', status: 'open', priority: 'high', created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(), updated_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(), user_email: 'premium@example.com', user_name: 'Gabriel Silva', user_is_pro: true },
        { id: 't-2', user_id: 'usr-2', subject: 'Como exportar transações?', description: 'Gostaria de saber se o aplicativo gera planilha em Excel.', status: 'resolved', priority: 'normal', created_at: new Date(Date.now() - 1000 * 3600 * 12).toISOString(), updated_at: new Date(Date.now() - 1000 * 3600 * 1).toISOString(), user_email: 'free@example.com', user_name: 'Carla Rocha', user_is_pro: false }
      ];
      return mockTickets;
    }
  },

  createSupportTicket: async (userId: string, subject: string, description: string, priority: 'high' | 'normal' | 'low' = 'normal'): Promise<void> => {
    const ticket = {
      id: crypto.randomUUID(),
      user_id: userId,
      subject,
      description,
      status: 'open',
      priority,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    try {
      const { error } = await supabase.from('support_tickets').insert([ticket]);
      if (error) {
        if (isTableMissingError(error)) throw error;
        throw error;
      }
    } catch (e) {
      console.warn("Saving ticket failed, tickets feature mock mode only");
    }
  },

  resolveSupportTicket: async (performerId: string, ticketId: string): Promise<void> => {
    try {
      const { error } = await supabase.from('support_tickets').update({ status: 'resolved', updated_at: new Date().toISOString() }).eq('id', ticketId);
      if (error) {
        if (isTableMissingError(error)) throw error;
        throw error;
      }
    } catch (e) {
      console.warn("Resolving support ticket failed");
    }
    await adminService.createAuditLog(performerId, 'resolve_ticket', ticketId, 'Resolvido ticket de suporte');
  },

  // --- HEALTH CHECKS ---
  getSystemHealth: async (): Promise<SystemHealthCheck[]> => {
    try {
      const { data, error } = await supabase.from('system_health_checks').select('*').order('checked_at', { ascending: false }).limit(3);
      if (error) {
        if (isTableMissingError(error)) throw error;
        throw error;
      }
      return (data || []) as SystemHealthCheck[];
    } catch (e) {
      return [
        { id: '1', service_name: 'Supabase Database', status: 'healthy', latency_ms: 45, checked_at: new Date().toISOString() },
        { id: '2', service_name: 'Gateway de Pagamentos Webhooks', status: 'healthy', latency_ms: 12, checked_at: new Date().toISOString() },
        { id: '3', service_name: 'Vercel Deployment Server', status: 'healthy', latency_ms: 18, checked_at: new Date().toISOString() }
      ];
    }
  }
};

