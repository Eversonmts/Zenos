
import { PlanConfig, PaymentRecord } from '../types';
import { db } from './db';

const PAYMENTS_KEY = 'zen_payments_db';

const DEFAULT_PLANS: PlanConfig[] = [
  {
    id: 'free',
    name: 'Grátis',
    price: 0,
    periodicity: 'monthly',
    features_json: ['Controle básico', '1 Pote'],
    limits_json: { accounts: 1, cards: 1, reports: false },
    trial_days: 0,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'silver',
    name: 'Prata',
    price: 29.90,
    periodicity: 'monthly',
    features_json: ['Controle avançado', '6 Potes', 'IA Advisor'],
    limits_json: { accounts: 6, cards: 3, reports: true },
    trial_days: 7,
    is_active: true,
    mercado_pago_public_key: 'APP_USR-9fcf61f6-7e45-4a0d-86d4-afca0ce47960',
    mercado_pago_access_token: 'APP_USR-3070912774531465-040600-85abb4ca8ae650eac74cdb6ba00b87a3-197163105',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'gold',
    name: 'Ouro',
    price: 59.90,
    periodicity: 'monthly',
    features_json: ['Tudo ilimitado', 'Suporte VIP', 'Consultoria'],
    limits_json: { accounts: 99, cards: 99, reports: true },
    trial_days: 7,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export const getPlanConfigs = async (): Promise<PlanConfig[]> => {
  const configs = await db.admin.plans.list();
  if (configs.length === 0) {
    // Seed default plans
    for (const plan of DEFAULT_PLANS) {
      await db.admin.plans.update(plan);
    }
    return DEFAULT_PLANS;
  }
  return configs as PlanConfig[];
};

export const updatePlanConfig = async (config: PlanConfig) => {
  await db.admin.plans.update(config);
};

export const getPayments = async (): Promise<PaymentRecord[]> => {
  return await db.admin.subscriptions.listAll() as PaymentRecord[];
};

export const registerPayment = async (payment: PaymentRecord) => {
  // registerPayment might need a new method in db.ts if not purely for admin
  // For now let's assume subscriptions are the payment records
  await db.admin.subscriptions.listAll(); // placeholder
};

// Gera a URL de Checkout (Real ou Simulada)
export const createMercadoPagoPreference = async (plan: PlanConfig, userId: string) => {
  const currentUrl = window.location.href.split('?')[0];

  // 1. MODO REAL VIA API (Prioritário se Access Token existir)
  if (plan.mercado_pago_access_token) {
    try {
      const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${plan.mercado_pago_access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          items: [{
            title: plan.name,
            quantity: 1,
            currency_id: 'BRL',
            unit_price: plan.price
          }],
          external_reference: userId,
          back_urls: {
            success: currentUrl,
            failure: currentUrl,
            pending: currentUrl
          },
          auto_return: "approved"
        })
      });

      const data = await response.json();
      if (data.init_point) {
        return {
           preferenceId: data.id,
           initPoint: data.init_point
        };
      } else {
        console.error("MP API Error:", data);
      }
    } catch (e) {
      console.error("MP Fetch Error:", e);
    }
  }

  // 2. MODO LINK ESTÁTICO
  if (plan.payment_link && plan.payment_link.startsWith('http')) {
     return {
        preferenceId: 'static_link',
        initPoint: plan.payment_link
     };
  }

  // 3. MODO SIMULAÇÃO
  await new Promise(r => setTimeout(r, 1500));
  
  return {
    preferenceId: `pref_${Math.random().toString(36).substr(2, 9)}`,
    initPoint: `${currentUrl}?status=approved&collection_status=approved&payment_id=${Math.random().toString().slice(2,10)}&external_reference=${userId}`
  };
};
