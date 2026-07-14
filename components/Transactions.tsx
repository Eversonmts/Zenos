
import React, { useState, useMemo, useEffect } from 'react';
import { Search, Plus, Minus, X, Trash2, Edit2, Calendar, SearchX, ChevronLeft, ChevronRight, Filter, CheckCircle2, CreditCard as CreditCardIcon, ArrowDownCircle, Banknote, QrCode, Smartphone, Laptop, FileText, Tag, Subtitles } from 'lucide-react';
import { Transaction, TransactionType, Account, Pot, Category, Goal, Debt, Profile } from '../types';
import { formatDisplayDate } from '../lib/utils';
import { Subcategory } from '../types';

const getPaymentIcon = (method: string | null) => {
  switch (method) {
    case 'PIX': return <QrCode className="w-3 h-3" />;
    case 'Dinheiro': return <Banknote className="w-3 h-3" />;
    case 'Cartão de Débito': return <Smartphone className="w-3 h-3" />;
    case 'Cartão de Crédito': return <CreditCardIcon className="w-3 h-3" />;
    case 'Transferência': return <Laptop className="w-3 h-3" />;
    case 'Boleto': return <FileText className="w-3 h-3" />;
    default: return null;
  }
};

interface TransactionsProps {
  activeUserId: string;
  transactions: Transaction[];
  accounts: Account[];
  pots?: Pot[];
  categories: Category[];
  subcategories: Subcategory[];
  onAdd: (t: Transaction | Transaction[]) => void;
  onDelete: (id: string) => void;
  onEdit: (t: Transaction) => void;
  onAddCategory?: (cat: Category) => void;
  onAddSubcategory?: (sub: Subcategory) => void;
  preFilledData?: Partial<Transaction> | null;
  initialTypeFilter?: 'all' | TransactionType;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function Transactions({ 
  activeUserId, transactions, accounts, pots = [], categories, subcategories, onAdd, onDelete, onEdit, onAddCategory, onAddSubcategory, preFilledData, initialTypeFilter = 'all', showToast
}: TransactionsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>(initialTypeFilter);
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  
  // Sync typeFilter with prop changes
  useEffect(() => {
    setTypeFilter(initialTypeFilter);
  }, [initialTypeFilter]);

  const [modalType, setModalType] = useState<'add' | 'edit' | null>(null);
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingNewSubcategory, setIsAddingNewSubcategory] = useState(false);
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  
  // Date Filters - Default to Current Month
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [dateRange, setDateRange] = useState({ 
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], 
    end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0] 
  });

  const [currentTx, setCurrentTx] = useState<Partial<Transaction>>({
    description: '', amount: 0, category_id: '', subcategory_id: '', type: 'expense', date_at: new Date().toISOString().split('T')[0],
    account_id: accounts.length > 0 ? accounts[0].id : '', payment_method: 'PIX', is_recurring: false, note: ''
  });

  const paymentMethods = ['PIX', 'Dinheiro', 'Cartão de Débito', 'Cartão de Crédito', 'Transferência', 'Boleto'];

  // Effect para abrir o modal quando dados pré-preenchidos (IA/atalho) chegarem.
  // Importante: só depende de `preFilledData` - se também dependesse de
  // `accounts`/`categories`, qualquer recálculo de saldo (que troca a
  // referência desses arrays) reabria a caixa de lançamento logo depois de
  // confirmar, já que o preFilledData ainda não tinha sido limpo no App.tsx.
  useEffect(() => {
    if (preFilledData) {
      const category = categories.find(c => c.name === (preFilledData as any).category);
      setCurrentTx({
        ...currentTx,
        ...preFilledData,
        category_id: category ? category.id : '',
        account_id: preFilledData.type === 'expense' && accounts.length > 0 ? accounts[0].id : ''
      });
      setModalType('add');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preFilledData]);

  // Atualiza o range de datas quando o mês selecionado muda
  useEffect(() => {
    const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString().split('T')[0];
    const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).toISOString().split('T')[0];
    setDateRange({ start, end });
  }, [currentMonth]);

  const changeMonth = (delta: number) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + delta);
    setCurrentMonth(newDate);
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const category = categories.find(c => c.id === t.category_id);
      const matchesSearch = (t.description || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (category && (category.name || '').toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesType = typeFilter === 'all' || t.type === typeFilter;
      
      const txDate = t.date_at; // YYYY-MM-DD
      const afterStart = !dateRange.start || txDate >= dateRange.start;
      const beforeEnd = !dateRange.end || txDate <= dateRange.end;

      return matchesSearch && matchesType && afterStart && beforeEnd;
    }).sort((a, b) => b.date_at.localeCompare(a.date_at));
  }, [transactions, searchTerm, typeFilter, dateRange, categories]);

  const availableCategories = useMemo(() => {
    return categories.filter(c => c.type === currentTx.type);
  }, [categories, currentTx.type]);

  const handleOpenAdd = (type: TransactionType, isWithdrawal = false) => {
    setCurrentTx({
      description: isWithdrawal ? 'Saque' : '',
      amount: 0,
      category_id: '',
      subcategory_id: '',
      type,
      date_at: new Date().toISOString().split('T')[0],
      account_id: type === 'expense' && accounts.length > 0 ? accounts[0].id : '',
      payment_method: isWithdrawal ? 'Dinheiro' : 'PIX',
      is_recurring: false,
      note: isWithdrawal ? 'Retirada de valor' : ''
    });
    setModalType('add');
  };

  const handleOpenEdit = (t: Transaction) => {
    setCurrentTx(t);
    setModalType('edit');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalCategoryId = currentTx.category_id;
    let finalSubcategoryId = currentTx.subcategory_id;

    if (isAddingNewCategory && newCategoryName.trim()) {
      const newCat: Category = {
        id: crypto.randomUUID(),
        user_id: activeUserId,
        name: newCategoryName,
        type: currentTx.type as TransactionType,
        color: '#4F46E5',
        icon: 'tag',
        is_default: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      if (onAddCategory) onAddCategory(newCat);
      finalCategoryId = newCat.id;
    }

    if (isAddingNewSubcategory && newSubcategoryName.trim() && finalCategoryId) {
      const newSub: Subcategory = {
        id: crypto.randomUUID(),
        user_id: activeUserId,
        category_id: finalCategoryId,
        name: newSubcategoryName,
        created_at: new Date().toISOString()
      };
      if (onAddSubcategory) onAddSubcategory(newSub);
      finalSubcategoryId = newSub.id;
    }

    if (!currentTx.description || !currentTx.amount || !finalCategoryId) {
      if (showToast) {
        showToast("Descrição, valor e categoria são obrigatórios.", "error");
      } else {
        alert("Descrição, valor e categoria são obrigatórios.");
      }
      return;
    }

    const txAmount = Number(currentTx.amount);
    if (isNaN(txAmount) || txAmount <= 0) {
      if (showToast) {
        showToast("O valor da transação deve ser maior que zero.", "error");
      } else {
        alert("O valor da transação deve ser maior que zero.");
      }
      return;
    }

    if (txAmount > 999999999) {
      if (showToast) {
        showToast("O valor da transação não pode exceder R$ 999.999.999,00.", "error");
      } else {
        alert("O valor da transação não pode exceder R$ 999.999.999,00.");
      }
      return;
    }

    if (currentTx.type === 'expense' && !currentTx.account_id) {
      if (showToast) {
        showToast("Selecione um Pote (Conta) para este gasto.", "error");
      } else {
        alert("Selecione um Pote (Conta) para este gasto.");
      }
      return;
    }

    const transactionData: Transaction = { 
      ...(currentTx as Transaction), 
      user_id: activeUserId,
      category_id: finalCategoryId,
      subcategory_id: finalSubcategoryId || null,
      id: modalType === 'add' ? crypto.randomUUID() : (currentTx as Transaction).id,
      created_at: (currentTx as any).created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    if (modalType === 'add') {
      onAdd(transactionData);
    } else if (modalType === 'edit') {
      onEdit(transactionData);
    }
    
    setModalType(null);
    setIsAddingNewCategory(false);
    setNewCategoryName('');
  };

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const monthLabel = `${monthNames[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <button onClick={() => handleOpenAdd('income')} className="flex flex-col items-center justify-center gap-1 py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl font-black uppercase text-[9px] tracking-widest hover:bg-emerald-500/20 active:scale-95 transition-all">
          <Plus className="w-4 h-4" /> Ganho
        </button>
        <button onClick={() => handleOpenAdd('expense')} className="flex flex-col items-center justify-center gap-1 py-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-2xl font-black uppercase text-[9px] tracking-widest hover:bg-rose-500/20 active:scale-95 transition-all">
          <Minus className="w-4 h-4" /> Gasto
        </button>
        <button onClick={() => handleOpenAdd('expense', true)} className="flex flex-col items-center justify-center gap-1 py-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-2xl font-black uppercase text-[9px] tracking-widest hover:bg-indigo-500/20 active:scale-95 transition-all">
          <ArrowDownCircle className="w-4 h-4" /> Saque
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900/40 p-3.5 rounded-2xl border border-slate-200 dark:border-white/5 space-y-3 shadow-sm dark:shadow-none">
        
        {/* Month Selector */}
        <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-950/50 p-2 rounded-xl mb-2">
            <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white dark:hover:bg-white/10 rounded-lg transition-colors">
                <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            <span className="text-sm font-black uppercase tracking-widest text-[#212529] dark:text-white">
                {monthLabel}
            </span>
            <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white dark:hover:bg-white/10 rounded-lg transition-colors">
                <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
        </div>

        {/* Filtros de Tipo */}
        <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-950/50 rounded-xl">
           <button 
             onClick={() => setTypeFilter('all')}
             className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${typeFilter === 'all' ? 'bg-white dark:bg-slate-800 text-indigo-500 shadow-sm' : 'text-slate-400'}`}
           >
             Todos
           </button>
           <button 
             onClick={() => setTypeFilter('income')}
             className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${typeFilter === 'income' ? 'bg-white dark:bg-slate-800 text-emerald-500 shadow-sm' : 'text-slate-400'}`}
           >
             Ganhos
           </button>
           <button 
             onClick={() => setTypeFilter('expense')}
             className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${typeFilter === 'expense' ? 'bg-white dark:bg-slate-800 text-rose-500 shadow-sm' : 'text-slate-400'}`}
           >
             Gastos
           </button>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-700 dark:text-slate-700" />
            <input type="text" placeholder="Filtrar por nome, categoria, item ou local..." className="w-full pl-9 pr-4 py-2.5 bg-slate-100 dark:bg-slate-950/50 border border-slate-200 dark:border-white/5 rounded-xl text-[#212529] dark:text-slate-200 text-xs outline-none focus:ring-1 focus:ring-indigo-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          
          <button 
            onClick={() => setIsFilterVisible(!isFilterVisible)}
            className={`p-2.5 rounded-xl border transition-all ${isFilterVisible ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-100 dark:bg-slate-950/50 border-slate-200 dark:border-white/5 text-slate-600'}`}
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>

        {isFilterVisible && (
          <div className="flex items-center gap-2 pt-2 animate-in slide-in-from-top-2 duration-300">
            <div className="relative flex-1">
               <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
               <input 
                 type="date" 
                 className="w-full pl-8 pr-2 py-2.5 bg-slate-100 dark:bg-slate-950/50 border border-slate-200 dark:border-white/5 rounded-xl text-[#212529] dark:text-slate-200 text-[10px] outline-none font-bold uppercase"
                 value={dateRange.start}
                 onChange={e => setDateRange({...dateRange, start: e.target.value})}
               />
            </div>
            <span className="text-slate-400 text-xs font-bold">-</span>
            <div className="relative flex-1">
               <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
               <input 
                 type="date" 
                 className="w-full pl-8 pr-2 py-2.5 bg-slate-100 dark:bg-slate-950/50 border border-slate-200 dark:border-white/5 rounded-xl text-[#212529] dark:text-slate-200 text-[10px] outline-none font-bold uppercase"
                 value={dateRange.end}
                 onChange={e => setDateRange({...dateRange, end: e.target.value})}
               />
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {filteredTransactions.map(t => (
          <div key={t.id} className="bg-white dark:bg-[#0a0c14] p-4 rounded-2xl border border-slate-200 dark:border-white/5 flex flex-col gap-2 group animate-in slide-in-from-bottom-2 duration-300 shadow-sm dark:shadow-none">
            <div className="flex justify-between items-start">
               <div className="flex gap-3 min-w-0">
                <div className={`p-1.5 rounded-lg flex-shrink-0 ${t.type === 'income' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                  {t.type === 'income' ? <Plus className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-[#212529] dark:text-slate-200 text-xs truncate">{t.description}</p>
                    {t.payment_method && (
                      <div className="text-slate-500 dark:text-slate-400">
                        {getPaymentIcon(t.payment_method)}
                      </div>
                    )}
                  </div>
                  <p className="text-[8px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest">
                    {categories.find(c => c.id === t.category_id)?.name || 'Sem Categoria'}
                    {t.subcategory_id && ` • ${subcategories.find(s => s.id === t.subcategory_id)?.name}`}
                    {` • ${formatDisplayDate(t.date_at)}`}
                  </p>
                  {(t.item || t.location) && (
                    <p className="text-[7px] text-indigo-500 font-black uppercase tracking-widest mt-0.5">
                      {t.item && `Item: ${t.item}`} {t.location && `• Local: ${t.location}`}
                    </p>
                  )}
                </div>
              </div>
              <p className={`font-black text-xs whitespace-nowrap ${t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#212529] dark:text-slate-200'}`}>
                R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="flex justify-between items-center border-t border-slate-100 dark:border-white/5 pt-2">
              <span className="text-[8px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest">
                {t.type === 'income' ? 'RECEITA' : (accounts.find(p => p.id === t.account_id)?.name || 'OUTRO')}
              </span>
              <div className="flex gap-1.5">
                <button onClick={() => handleOpenEdit(t)} className="p-2 text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/50 rounded-lg hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                <button onClick={() => onDelete(t.id)} className="p-2 text-rose-500/50 bg-rose-500/5 rounded-lg hover:text-rose-600 dark:hover:text-rose-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          </div>
        ))}
        {filteredTransactions.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-16 px-4 bg-slate-50 dark:bg-slate-900/20 border border-dashed border-slate-200 dark:border-white/10 rounded-3xl animate-in fade-in zoom-in-95">
            <div className="p-4 bg-white dark:bg-white/5 rounded-full mb-4 shadow-sm">
               <SearchX className="w-8 h-8 text-slate-500 dark:text-slate-400" />
            </div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-500">Nenhuma transação encontrada</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-black tracking-widest mt-1 text-center">
               Para o filtro selecionado
            </p>
          </div>
        )}
      </div>

      {modalType && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 dark:bg-black/95 backdrop-blur-sm">
          <div className={`
             bg-white dark:bg-[#111827] w-full sm:max-w-md rounded-t-[2.5rem] sm:rounded-[2rem] p-6 md:p-8 border-t border-x sm:border flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300
             ${currentTx.type === 'income' ? 'border-emerald-500/30' : 'border-rose-500/30'}
          `}>
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                 <div className={`p-2 rounded-xl ${currentTx.type === 'income' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                    {currentTx.type === 'income' ? <Plus className="w-5 h-5" /> : <Minus className="w-5 h-5" />}
                 </div>
                 <h3 className="text-lg font-black text-[#212529] dark:text-white uppercase tracking-tighter">
                    {modalType === 'add' ? 'Registrar' : 'Editar'} {currentTx.type === 'income' ? 'Ganho' : 'Gasto'}
                 </h3>
              </div>
              <button onClick={() => setModalType(null)} className="p-2 bg-slate-100 dark:bg-slate-900 rounded-full transition-colors hover:bg-slate-200 dark:hover:bg-slate-800">
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1 pr-2 custom-scrollbar">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-550 dark:text-slate-400 uppercase ml-1">Descrição</label>
                  <input required className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-[#212529] dark:text-white outline-none focus:ring-1 focus:ring-indigo-600 text-sm" value={currentTx.description} onChange={e => setCurrentTx({...currentTx, description: e.target.value})} placeholder="Ex: Salário, Aluguel..." />
                </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-550 dark:text-slate-400 uppercase ml-1">Valor R$</label>
                  <input type="number" step="0.01" inputMode="decimal" required className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-[#212529] dark:text-white outline-none text-sm" value={currentTx.amount || ''} onChange={e => setCurrentTx({...currentTx, amount: parseFloat(e.target.value)})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-550 dark:text-slate-400 uppercase ml-1">Data</label>
                  <input type="date" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-[#212529] dark:text-white outline-none text-sm" value={currentTx.date_at} onChange={e => setCurrentTx({...currentTx, date_at: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-550 dark:text-slate-400 uppercase ml-1">Categoria</label>
                  {!isAddingNewCategory ? (
                    <select 
                      required 
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-[#212529] dark:text-white outline-none text-sm"
                      value={currentTx.category_id}
                      onChange={e => {
                        if (e.target.value === 'NEW') setIsAddingNewCategory(true);
                        else setCurrentTx({...currentTx, category_id: e.target.value, subcategory_id: ''});
                      }}
                    >
                      <option value="">Selecione...</option>
                      {availableCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      <option value="NEW">+ Nova...</option>
                    </select>
                  ) : (
                    <div className="relative">
                      <input autoFocus placeholder="Nova categoria..." className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-indigo-500/50 rounded-xl text-[#212529] dark:text-white outline-none text-sm" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} />
                      <button type="button" onClick={() => setIsAddingNewCategory(false)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 dark:text-slate-400 hover:text-rose-500"><X className="w-3 h-3" /></button>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-550 dark:text-slate-400 uppercase ml-1">Subcategoria</label>
                  {!isAddingNewSubcategory ? (
                    <select 
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-[#212529] dark:text-white outline-none text-sm disabled:opacity-50"
                      value={currentTx.subcategory_id || ''}
                      disabled={!currentTx.category_id}
                      onChange={e => {
                        if (e.target.value === 'NEW') setIsAddingNewSubcategory(true);
                        else setCurrentTx({...currentTx, subcategory_id: e.target.value});
                      }}
                    >
                      <option value="">Nenhuma</option>
                      {subcategories.filter(s => s.category_id === currentTx.category_id).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      {currentTx.category_id && <option value="NEW">+ Nova...</option>}
                    </select>
                  ) : (
                    <div className="relative">
                      <input autoFocus placeholder="Nova sub..." className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-indigo-500/50 rounded-xl text-[#212529] dark:text-white outline-none text-sm" value={newSubcategoryName} onChange={e => setNewSubcategoryName(e.target.value)} />
                      <button type="button" onClick={() => setIsAddingNewSubcategory(false)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 dark:text-slate-400 hover:text-rose-500"><X className="w-3 h-3" /></button>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-550 dark:text-slate-400 uppercase ml-1">Forma de Pagamento</label>
                <select 
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-[#212529] dark:text-white outline-none text-sm"
                  value={currentTx.payment_method || ''}
                  onChange={e => setCurrentTx({...currentTx, payment_method: e.target.value})}
                >
                  <option value="">Selecione...</option>
                  {paymentMethods.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-550 dark:text-slate-400 uppercase ml-1">Conta Bancária</label>
                <select 
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-[#212529] dark:text-white outline-none text-sm" 
                  value={currentTx.account_id || ''} 
                  onChange={e => setCurrentTx({...currentTx, account_id: e.target.value || null})}
                >
                  <option value="">Selecione a Conta...</option>
                  {accounts.map(p => <option key={p.id} value={p.id}>{p.name} (R$ {p.current_balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})</option>)}
                </select>
              </div>

              {currentTx.type === 'expense' && pots && pots.length > 0 && (
                <div className="space-y-1.5 mt-3">
                  <label className="text-[9px] font-black text-slate-550 dark:text-slate-400 uppercase ml-1">Pote Virtual</label>
                  <select 
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-[#212529] dark:text-white outline-none text-sm" 
                    value={currentTx.pot_id || ''} 
                    onChange={e => setCurrentTx({...currentTx, pot_id: e.target.value || null})}
                  >
                    <option value="">Selecione o Pote...</option>
                    {pots.map(p => <option key={p.id} value={p.id}>{p.name} (R$ {p.current_balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})</option>)}
                  </select>
                </div>
              )}

              </div>

              <button 
                type="submit" 
                className={`w-full py-4 text-white font-black uppercase text-xs tracking-widest rounded-xl shadow-xl mt-4 active:scale-95 transition-all
                  ${currentTx.type === 'income' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'}
                `}
              >
                Confirmar {currentTx.type === 'income' ? 'Entrada' : 'Saída'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
