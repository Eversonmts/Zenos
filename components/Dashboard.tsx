
import React, { useMemo, useState } from 'react';
import { Wallet, TrendingUp, Plus, Minus, PieChart as PieChartIcon, BarChart3, Activity, AlertTriangle, CheckCircle2, Hourglass, X, ArrowUpCircle, ArrowDownCircle, ChevronLeft, ChevronRight, Trophy, ArrowUpRight, Target, Settings, Eye, EyeOff, MoveUp, MoveDown, Gift, ChevronDown, Crown, Search, Sparkles, Bell } from 'lucide-react';
import { FinancialData, Account, Transaction, DashboardLayoutItem, Profile, AppView } from '../types';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import { parseLocalDate, formatCurrency, formatDisplayDate, getYearMonth } from '../lib/utils';

interface DashboardProps {
  data: FinancialData;
  user?: Profile;
  layout?: DashboardLayoutItem[];
  onUpdateLayout?: (layout: DashboardLayoutItem[]) => void;
  onNavigate?: (view: AppView, filter?: string) => void;
  onAddDebt?: () => void;
  onQuickAction?: (type: 'income' | 'expense') => void;
  totalBalance?: number;
  totalMonthlyIncome?: number;
  monthExpenses?: number;
  onOpenAIScanner?: () => void;
}

const COLORS = ['#818CF8', '#A78BFA', '#F472B6', '#F87171', '#FBBF24', '#34D399', '#22D3EE'];

const DEFAULT_LAYOUT: DashboardLayoutItem[] = [
  { id: 'summary_widgets', visible: true, order: 0, label: 'Resumo de Saldos' },
  { id: 'expenses_by_category', visible: true, order: 1, label: 'Gastos por Categoria' },
  { id: 'budgets', visible: true, order: 2, label: 'Orçamentos' },
  { id: 'compromissos', visible: true, order: 3, label: 'Compromissos do Mês' },
  { id: 'accounts', visible: true, order: 4, label: 'Potes' },
  { id: 'goals', visible: true, order: 5, label: 'Metas' },
  { id: 'activities', visible: true, order: 6, label: 'Atividades Recentes' },
  { id: 'cash_flow_chart', visible: true, order: 7, label: 'Fluxo de Caixa' },
];

export default function Dashboard({ 
  data, user, layout, onUpdateLayout, onNavigate, onAddDebt, onQuickAction,
  totalBalance: propTotalBalance, 
  totalMonthlyIncome: propTotalMonthlyIncome, 
  monthExpenses: propMonthExpenses,
  onOpenAIScanner
}: DashboardProps) {
  const { transactions, accounts, pots = [], debts, goals, tasks, notes, journal, budgets } = data;
  
  // Use props if available, otherwise calculate locally
  const currentTotalBalance = propTotalBalance ?? pots.reduce((acc, p) => acc + Number(p.current_balance), 0);
  const currentMonthlyIncome = propTotalMonthlyIncome ?? transactions
    .filter(t => t.type === 'income' && t.date_at?.startsWith(new Date().toISOString().slice(0, 7)))
    .reduce((acc, t) => acc + Number(t.amount), 0);
  const currentMonthlyExpenses = propMonthExpenses ?? transactions
    .filter(t => t.type === 'expense' && t.date_at?.startsWith(new Date().toISOString().slice(0, 7)))
    .reduce((acc, t) => acc + Number(t.amount), 0);
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(prev => prev - 1);
    } else {
      setSelectedMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(prev => prev + 1);
    } else {
      setSelectedMonth(prev => prev + 1);
    }
  };
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [showLayoutModal, setShowLayoutModal] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  const [accountSearch, setAccountSearch] = useState('');

  const currentLayout = useMemo(() => {
    if (!layout || layout.length === 0) return DEFAULT_LAYOUT;
    // Merge with default to ensure all items exist
    const merged = [...DEFAULT_LAYOUT];
    layout.forEach(item => {
      const idx = merged.findIndex(i => i.id === item.id);
      if (idx !== -1) merged[idx] = item;
    });
    return merged.sort((a, b) => a.order - b.order);
  }, [layout]);

  const handleToggleVisibility = (id: string) => {
    const newLayout = currentLayout.map(item => 
      item.id === id ? { ...item, visible: !item.visible } : item
    );
    onUpdateLayout?.(newLayout);
  };

  const handleMove = (id: string, direction: 'up' | 'down') => {
    const idx = currentLayout.findIndex(item => item.id === id);
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === currentLayout.length - 1) return;

    const newLayout = [...currentLayout];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    [newLayout[idx], newLayout[targetIdx]] = [newLayout[targetIdx], newLayout[idx]];
    
    // Re-assign order
    const orderedLayout = newLayout.map((item, i) => ({ ...item, order: i }));
    onUpdateLayout?.(orderedLayout);
  };

  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const { year, month } = getYearMonth(t.date_at);
      return month === selectedMonth && year === selectedYear;
    });
  }, [transactions, selectedMonth, selectedYear]);

  const monthIncome = useMemo(() => {
    return filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((acc, t) => acc + Number(t.amount), 0);
  }, [filteredTransactions]);

  const monthExpenses = useMemo(() => {
    return filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => acc + Number(t.amount), 0);
  }, [filteredTransactions]);  // Recalcular saldos das contas para o mês selecionado
  const monthAccounts = useMemo(() => {
    const expenseByAccount: Record<string, number> = {};
    filteredTransactions.forEach(t => {
      if (t.type === 'expense' && (t.pot_id || t.account_id)) {
        const key = t.pot_id || t.account_id;
        if (key) expenseByAccount[key] = (expenseByAccount[key] || 0) + Number(t.amount);
      }
    });

    const potsList = pots || [];
    return potsList.map(pot => {
      const monthAllocatedIncome = monthIncome * (pot.percentage / 100);
      const monthExpenses = expenseByAccount[pot.id] || 0;
      return { 
        ...pot, 
        // Use the all-time balance passed from App.tsx as the primary balance
        // current_balance is already calculated correctly in App.tsx
        displayBalance: pot.current_balance,
        balance: pot.current_balance,
        monthFlow: monthAllocatedIncome - monthExpenses,
        monthIncome: monthAllocatedIncome, 
        monthExpenses: monthExpenses 
      };
    });
  }, [filteredTransactions, pots, monthIncome]);

  const dashboardTotalBalance = useMemo(() => {
    return pots.reduce((acc, p) => acc + p.current_balance, 0);
  }, [pots]);
  
  // Cálculo de Compromissos do Mês
  const debtSummary = useMemo(() => {
    let due = 0;
    let paid = 0;

    debts.forEach(debt => {
      const debtDate = parseLocalDate(debt.due_date);
      if (debtDate.getMonth() === selectedMonth && debtDate.getFullYear() === selectedYear) {
         const paidVal = Number(debt.paid_amount || 0);
         const totalVal = Number(debt.total_amount || 0);
         paid += paidVal;
         due += (totalVal - paidVal);
      }
    });
    return { due, paid };
  }, [debts, selectedMonth, selectedYear]);

  const categoryData = useMemo(() => {
    const expenses = filteredTransactions.filter(t => t.type === 'expense');
    const categoryTotals: Record<string, number> = {};
    expenses.forEach(t => {
      const cat = data.categories.find(c => c.id === t.category_id)?.name || 'Outros';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(t.amount);
    });
    return Object.entries(categoryTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [filteredTransactions, data.categories]);

  const trendData = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const incomeByDay: Record<number, number> = {};
    const expenseByDay: Record<number, number> = {};
    
    transactions.forEach(t => {
      const { year, month } = getYearMonth(t.date_at);
      if (month === selectedMonth && year === selectedYear) {
        const day = parseInt(t.date_at.split('-')[2]);
        if (t.type === 'income') incomeByDay[day] = (incomeByDay[day] || 0) + t.amount;
        else expenseByDay[day] = (expenseByDay[day] || 0) + t.amount;
      }
    });
    
    const chartData = [];
    for (let i = 1; i <= daysInMonth; i++) {
      chartData.push({ 
        name: i.toString().padStart(2, '0'), 
        Entradas: incomeByDay[i] || 0, 
        Saídas: expenseByDay[i] || 0 
      });
    }
    return chartData;
  }, [transactions, selectedMonth, selectedYear]);

  const renderItem = (id: string) => {
    switch (id) {
      case 'summary_widgets':
        return (
            <div key="summary_widgets" className="bg-white dark:bg-[#0a0c14] p-5 rounded-b-3xl border-b border-slate-200 dark:border-white/5 space-y-6 animate-in fade-in slide-in-from-top-4 duration-500 -mx-4 md:-mx-6 -mt-4 md:-mt-6">
            {/* Top Row: Profile, Month, Gift */}
            <div className="flex justify-between items-center">
              <button 
                onClick={() => onNavigate?.('settings', 'profile')}
                className="relative group transition-transform active:scale-95"
              >
                <div className="w-12 h-12 rounded-full border-2 border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-900 group-hover:border-indigo-500 transition-colors">
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="text-slate-500 dark:text-slate-400">
                      <Wallet className="w-6 h-6" />
                    </div>
                  )}
                </div>
                <div className="absolute -top-1 -right-1 bg-white dark:bg-slate-900 rounded-full p-0.5 shadow-sm border border-slate-100 dark:border-slate-800">
                  <Crown className="w-3 h-3 text-amber-500" />
                </div>
              </button>

              {/* Month navigation controls with ChevronLeft, ChevronRight and a localized Popover */}
              <div className="flex items-center gap-2.5 relative">
                <button 
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-xl transition-all text-slate-500 dark:text-slate-400 hover:text-indigo-500 active:scale-90"
                  title="Mês Anterior"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                <div className="relative">
                  <button 
                    type="button"
                    onClick={() => setShowDatePicker(!showDatePicker)}
                    className="flex items-center gap-1.5 group py-1.5 px-3 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-2xl transition-all"
                  >
                    <span className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                      {months[selectedMonth]}
                    </span>
                    <ChevronDown className="w-4 h-4 text-slate-500 dark:text-slate-400 group-hover:text-indigo-500 transition-all group-hover:translate-y-0.5" />
                  </button>

                  {showDatePicker && (
                    <>
                      {/* Transparent overlay detector to close popover when clicking anywhere else */}
                      <div 
                        className="fixed inset-0 z-[120]" 
                        onClick={() => setShowDatePicker(false)}
                      />
                      
                      {/* Local Popover Container */}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 z-[125] w-64 bg-white dark:bg-[#0f111a] border border-slate-200 dark:border-white/10 rounded-[2rem] shadow-2xl p-5 animate-in fade-in slide-in-from-top-2 duration-200 text-slate-800 dark:text-white">
                        <div className="flex items-center justify-between mb-4">
                          <button 
                            type="button"
                            onClick={() => setSelectedYear(prev => prev - 1)} 
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                          >
                            <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                          </button>
                          <span className="font-black text-sm tracking-tight">{selectedYear}</span>
                          <button 
                            type="button"
                            onClick={() => setSelectedYear(prev => prev + 1)} 
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                          >
                            <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {months.map((m, idx) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => {
                                setSelectedMonth(idx);
                                setShowDatePicker(false);
                              }}
                              className={`text-[9px] font-black uppercase py-2.5 rounded-xl transition-all ${selectedMonth === idx ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-600 dark:text-slate-400'}`}
                            >
                              {m.substring(0, 3)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <button 
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-xl transition-all text-slate-500 dark:text-slate-400 hover:text-indigo-500 active:scale-90"
                  title="Próximo Mês"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <button 
                onClick={onOpenAIScanner}
                className="relative w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all group"
                title="Mensagens e Notificações"
              >
                <div className="absolute top-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-[#0a0c14] z-[1]" />
                <Bell className="w-5 h-5 text-white animate-pulse" />
              </button>
            </div>

            {/* Middle Row: Saldo Total */}
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[10px] font-black text-slate-550 dark:text-slate-400 uppercase tracking-widest mb-1.5">Saldo Disponível</p>
                <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white transition-all select-none">
                  {showBalance ? `R$ ${formatCurrency(dashboardTotalBalance)}` : '••••••'}
                </h1>
              </div>
              <div>
                <button 
                  type="button"
                  onClick={() => setShowBalance(!showBalance)}
                  className="p-2 text-slate-500 dark:text-slate-400 hover:text-indigo-500 transition-colors"
                >
                  {showBalance ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Bottom Row: Receitas & Despesas */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50 dark:border-white/5">
              <button 
                onClick={() => onNavigate?.('transactions', 'income')}
                className="flex items-center gap-2 group text-left active:scale-95 transition-transform"
              >
                <div className="w-10 h-10 rounded-full bg-[#10b981] flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                  <ArrowUpCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Receitas</p>
                  <p className="text-base font-black text-[#10b981]">R$ {formatCurrency(currentMonthlyIncome)}</p>
                </div>
              </button>
              <button 
                onClick={() => onNavigate?.('transactions', 'expense')}
                className="flex items-center gap-2 group text-left active:scale-95 transition-transform"
              >
                <div className="w-10 h-10 rounded-full bg-[#f43f5e] flex items-center justify-center shadow-lg shadow-rose-500/20 group-hover:scale-110 transition-transform">
                  <ArrowDownCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Gastos</p>
                  <p className="text-base font-black text-[#f43f5e]">R$ {formatCurrency(currentMonthlyExpenses)}</p>
                </div>
              </button>
            </div>
          </div>
        );
      case 'expenses_by_category':
        return (
          <button 
            key="expenses_by_category"
            onClick={() => onNavigate?.('transactions', 'expense')}
            className="w-full text-left bg-white dark:bg-[#0a0c14] p-6 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm hover:border-indigo-500/30 transition-all group block"
          >
            <h3 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2 group-hover:text-indigo-500 transition-colors">
              <PieChartIcon className="w-4 h-4 text-indigo-500" /> Gastos por Categoria
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-4">
                {categoryData.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-[#212529] dark:text-white">R$ {formatCurrency(item.value)}</p>
                      <p className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                        {((item.value / (monthExpenses || 1)) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                ))}
                {categoryData.length === 0 && (
                  <div className="py-8 text-center">
                    <p className="text-[10px] font-black text-slate-550 dark:text-slate-400 uppercase tracking-widest">Sem despesas registradas</p>
                  </div>
                )}
              </div>
            </div>
          </button>
        );
      case 'accounts':
        return (
          <div key="accounts" className="space-y-4">
            <button 
              onClick={() => onNavigate?.('accounts' as any)}
              className="w-full text-left focus:outline-none group/title"
            >
              <h3 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1 flex items-center gap-3 group-hover/title:text-indigo-500 transition-colors">
                POTES <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800/50 group-hover/title:bg-indigo-500/30"></div>
              </h3>
            </button>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {monthAccounts.map((account, idx) => {
                const color = COLORS[idx % COLORS.length];
                const progress = Math.max(0, Math.min(100, (account.displayBalance / (dashboardTotalBalance || 1)) * 100));
                const isSelected = selectedAccountId === account.id;
                return (
                  <div key={account.id} className="flex flex-col gap-3 relative col-span-1 sm:col-span-2">
                    <button 
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setSelectedAccountId(null);
                          setAccountSearch('');
                        } else {
                          setSelectedAccountId(account.id);
                          setAccountSearch('');
                        }
                      }}
                      className={`text-left bg-white dark:bg-[#0a0c14] p-5 rounded-3xl border transition-all group shadow-sm dark:shadow-none hover:border-indigo-500/40 ${isSelected ? 'border-indigo-500 ring-4 ring-indigo-500/5 dark:ring-indigo-500/10' : 'border-slate-200 dark:border-white/5'}`}
                    >
                       <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[10px] font-black uppercase tracking-widest truncate text-slate-800 dark:text-slate-200">{account.name}</span>
                             <span className="text-xs font-black tracking-tighter text-indigo-500">
                              R$ {formatCurrency(account.displayBalance)}
                            </span>
                          </div>
                          <span className="text-[8px] font-black text-slate-400 uppercase ml-2">{account.percentage}%</span>
                       </div>
                       <div className="h-2 w-full bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                          <div 
                            className="h-full transition-all duration-700" 
                            style={{ 
                              width: `${progress}%`,
                              backgroundColor: color
                            }}
                          ></div>
                       </div>
                    </button>

                    {isSelected && (
                      <div className="bg-slate-50 dark:bg-[#0c0d15] border border-slate-200 dark:border-white/5 rounded-3xl p-5 space-y-4 animate-in slide-in-from-top-3 duration-300">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-white/5">
                          <div>
                            <h4 className="text-xs font-black uppercase text-indigo-500 tracking-wider">Histórico de Movimentações</h4>
                            <p className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest">{account.name}</p>
                          </div>
                          <button 
                            type="button"
                            onClick={() => { setSelectedAccountId(null); setAccountSearch(''); }}
                            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Aportes & Saídas do Pote */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-emerald-500/5 border border-emerald-500/10 p-3.5 rounded-2xl">
                            <div className="flex items-center gap-1.5 mb-1">
                              <ArrowUpCircle className="w-3.5 h-3.5 text-emerald-500" />
                              <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Aportes</span>
                            </div>
                            <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                              R$ {formatCurrency((account as any).monthIncome || 0)}
                            </p>
                          </div>
                          <div className="bg-rose-500/5 border border-rose-500/10 p-3.5 rounded-2xl">
                            <div className="flex items-center gap-1.5 mb-1">
                              <ArrowDownCircle className="w-3.5 h-3.5 text-rose-500" />
                              <span className="text-[8px] font-black text-rose-600 uppercase tracking-widest">Saídas</span>
                            </div>
                            <p className="text-sm font-black text-rose-600 dark:text-rose-400">
                              R$ {formatCurrency((account as any).monthExpenses || 0)}
                            </p>
                          </div>
                        </div>

                        {/* Saldo da Conta */}
                        <div className="flex justify-between items-center py-2.5 px-4 bg-white dark:bg-[#0a0c14] border border-slate-200 dark:border-white/5 rounded-2xl">
                          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Saldo no Pote</span>
                          <span className={`text-sm font-black tracking-tight ${account.balance < 0 ? 'text-rose-500' : 'text-indigo-600 dark:text-indigo-400'}`}>
                            R$ {formatCurrency(account.balance)}
                          </span>
                        </div>

                        {/* Busca e Lista de Transações */}
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                          <input 
                            type="text"
                            placeholder="Buscar no histórico do pote..."
                            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#0a0c14] border border-slate-200 dark:border-white/5 rounded-xl text-[10px] uppercase font-black tracking-wider outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-white"
                            value={accountSearch}
                            onChange={e => setAccountSearch(e.target.value)}
                          />
                        </div>

                        <div className="space-y-2 max-h-40 overflow-y-auto no-scrollbar pt-1">
                          {/* virtual allocation line */}
                          {accountSearch === '' && (
                            <div className="flex justify-between items-center py-2 px-1.5 border-b border-slate-100 dark:border-white/5">
                              <div className="min-w-0">
                                <p className="text-[10px] font-bold text-slate-900 dark:text-slate-200">Aporte Mensal ({months[selectedMonth]})</p>
                                <p className="text-[8px] text-slate-500 font-black uppercase tracking-wider">Automático</p>
                              </div>
                              <p className="text-[10px] font-black text-emerald-500">+ R$ {formatCurrency((account as any).monthIncome || 0)}</p>
                            </div>
                          )}

                          {filteredTransactions
                            .filter(t => t.pot_id === account.id || t.account_id === account.id)
                            .filter(t => {
                              const catName = data.categories.find(c => c.id === t.category_id)?.name || 'Outros';
                              return (t.description || '').toLowerCase().includes(accountSearch.toLowerCase()) || 
                                     catName.toLowerCase().includes(accountSearch.toLowerCase());
                            })
                            .map(t => {
                              const catName = data.categories.find(c => c.id === t.category_id)?.name || 'Outros';
                              return (
                                <div key={t.id} className="flex justify-between items-center py-2 px-1.5 border-b border-slate-100 dark:border-white/5 last:border-0">
                                  <div className="min-w-0">
                                    <p className="text-[10px] font-bold text-slate-900 dark:text-slate-200 truncate">{t.description}</p>
                                    <p className="text-[7.5px] text-slate-500 font-black uppercase tracking-wider">{formatDisplayDate(t.date_at)} • {catName}</p>
                                  </div>
                                  <p className={`text-[10px] font-black ${t.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {t.type === 'income' ? '+' : '-'} R$ {formatCurrency(t.amount)}
                                  </p>
                                </div>
                              );
                            })}
                          
                          {filteredTransactions.filter(t => t.pot_id === account.id || t.account_id === account.id).length === 0 && accountSearch !== '' && (
                            <p className="text-center py-4 text-[8px] font-black text-slate-500 uppercase tracking-widest italic">Nenhum resultado</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      case 'compromissos':
        return (
          <button 
            key="compromissos"
            onClick={() => onNavigate?.('compromissos')}
            className="w-full text-left bg-slate-50 dark:bg-slate-900/40 p-5 rounded-3xl border border-slate-200 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-slate-900/60 transition-all group overflow-hidden"
          >
            <div className="flex justify-between items-center mb-4 min-w-0">
              <h3 className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2 truncate">
                 Compromissos do Mês
              </h3>
              <TrendingUp className="w-4 h-4 flex-shrink-0 text-slate-550 dark:text-slate-400 group-hover:text-indigo-500 transition-colors" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                <div className="min-w-0 bg-indigo-500/10 rounded-2xl p-3 border border-indigo-500/20">
                   <div className="flex items-center gap-1.5 mb-1 min-w-0">
                      <Wallet className="w-3 h-3 flex-shrink-0 text-indigo-500" />
                      <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest truncate">Total do Mês</span>
                   </div>
                   <p className="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400 truncate">R$ {formatCurrency(debtSummary.due + debtSummary.paid)}</p>
                </div>
                <div className="min-w-0 bg-rose-500/10 rounded-2xl p-3 border border-rose-500/20">
                   <div className="flex items-center gap-1.5 mb-1 min-w-0">
                      <AlertTriangle className="w-3 h-3 flex-shrink-0 text-rose-500" />
                      <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest truncate">Necessário</span>
                   </div>
                   <p className="text-base sm:text-lg font-black text-rose-500 dark:text-rose-400 truncate">R$ {formatCurrency(debtSummary.due)}</p>
                </div>
                <div className="min-w-0 bg-emerald-500/10 rounded-2xl p-3 border border-emerald-500/20">
                   <div className="flex items-center gap-1.5 mb-1 min-w-0">
                      <CheckCircle2 className="w-3 h-3 flex-shrink-0 text-emerald-500" />
                      <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest truncate">Pago</span>
                   </div>
                   <p className="text-base sm:text-lg font-black text-emerald-500 dark:text-emerald-400 truncate">R$ {formatCurrency(debtSummary.paid)}</p>
                </div>
            </div>
          </button>
        );
      case 'potes':
        return null; // Substituído por 'accounts'
      case 'goals':
        return (
          <div key="goals" className="space-y-4">
            <button 
              onClick={() => onNavigate?.('goals')}
              className="w-full text-left focus:outline-none group/title"
            >
              <h3 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1 flex items-center gap-3 group-hover/title:text-indigo-500 transition-colors">
                METAS <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800/50 group-hover/title:bg-indigo-500/30"></div>
              </h3>
            </button>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {goals && goals.slice(0, 2).map(goal => {
                const progress = (goal.current_amount / goal.target_amount) * 100;
                return (
                  <button 
                    key={goal.id} 
                    onClick={() => onNavigate?.('goals')}
                    className="bg-white dark:bg-[#0a0c14] p-5 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm text-left hover:border-indigo-500/50 transition-all active:scale-95"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{goal.title}</h4>
                        <p className="text-[8px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Prazo: {formatDisplayDate(goal.deadline)}</p>
                      </div>
                      <Trophy className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[9px] font-black uppercase">
                        <span className="text-indigo-600 dark:text-indigo-400">R$ {formatCurrency(goal.current_amount)}</span>
                        <span className="text-slate-550 dark:text-slate-400">R$ {formatCurrency(goal.target_amount)}</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-600 transition-all duration-1000" style={{ width: `${Math.min(progress, 100)}%` }}></div>
                      </div>
                    </div>
                  </button>
                );
              })}
              {(!goals || goals.length === 0) && (
                <div className="col-span-full py-8 text-center bg-slate-50 dark:bg-slate-900/20 rounded-3xl border border-dashed border-slate-200 dark:border-white/5">
                  <p className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Nenhuma meta ativa</p>
                </div>
              )}
            </div>
          </div>
        );
      case 'activities':
        return (
          <div key="activities" className="space-y-3">
            <button 
              onClick={() => onNavigate?.('transactions')}
              className="w-full text-left focus:outline-none group/title"
            >
              <h3 className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1 flex items-center gap-3 group-hover/title:text-indigo-500 transition-colors">
                ATIVIDADES <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800/50 group-hover/title:bg-indigo-500/30"></div>
              </h3>
            </button>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredTransactions.slice(0, 4).map(t => (
                <button 
                  key={t.id} 
                  onClick={() => onNavigate?.('transactions')}
                  className="w-full text-left bg-white dark:bg-[#0a0c14] p-3.5 rounded-2xl border border-slate-200 dark:border-white/5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900 hover:border-indigo-500/30 transition-all shadow-sm dark:shadow-none active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${t.type === 'income' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                      {t.type === 'income' ? <Plus className="w-3.5 h-3.5" /> : <Activity className="w-3.5 h-3.5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#212529] dark:text-slate-200 truncate">{t.description}</p>
                      <p className="text-[8px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest">{data.categories.find(c => c.id === t.category_id)?.name || 'Outros'}</p>
                    </div>
                  </div>
                  <p className={`text-sm font-black ${t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#212529] dark:text-slate-300'}`}>
                    R$ {formatCurrency(t.amount)}
                  </p>
                </button>
              ))}
              {filteredTransactions.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-500 dark:text-slate-500 text-[10px] font-black uppercase italic tracking-widest">VAZIO</div>
              )}
            </div>
          </div>
        );
      case 'budgets': {
        if (!budgets || budgets.length === 0) return null;
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const topBudgets = budgets.slice(0, 3);

        return (
          <div key="budgets" onClick={() => onNavigate && onNavigate('budgets' as any)} className="cursor-pointer bg-white dark:bg-[#0a0c14] p-6 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm hover:border-indigo-500/30 transition-all">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-indigo-500" /> Orçamentos
              </h3>
              <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            </div>
            <div className="space-y-4">
              {topBudgets.map(b => {
                const spent = transactions
                  .filter(t => t.type === 'expense' && t.category_id === b.category_id && new Date(t.date_at) >= startOfMonth)
                  .reduce((sum, t) => sum + Number(t.amount), 0);
                const limitAmount = Number(b.limit_amount);
                const percent = Math.min((spent / limitAmount) * 100, 100);
                const isOver = spent > limitAmount;
                return (
                  <div key={b.id}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs font-bold text-[#212529] dark:text-white">{b.category_name}</span>
                      <span className={`text-[10px] font-black ${isOver ? 'text-rose-500' : 'text-slate-500 dark:text-slate-400'}`}>{percent.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${isOver ? 'bg-rose-500' : percent > 80 ? 'bg-amber-500' : 'bg-indigo-500'}`} style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
              {budgets.length > 3 && (
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest text-center pt-1">+{budgets.length - 3} outro(s)</p>
              )}
            </div>
          </div>
        );
      }
      case 'cash_flow_chart':
        return (
          <button 
            key="cash_flow_chart"
            onClick={() => onNavigate?.('transactions')}
            className="w-full text-left bg-white dark:bg-[#0a0c14] p-6 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm hover:border-indigo-500/30 transition-all group block"
          >
            <h3 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2 group-hover:text-indigo-500 transition-colors">
              <TrendingUp className="w-4 h-4 text-indigo-500" /> Fluxo de Caixa Mensal
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.1} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }}
                  />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    verticalAlign="top" 
                    align="right" 
                    iconType="circle"
                    wrapperStyle={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', paddingBottom: '20px' }}
                  />
                  <Bar 
                    dataKey="Entradas" 
                    fill="#34D399" 
                    radius={[4, 4, 0, 0]}
                    barSize={12}
                  />
                  <Bar 
                    dataKey="Saídas" 
                    fill="#F87171" 
                    radius={[4, 4, 0, 0]}
                    barSize={12}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </button>
        );
      default:
        return null;
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 p-3 rounded-2xl shadow-2xl backdrop-blur-md">
          <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Dia {label}</p>
          {payload.map((p: any) => (
            <div key={p.name} className="flex items-center justify-between gap-4 mb-1 last:mb-0">
              <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: p.color }}>{p.name}</span>
              <span className="text-xs font-black text-[#212529] dark:text-white">R$ {p.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-10">
      
      {/* Renderização Dinâmica do Layout */}
      {currentLayout.map(item => (item.visible || item.id === 'summary_widgets') ? renderItem(item.id) : null)}

      {/* Botão de Ajuste de Tela Inicial */}
      <div className="pt-8 pb-4 flex justify-center">
        <button 
          onClick={() => setShowLayoutModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl text-slate-500 dark:text-slate-400 hover:text-indigo-600 transition-all shadow-sm active:scale-95"
        >
          <Settings className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-widest">Ajuste de tela inicial</span>
        </button>
      </div>

      {/* Modal de Personalização de Layout */}
      {showLayoutModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-black tracking-tighter text-slate-900 dark:text-white uppercase">Personalizar Dashboard</h3>
                <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Organize e habilite itens</p>
              </div>
              <button onClick={() => setShowLayoutModal(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-650 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 no-scrollbar">
              {currentLayout.filter(item => item.id !== 'summary_widgets').map((item, idx) => (
                <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col gap-1">
                      <button 
                        disabled={idx === 0}
                        onClick={() => handleMove(item.id, 'up')}
                        className={`p-1 rounded-md transition-colors ${idx === 0 ? 'text-slate-300 dark:text-slate-700' : 'text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                      >
                        <MoveUp className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        disabled={idx === currentLayout.length - 1}
                        onClick={() => handleMove(item.id, 'down')}
                        className={`p-1 rounded-md transition-colors ${idx === currentLayout.length - 1 ? 'text-slate-300 dark:text-slate-700' : 'text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                      >
                        <MoveDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{item.label}</span>
                  </div>
                  <button 
                    onClick={() => handleToggleVisibility(item.id)}
                    className={`p-2 rounded-xl transition-all ${item.visible ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-200 dark:bg-slate-700 text-slate-600'}`}
                  >
                    {item.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
              ))}
            </div>

            <button 
              onClick={() => setShowLayoutModal(false)}
              className="w-full mt-6 py-4 bg-indigo-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl hover:bg-indigo-500 transition-all"
            >
              Salvar Alterações
            </button>
          </div>
        </div>
      )}




    </div>
  );
}
