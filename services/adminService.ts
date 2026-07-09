
import { supabase } from './supabase';
import { db } from './db';
import { Profile, Subscription, Plan, UserStatus, SubscriptionStatus } from '../types';

export const adminService = {
  // --- STATS ---
  getStats: async () => {
    const { data: profiles } = await supabase.from('profiles').select('id, status');
    const { data: subscriptions } = await supabase.from('subscriptions').select('id, status, plan_id');
    const { data: plans } = await supabase.from('plans').select('id, price');

    const totalUsers = profiles?.length || 0;
    const activeSubscribers = subscriptions?.filter(s => s.status === 'active').length || 0;
    
    // MRR calculation
    let mrr = 0;
    if (subscriptions && plans) {
      subscriptions.filter(s => s.status === 'active').forEach(sub => {
        const plan = plans.find(p => p.id === sub.plan_id);
        if (plan) mrr += plan.price;
      });
    }

    // Churn (simplified: canceled in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { data: canceledSubs } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('status', 'canceled')
      .gte('updated_at', thirtyDaysAgo.toISOString());
    
    const churnCount = canceledSubs?.length || 0;

    return {
      totalUsers,
      activeSubscribers,
      mrr,
      churnRate: totalUsers > 0 ? (churnCount / totalUsers) * 100 : 0
    };
  },

  // --- USER MANAGEMENT ---
  listUsers: async (): Promise<Profile[]> => {
    return await db.users.listAll();
  },

  toggleUserBlock: async (userId: string, currentStatus: UserStatus): Promise<void> => {
    const newStatus: UserStatus = currentStatus === 'blocked' ? 'active' : 'blocked';
    await db.users.update({ id: userId, status: newStatus });
  },

  resetTrial: async (userId: string): Promise<void> => {
    const newTrialEnd = new Date();
    newTrialEnd.setDate(newTrialEnd.getDate() + 7);
    
    await db.users.update({ 
      id: userId, 
      trialEndsAt: newTrialEnd.toISOString(),
      subscriptionStatus: 'trial'
    });

    // Also update or create subscription entry
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
    }
  },

  upgradeUser: async (userId: string, planId: string): Promise<void> => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const { data: plan } = await supabase.from('plans').select('name').eq('id', planId).single();

    await db.users.update({
      id: userId,
      plan_id: planId,
      plan: plan?.name || 'Pro',
      subscriptionStatus: 'active'
    });

    await supabase.from('subscriptions').upsert({
      user_id: userId,
      plan_id: planId,
      status: 'active',
      started_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString()
    });
  },

  deleteUser: async (userId: string): Promise<void> => {
    await db.users.delete(userId);
  }
};
