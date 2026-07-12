
export type TransactionType = 'income' | 'expense';
// Categorias também podem existir só pra classificar Dívidas/Cartão (ex: "Empréstimo",
// "Financiamento"), sem precisar ser do tipo receita/despesa de uma transação normal.
export type CategoryType = TransactionType | 'debt';
export type AccountType = 'cash' | 'bank' | 'credit_card' | 'investment';
export type GoalStatus = 'pending' | 'completed' | 'canceled';
export type DebtStatus = 'active' | 'paid' | 'overdue';
export type UserStatus = 'active' | 'blocked' | 'delinquent';
export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'canceled';
export type UserRole = 'user' | 'admin';

export interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  status: UserStatus;
  plan_id: string | null;
  menu_size: 'xs' | 'sm' | 'md' | 'lg';
  dashboard_layout?: any;
  subscriptionStatus?: SubscriptionStatus;
  trialEndsAt?: string;
  plan?: string; // Legacy support or derived field
  security_pin?: string | null;
  biometry_enabled?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  periodicity?: string; // added to match billing.ts
  limits_json: {
    accounts?: number;
    cards?: number;
    transactions_month?: number;
    reports?: boolean; // added to match billing.ts
    [key: string]: any;
  };
  features_json: string[];
  trial_days?: number; // added to match billing.ts
  is_active: boolean;
  mercado_pago_public_key?: string; // added
  mercado_pago_access_token?: string; // added
  payment_link?: string; // added
  created_at: string;
  updated_at: string;
}

// Aliases for billing.ts
export type PlanConfig = Plan;
export type PaymentRecord = Subscription;

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  started_at: string;
  expires_at: string | null;
  gateway: string | null;
  external_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string | null; // NULL para categorias do sistema
  name: string;
  type: CategoryType;
  color: string | null;
  icon: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  balance_initial: number;
  current_balance: number;
  percentage: number; // For revenue apportionment
  is_active: boolean;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string | null;
  category_id: string | null;
  subcategory_id: string | null;
  type: TransactionType;
  description: string;
  amount: number;
  date_at: string;
  payment_method: string | null;
  is_recurring: boolean;
  note?: string | null;
  item?: string | null;
  location?: string | null;
  created_at: string;
  updated_at: string;
}

// Rateio de uma receita entre potes. A transação em si é única (aparece uma vez
// em Movimentações); este registro só existe para detalhar quanto foi para cada
// pote, consultado na tela de "Detalhes" de cada pote.
export interface TransactionAllocation {
  id: string;
  transaction_id: string;
  account_id: string;
  amount: number;
  created_at: string;
}

export interface Subcategory {
  id: string;
  user_id: string;
  category_id: string;
  name: string;
  created_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  status: GoalStatus;
  created_at: string;
  updated_at: string;
}

export interface Debt {
  id: string;
  user_id: string;
  description: string;
  total_amount: number;
  paid_amount: number;
  due_date: string | null;
  status: DebtStatus;
  installments?: number; // added
  card_id?: string | null; // preenchido quando a dívida é uma parcela de cartão de crédito
  installment_number?: number | null; // qual parcela (ex: 2 de 6)
  category_id?: string | null;
  subcategory_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreditCard {
  id: string;
  user_id: string;
  name: string;
  last_4_digits?: string | null;
  limit: number;
  closing_day: number; // "melhor dia de compra"
  due_day: number; // vencimento da fatura
  color: string;
  created_at: string;
  updated_at?: string;
}

export interface Invoice {
  id: string;
  card_id: string;
  month: number;
  year: number;
  status: 'open' | 'closed' | 'paid';
  total_amount: number;
}

export interface Jar {
  id: string;
  name: string;
  percentage: number;
  balance: number;
  color: string;
  icon?: string;
}

export interface Settings {
  id: string;
  user_id: string;
  currency: string;
  language: string;
  theme: string;
  notifications_enabled: boolean;
  meta_json: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface GuestBackup {
  id: string;
  device_id: string;
  payload_json: Record<string, any>;
  created_at: string;
}

export interface AdminLog {
  id: string;
  user_id: string | null;
  action: string;
  entity: string | null;
  details: Record<string, any> | null;
  created_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  category_name: string;
  limit_amount: number;
  period: 'monthly' | 'weekly';
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  status: 'pending' | 'completed' | 'canceled';
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  category: string;
  created_at: string;
}

export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  color: string;
  tags: string[];
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface JournalEntry {
  id: string;
  user_id: string;
  title: string;
  content: string;
  mood: 'happy' | 'neutral' | 'sad' | 'productive' | 'tired';
  date: string;
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  category: string;
  color: string;
}

export type AppView = 
  | 'dashboard' 
  | 'transactions' 
  | 'accounts' 
  | 'goals' 
  | 'compromissos'
  | 'potes'
  | 'budgets'
  | 'analytics'
  | 'tasks'
  | 'notes'
  | 'journal'
  | 'calendar'
  | 'advisor'
  | 'settings' 
  | 'admin';

export interface DashboardLayoutItem {
  id: string;
  label: string;
  visible: boolean;
  order: number;
}

export interface FinancialData {
  profiles: Profile[];
  plans: Plan[];
  subscriptions: Subscription[];
  categories: Category[];
  subcategories: Subcategory[];
  accounts: Account[];
  transactions: Transaction[];
  transaction_allocations: TransactionAllocation[];
  cards: CreditCard[];
  goals: Goal[];
  debts: Debt[];
  tasks: Task[];
  notes: Note[];
  journal: JournalEntry[];
  calendar: CalendarEvent[];
  budgets: Budget[];
  settings: Settings[];
}

export interface AdminSettings {
  id: string;
  cac_value: number;
  marketing_costs: number;
  fee_operational_pct: number;
  fee_profit_pct: number;
  fee_reserve_pct: number;
  updated_at: string;
}

export interface GatewayWebhook {
  id: string;
  gateway: string;
  event_type: string;
  payload: Record<string, any>;
  status: 'processed' | 'error' | 'pending';
  created_at: string;
}

export interface DunningAttempt {
  id: string;
  user_id: string;
  subscription_id: string;
  attempt_number: number;
  status: string;
  error_message: string | null;
  created_at: string;
}

export interface BillingReceipt {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  invoice_url: string | null;
  payment_method: string | null;
  billing_date: string;
  created_at: string;
}

export interface UserUsageQuota {
  id: string;
  user_id: string;
  resource_name: string;
  current_count: number;
  limit_count: number;
  updated_at: string;
}

export interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  description: string;
  status: 'open' | 'resolved' | 'closed';
  priority: 'high' | 'normal' | 'low';
  created_at: string;
  updated_at: string;
  user_email?: string;
  user_name?: string;
  user_is_pro?: boolean;
}

export interface SystemHealthCheck {
  id: string;
  service_name: string;
  status: 'healthy' | 'degraded' | 'offline';
  latency_ms: number;
  checked_at: string;
}

