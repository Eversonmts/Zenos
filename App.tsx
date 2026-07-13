
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, Receipt, Target, BrainCircuit, Menu, X, Archive, 
  AlertCircle, Plus, Settings as SettingsIcon, Camera, Mic, Loader2, StopCircle, LogOut, Shield, Wallet, Lock, Crown, Check, CreditCard as CreditCardIcon, ShoppingBag, Activity, ArrowUpCircle, ArrowDownCircle, Eye, Fingerprint,
  BarChart2, CheckSquare, StickyNote, Book, Calendar as CalendarIcon, MessageSquare, PieChart, Tag, ShoppingCart
} from 'lucide-react';
import { AppView, Transaction, Account, Debt, Goal, Category, Subcategory, Profile, Plan, Settings as SettingsType, FinancialData, Subscription, Task, Note, JournalEntry, CalendarEvent, Budget, TransactionAllocation, CreditCard, ShoppingItem } from './types';
import Dashboard from './components/Dashboard';
import Transactions from './components/Transactions';
import Compromissos from './components/Compromissos';
import Potes from './components/Potes';
import Goals from './components/Goals';
import Settings from './components/Settings';
import AdminDashboard from './components/admin/AdminDashboard';
import LoginModal from './components/LoginModal';
import Toast, { ToastType } from './components/Toast';
import BottomNav from './components/BottomNav';
import Tasks from './components/Tasks';
import Notes from './components/Notes';
import Journal from './components/Journal';
import CalendarView from './components/Calendar';
import Cartoes from './components/Cartoes';
import CardExpenseModal from './components/CardExpenseModal';
import Budgets from './components/Budgets';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import ZenosIA from './components/ZenosIA';
import ZenOSLogo from './components/ZenOSLogo';
import ZenosIAScannerModal from './components/ZenosIAScannerModal';
import ShoppingList from './components/ShoppingList';
import { analyzeReceipt, analyzeAudioCommand } from './services/gemini';
import { initializeAuth, logout as authLogout, updateProfileData } from './services/auth';
import { db, onSyncStatusChange, SyncStatus, subscribeRealtime } from './services/db';
import { financeService } from './services/finance';
import { checkLatestVersion } from './services/versionService';

// Default Constants (Fallback)
const INITIAL_ACCOUNTS: Account[] = [
  { id: crypto.randomUUID(), user_id: '', name: 'Operacional', type: 'bank', balance_initial: 0, current_balance: 0, percentage: 60, is_active: true, color: '#4F46E5', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: crypto.randomUUID(), user_id: '', name: 'Reserva', type: 'investment', balance_initial: 0, current_balance: 0, percentage: 40, is_active: true, color: '#10B981', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

const DEFAULT_CATEGORIES: Category[] = [
  { 
    id: crypto.randomUUID(), user_id: null, name: 'Moradia', type: 'expense', is_default: true, color: '#EF4444', icon: 'home',
    created_at: new Date().toISOString(), updated_at: new Date().toISOString()
  },
  { 
    id: crypto.randomUUID(), user_id: null, name: 'Alimentação', type: 'expense', is_default: true, color: '#F59E0B', icon: 'utensils',
    created_at: new Date().toISOString(), updated_at: new Date().toISOString()
  },
  { 
    id: crypto.randomUUID(), user_id: null, name: 'Transporte', type: 'expense', is_default: true, color: '#3B82F6', icon: 'car',
    created_at: new Date().toISOString(), updated_at: new Date().toISOString()
  },
  { 
    id: crypto.randomUUID(), user_id: null, name: 'Renda', type: 'income', is_default: true, color: '#10B981', icon: 'trending-up',
    created_at: new Date().toISOString(), updated_at: new Date().toISOString()
  }
];

interface NavItem {
  id: AppView;
  label: string;
  icon: any;
  section: string;
  adminOnly?: boolean;
}

export default function App() {
  const [view, setView] = useState<AppView>('dashboard');
  const [menuSize, setMenuSize] = useState<Profile['menu_size']>('md');
  const [settingsTab, setSettingsTab] = useState<'categories' | 'appearance' | 'subscription' | 'profile'>('categories');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: ToastType } | null>(null);

  // Estado para verificar atualização pendente do aplicativo
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);

  // --- PWA INSTALL BANNER STATES ---
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const isClosed = sessionStorage.getItem('zenos_install_banner_closed') === 'true';
      if (!isClosed) {
        setShowInstallBanner(true);
      }
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setShowInstallBanner(false);
      showToast("ZenOS instalado com sucesso! Acesse pela sua tela inicial.", "success");
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('Usuário aceitou instalar o PWA');
    }
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  useEffect(() => {
    const checkAppUpdate = async () => {
      try {
        const res = await checkLatestVersion();
        setIsUpdateAvailable(res.isUpdateAvailable);
      } catch (err) {
        console.warn("Background update check failed:", err);
      }
    };
    checkAppUpdate();
    
    // Verificação automática periódica a cada 5 minutos (300000ms)
    const intervalId = setInterval(checkAppUpdate, 300000);
    return () => clearInterval(intervalId);
  }, []);
  
  // Data States (Loaded asynchronously)
  const [loadingData, setLoadingData] = useState(false);
  const [txFilter, setTxFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionAllocations, setTransactionAllocations] = useState<TransactionAllocation[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [showCardExpenseModal, setShowCardExpenseModal] = useState(false);
  const [isAIScannerOpen, setIsAIScannerOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [settings, setSettings] = useState<SettingsType[]>([]);

  // States for Paywall & Fab
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [preFilledTx, setPreFilledTx] = useState<Partial<Transaction> | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [user, setUser] = useState<Profile | null>(null);
  const [simulatedUser, setSimulatedUser] = useState<Profile | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [pinBuffer, setPinBuffer] = useState('');
  const [loading, setLoading] = useState(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  useEffect(() => {
    // Timeout safety for initial load
    const timeoutTimer = setTimeout(() => {
      if (loading) setLoading(false);
      if (loadingData) setLoadingData(false);
    }, 10000); // 10 seconds max wait

    const unsubscribe = initializeAuth(async (u) => {
      setUser(u);
      
      // Request PIN if security is active
      if (u?.security_pin) {
        setIsLocked(true);
      }

      const simulatedId = localStorage.getItem('zen_simulated_user');
      
      if (u && u.role === 'admin' && simulatedId) {
        const sUser = await db.users.getById(simulatedId);
        if (sUser) {
          setSimulatedUser(sUser);
          await loadUserData(simulatedId);
        } else {
          await loadUserData(u.id);
        }
      } else if (u) {
        await loadUserData(u.id);
      }
      
      setLoading(false);
      clearTimeout(timeoutTimer);
    });
    return () => {
      unsubscribe();
      clearTimeout(timeoutTimer);
    };
  }, []);

  useEffect(() => {
    const u = simulatedUser || user;
    if (u?.menu_size) {
      setMenuSize(u.menu_size);
    } else {
      setMenuSize('md');
    }
  }, [simulatedUser?.menu_size, user?.menu_size]);

  // Multi-device realtime sync: whenever ANY table changes on ANY device for
  // this user (Supabase Realtime/Postgres CDC), reload data here almost
  // instantly instead of waiting for the next manual refresh/app reopen.
  useEffect(() => {
    const activeId = (simulatedUser || user)?.id;
    if (!activeId) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const handleRemoteChange = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      // Small debounce: a single user action can touch multiple tables
      // (e.g. a transaction + its account balance) - wait for the burst
      // to settle before reloading once.
      debounceTimer = setTimeout(() => {
        loadUserData(activeId, true);
      }, 400);
    };

    const unsubscribe = subscribeRealtime(activeId, handleRemoteChange);
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      unsubscribe();
    };
  }, [simulatedUser?.id, user?.id]);

  useEffect(() => {
    // Só aplica escala de fontSize em telas desktop (>=1024px).
    // Em mobile, fontSize fixo em 100% para não causar overflow.
    const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
    if (!isDesktop) {
      document.documentElement.style.fontSize = '100%';
      return;
    }
    let sizePercent = '100%';
    if (menuSize === 'xs') {
      sizePercent = '70%'; // Muito Pequena: 30% menor que a normal
    } else if (menuSize === 'sm') {
      sizePercent = '85%'; // Pequena: 15% menor que a normal
    } else if (menuSize === 'lg') {
      sizePercent = '115%'; // Grande: 15% maior que a normal
    } else {
      sizePercent = '100%'; // Normal
    }
    document.documentElement.style.fontSize = sizePercent;
  }, [menuSize]);

  const exitSimulation = () => {
    localStorage.removeItem('zen_simulated_user');
    setSimulatedUser(null);
    if (user) loadUserData(user.id);
    showToast("Simulação encerrada", "info");
  };

  const handleLogout = async () => {
    await authLogout();
    showToast('Sessão encerrada', 'info');
  };

  // Pull to refresh logic
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Sempre que troca de tela (ou de aba dentro de Ajustes), volta o scroll pro topo -
  // sem isso, a tela nova podia renderizar "embaixo" da rolagem anterior.
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [view, settingsTab]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');

  useEffect(() => {
    const handleOnline = () => {
      showToast('Conexão restabelecida. Sincronizando...', 'info');
      if (user) db.syncAllData(simulatedUser?.id || user.id);
    };
    const handleOffline = () => {
      showToast('Você está offline. Alterações serão salvas localmente.', 'info');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubscribeSync = onSyncStatusChange((status) => {
      setSyncStatus(status);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribeSync();
    };
  }, [user, simulatedUser]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !user) return;

    let startY = 0;
    let isPulling = false;

    const handleTouchStart = (e: TouchEvent) => {
      if (container.scrollTop === 0) {
        startY = e.touches[0].pageY;
        isPulling = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling) return;
      const currentY = e.touches[0].pageY;
      const diff = currentY - startY;

      if (diff > 150 && container.scrollTop === 0) {
        // Pull detected
      }
    };

    const handleTouchEnd = async (e: TouchEvent) => {
      if (!isPulling) return;
      const currentY = e.changedTouches[0].pageY;
      const diff = currentY - startY;

      if (diff > 150 && container.scrollTop === 0) {
        setIsRefreshing(true);
        await loadUserData(user.id);
        setIsRefreshing(false);
        showToast("Dados atualizados!", "success");
      }
      isPulling = false;
    };

    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchmove', handleTouchMove);
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [user]);

  const loadUserData = async (userId: string, forceRefresh: boolean = false) => {
    if (!forceRefresh) setLoadingData(true);
    try {
        const data = await db.getFinancialData(userId, forceRefresh);
        
        setTransactions(data.transactions || []);
        setTransactionAllocations(data.transaction_allocations || []);
        setCards(data.cards || []);

        const safeAccounts = data.accounts.length
          ? data.accounts
          : await db.ensureDefaultAccounts(userId, data.accounts || []);
        setAccounts(safeAccounts.length ? safeAccounts : INITIAL_ACCOUNTS);

        setDebts(data.debts || []);
        setGoals(data.goals || []);

        // Garante categorias reais no banco (nunca usa fallback fake em memória,
        // que causaria erro de chave estrangeira ao lançar uma transação)
        const safeCategories = data.categories.length
          ? data.categories
          : await db.ensureDefaultCategories(userId, data.categories || []);
        setCategories(safeCategories.length ? safeCategories : DEFAULT_CATEGORIES);

        setSubcategories(data.subcategories || []);
        setSettings(data.settings || []);
        setSubscriptions(data.subscriptions || []);
        setTasks(data.tasks || []);
        setNotes(data.notes || []);
        setJournalEntries(data.journal || []);
        setEvents(data.calendar || []);
        setBudgets(data.budgets || []);
        setShoppingList(data.shopping_list || []);
        
        // Load plans
        const plansList = await db.admin.plans.list();
        setPlans(plansList);
    } catch (e) {
        console.error("Failed to load data", e);
        showToast("Erro ao carregar dados do servidor.", "error");
    } finally {
        setLoadingData(false);
    }
  };

  const checkPaymentCallback = (currentProfile: Profile) => {
      // Payment check logic would move to a subscription handling effect or specific view
  };

  // Theme Management
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('zen_theme') as 'dark' | 'light') || 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('zen_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const handleAddSubcategory = (sub: Subcategory) => {
    updateAndSave((prev: Subcategory[]) => [...prev, sub], setSubcategories, db.saveSubcategories);
  };

  const activeUser = simulatedUser || user;

  // --- Processed Data (Derived State) ---
  const { processedAccounts, totalBalance, totalMonthlyIncome, monthExpenses } = useMemo(() => {
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const monthlyIncome = transactions
      .filter(t => t.type === 'income' && t.date_at?.startsWith(currentMonthStr))
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const monthlyExpenses = transactions
      .filter(t => t.type === 'expense' && t.date_at?.startsWith(currentMonthStr))
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // IMPORTANT: Pot balances are accumulated strictly from actual data already
    // persisted (income via transaction_allocations, expenses via transactions
    // directly tagged to that account_id). We intentionally do NOT recompute
    // "all-time income x current percentage" here - that would retroactively
    // change historical allocations every time a percentage is edited or a new
    // pot is created. Percentages only affect how *new* income entries split.
    const processed = accounts.map(acc => {
      const incomes = transactionAllocations
        .filter(a => a.account_id === acc.id)
        .reduce((sum, a) => sum + Number(a.amount), 0);

      // Receita manual, lançada direto numa conta específica (sem passar pelo rateio automático)
      const directIncomes = transactions
        .filter(t => t.type === 'income' && t.account_id === acc.id)
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const expenses = transactions
        .filter(t => t.type === 'expense' && t.account_id === acc.id)
        .reduce((sum, t) => sum + Number(t.amount), 0);

      return {
        ...acc,
        current_balance: Number(acc.balance_initial || 0) + incomes + directIncomes - expenses
      };
    });

    const total = processed.reduce((sum, a) => sum + a.current_balance, 0);

    return { 
      processedAccounts: processed, 
      totalBalance: total, 
      totalMonthlyIncome: monthlyIncome,
      monthExpenses: monthlyExpenses
    };
  }, [transactions, accounts, transactionAllocations]);

  const financialData = useMemo(() => ({ 
    profile: activeUser,
    transactions, 
    accounts: processedAccounts, 
    debts, goals, categories, subcategories, settings, subscriptions,
    tasks, notes, journal: journalEntries, calendar: events, budgets
  }), [activeUser, transactions, processedAccounts, debts, goals, categories, subcategories, settings, subscriptions, tasks, notes, journalEntries, events, budgets]);

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ message, type });
  };

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard, section: 'PRINCIPAL' },
    { id: 'transactions', label: 'Finanças', icon: Receipt, section: 'FINANCEIRO' },
    { id: 'accounts' as any, label: 'Potes', icon: Archive, section: 'FINANCEIRO' },
    { id: 'goals', label: 'Metas', icon: Target, section: 'FINANCEIRO' },
    { id: 'compromissos', label: 'Dívidas', icon: AlertCircle, section: 'FINANCEIRO' },
    { id: 'cartoes' as any, label: 'Cartões', icon: CreditCardIcon, section: 'FINANCEIRO' },
    { id: 'budgets' as any, label: 'Orçamentos', icon: PieChart, section: 'FINANCEIRO' },
    { id: 'categories' as any, label: 'Categorias', icon: Tag, section: 'FINANCEIRO' },
    { id: 'tasks', label: 'Tarefas', icon: CheckSquare, section: 'PRODUTIVIDADE' },
    { id: 'notes', label: 'Notas', icon: StickyNote, section: 'PRODUTIVIDADE' },
    { id: 'journal', label: 'Diário', icon: Book, section: 'PRODUTIVIDADE' },
    { id: 'calendar', label: 'Calendário', icon: CalendarIcon, section: 'PRODUTIVIDADE' },
    { id: 'shopping_list' as any, label: 'Lista de Compras', icon: ShoppingCart, section: 'PRODUTIVIDADE' },
    { id: 'analytics', label: 'Análise', icon: BarChart2, section: 'INTELIGÊNCIA' },
    { id: 'advisor', label: 'Zenos IA', icon: BrainCircuit, section: 'INTELIGÊNCIA' },
    { id: 'settings', label: 'Ajustes', icon: SettingsIcon, section: 'SISTEMA' },
    { id: 'admin', label: 'Admin', icon: Shield, section: 'SISTEMA', adminOnly: true },
  ];

  const handleUpdateUser = (updatedProfile: Profile) => {
    if (simulatedUser) setSimulatedUser(updatedProfile);
    else setUser(updatedProfile);
    
    updateProfileData(updatedProfile);
  };

  const handleAddCategory = async (cat: Category) => {
    if (!activeUser) return;
    
    const check = await financeService.checkLimit(activeUser.id, 'categories');
    if (!check.allowed) {
      showToast(check.message || 'Limite atingido', 'error');
      return;
    }

    const newCats = [...categories, cat];
    setCategories(newCats);
    db.saveCategories(activeUser.id, newCats);
  };

  const updateAndSave = async (
      updateFn: any, 
      setter: React.Dispatch<any>, 
      saver: (uid: string, data: any) => Promise<void>
  ) => {
      if(!activeUser) return;
      setter((prev: any) => {
          const newData = typeof updateFn === 'function' ? updateFn(prev) : updateFn;
          saver(activeUser.id, newData).catch(err => {
              console.warn("Save failed in Supabase (saved locally):", err);
          });
          return newData;
      });
  };

  const handleAddGoal = (g: Goal) => {
    updateAndSave((prev: Goal[]) => [...prev, g], setGoals, db.saveGoals);
  };

  const handleAddCompromisso = (e: CalendarEvent) => {
    updateAndSave((prev: CalendarEvent[]) => [...prev, e], setEvents, db.saveCalendar);
  };

  const handleAddNote = (n: Note) => {
    updateAndSave((prev: Note[]) => [...prev, n], setNotes, db.saveNotes);
  };

  const handleAddTask = (t: Task) => {
    updateAndSave((prev: Task[]) => [...prev, t], setTasks, db.saveTasks);
  };

  const handleAddShoppingItem = (name: string, quantity?: string) => {
    if (!activeUser) return;
    const newItem: ShoppingItem = {
      id: crypto.randomUUID(),
      user_id: activeUser.id,
      name,
      quantity,
      completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    const updated = [...shoppingList, newItem];
    setShoppingList(updated);
    db.saveShoppingList(activeUser.id, updated).catch(err => console.error("Failed to save shopping item:", err));
  };

  const handleToggleShoppingItem = (id: string) => {
    if (!activeUser) return;
    const updated = shoppingList.map(item => 
      item.id === id ? { ...item, completed: !item.completed, updated_at: new Date().toISOString() } : item
    );
    setShoppingList(updated);
    db.saveShoppingList(activeUser.id, updated).catch(err => console.error("Failed to toggle shopping item:", err));
  };

  const handleDeleteShoppingItem = (id: string) => {
    if (!activeUser) return;
    const updated = shoppingList.filter(item => item.id !== id);
    setShoppingList(updated);
    db.saveShoppingList(activeUser.id, updated).catch(err => console.error("Failed to delete shopping item:", err));
  };

  const handleClearCompletedShopping = () => {
    if (!activeUser) return;
    const updated = shoppingList.filter(item => !item.completed);
    setShoppingList(updated);
    db.saveShoppingList(activeUser.id, updated).catch(err => console.error("Failed to clear completed shopping items:", err));
  };

  const handlePayCompromisso = (compromissoId: string, accountId: string, amount: number) => {
    if (!activeUser) return;
    const targetComp = events.find(e => e.id === compromissoId);
    if (targetComp) {
      const updatedEvents = events.map(e => 
        e.id === compromissoId ? { ...e, status: 'paid', updated_at: new Date().toISOString() } : e
      );
      setEvents(updatedEvents);
      db.saveCalendar(activeUser.id, updatedEvents);

      const paymentTx: Transaction = {
        id: crypto.randomUUID(),
        user_id: activeUser.id,
        description: `Pago: ${targetComp.title}`,
        amount: Math.abs(amount),
        type: 'expense',
        category_id: categories.find(c => c.name.toLowerCase().includes('moradia') || c.name.toLowerCase().includes('alimentação'))?.id || null,
        subcategory_id: null,
        account_id: accountId,
        date_at: new Date().toISOString().split('T')[0],
        payment_method: 'Zenos IA Baixa',
        is_recurring: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      handleAddTransaction(paymentTx);
    }
  };

  // --- Specific Action Handlers ---
  
  const handleAddTransaction = async (t: Transaction | Transaction[]) => {
    if(!activeUser) return;

    let newEntries: Transaction[];
    let newAllocations: TransactionAllocation[] = [];

    if (!Array.isArray(t) && t.type === 'income' && !t.account_id) {
      // Auto-rateio: a transação em Movimentações fica ÚNICA. O rateio entre
      // potes (percentual vigente agora) é gravado separadamente, e nunca muda
      // o que já foi lançado mesmo que os percentuais mudem depois.
      const activePots = accounts.filter(a => a.is_active && (a.percentage || 0) > 0);
      const totalPct = activePots.reduce((s, a) => s + (a.percentage || 0), 0);

      const singleTx: Transaction = {
        ...(t as Transaction),
        id: crypto.randomUUID(),
        account_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      newEntries = [singleTx];

      if (activePots.length > 0 && totalPct > 0) {
        let allocated = 0;
        newAllocations = activePots.map((acc, idx) => {
          const isLast = idx === activePots.length - 1;
          const share = isLast ? (singleTx.amount - allocated) : Math.round((singleTx.amount * ((acc.percentage || 0) / totalPct)) * 100) / 100;
          allocated += share;
          return {
            id: crypto.randomUUID(),
            transaction_id: singleTx.id,
            account_id: acc.id,
            amount: share,
            created_at: new Date().toISOString()
          };
        });
      }
    } else {
      newEntries = Array.isArray(t) ? t : [t as Transaction];
    }

    const newTxs = [...newEntries, ...transactions];
    const updatedAllocations = newAllocations.length > 0
      ? [...transactionAllocations, ...newAllocations]
      : transactionAllocations;

    // Atualiza AMBOS os estados (transações + alocações) no mesmo ciclo de render,
    // para que o useMemo do totalBalance recalcule com os dois dados atualizados.
    setTransactions(newTxs);
    if (newAllocations.length > 0) {
      setTransactionAllocations(updatedAllocations);
    }
    setPreFilledTx(null); // limpa já, antes dos saves assíncronos - evita a caixa reabrir

    try {
      // As alocações têm uma chave estrangeira apontando pra transação - por isso
      // é essencial esperar a transação terminar de salvar antes de gravar o rateio.
      // Otimizado: enviamos apenas as novas entradas e novas alocações para o Supabase
      await db.saveTransactions(activeUser.id, newTxs, newEntries);

      if (newAllocations.length > 0) {
        await db.saveAllocations(activeUser.id, updatedAllocations, newAllocations);
      }
    } catch (err) {
      console.warn('Failed to save transaction to Supabase (saving offline/local instead):', err);
      showToast('Lançamento salvo localmente (modo offline)', 'info');
    }

    const label = Array.isArray(t) ? 'Lançamentos registrados!' : `${(t as Transaction).type === 'income' ? 'Entrada' : 'Despesa'} registrada!`;
    showToast(label);
  };

  const handleUpdateDebts = (updatedDebts: Debt[]) => {
      if(!activeUser) return;
      setDebts(prev => {
        const map = new Map<string, Debt>(prev.map(d => [d.id, d]));
        updatedDebts.forEach(d => map.set(d.id, d));
        const merged = Array.from(map.values());
        db.saveDebts(activeUser.id, merged).catch(err => console.error("Failed to save debts:", err));
        return merged;
      });
  };

  const handleDeleteDebt = (debtId: string) => {
    if(!activeUser) return;
    db.deleteRow('debts', debtId).catch(err => console.error(err));
    const updated = debts.filter(d => d.id !== debtId);
    setDebts(updated);
    db.saveDebts(activeUser.id, updated);
  };

  const handleDebtPayment = (debt: Debt, amount: number, account_id: string, date: string) => {
    if(!activeUser) return;
    const updatedDebts = debts.map(d => {
      if (d.id === debt.id) {
        const newPaid = d.paid_amount + amount;
        return { ...d, paid_amount: newPaid, status: newPaid >= d.total_amount ? 'paid' : d.status } as Debt;
      }
      return d;
    });
    setDebts(updatedDebts);
    db.saveDebts(activeUser.id, updatedDebts);

    const paymentTx: Transaction = {
      id: crypto.randomUUID(),
      user_id: activeUser.id,
      description: `Pagamento: ${debt.description}`,
      amount: amount,
      category_id: null,
      subcategory_id: null,
      account_id: account_id,
      date_at: date || new Date().toISOString().split('T')[0],
      type: 'expense',
      payment_method: 'Transferência',
      is_recurring: false,
      note: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    handleAddTransaction(paymentTx);
  };

  // Paga várias parcelas de uma fatura de cartão de uma vez, todas saindo do
  // mesmo pote escolhido - reaproveita a mesma regra de pagamento das dívidas.
  const handleInvoicePayment = (debtIds: string[], accountId: string, totalAmount: number) => {
    if (!activeUser) return;
    const today = new Date().toISOString().split('T')[0];

    const updatedDebts = debts.map(d => {
      if (debtIds.includes(d.id)) {
        return { ...d, paid_amount: d.total_amount, status: 'paid' } as Debt;
      }
      return d;
    });
    setDebts(updatedDebts);
    db.saveDebts(activeUser.id, updatedDebts);

    const paymentTx: Transaction = {
      id: crypto.randomUUID(),
      user_id: activeUser.id,
      description: `Pagamento de fatura (${debtIds.length} parcela${debtIds.length > 1 ? 's' : ''})`,
      amount: totalAmount,
      category_id: null,
      subcategory_id: null,
      account_id: accountId,
      date_at: today,
      type: 'expense',
      payment_method: 'Transferência',
      is_recurring: false,
      note: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    handleAddTransaction(paymentTx);
    showToast('Fatura paga com sucesso!');
  };

  const handleGoalDeposit = (amount: number, account_id: string, goalTitle: string) => {
    if (!activeUser) return;
    const tx: Transaction = {
      id: crypto.randomUUID(),
      user_id: activeUser.id,
      description: `Aporte: ${goalTitle}`,
      amount: amount,
      category_id: null,
      subcategory_id: null,
      account_id: account_id,
      date_at: new Date().toISOString().split('T')[0],
      type: 'expense',
      payment_method: 'Aporte Meta',
      is_recurring: false,
      note: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    handleAddTransaction(tx);
  };

  const handleMercadoPagoCheckout = () => {
    showToast("Pagamento indisponível em modo teste", "info");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    showToast("Analisando imagem...", "info");
    const reader = new FileReader();
    reader.onload = async () => {
      const base64String = (reader.result as string).split(',')[1];
      const result = await analyzeReceipt(base64String);
      setIsProcessing(false);
      if (result) {
        setView('transactions');
        setPreFilledTx(result);
        showToast("Dados extraídos do cupom!", "success");
      } else {
        showToast("Não foi possível ler o cupom.", "error");
      }
    };
    reader.readAsDataURL(file);
    e.target.value = ''; 
  };

  const handleMicClick = async () => {
    if (isRecording) stopRecording(); else startRecording();
    if (isRecording) setIsFabOpen(false);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => { if (event.data.size > 0) audioChunksRef.current.push(event.data); };
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          setIsProcessing(true);
          showToast("Processando comando...", "info");
          const result = await analyzeAudioCommand(base64Audio);
          setIsProcessing(false);
          if (result) {
            setView('transactions');
            setPreFilledTx(result);
            showToast(result.type === 'income' ? "Receita identificada!" : "Despesa identificada!", "success");
          } else {
            showToast("Não entendi o comando.", "error");
          }
        };
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorder.start();
      setIsRecording(true);
      showToast("Ouvindo... (toque novamente para parar)", "info");
    } catch (err) {
      console.error(err);
      showToast("Erro ao acessar microfone", "error");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsFabOpen(false);
    }
  };

  const handleQuickAction = (type: 'income' | 'expense' | 'transfer' | 'card' | 'voice') => {
    if (type === 'voice') {
      setIsAIScannerOpen(true);
      setIsFabOpen(false);
      return;
    }

    if (type === 'card') {
      setShowCardExpenseModal(true);
      setIsFabOpen(false);
      return;
    }

    let txType: 'income' | 'expense' = (type === 'income') ? 'income' : 'expense';
    let paymentMethod = 'Dinheiro';
    if (type === 'transfer') paymentMethod = 'Transferência';

    setPreFilledTx({ 
      type: txType, 
      paymentMethod,
      date: new Date().toISOString().split('T')[0] 
    });
    setView('transactions');
    setTxFilter(txType);
    setIsFabOpen(false);
  };

  const handleCameraClick = () => {
    fileInputRef.current?.click();
    setIsFabOpen(false);
  };

  const sections = ['PRINCIPAL', 'FINANCEIRO', 'PRODUTIVIDADE', 'INTELIGÊNCIA', 'SISTEMA'];

  // --- RENDERIZACAO ---

  if (loading || loadingData || verifyingPayment) {
     return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#030712] flex flex-col items-center justify-center p-6 text-center">
            <div className="relative mb-6">
               <div className="absolute inset-0 bg-sky-500/10 blur-3xl rounded-full"></div>
               <ZenOSLogo size="xl" showText={true} className="relative z-10" />
               <div className="flex justify-center mt-6">
                 <Loader2 className="w-5 h-5 text-sky-500 animate-spin" />
               </div>
            </div>
            <div className="space-y-2">
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] text-sky-500/80">
                {verifyingPayment ? 'Verificando Assinatura' : 'Sincronizando Sistema'}
              </p>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">
                {verifyingPayment ? 'Sincronizando com Mercado Pago' : 'Sincronizando seu universo financeiro'}
              </p>
            </div>
            
            <div className="mt-12 space-y-4 w-full max-w-xs">
              <button 
                onClick={() => { setLoading(false); setLoadingData(false); setVerifyingPayment(false); }}
                className="w-full py-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-100 transition-all shadow-sm"
              >
                Continuar Mesmo Assim
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="w-full py-3 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest hover:underline"
              >
                Recarregar App
              </button>
            </div>
        </div>
     );
  }

  if (!user) {
    return (
      <LoginModal 
        isOpen={true} 
        isPage={true}
        onClose={() => setIsLoginModalOpen(false)} 
        onSuccess={() => setIsLoginModalOpen(false)} 
      />
    );
  }

  if (isLocked) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-50 dark:bg-[#030712] flex flex-col items-center justify-center p-6 transition-all">
         <div className="mb-6">
            <ZenOSLogo size="lg" showText={true} />
         </div>
         <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-8 mt-2">Digite seu PIN de 4 dígitos para desbloquear</p>
         
         <div className="flex gap-4 mb-10">
            {[0,1,2,3].map(i => (
              <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all ${pinBuffer.length > i ? 'bg-indigo-600 border-indigo-600 scale-125' : 'border-slate-300 dark:border-slate-700'}`} />
            ))}
         </div>

         <div className="grid grid-cols-3 gap-6">
            {[1,2,3,4,5,6,7,8,9].map(num => (
              <button 
                key={num} 
                onClick={() => {
                  if (pinBuffer.length < 4) {
                    const newPin = pinBuffer + num;
                    setPinBuffer(newPin);
                    if (newPin === activeUser?.security_pin) {
                      setTimeout(() => {
                        setIsLocked(false);
                        setPinBuffer('');
                      }, 300);
                    } else if (newPin.length === 4) {
                      showToast('PIN Incorreto!', 'error');
                      setTimeout(() => setPinBuffer(''), 500);
                    }
                  }
                }}
                className="w-16 h-16 rounded-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 text-xl font-black text-slate-900 dark:text-white flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 active:scale-90 transition-all shadow-sm"
              >
                {num}
              </button>
            ))}
            <div />
            <button 
               onClick={() => {
                if (pinBuffer.length < 4) {
                  const newPin = pinBuffer + '0';
                  setPinBuffer(newPin);
                  if (newPin === activeUser?.security_pin) {
                    setTimeout(() => {
                      setIsLocked(false);
                      setPinBuffer('');
                    }, 300);
                  } else if (newPin.length === 4) {
                    showToast('PIN Incorreto!', 'error');
                    setTimeout(() => setPinBuffer(''), 500);
                  }
                }
              }}
               className="w-16 h-16 rounded-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 text-xl font-black text-slate-900 dark:text-white flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 active:scale-90 transition-all shadow-sm"
            >
              0
            </button>
            <button 
              onClick={() => setPinBuffer('')}
              className="w-16 h-16 rounded-full text-rose-500 flex items-center justify-center hover:bg-rose-500/10 transition-all font-black text-xs uppercase"
            >
              <X className="w-6 h-6" />
            </button>
         </div>

         {activeUser?.biometry_enabled && (
           <button 
             onClick={() => {
               // Simulated biometry
               showToast('Autenticando via Biometria...', 'info');
               setTimeout(() => setIsLocked(false), 1000);
             }}
             className="mt-12 flex items-center gap-2 text-indigo-600 font-black uppercase text-[10px] tracking-widest px-6 py-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl hover:bg-indigo-100 transition-all"
           >
             <Fingerprint className="w-4 h-4" />
             Acesso Biométrico
           </button>
         )}
      </div>
    );
  }

  // --- LOGICA DE BLOQUEIO DE ASSINATURA ---
  const isExpired = false; // Bypass expiration
  
  if (isExpired && plans.length > 0) {
    const plan = plans.find(p => p.id === activeUser?.plan_id) || plans.find(p => p.name === activeUser?.plan) || plans[0];
    const planFeatures = plan?.features_json || [];
    return (
       <div className="min-h-screen bg-slate-50 dark:bg-[#030712] flex items-center justify-center p-6 text-[#212529] dark:text-white">
          <div className="bg-white dark:bg-[#111827] rounded-[2.5rem] w-full max-w-md p-8 border border-slate-200 dark:border-white/5 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-rose-500 via-purple-500 to-indigo-500"></div>
             <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-600/20 blur-3xl rounded-full pointer-events-none"></div>
             <div className="flex flex-col items-center text-center space-y-6">
                <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mb-2 animate-bounce">
                   <Lock className="w-10 h-10 text-rose-500" />
                </div>
                <div>
                   <h2 className="text-2xl font-black uppercase tracking-tighter mb-2">Período de Teste Encerrado</h2>
                   <p className="text-slate-600 text-sm">Esperamos que você tenha aproveitado os 7 dias gratuitos do ZenOS Finance. Para continuar organizando sua vida financeira, ative o plano premium.</p>
                </div>
                <div className="w-full bg-slate-50 dark:bg-black/20 rounded-2xl p-6 border border-slate-200 dark:border-white/5">
                   <div className="flex justify-between items-center mb-4">
                      <span className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">{plan?.name}</span>
                      <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">R$ {plan?.price.toFixed(2)}<span className="text-xs text-slate-400">/mês</span></span>
                   </div>
                   <ul className="space-y-3 text-left">
                      {planFeatures.map((feat: string, idx: number) => (
                        <li key={idx} className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300"><Check className="w-4 h-4 text-emerald-500" /> {feat}</li>
                      ))}
                   </ul>
                </div>
                <button onClick={handleMercadoPagoCheckout} disabled={isProcessingPayment} className="w-full py-4 bg-[#009EE3] text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl hover:bg-[#008ED0] transition-all flex items-center justify-center gap-2 relative overflow-hidden group">
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                  {isProcessingPayment ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCardIcon className="w-5 h-5" />}
                  {isProcessingPayment ? 'Redirecionando...' : 'Pagar com Mercado Pago'}
                </button>
             </div>
          </div>
       </div>
    );
  }

  return (
    <div className="min-h-screen w-full max-w-[100vw] flex bg-slate-50 dark:bg-[#030712] text-[#1c1f22] dark:text-slate-200 font-sans overflow-hidden overflow-x-hidden select-none transition-colors duration-300">
      {/* Banner de Instalação do PWA ZenOS */}
      <AnimatePresence>
        {showInstallBanner && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-4 right-4 md:left-auto md:right-6 md:max-w-sm bg-white/95 dark:bg-[#0a0c14]/95 backdrop-blur-md border border-slate-200 dark:border-white/5 rounded-[2rem] p-4 shadow-2xl z-[99] flex items-center justify-between gap-4 animate-in slide-in-from-bottom-5 duration-300"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden shadow-md flex-shrink-0 bg-[#030712] flex items-center justify-center border border-white/5">
                <img src="/icon.jpg" alt="ZenOS Logo" className="w-8 h-8 object-contain rounded-lg" />
              </div>
              <div className="text-left">
                <h4 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-wider">Instalar ZenOS App</h4>
                <p className="text-[9px] text-slate-500 font-bold mt-0.5 leading-relaxed">Instale na sua tela inicial para acesso offline e melhor desempenho.</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button 
                onClick={handleInstallApp}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest shadow-md transition-all active:scale-95"
              >
                Instalar
              </button>
              <button 
                onClick={() => {
                  setShowInstallBanner(false);
                  sessionStorage.setItem('zenos_install_banner_closed', 'true');
                }}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-all text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {simulatedUser && (
        <div className="fixed top-0 left-0 right-0 bg-indigo-600 text-white px-4 py-2 z-[100] flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
            <Eye className="w-4 h-4" />
            Simulando: {simulatedUser.full_name} ({simulatedUser.email})
          </div>
          <button onClick={exitSimulation} className="bg-white text-indigo-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-all">
            Sair da Simulação
          </button>
        </div>
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <input type="file" accept="image/*" capture="environment" ref={fileInputRef} className="hidden" onChange={handleFileChange} />

      {showCardExpenseModal && activeUser && (
        <CardExpenseModal
          cards={cards}
          categories={categories}
          subcategories={subcategories}
          userId={activeUser.id}
          onClose={() => setShowCardExpenseModal(false)}
          onSubmit={(newDebts) => {
            updateAndSave((prev: Debt[]) => [...prev, ...newDebts], setDebts, db.saveDebts);
            setShowCardExpenseModal(false);
            showToast('Gasto no cartão lançado!');
          }}
        />
      )}
      
      {isAIScannerOpen && activeUser && (
        <ZenosIAScannerModal
          isOpen={isAIScannerOpen}
          onClose={() => setIsAIScannerOpen(false)}
          accounts={processedAccounts}
          categories={categories}
          activeUser={activeUser}
          activePlan={plans.find(p => p.id === activeUser?.plan_id) || plans.find(p => p.name === activeUser?.plan) || null}
          compromissos={events}
          onAddTransaction={handleAddTransaction}
          onAddGoal={handleAddGoal}
          onAddCompromisso={handleAddCompromisso}
          onAddNote={handleAddNote}
          onAddTask={handleAddTask}
          onAddShoppingItem={handleAddShoppingItem}
          onPayCompromisso={handlePayCompromisso}
          showToast={showToast}
          onNavigate={setView}
        />
      )}

      {isProcessing && (
        <div className="fixed inset-0 z-[100] bg-white/80 dark:bg-black/80 backdrop-blur-md flex items-center justify-center flex-col gap-6 p-6 text-center">
          <div className="relative">
             <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full"></div>
             <Loader2 className="w-16 h-16 text-indigo-600 animate-spin relative z-10" />
          </div>
          <div>
            <p className="text-[#212529] dark:text-white font-black text-lg uppercase tracking-widest animate-pulse">Consultando IA...</p>
            <p className="text-slate-500 text-[10px] font-bold mt-1 uppercase tracking-tighter">O ZenOS está processando seus dados financeiros</p>
          </div>
          <button 
            onClick={() => setIsProcessing(false)}
            className="mt-4 px-6 py-2 bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-300 transition-all"
          >
            Cancelar Operação
          </button>
        </div>
      )}

      <BottomNav 
        currentView={view}
        onNavigate={setView}
        onQuickAction={handleQuickAction}
        onToggleSidebar={() => setIsSidebarOpen(true)}
        containerRef={scrollContainerRef}
        txFilter={txFilter}
        isUpdateAvailable={isUpdateAvailable}
      />

      <div className={`fixed inset-0 bg-black/80 backdrop-blur-md z-[60] lg:hidden transition-opacity ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsSidebarOpen(false)} />
      
      <aside className={`fixed lg:sticky top-0 left-0 h-[100dvh] lg:h-screen z-[70] transition-all duration-300 ${isSidebarOpen ? 'w-[85vw] max-w-72 translate-x-0' : 'w-[85vw] max-w-72 -translate-x-full lg:translate-x-0 lg:w-20 xl:w-72'} bg-white dark:bg-[#0a0c14] border-r border-slate-200 dark:border-white/5 flex flex-col shadow-2xl lg:shadow-none`}>
        {/* Sidebar Header with User Info (Moved from top bar) */}
        <div className="p-6 flex flex-col gap-6">
          <div className="flex items-center justify-between">
             <div className="flex items-center gap-3">
               <ZenOSLogo size="sm" showText={true} className="lg:hidden xl:flex items-start" />
               <ZenOSLogo size="sm" showText={false} className="hidden lg:flex xl:hidden" />
             </div>
             <button className="lg:hidden p-2 text-[#4e545a]" onClick={() => setIsSidebarOpen(false)}><X /></button>
          </div>
          
          {/* User Profile in Sidebar */}
          <button 
            onClick={() => { setView('settings'); setSettingsTab('profile'); }}
            className="flex items-center gap-3 pb-6 border-b border-slate-100 dark:border-white/5 lg:hidden xl:flex w-full text-left hover:bg-slate-50 dark:hover:bg-white/5 transition-colors rounded-xl p-2"
          >
             <div className="w-10 h-10 rounded-full bg-[#4F46E5] text-white flex items-center justify-center font-black text-lg shadow-md">
                {user.full_name?.charAt(0) || user.email.charAt(0)}
             </div>
             <div className="flex flex-col overflow-hidden">
                <span className="text-xs font-bold text-[#212529] dark:text-white truncate">{user.full_name || 'Usuário'}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest">{user.role}</span>
             </div>
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-6 overflow-y-auto overscroll-contain pb-4">
          {sections.map(sectionName => {
             const items = navItems.filter(item => item.section === sectionName && (!item.adminOnly || user.role === 'admin'));
             if (items.length === 0) return null;
             return (
              <div key={sectionName} className="space-y-1">
                <h4 className="px-4 text-[8px] font-black text-slate-550 dark:text-slate-400 uppercase tracking-[0.3em] lg:hidden xl:block">{sectionName}</h4>
                <div className="space-y-1">
                  {items.map((item) => (
                    <button key={item.id} onClick={() => {
                        if ((item.id as string) === 'categories') { setView('settings'); setSettingsTab('categories'); }
                        else setView(item.id);
                        setIsSidebarOpen(false);
                      }} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all min-h-[44px] ${view === item.id || ((item.id as string) === 'categories' && view === 'settings' && settingsTab === 'categories') ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/10' : 'text-slate-500 dark:text-slate-400 hover:text-[#212529] dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/40'}`}>
                      <item.icon className={`w-5 h-5 flex-shrink-0 ${view === item.id ? 'text-white' : ''}`} />
                      <span className="font-bold text-sm lg:hidden xl:block flex items-center gap-1.5">
                        {item.label}
                        {item.id === 'settings' && isUpdateAvailable && (
                          <span className="inline-block w-2 h-2 relative">
                            <span className="absolute top-0 right-0 block w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                            <span className="absolute top-0 right-0 block w-2 h-2 rounded-full bg-rose-500" />
                          </span>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>
        <div className="px-4 py-4 space-y-2 flex-shrink-0">
            {activeUser?.id?.startsWith('imei-') ? (
              <button 
                onClick={() => setIsLoginModalOpen(true)}
                className="w-full p-4 rounded-2xl flex items-center justify-center gap-2 bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/10"
              >
                <Lock className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Entrar</span>
              </button>
            ) : (
              <button 
                onClick={handleLogout}
                className="w-full p-4 rounded-2xl flex items-center justify-center gap-2 bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Sair</span>
              </button>
            )}
            <div className={`p-4 rounded-2xl flex items-center justify-center ${activeUser?.subscriptionStatus === 'trial' ? 'bg-amber-500/10 text-amber-600' : 'bg-[#E1F9F0] text-[#10B981]'}`}>
                <p className="text-[10px] font-black uppercase tracking-widest">{activeUser?.subscriptionStatus === 'trial' ? 'Período de Teste' : 'Assinatura Ativa'}</p>
            </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-screen relative bg-slate-50 dark:bg-[#030712] transition-colors duration-300">
        
        {/* Content Area - No Header */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 md:space-y-8 pt-6 overscroll-none pb-24 lg:pb-6"
        >
          {isRefreshing && (
            <div className="flex justify-center py-4">
              <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
            </div>
          )}
          <div className="max-w-7xl mx-auto w-full">
            {view === 'dashboard' && (
              <Dashboard 
                data={financialData as any} 
                layout={activeUser?.dashboard_layout || []}
                totalBalance={totalBalance}
                totalMonthlyIncome={totalMonthlyIncome}
                monthExpenses={monthExpenses}
                onUpdateLayout={(newLayout) => handleUpdateUser({ ...activeUser!, dashboard_layout: newLayout })}
                onNavigate={(v, f) => {
                  setView(v);
                  if (v === 'settings' && f) setSettingsTab(f as any);
                  if (f && v === 'transactions') setTxFilter(f);
                  else setTxFilter('all');
                }}
                onAddDebt={() => setView('compromissos')}
                onQuickAction={(type) => {
                  setPreFilledTx({ type, date_at: new Date().toISOString().split('T')[0] });
                  setView('transactions');
                  setTxFilter(type);
                }}
                onOpenAIScanner={() => showToast('Nenhuma nova notificação ou mensagem no momento.', 'info')}
              />
            )}
            {view === 'transactions' && (
              <Transactions 
                activeUserId={activeUser.id}
                transactions={transactions} 
                categories={categories}
                subcategories={subcategories}
                accounts={processedAccounts}
                onAdd={handleAddTransaction} 
                onDelete={(id) => {
                  const removed = transactions.find(t => t.id === id);
                  updateAndSave((prev: Transaction[]) => prev.filter(t => t.id !== id), setTransactions, db.saveTransactions);
                  db.deleteRow('transactions', id).catch(err => {
                    console.error(err);
                    // Delete failed server-side: put it back so the UI never
                    // shows something as gone when it still exists in the DB.
                    if (removed) {
                      updateAndSave((prev: Transaction[]) => prev.some(t => t.id === id) ? prev : [...prev, removed], setTransactions, db.saveTransactions);
                    }
                    showToast('Não foi possível excluir o lançamento. Verifique sua conexão e tente novamente.', 'error');
                  });
                }}
                onEdit={(updated) => updateAndSave((prev: Transaction[]) => prev.map(t => t.id === updated.id ? updated : t), setTransactions, db.saveTransactions)}
                onAddCategory={handleAddCategory}
                onAddSubcategory={handleAddSubcategory}
                preFilledData={preFilledTx}
                initialTypeFilter={txFilter}
                showToast={showToast}
              />
            )}
            {view === 'compromissos' && (
              <Compromissos 
                activeUserId={activeUser.id}
                debts={debts} 
                accounts={processedAccounts} 
                cards={cards}
                transactions={transactions}
                categories={categories}
                subcategories={subcategories}
                onAdd={(d) => updateAndSave((prev: Debt[]) => Array.isArray(d) ? [...prev, ...d] : [...prev, d], setDebts, db.saveDebts)}
                onUpdate={(d) => handleUpdateDebts([d])}
                onEdit={(d) => handleUpdateDebts([d])}
                onDelete={handleDeleteDebt}
                onPay={handleDebtPayment} 
              />
            )}
            {view === 'cartoes' as any && (
              <Cartoes
                cards={cards}
                debts={debts}
                accounts={processedAccounts}
                userId={activeUser.id}
                onUpdateCards={(newCards) => updateAndSave(() => newCards, setCards, db.saveCards)}
                onDeleteCard={(id) => {
                  db.deleteRow('cards', id).catch(err => console.error(err));
                  updateAndSave((prev: CreditCard[]) => prev.filter(c => c.id !== id), setCards, db.saveCards);
                }}
                onPayInvoice={handleInvoicePayment}
                activeUser={activeUser}
                activePlan={plans.find(p => p.id === activeUser?.plan_id) || plans.find(p => p.name === activeUser?.plan) || null}
                showToast={showToast}
              />
            )}
            {view === 'budgets' as any && (
              <Budgets
                budgets={budgets}
                categories={categories}
                transactions={transactions}
                onAdd={(b) => updateAndSave((prev: Budget[]) => [...prev, b], setBudgets, db.saveBudgets)}
                onUpdate={(b) => updateAndSave((prev: Budget[]) => prev.map(x => x.id === b.id ? b : x), setBudgets, db.saveBudgets)}
                onDelete={(id) => {
                  db.deleteRow('budgets', id).catch(err => console.error(err));
                  updateAndSave((prev: Budget[]) => prev.filter(b => b.id !== id), setBudgets, db.saveBudgets);
                }}
              />
            )}
            {view === 'accounts' as any && (
              <Potes 
                activeUserId={activeUser.id}
                accounts={processedAccounts} 
                transactions={transactions}
                allocations={transactionAllocations}
                categories={categories}
                onUpdate={(newAccounts: Account[]) => {
                  updateAndSave(() => newAccounts, setAccounts, db.saveAccounts);
                }} 
                activeUser={activeUser}
                activePlan={plans.find(p => p.id === activeUser?.plan_id) || plans.find(p => p.name === activeUser?.plan) || null}
                showToast={showToast}
              />
            )}
            {view === 'goals' && (
              <Goals 
                activeUserId={activeUser.id}
                goals={goals} 
                accounts={processedAccounts}
                onAdd={(g) => updateAndSave((prev: Goal[]) => [...prev, g], setGoals, db.saveGoals)}
                onUpdate={(newGoals) => updateAndSave(newGoals, setGoals, db.saveGoals)}
                onDeposit={handleGoalDeposit}
                onEdit={(g) => updateAndSave((prev: Goal[]) => prev.map(i => i.id === g.id ? g : i), setGoals, db.saveGoals)}
                onDelete={(id) => {
                  db.deleteRow('goals', id).catch(err => console.error(err));
                  updateAndSave((prev: Goal[]) => prev.filter(g => g.id !== id), setGoals, db.saveGoals);
                }}
              />
            )}
            {view === 'tasks' && (
              <Tasks 
                tasks={tasks}
                onAdd={(t) => updateAndSave((prev: Task[]) => [...prev, t], setTasks, db.saveTasks)}
                onUpdate={(t) => updateAndSave((prev: Task[]) => prev.map(i => i.id === t.id ? t : i), setTasks, db.saveTasks)}
                onDelete={(id) => {
                  db.deleteRow('tasks', id).catch(err => console.error(err));
                  updateAndSave((prev: Task[]) => prev.filter(t => t.id !== id), setTasks, db.saveTasks);
                }}
              />
            )}
            {view === 'shopping_list' as any && (
              <ShoppingList
                items={shoppingList}
                onAddItem={handleAddShoppingItem}
                onToggleItem={handleToggleShoppingItem}
                onDeleteItem={handleDeleteShoppingItem}
                onClearCompleted={handleClearCompletedShopping}
              />
            )}
            {view === 'notes' && (
              <Notes 
                notes={notes}
                onAdd={(n) => updateAndSave((prev: Note[]) => [...prev, n], setNotes, db.saveNotes)}
                onUpdate={(n) => updateAndSave((prev: Note[]) => prev.map(i => i.id === n.id ? n : i), setNotes, db.saveNotes)}
                onDelete={(id) => {
                  db.deleteRow('notes', id).catch(err => console.error(err));
                  updateAndSave((prev: Note[]) => prev.filter(n => n.id !== id), setNotes, db.saveNotes);
                }}
              />
            )}
            {view === 'journal' && (
              <Journal 
                entries={journalEntries}
                onAdd={(e) => updateAndSave((prev: JournalEntry[]) => [...prev, e], setJournalEntries, db.saveJournal)}
                onDelete={(id) => {
                  db.deleteRow('journal', id).catch(err => console.error(err));
                  updateAndSave((prev: JournalEntry[]) => prev.filter(e => e.id !== id), setJournalEntries, db.saveJournal);
                }}
              />
            )}
            {view === 'calendar' && (
              <CalendarView 
                events={events}
                debts={debts}
                cards={cards}
                onAdd={(e) => updateAndSave((prev: CalendarEvent[]) => [...prev, e], setEvents, db.saveCalendar)}
                onDelete={(id) => {
                  db.deleteRow('calendar', id).catch(err => console.error(err));
                  updateAndSave((prev: CalendarEvent[]) => prev.filter(e => e.id !== id), setEvents, db.saveCalendar);
                }}
                onGoToDebt={() => setView('compromissos')}
              />
            )}
            {view === 'analytics' && (
              <AnalyticsDashboard 
                transactions={transactions}
                categories={categories}
                accounts={processedAccounts}
              />
            )}
            {view === 'advisor' && (
              <ZenosIA 
                data={{
                  transactions,
                  categories,
                  accounts: processedAccounts,
                  goals,
                  debts,
                  tasks,
                  notes,
                  journal: journalEntries
                } as any}
                activeUser={activeUser}
                activePlan={plans.find(p => p.id === activeUser?.plan_id) || plans.find(p => p.name === activeUser?.plan) || null}
                onTransactionCommand={(t) => {
                   handleAddTransaction(t);
                   setView('transactions');
                }}
                showToast={showToast}
              />
            )}
            {view === 'settings' && (
              <Settings 
                categories={categories} 
                onUpdateCategories={(cats) => updateAndSave(cats, setCategories, db.saveCategories)}
                subcategories={subcategories}
                onUpdateSubcategories={(subs) => updateAndSave(subs, setSubcategories, db.saveSubcategories)}
                settings={settings}
                onUpdateSettings={(s) => updateAndSave(() => s, setSettings, db.saveSettings)}
                showToast={showToast} 
                currentTheme={theme}
                toggleTheme={toggleTheme}
                profile={activeUser}
                onUpdateProfile={handleUpdateUser}
                initialTab={settingsTab}
                activePlan={plans.find(p => p.id === activeUser?.plan_id) || plans.find(p => p.name === activeUser?.plan) || null}
              />
            )}
            {view === 'admin' && activeUser?.role === 'admin' && (
              <AdminDashboard 
                user={activeUser}
                onLogout={handleLogout}
                showToast={showToast}
                onBack={() => setView('dashboard')}
                onSimulateUser={async (userId) => {
                  localStorage.setItem('zen_simulated_user', userId);
                  const sUser = await db.users.getById(userId);
                  if (sUser) {
                    setSimulatedUser(sUser);
                    await loadUserData(userId);
                    setView('dashboard');
                    showToast(`Simulando sessão de ${sUser.full_name || sUser.email}`, "success");
                  } else {
                    showToast("Usuário não encontrado para simulação", "error");
                  }
                }}
              />
            )}
          </div>
          <div className="h-24 lg:hidden"></div>
        </div>
      </main>

      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={() => {
          showToast("Login realizado com sucesso!", "success");
          // The initializeAuth listener will handle the user state update
        }}
      />
      
      {/* Sync Status Overlay */}
      {syncStatus !== 'idle' && syncStatus !== 'synced' && (
        <div className="fixed bottom-24 right-6 z-50 flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2 rounded-full shadow-xl border border-slate-200 dark:border-white/10 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {syncStatus === 'syncing' ? (
            <>
              <Loader2 className="w-3 h-3 text-cyan-500 animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Sincronizando...</span>
            </>
          ) : syncStatus === 'offline' ? (
            <>
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Modo Offline</span>
            </>
          ) : syncStatus === 'error' ? (
            <>
              <AlertCircle className="w-3 h-3 text-rose-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Erro de Sinc</span>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
