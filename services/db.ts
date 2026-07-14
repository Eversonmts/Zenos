
import { supabase } from './supabase';
import { testDb } from './testDb';
import {
  Profile, Transaction, Account, Debt, Goal, Category,
  FinancialData, Settings, AdminLog, Plan, Subscription, TransactionAllocation
} from '../types';

const isTestUser = (id: string) => id?.startsWith('test_') || false;

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';
let currentSyncStatus: SyncStatus = 'idle';
const syncListeners: ((status: SyncStatus) => void)[] = [];

export const onSyncStatusChange = (cb: (status: SyncStatus) => void) => {
  syncListeners.push(cb);
  cb(currentSyncStatus);
  return () => {
    const idx = syncListeners.indexOf(cb);
    if (idx >= 0) syncListeners.splice(idx, 1);
  };
};

const setSyncStatus = (status: SyncStatus) => {
  currentSyncStatus = status;
  syncListeners.forEach(cb => cb(status));
};

// --- REALTIME MULTI-DEVICE SYNC ---
// Subscribes to every user-owned table via Supabase Realtime (Postgres CDC).
// Any insert/update/delete made from ANY device fires `onChange` on ALL
// other connected devices within ~1s, so the caller can refresh its state
// immediately instead of waiting for the next manual/background refresh.
const REALTIME_TABLES = [
  'accounts', 'transactions', 'categories', 'subcategories', 'goals', 'debts',
  'settings', 'tasks', 'notes', 'journal', 'calendar', 'budgets', 'cards'
  // NOTE: transaction_allocations intentionally excluded - it has no user_id
  // column to filter on server-side, so subscribing to it would fire for
  // EVERY user's changes, not just this one. A transaction insert/update
  // (which always accompanies an allocation change) already triggers a
  // reload that re-fetches allocations for the loaded transactions.
] as const;

export const subscribeRealtime = (userId: string, onChange: () => void) => {
  if (!userId || isTestUser(userId)) {
    return () => {};
  }

  const channel = supabase.channel(`user-sync-${userId}`);

  REALTIME_TABLES.forEach(table => {
    channel.on(
      'postgres_changes' as any,
      { event: '*', schema: 'public', table, filter: `user_id=eq.${userId}` },
      () => onChange()
    );
  });

  channel.subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

const LOCAL_STORAGE_KEY = 'zenos_finance_data_';

// Local cache: used as an instant-load layer and as offline support for the
// "test mode" sandbox. Supabase remains the single source of truth otherwise.
const getLocalData = (userId: string): FinancialData | null => {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY + userId);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error("Error loading local cache:", e);
    return null;
  }
};

const saveLocalData = (userId: string, data: Partial<FinancialData>) => {
  try {
    const current = getLocalData(userId) || {
      profiles: [],
      plans: [],
      subscriptions: [],
      categories: [],
      subcategories: [], transaction_allocations: [], cards: [],
      accounts: [],
      transactions: [],
      goals: [],
      debts: [],
      tasks: [],
      notes: [],
      journal: [],
      calendar: [],
      budgets: [],
      settings: [],
      shopping_list: []
    };
    const updated = { ...current, ...data };
    localStorage.setItem(LOCAL_STORAGE_KEY + userId, JSON.stringify(updated));

    if (isTestUser(userId)) {
      testDb.saveData(userId, updated);
    }
  } catch (e) {
    console.error("Error saving local cache:", e);
  }
};

const DEFAULT_CATEGORIES: Category[] = [
  { id: crypto.randomUUID(), user_id: null, name: 'Moradia', type: 'expense', is_default: true, color: '#EF4444', icon: 'home', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: crypto.randomUUID(), user_id: null, name: 'Alimentação', type: 'expense', is_default: true, color: '#F59E0B', icon: 'utensils', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: crypto.randomUUID(), user_id: null, name: 'Transporte', type: 'expense', is_default: true, color: '#3B82F6', icon: 'car', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: crypto.randomUUID(), user_id: null, name: 'Renda', type: 'income', is_default: true, color: '#10B981', icon: 'trending-up', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
];

const INITIAL_ACCOUNTS: Account[] = [
  { id: crypto.randomUUID(), user_id: '', name: 'Operacional', type: 'bank', balance_initial: 0, current_balance: 0, percentage: 60, is_active: true, color: '#4F46E5', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: crypto.randomUUID(), user_id: '', name: 'Reserva', type: 'investment', balance_initial: 0, current_balance: 0, percentage: 40, is_active: true, color: '#10B981', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

export const db = {
  // --- PROFILES (USERS) ---
  users: {
    getById: async (id: string): Promise<Profile | undefined> => {
      try {
        if (isTestUser(id)) {
          const local = localStorage.getItem('zenos_user_' + id);
          return local ? JSON.parse(local) : undefined;
        }

        const { data: profile } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
        if (profile) {
          localStorage.setItem('zenos_user_' + id, JSON.stringify(profile));
          return profile as Profile;
        }

        // Fall back to last-known local copy if Supabase is unreachable
        const local = localStorage.getItem('zenos_user_' + id);
        return local ? JSON.parse(local) : undefined;
      } catch (error) {
        console.warn("Supabase profile lookup failed, using local cache:", error);
        const local = localStorage.getItem('zenos_user_' + id);
        return local ? JSON.parse(local) : undefined;
      }
    },

    create: async (profile: Profile): Promise<Profile> => {
      if (isTestUser(profile.id)) {
        localStorage.setItem('zenos_user_' + profile.id, JSON.stringify(profile));
        return profile;
      }

      try {
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          role: profile.role,
          status: profile.status,
          phone: profile.phone,
          plan_id: profile.plan_id,
          created_at: profile.created_at,
          updated_at: profile.updated_at
        });

        if (profileError) {
          console.error("Profile upsert failed (check RLS policies):", profileError);
        }

        await supabase.from('settings').upsert({
          user_id: profile.id,
          currency: 'BRL',
          language: 'pt-BR',
          theme: 'light',
          notifications_enabled: true
        }).then(({ error }) => {
          if (error) console.error("Failed to ensure default settings:", error);
        });

        const { data: existingCats } = await supabase.from('categories').select('id').eq('user_id', profile.id).limit(1);
        if (!existingCats || existingCats.length === 0) {
          const defaultCats = [
            { user_id: profile.id, name: 'Alimentação', type: 'expense', color: '#FF5252', icon: 'Utensils', is_default: true },
            { user_id: profile.id, name: 'Combustível', type: 'expense', color: '#FFD740', icon: 'Fuel', is_default: true },
            { user_id: profile.id, name: 'Moradia', type: 'expense', color: '#448AFF', icon: 'Home', is_default: true },
            { user_id: profile.id, name: 'Lazer', type: 'expense', color: '#E040FB', icon: 'Gamepad2', is_default: true },
            { user_id: profile.id, name: 'Salário', type: 'income', color: '#69F0AE', icon: 'Banknote', is_default: true }
          ];
          const { error: catError } = await supabase.from('categories').insert(defaultCats);
          if (catError) console.error("Failed to ensure default categories:", catError);
        }

        localStorage.setItem('zenos_user_' + profile.id, JSON.stringify(profile));
        return profile;
      } catch (error) {
        console.error("Error in db.users.create:", error);
        localStorage.setItem('zenos_user_' + profile.id, JSON.stringify(profile));
        return profile;
      }
    },

    listAll: async (): Promise<Profile[]> => {
      try {
        const { data } = await supabase.from('profiles').select('*');
        return (data || []) as Profile[];
      } catch (error) {
        console.error("Error listing profiles:", error);
        return [];
      }
    },

    update: async (profile: Partial<Profile> & { id: string }): Promise<void> => {
      if (isTestUser(profile.id)) {
        const current = localStorage.getItem('zenos_user_' + profile.id);
        if (current) {
          const updated = { ...JSON.parse(current), ...profile };
          localStorage.setItem('zenos_user_' + profile.id, JSON.stringify(updated));
        }
        return;
      }

      try {
        const { error } = await supabase.from('profiles').update(profile).eq('id', profile.id);
        if (error) throw error;
        const { data: updatedProfile } = await supabase.from('profiles').select('*').eq('id', profile.id).maybeSingle();
        if (updatedProfile) {
          localStorage.setItem('zenos_user_' + profile.id, JSON.stringify(updatedProfile));
        }
      } catch (error) {
        console.error("Profile update failed:", error);
        throw error;
      }
    },

    delete: async (userId: string): Promise<void> => {
      try {
        localStorage.removeItem('zenos_user_' + userId);
        localStorage.removeItem(LOCAL_STORAGE_KEY + userId);
        if (!isTestUser(userId)) {
          const { error } = await supabase.from('profiles').delete().eq('id', userId);
          if (error) throw error;
        }
      } catch (error) {
        console.error("User deletion failed:", error);
        throw error;
      }
    }
  },

  // --- FINANCIAL DATA ---
  getFinancialData: async (userId: string, forceRefresh: boolean = false): Promise<FinancialData> => {
    if (isTestUser(userId)) {
      const cached = await testDb.getData(userId);
      if (cached) return cached;

      const localData = getLocalData(userId);
      if (localData) {
        testDb.saveData(userId, localData);
        return localData;
      }

      return {
        profiles: [], plans: [], subscriptions: [], categories: DEFAULT_CATEGORIES,
        subcategories: [], transaction_allocations: [], cards: [],
        accounts: INITIAL_ACCOUNTS, transactions: [], goals: [], debts: [],
        tasks: [], notes: [], journal: [], calendar: [], budgets: [],
        settings: [], shopping_list: []
      };
    }

    // forceRefresh=true (used after a realtime change notification from
    // another device) skips the local cache entirely - we want the actual
    // current state, not what was cached before the remote change arrived.
    const localData = forceRefresh ? null : getLocalData(userId);
    if (localData) {
      // Serve the local cache instantly, then refresh from Supabase in the background.
      setTimeout(() => db.refreshFromSupabase(userId), 200);
      return localData;
    }

    setSyncStatus('syncing');
    try {
      const freshData = await fetchAllFromSupabase(userId);
      saveLocalData(userId, freshData);
      setSyncStatus('synced');
      return freshData;
    } catch (error) {
      console.error("Failed to load data from Supabase:", error);
      setSyncStatus('error');
      // On a forced (realtime-triggered) refresh, prefer stale local data
      // over wiping the screen with empty data if the network hiccups.
      const fallback = forceRefresh ? getLocalData(userId) : null;
      return fallback || {
        profiles: [], plans: [], subscriptions: [], categories: DEFAULT_CATEGORIES,
        subcategories: [], transaction_allocations: [], cards: [],
        accounts: INITIAL_ACCOUNTS, transactions: [], goals: [], debts: [],
        tasks: [], notes: [], journal: [], calendar: [], budgets: [],
        settings: [], shopping_list: []
      };
    }
  },

  // Silently refresh the local cache from Supabase (used after serving cached data instantly)
  refreshFromSupabase: async (userId: string) => {
    if (!navigator.onLine || isTestUser(userId)) return;
    try {
      // Force a session check first. If the access token is expired, this
      // refreshes it using the refresh token before we touch any table -
      // prevents a stale JWT from causing every query to fail at once.
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        console.warn("Sessao invalida ao atualizar em segundo plano, abortando refresh:", sessionError);
        return; // do NOT touch local cache
      }

      const freshData = await fetchAllFromSupabase(userId);
      saveLocalData(userId, freshData);
      setSyncStatus('synced');
    } catch (error) {
      // Any failure here (including JWT expired thrown above) must leave the
      // existing local cache untouched.
      console.warn("Background refresh from Supabase failed, cache local preservado:", error);
    }
  },

  syncAllData: async (userId: string) => {
    if (!navigator.onLine) {
      setSyncStatus('offline');
      return;
    }
    if (isTestUser(userId)) return;

    setSyncStatus('syncing');
    try {
      const local = getLocalData(userId);
      if (!local) return;

      const withUser = (rows: any[]) => rows.map(r => ({ ...r, user_id: userId }));

      const syncTable = async (tableName: string, data: any[]) => {
        if (!data || data.length === 0) return;
        try {
          const { error } = await supabase.from(tableName).upsert(data);
          if (error) {
            // Ignorar erros de tabelas que não existem no banco de dados
            if (error.code === 'PGRST114' || error.code === 'PGRST205' || (error.message?.includes('relation') && error.message?.includes('does not exist')) || error.message?.includes('Could not find the table')) {
              console.warn(`Tabela ${tableName} não existe no banco de dados. Sincronização desta tabela ignorada.`);
              return;
            }
            throw error;
          }
        } catch (err) {
          console.error(`Erro ao sincronizar tabela ${tableName}:`, err);
          throw err;
        }
      };

      const syncs = [
        syncTable('categories', withUser(local.categories?.filter(c => c.user_id !== null) || [])),
        syncTable('subcategories', withUser(local.subcategories || [])),
        syncTable('accounts', withUser(local.accounts || [])),
        syncTable('transactions', withUser(local.transactions || [])),
        syncTable('goals', withUser(local.goals || [])),
        syncTable('debts', withUser(local.debts || [])),
        syncTable('settings', withUser(local.settings || [])),
        syncTable('tasks', withUser(local.tasks || [])),
        syncTable('notes', withUser(local.notes || [])),
        syncTable('journal', withUser(local.journal || [])),
        syncTable('calendar', withUser(local.calendar || [])),
        syncTable('budgets', withUser(local.budgets || [])),
        syncTable('cards', withUser(local.cards || []))
      ];

      const results = await Promise.allSettled(syncs);
      const failed = results.filter(r => r.status === 'rejected');
      if (failed.length) {
        console.error(`${failed.length} tabela(s) falharam na sincronização crítica:`, failed);
        setSyncStatus('error');
      } else {
        setSyncStatus('synced');
      }
    } catch (error) {
      console.error("Global sync error", error);
      setSyncStatus('error');
    }
  },

  // Garante que o usuário tenha categorias reais no banco. Se não tiver nenhuma
  // (conta nova, ou conta antiga criada por fora do fluxo normal de cadastro),
  // cria as categorias padrão de verdade no Supabase - nunca usa objetos "fake"
  // só de memória, que quebrariam a chave estrangeira ao lançar uma transação.
  ensureDefaultCategories: async (userId: string, existingCategories: Category[]): Promise<Category[]> => {
    if (isTestUser(userId)) return existingCategories;

    // Never trust the local/passed-in array to decide whether to seed -
    // that array can be empty due to a transient cache/auth hiccup even
    // though the user already has categories in the database. Ask the DB.
    const { count, error: countError } = await supabase
      .from('categories')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countError) {
      console.error('Failed to check existing categories, skipping seed to avoid duplicates:', countError);
      return existingCategories;
    }
    if ((count ?? 0) > 0) return existingCategories;

    // 4 default expense categories (2 subcategories each) + 1 default income category.
    const defaults = [
      { user_id: userId, name: 'Alimentação', type: 'expense', color: '#FF5252', icon: 'Utensils', is_default: true },
      { user_id: userId, name: 'Combustível', type: 'expense', color: '#FFD740', icon: 'Fuel', is_default: true },
      { user_id: userId, name: 'Moradia', type: 'expense', color: '#448AFF', icon: 'Home', is_default: true },
      { user_id: userId, name: 'Lazer', type: 'expense', color: '#E040FB', icon: 'Gamepad2', is_default: true },
      { user_id: userId, name: 'Salário', type: 'income', color: '#69F0AE', icon: 'Banknote', is_default: true }
    ];

    try {
      // onConflict + ignoreDuplicates makes this safe even if two devices/tabs
      // race to seed at the same time - the unique (user_id, name, type)
      // constraint means only one copy of each ever survives.
      const { data, error } = await supabase
        .from('categories')
        .upsert(defaults, { onConflict: 'user_id,name,type', ignoreDuplicates: true })
        .select('*');
      if (error) throw error;

      const created = (data as Category[]) || [];

      // Seed 2 default subcategories for each of the 4 expense categories.
      const subDefaults: Record<string, string[]> = {
        'Alimentação': ['Mercado', 'Restaurante'],
        'Combustível': ['Carro', 'Moto'],
        'Moradia': ['Aluguel', 'Contas'],
        'Lazer': ['Viagem', 'Cinema'],
      };
      const subRows = created
        .filter(c => subDefaults[c.name])
        .flatMap(c => subDefaults[c.name].map(name => ({ user_id: userId, category_id: c.id, name })));

      if (subRows.length) {
        const { error: subError } = await supabase
          .from('subcategories')
          .upsert(subRows, { onConflict: 'user_id,category_id,name', ignoreDuplicates: true });
        if (subError) console.error('Failed to seed default subcategories:', subError);
      }

      return [...existingCategories, ...created];
    } catch (error) {
      console.error('Failed to seed default categories:', error);
      return existingCategories;
    }
  },

  // Mesma lógica de auto-cura para os Potes (accounts): nunca deixa a tela
  // funcionar só com objetos fictícios em memória - sempre garante que existam
  // linhas reais no banco antes de permitir que o usuário lance algo contra elas.
  ensureDefaultAccounts: async (userId: string, existingAccounts: Account[]): Promise<Account[]> => {
    if (isTestUser(userId)) return existingAccounts;

    const { count, error: countError } = await supabase
      .from('accounts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countError) {
      console.error('Failed to check existing accounts, skipping seed to avoid duplicates:', countError);
      return existingAccounts;
    }
    if ((count ?? 0) > 0) return existingAccounts;

    const defaults = [
      { user_id: userId, name: 'Operacional', type: 'bank', balance_initial: 0, current_balance: 0, percentage: 60, is_active: true, color: '#4F46E5' },
      { user_id: userId, name: 'Reserva', type: 'investment', balance_initial: 0, current_balance: 0, percentage: 40, is_active: true, color: '#10B981' }
    ];

    try {
      const { data, error } = await supabase
        .from('accounts')
        .upsert(defaults, { onConflict: 'user_id,name', ignoreDuplicates: true })
        .select('*');
      if (error) throw error;
      return [...existingAccounts, ...(data as Account[])];
    } catch (error) {
      console.error('Failed to seed default accounts:', error);
      return existingAccounts;
    }
  },

  // Exclusão real no Supabase. Diferente de um "save" (que só faz upsert dos itens
  // que sobraram), isso garante que o registro apagado localmente também seja
  // removido de verdade no banco - essencial pra sincronizar exclusões entre
  // dispositivos diferentes.
  deleteRow: async (table: string, id: string) => {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) { console.error(`Failed to delete row from ${table}:`, error); throw error; }
  },

  // --- SPECIFIC SAVERS ---
  saveTransactions: async (userId: string, txs: Transaction[], onlyNewOrUpdated?: Transaction | Transaction[]) => {
    saveLocalData(userId, { transactions: txs });
    if (isTestUser(userId)) return;
    const toUpsert = onlyNewOrUpdated 
      ? (Array.isArray(onlyNewOrUpdated) ? onlyNewOrUpdated : [onlyNewOrUpdated]) 
      : txs;

    // Sanitização estrita: envia apenas as colunas reais da tabela transactions no Supabase
    // para evitar que colunas extras do frontend (ex: subcategory_id, goal_id, item, location)
    // façam a requisição falhar inteira.
    const cleanTxs = toUpsert.map(t => ({
      id: t.id,
      user_id: userId,
      account_id: t.account_id,
      category_id: t.category_id,
      type: t.type,
      description: t.description || '',
      amount: Number(t.amount || 0),
      date_at: t.date_at,
      payment_method: t.payment_method,
      is_recurring: !!t.is_recurring,
      note: t.note || null,
      created_at: t.created_at || new Date().toISOString(),
      updated_at: t.updated_at || new Date().toISOString()
    }));

    const { error } = await supabase.from('transactions').upsert(cleanTxs);
    if (error) { 
      console.error("Failed to save transactions to Supabase:", error); 
      throw error; 
    }
  },

  saveAccounts: async (userId: string, accounts: Account[]) => {
    saveLocalData(userId, { accounts });
    if (isTestUser(userId)) return;
    const { error } = await supabase.from('accounts').upsert(accounts.map(a => ({ ...a, user_id: userId })));
    if (error) { console.error("Failed to save accounts:", error); throw error; }
  },

  saveDebts: async (userId: string, debts: Debt[]) => {
    saveLocalData(userId, { debts });
    if (isTestUser(userId)) return;
    const { error } = await supabase.from('debts').upsert(debts.map(d => ({ ...d, user_id: userId })));
    if (error) { console.error("Failed to save debts:", error); throw error; }
  },

  saveGoals: async (userId: string, goals: Goal[]) => {
    saveLocalData(userId, { goals });
    if (isTestUser(userId)) return;
    const { error } = await supabase.from('goals').upsert(goals.map(g => ({ ...g, user_id: userId })));
    if (error) { console.error("Failed to save goals:", error); throw error; }
  },

  saveCategories: async (userId: string, cats: Category[]) => {
    const userCats = cats.filter(c => c.user_id === userId);
    saveLocalData(userId, { categories: cats });
    if (isTestUser(userId)) return;
    const { error } = await supabase.from('categories').upsert(userCats.map(c => ({ ...c, user_id: userId })));
    if (error) { console.error("Failed to save categories:", error); throw error; }
  },

  saveSubcategories: async (userId: string, subcats: any[]) => {
    saveLocalData(userId, { subcategories: subcats });
    if (isTestUser(userId)) return;
    const { error } = await supabase.from('subcategories').upsert(subcats.map(s => ({ ...s, user_id: userId })));
    if (error) { console.error("Failed to save subcategories:", error); throw error; }
  },

  saveSettings: async (userId: string, settings: Settings[]) => {
    saveLocalData(userId, { settings });
    if (isTestUser(userId)) return;
    const { error } = await supabase.from('settings').upsert(settings.map(s => ({ ...s, user_id: userId })));
    if (error) { console.error("Failed to save settings:", error); throw error; }
  },

  saveShoppingList: async (userId: string, items: any[]) => {
    saveLocalData(userId, { shopping_list: items } as any);
    if (isTestUser(userId)) return;
    try {
      if (items.length > 0) {
        const { error } = await supabase.from('shopping_list').upsert(items.map(item => ({
          id: item.id,
          user_id: userId,
          name: item.name,
          quantity: item.quantity || null,
          completed: item.completed,
          created_at: item.created_at,
          updated_at: item.updated_at
        })));
        if (error) {
          const isMissingTable =
            error.code === 'PGRST114' ||
            error.code === 'PGRST205' ||
            error.message?.includes('relation') ||
            error.message?.includes('Could not find the table');
          if (!isMissingTable) {
            console.error("Failed to sync shopping list to Supabase:", error);
            throw error;
          }
        }
      }
    } catch (e) {
      console.warn("Failed to sync shopping list, keeping in local cache:", e);
    }
  },

  saveTasks: async (userId: string, tasks: any[]) => {
    saveLocalData(userId, { tasks });
    if (isTestUser(userId)) return;
    const { error } = await supabase.from('tasks').upsert(tasks.map(t => ({ ...t, user_id: userId })));
    if (error) { console.error("Failed to save tasks:", error); throw error; }
  },

  saveNotes: async (userId: string, notes: any[]) => {
    saveLocalData(userId, { notes });
    if (isTestUser(userId)) return;
    const { error } = await supabase.from('notes').upsert(notes.map(n => ({ ...n, user_id: userId })));
    if (error) { console.error("Failed to save notes:", error); throw error; }
  },

  saveJournal: async (userId: string, entries: any[]) => {
    saveLocalData(userId, { journal: entries });
    if (isTestUser(userId)) return;
    const { error } = await supabase.from('journal').upsert(entries.map(e => ({ ...e, user_id: userId })));
    if (error) { console.error("Failed to save journal entries:", error); throw error; }
  },

  saveBudgets: async (userId: string, budgets: any[]) => {
    saveLocalData(userId, { budgets });
    if (isTestUser(userId)) return;
    const { error } = await supabase.from('budgets').upsert(budgets.map(b => ({ ...b, user_id: userId })));
    if (error) { console.error("Failed to save budgets:", error); throw error; }
  },

  saveCalendar: async (userId: string, events: any[]) => {
    saveLocalData(userId, { calendar: events });
    if (isTestUser(userId)) return;
    const { error } = await supabase.from('calendar').upsert(events.map(e => ({ ...e, user_id: userId })));
    if (error) { console.error("Failed to save calendar events:", error); throw error; }
  },

  saveCards: async (userId: string, cards: any[]) => {
    saveLocalData(userId, { cards });
    if (isTestUser(userId)) return;
    const { error } = await supabase.from('cards').upsert(cards.map(c => ({ ...c, user_id: userId })));
    if (error) { console.error("Failed to save cards:", error); throw error; }
  },

  // Salva o rateio de uma receita entre potes (não duplica a transação, só o detalhamento)
  saveAllocations: async (userId: string, allocations: TransactionAllocation[], onlyNewOrUpdated?: TransactionAllocation[]) => {
    saveLocalData(userId, { transaction_allocations: allocations });
    if (isTestUser(userId)) return;
    const toUpsert = onlyNewOrUpdated || allocations;
    if (!toUpsert.length) return;
    const { error } = await supabase.from('transaction_allocations').upsert(toUpsert);
    if (error) { console.error("Failed to save transaction allocations:", error); throw error; }
  },

  // --- SYSTEM ADMIN ---
  admin: {
    logs: {
      list: async (): Promise<AdminLog[]> => {
        const { data } = await supabase.from('admin_logs').select('*').order('created_at', { ascending: false });
        return (data || []) as AdminLog[];
      },
      create: async (log: Omit<AdminLog, 'id' | 'created_at'>): Promise<void> => {
        await supabase.from('admin_logs').insert([log]);
      }
    },
    plans: {
      list: async (): Promise<Plan[]> => {
        const { data } = await supabase.from('plans').select('*').eq('is_active', true);
        return (data || []) as Plan[];
      },
      update: async (plan: Plan): Promise<void> => {
        await supabase.from('plans').upsert([plan]);
      }
    },
    subscriptions: {
      listAll: async (): Promise<Subscription[]> => {
        const { data } = await supabase.from('subscriptions').select('*');
        return (data || []) as Subscription[];
      }
    }
  }
};

// Fetches every user-owned table from Supabase in parallel.
async function fetchAllFromSupabase(userId: string): Promise<FinancialData> {
  const tables = ['categories', 'subcategories', 'accounts', 'transactions', 'goals', 'debts', 'settings', 'tasks', 'notes', 'journal', 'calendar', 'budgets', 'cards', 'shopping_list' as any] as const;

  const fetchPromises = tables.map(async (table) => {
    const { data, error } = await supabase.from(table).select('*').eq('user_id', userId);
    if (error) {
      const isMissingTable =
        error.code === 'PGRST114' ||
        error.code === 'PGRST205' ||
        (error.message?.includes('relation') && error.message?.includes('does not exist')) ||
        error.message?.includes('Could not find the table');
      if (isMissingTable) {
        console.warn(`Tabela ${table} nao encontrada no Supabase. Retornando dados vazios.`);
        return [];
      }
      // Auth/session errors (expired or invalid JWT) must NOT be treated as "no data" -
      // doing so would let an empty result silently overwrite the local cache.
      // Throw so the caller can abort the refresh instead.
      console.error(`Erro ao carregar tabela ${table} do Supabase:`, error);
      throw error;
    }
    return data || [];
  });

  const results = await Promise.all(fetchPromises);
  const byTable = Object.fromEntries(tables.map((t, i) => [t, results[i]]));

  // System-wide default categories (user_id IS NULL) are shared by everyone.
  const { data: systemCategories } = await supabase.from('categories').select('*').is('user_id', null);

  // Alocações não têm user_id direto (ligam por transaction_id) - busca pelas
  // transações do usuário que acabamos de carregar.
  const txIds = (byTable.transactions as any[]).map(t => t.id);
  let allocations: any[] = [];
  if (txIds.length > 0) {
    try {
      const { data: allocData, error: allocError } = await supabase.from('transaction_allocations').select('*').in('transaction_id', txIds);
      if (allocError) {
        if (allocError.code === 'PGRST114' || (allocError.message?.includes('relation') && allocError.message?.includes('does not exist'))) {
          console.warn(`Tabela transaction_allocations nao encontrada no Supabase.`);
        } else {
          throw allocError;
        }
      } else {
        allocations = allocData || [];
      }
    } catch (e) {
      console.error(`Erro ao carregar transaction_allocations:`, e);
    }
  }

  return {
    profiles: [],
    plans: [],
    subscriptions: [],
    categories: [...(systemCategories || []), ...byTable.categories] as Category[],
    subcategories: byTable.subcategories as any[],
    accounts: byTable.accounts as Account[],
    transactions: byTable.transactions as Transaction[],
    transaction_allocations: allocations,
    goals: byTable.goals as Goal[],
    debts: byTable.debts as Debt[],
    settings: byTable.settings as Settings[],
    tasks: byTable.tasks as any[],
    notes: byTable.notes as any[],
    journal: byTable.journal as any[],
    calendar: byTable.calendar as any[],
    budgets: byTable.budgets as any[],
    cards: byTable.cards as any[],
    shopping_list: (byTable.shopping_list || []) as any[],
  };
}
