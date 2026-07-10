
import React, { useState, useMemo } from 'react';
import { Debt, Account, Transaction, CreditCard, Category, Subcategory } from '../types';
import { Plus, CheckCircle2, AlertTriangle, Calendar, ChevronLeft, ChevronRight, DollarSign, X, Edit2, Clock } from 'lucide-react';
import { parseLocalDate, formatCurrency, formatDisplayDate, formatDateObject } from '../lib/utils';

const addMonths = (dateStr: string, months: number): string => {
  const date = new Date(dateStr + 'T12:00:00');
  const d = date.getDate();
  date.setMonth(date.getMonth() + months);
  if (date.getDate() < d) {
    date.setDate(0);
  }
  return date.toISOString().split('T')[0];
};

interface CompromissosProps {
  activeUserId: string;
  debts: Debt[];
  accounts: Account[];
  cards?: CreditCard[];
  transactions?: Transaction[];
  categories: Category[];
  subcategories: Subcategory[];
  onAdd: (d: Debt | Debt[]) => void;
  onUpdate: (d: Debt) => void;
  onPay: (d: Debt, amount: number, accountId: string, date: string) => void;
  onEdit?: (d: Debt) => void;
  onDelete?: (id: string) => void;
}

interface InstallmentItem {
  debt: Debt;
  installmentNumber: number;
  totalInstallments: number;
  date: Date;
  amount: number;
  remainingAmount: number;
  paidAmount: number;
  status: 'paid' | 'overdue' | 'pending';
  originalDebtId: string;
}

export default function Compromissos({ activeUserId, debts, accounts, cards = [], transactions = [], categories, subcategories, onAdd, onUpdate, onPay, onEdit, onDelete }: CompromissosProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState<Debt | null>(null);
  const [inputType, setInputType] = useState<'total' | 'installment'>('total');
  const [isEditing, setIsEditing] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentsCount, setInstallmentsCount] = useState<number | ''>('');

  const [paymentModal, setPaymentModal] = useState<{ debt: Debt | null, amount: number, accountId: string, date: string }>({ 
    debt: null, 
    amount: 0, 
    accountId: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [newDebt, setNewDebt] = useState<{
    id?: string;
    description: string;
    valueInput: number;
    due_date: string;
    paid_amount?: number;
    status?: 'active' | 'paid' | 'overdue';
    category_id?: string;
    subcategory_id?: string;
  }>({
    description: '', valueInput: 0, due_date: new Date().toISOString().split('T')[0]
  });

  // Só categorias marcadas como "Dívida/Cartão" aparecem aqui - são separadas
  // das categorias normais de receita/despesa.
  const debtCategories = categories.filter(c => c.type === 'debt');
  const availableSubcategories = subcategories.filter(s => s.category_id === newDebt.category_id);

  const totalDebt = debts.filter(d => d.status !== 'paid').reduce((acc, d) => acc + (d.total_amount - d.paid_amount), 0);
  // Subtotal só das parcelas de cartão de crédito (dado informativo - já está
  // somado dentro de totalDebt junto com as outras dívidas).
  const totalCardDebt = debts.filter(d => d.status !== 'paid' && d.card_id).reduce((acc, d) => acc + (d.total_amount - d.paid_amount), 0);
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const monthLabel = `${monthNames[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;

  const changeMonth = (delta: number) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + delta);
    setCurrentMonth(newDate);
  };

  const displayItems = useMemo(() => {
    const items: InstallmentItem[] = [];
    const viewMonth = currentMonth.getMonth();
    const viewYear = currentMonth.getFullYear();
    const today = new Date();
    today.setHours(0,0,0,0);
    const isCurrentViewMonth = viewMonth === today.getMonth() && viewYear === today.getFullYear();

    debts.forEach(debt => {
      const remainingAmount = debt.total_amount - debt.paid_amount;
      const installmentValue = debt.total_amount; // Simplified to 1 installment if not specified
      const totalPaidForDebt = debt.paid_amount;
      
      const installments = 1; // Simplified mapping
      for (let i = 0; i < installments; i++) {
        const dueDateStr = debt.due_date || new Date().toISOString().split('T')[0];
        const installmentDate = parseLocalDate(dueDateStr);
        installmentDate.setMonth(installmentDate.getMonth() + i);
        installmentDate.setHours(0,0,0,0);

        const itemPaidAmount = debt.paid_amount;
        const itemRemainingAmount = debt.total_amount - debt.paid_amount;

        let status: 'paid' | 'overdue' | 'pending' = 'pending';
        if (itemRemainingAmount <= 0.01) {
          status = 'paid';
        } else if (installmentDate < today) {
          status = 'overdue';
        } else {
          status = 'pending';
        }

        const isInstallmentMonth = installmentDate.getMonth() === viewMonth && installmentDate.getFullYear() === viewYear;
        if (isInstallmentMonth || (isCurrentViewMonth && status === 'overdue' && debt.status !== 'paid')) {
          items.push({
            debt: debt,
            installmentNumber: i + 1,
            totalInstallments: debt.installments || 1,
            date: installmentDate,
            amount: installmentValue,
            remainingAmount: itemRemainingAmount,
            paidAmount: itemPaidAmount,
            status: status,
            originalDebtId: debt.id
          });
        }
      }
    });

    return items.sort((a, b) => {
      if (a.status === 'overdue' && b.status !== 'overdue') return -1;
      if (a.status !== 'overdue' && b.status === 'overdue') return 1;
      return a.date.getTime() - b.date.getTime();
    });
  }, [debts, currentMonth]);

  const requiredValue = useMemo(() => {
    return displayItems
      .filter(item => item.status !== 'paid')
      .reduce((acc, item) => acc + item.remainingAmount, 0);
  }, [displayItems]);

  const monthSummary = useMemo(() => {
    let due = 0;
    let paid = 0;
    displayItems.forEach(item => {
        paid += item.paidAmount;
        due += item.remainingAmount;
    });
    return { due, paid };
  }, [displayItems]);

  const handleOpenPayment = (item: InstallmentItem) => {
    const amountToPay = item.remainingAmount;
    setPaymentModal({
      debt: item.debt,
      amount: parseFloat(amountToPay.toFixed(2)),
      accountId: accounts.length > 0 ? accounts[0].id : '',
      date: new Date().toISOString().split('T')[0]
    });
  };

  const handleOpenEdit = (debt: Debt) => {
    setIsEditing(true);
    setInputType('total');
    setIsInstallment(false);
    setInstallmentsCount('');
    setNewDebt({
      id: debt.id,
      description: debt.description,
      valueInput: debt.total_amount,
      due_date: debt.due_date || new Date().toISOString().split('T')[0],
      paid_amount: debt.paid_amount,
      status: debt.status,
      category_id: debt.category_id || '',
      subcategory_id: debt.subcategory_id || ''
    });
    setShowAddModal(true);
  };

  const handleDelete = (id: string) => {
    if (onDelete && window.confirm('Deseja realmente excluir este compromisso?')) {
      onDelete(id);
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDebt.description || !newDebt.valueInput) return;

    if (!isEditing && isInstallment) {
      if (!installmentsCount || installmentsCount < 2) {
        alert("Por favor, digite o número de parcelas (mínimo 2).");
        return;
      }
    }

    const baseDebt: Debt = {
      id: isEditing && newDebt.id ? newDebt.id : crypto.randomUUID(),
      user_id: activeUserId,
      description: newDebt.description,
      total_amount: newDebt.valueInput,
      paid_amount: isEditing ? (newDebt.paid_amount ?? 0) : 0, 
      due_date: newDebt.due_date,
      status: newDebt.status || 'active',
      category_id: newDebt.category_id || null,
      subcategory_id: newDebt.subcategory_id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (isEditing) {
      if (onEdit) onEdit(baseDebt);
    } else {
      if (isInstallment && installmentsCount && installmentsCount > 1) {
        const count = Number(installmentsCount);
        const generatedDebts: Debt[] = [];
        for (let i = 1; i <= count; i++) {
          const installmentDate = addMonths(newDebt.due_date || new Date().toISOString().split('T')[0], i - 1);
          generatedDebts.push({
            ...baseDebt,
            id: crypto.randomUUID(),
            description: `${newDebt.description} (${i}/${count})`,
            total_amount: newDebt.valueInput,
            due_date: installmentDate,
            installments: count,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
        onAdd(generatedDebts);
      } else {
        onAdd(baseDebt);
      }
    }
    
    setNewDebt({ description: '', valueInput: 0, due_date: new Date().toISOString().split('T')[0] });
    setShowAddModal(false);
    setIsEditing(false);
  };

  const getPaymentDate = (debt: Debt) => {
    if (transactions.length === 0) return null;
    const payment = transactions
        .filter(t => (t.description.toLowerCase().includes(debt.description.toLowerCase())))
        .sort((a, b) => parseLocalDate(b.date_at).getTime() - parseLocalDate(a.date_at).getTime())[0];
    return payment ? formatDisplayDate(payment.date_at) : null;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black text-[#212529] dark:text-white uppercase tracking-tighter">Compromissos</h2>
        <button 
          onClick={() => {
            setIsEditing(false);
            setIsInstallment(false);
            setInstallmentsCount('');
            setNewDebt({ description: '', valueInput: 0, due_date: new Date().toISOString().split('T')[0] });
            setShowAddModal(true);
          }}
          className="w-10 h-10 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-600/20 flex items-center justify-center hover:bg-indigo-700 active:scale-95 transition-all"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-3xl">
          <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest block mb-2">Total do Mês ({monthLabel})</span>
          <p className="text-3xl font-black text-amber-600 dark:text-white tracking-tighter">R$ {formatCurrency(monthSummary.due + monthSummary.paid)}</p>
        </div>

        <div className="bg-indigo-500/10 border border-indigo-500/20 p-6 rounded-3xl">
          <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block mb-2">Valor Necessário</span>
          <p className="text-3xl font-black text-indigo-600 dark:text-white tracking-tighter">R$ {formatCurrency(monthSummary.due)}</p>
          <span className="text-[8px] text-indigo-400 font-bold uppercase mt-1 block">Para quitar compromissos do mês</span>
        </div>

        <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-3xl relative overflow-hidden group">
          <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block mb-2">Pago ({monthLabel})</span>
          <p className="text-3xl font-black text-emerald-600 dark:text-white tracking-tighter">R$ {formatCurrency(monthSummary.paid)}</p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
         <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-col">
                <h3 className="text-[11px] font-black text-[#4e545a] dark:text-slate-600 uppercase tracking-[0.2em]">
                Parcelas do Mês
                </h3>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                    Saldo Total Devedor: R$ {formatCurrency(totalDebt)}
                    {totalCardDebt > 0 && <span className="text-indigo-400"> · Cartões: R$ {formatCurrency(totalCardDebt)}</span>}
                </span>
            </div>
            
            <div className="flex items-center bg-slate-100 dark:bg-slate-900/50 p-1.5 rounded-xl border border-slate-200 dark:border-white/5">
                <button onClick={() => changeMonth(-1)} className="p-1.5 hover:bg-white dark:hover:bg-white/10 rounded-lg transition-colors">
                    <ChevronLeft className="w-4 h-4 text-slate-600" />
                </button>
                <span className="text-xs font-black uppercase tracking-widest text-[#212529] dark:text-white px-3 min-w-[120px] text-center">
                    {monthLabel}
                </span>
                <button onClick={() => changeMonth(1)} className="p-1.5 hover:bg-white dark:hover:bg-white/10 rounded-lg transition-colors">
                    <ChevronRight className="w-4 h-4 text-slate-600" />
                </button>
            </div>
         </div>
        
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {displayItems.map((item, index) => {
              let statusConfig = {
                 bg: 'bg-white dark:bg-[#111827]/60',
                 border: 'border-slate-200 dark:border-white/5',
                 iconBg: 'bg-indigo-500/10',
                 iconColor: 'text-indigo-600 dark:text-indigo-400',
                 icon: Clock,
                 label: 'A Vencer',
                 labelColor: 'text-amber-500'
              };

              let paymentDateDisplay = null;

              if (item.status === 'overdue') {
                 statusConfig = {
                    bg: 'bg-rose-50 dark:bg-rose-900/10',
                    border: 'border-rose-200 dark:border-rose-500/30',
                    iconBg: 'bg-rose-500/20',
                    iconColor: 'text-rose-600 dark:text-rose-400',
                    icon: AlertTriangle,
                    label: 'Vencido',
                    labelColor: 'text-rose-600'
                 };
              } else if (item.status === 'paid') {
                 statusConfig = {
                    bg: 'bg-emerald-50 dark:bg-emerald-900/10',
                    border: 'border-emerald-200 dark:border-emerald-500/30',
                    iconBg: 'bg-emerald-500/20',
                    iconColor: 'text-emerald-600 dark:text-emerald-400',
                    icon: CheckCircle2,
                    label: 'Pago',
                    labelColor: 'text-emerald-600'
                 };
                 paymentDateDisplay = getPaymentDate(item.debt);
              }

              if (item.status === 'pending') {
                  statusConfig.iconBg = 'bg-amber-500/10';
                  statusConfig.iconColor = 'text-amber-600 dark:text-amber-400';
                  statusConfig.label = 'A Vencer';
                  statusConfig.labelColor = 'text-amber-600 dark:text-amber-400';
                  statusConfig.border = 'border-amber-200 dark:border-amber-500/30';
              }

              return (
                <div key={`${item.originalDebtId}-${item.installmentNumber}-${index}`} className={`${statusConfig.bg} backdrop-blur-md border ${statusConfig.border} rounded-3xl p-6 relative group transition-all shadow-sm`}>
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all z-10 flex gap-2">
                     <button onClick={() => handleOpenEdit(item.debt)} className="p-2 bg-white/50 dark:bg-black/20 rounded-full hover:bg-indigo-500 hover:text-white transition-colors text-slate-600" title="Editar">
                       <Edit2 className="w-4 h-4" />
                     </button>
                     <button onClick={() => handleDelete(item.debt.id)} className="p-2 bg-white/50 dark:bg-black/20 rounded-full hover:bg-rose-500 hover:text-white transition-colors text-slate-600" title="Excluir">
                       <X className="w-4 h-4" />
                     </button>
                  </div>

                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-2xl ${statusConfig.iconBg} ${statusConfig.iconColor}`}>
                        <statusConfig.icon />
                      </div>
                      <div>
                        <h4 className="font-bold text-[#212529] dark:text-white text-lg tracking-tight">{item.debt.description}</h4>
                        <div className="flex gap-2 items-center mt-1 flex-wrap">
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${statusConfig.labelColor} bg-white/50 dark:bg-black/20`}>
                                {statusConfig.label}
                            </span>
                            {item.debt.card_id && (() => {
                              const card = cards.find(c => c.id === item.debt.card_id);
                              return card ? (
                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10">
                                  💳 {card.name}{card.last_4_digits ? ` •${card.last_4_digits}` : ''}
                                </span>
                              ) : null;
                            })()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right pr-8 lg:pr-0">
                      <p className="text-xs font-bold uppercase tracking-widest mb-1 text-[#4e545a] dark:text-slate-600">
                        {item.status === 'paid' && paymentDateDisplay ? 'Pago em' : 'Vencimento'}
                      </p>
                      <div className={`flex items-center justify-end gap-2 text-sm font-bold ${statusConfig.labelColor}`}>
                        <Calendar className="w-4 h-4" />
                        {item.status === 'paid' && paymentDateDisplay ? paymentDateDisplay : formatDateObject(item.date)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-white/50 dark:bg-black/20 p-3 rounded-2xl">
                          <span className="text-[9px] text-[#4e545a] dark:text-slate-600 font-black uppercase block mb-1">A Pagar</span>
                          <span className="text-lg font-bold text-[#212529] dark:text-slate-200">
                             R$ {formatCurrency(item.remainingAmount)}
                          </span>
                      </div>
                      <div className="bg-white/50 dark:bg-black/20 p-3 rounded-2xl">
                          <span className="text-[9px] text-[#4e545a] dark:text-slate-600 font-black uppercase block mb-1">Pago</span>
                          <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                             R$ {formatCurrency(item.paidAmount)}
                          </span>
                      </div>
                  </div>
                  
                  {item.totalInstallments > 1 && (
                    <div className="bg-slate-50 dark:bg-black/20 p-3 rounded-2xl mb-4">
                        <span className="text-[9px] text-[#4e545a] dark:text-slate-600 font-black uppercase block mb-1">Restante Total da Dívida</span>
                        <span className="text-sm font-bold text-[#212529] dark:text-slate-200">
                           R$ {formatCurrency(item.debt.total_amount - item.debt.paid_amount)} / R$ {formatCurrency(item.debt.total_amount)}
                        </span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {item.status !== 'paid' && (
                      <button onClick={() => handleOpenPayment(item)} className="flex-1 flex items-center justify-center gap-2 py-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-[11px] font-black uppercase tracking-widest text-[#212529] dark:text-slate-300 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-sm">
                        <DollarSign className="w-4 h-4" /> Pagar
                      </button>
                    )}
                    {item.totalInstallments > 1 && (
                      <button onClick={() => setShowDetailsModal(item.debt)} className="flex-1 flex items-center justify-center gap-2 py-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-[11px] font-black uppercase tracking-widest text-[#212529] dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-all shadow-sm">
                        <Clock className="w-4 h-4" /> Detalhes
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            
            {displayItems.length === 0 && (
              <div className="lg:col-span-2 text-center py-16 bg-slate-100 dark:bg-slate-900/20 rounded-3xl border border-dashed border-slate-300 dark:border-white/10">
                <div className="flex justify-center mb-3">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500/50" />
                </div>
                <p className="text-[#4e545a] dark:text-slate-700 font-black uppercase text-xs tracking-[0.2em]">Nenhuma parcela pendente em {monthLabel}</p>
              </div>
            )}
         </div>
      </div>

      {showDetailsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/80 backdrop-blur-md">
          <div className="bg-white dark:bg-[#1e293b] rounded-3xl w-full max-w-md p-8 border border-slate-200 dark:border-white/10 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-[#212529] dark:text-white tracking-tight">{showDetailsModal.description}</h3>
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Detalhes do Compromisso</p>
              </div>
              <button onClick={() => setShowDetailsModal(null)}><X className="text-[#4e545a] dark:text-slate-600 hover:text-[#212529] dark:hover:text-white" /></button>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-white/5">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Valor Total</p>
                <p className="text-lg font-black text-slate-900 dark:text-white">R$ {formatCurrency(showDetailsModal.total_amount)}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Pago</p>
                  <p className="text-lg font-black text-emerald-600">R$ {formatCurrency(showDetailsModal.paid_amount || 0)}</p>
                </div>
                <div className="p-4 bg-rose-500/5 rounded-2xl border border-rose-500/10">
                  <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1">Restante</p>
                  <p className="text-lg font-black text-rose-600">R$ {formatCurrency(showDetailsModal.total_amount - (showDetailsModal.paid_amount || 0))}</p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-white/5">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Data de Vencimento</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{formatDisplayDate(showDetailsModal.due_date)}</p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-white/5">
              <button onClick={() => setShowDetailsModal(null)} className="w-full py-3 bg-slate-100 dark:bg-white/5 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {paymentModal.debt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/80 backdrop-blur-md">
          <div className="bg-white dark:bg-[#1e293b] rounded-3xl w-full max-w-sm p-8 border border-slate-200 dark:border-white/10 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-[#212529] dark:text-white tracking-tight">Pagar {paymentModal.debt.description}</h3>
              <button onClick={() => setPaymentModal({ debt: null, amount: 0, accountId: '', date: '' })}><X className="text-[#4e545a] dark:text-slate-600 hover:text-[#212529] dark:hover:text-white" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-[#4e545a] dark:text-slate-600 uppercase tracking-widest block mb-2">Valor do Pagamento</label>
                <input type="number" step="0.01" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-[#212529] dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" value={paymentModal.amount} onChange={(e) => setPaymentModal({ ...paymentModal, amount: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                 <label className="text-[10px] font-black text-[#4e545a] dark:text-slate-600 uppercase tracking-widest block mb-2">Data do Pagamento</label>
                 <input type="date" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-[#212529] dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" value={paymentModal.date} onChange={(e) => setPaymentModal({ ...paymentModal, date: e.target.value })} />
              </div>
              <div>
                <label className="text-[10px] font-black text-[#4e545a] dark:text-slate-600 uppercase tracking-widest block mb-2">Conta de Origem</label>
                <select className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-[#212529] dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" value={paymentModal.accountId} onChange={(e) => setPaymentModal({ ...paymentModal, accountId: e.target.value })}>
                  <option value="">Selecione...</option>
                  {accounts.map(p => <option key={p.id} value={p.id}>{p.name} (Saldo: R$ {formatCurrency(p.current_balance)})</option>)}
                </select>
              </div>
              <button 
                onClick={() => {
                  if (paymentModal.debt && paymentModal.amount > 0 && paymentModal.accountId && paymentModal.date) {
                    onPay(paymentModal.debt, paymentModal.amount, paymentModal.accountId, paymentModal.date);
                    setPaymentModal({ debt: null, amount: 0, accountId: '', date: '' });
                  } else {
                    alert("Preencha todos os campos corretamente.");
                  }
                }}
                className="w-full py-4 bg-emerald-500 text-emerald-950 font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-emerald-400 transition-all shadow-xl"
              >
                Confirmar Pagamento
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/80 backdrop-blur-md overflow-y-auto">
           <div className="bg-white dark:bg-[#1e293b] rounded-[2.5rem] w-full max-w-sm p-10 border border-slate-200 dark:border-white/10 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto scrollbar-thin">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black text-[#212529] dark:text-white uppercase tracking-tighter">
                {isEditing ? 'Editar Compromisso' : 'Registrar Compromisso'}
              </h3>
              <button onClick={() => setShowAddModal(false)}><X className="text-[#4e545a] dark:text-slate-700" /></button>
            </div>
            <form onSubmit={handleAddSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#4e545a] dark:text-slate-700 uppercase tracking-widest ml-1">Descrição</label>
                <input required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[#212529] dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" value={newDebt.description} onChange={e => setNewDebt({...newDebt, description: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#4e545a] dark:text-slate-700 uppercase tracking-widest ml-1">Categoria</label>
                  <select className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[#212529] dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" value={newDebt.category_id || ''} onChange={e => setNewDebt({...newDebt, category_id: e.target.value, subcategory_id: ''})}>
                    <option value="">Sem categoria</option>
                    {debtCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#4e545a] dark:text-slate-700 uppercase tracking-widest ml-1">Subcategoria</label>
                  <select disabled={!newDebt.category_id} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[#212529] dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50" value={newDebt.subcategory_id || ''} onChange={e => setNewDebt({...newDebt, subcategory_id: e.target.value})}>
                    <option value="">Nenhuma</option>
                    {availableSubcategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#4e545a] dark:text-slate-700 uppercase tracking-widest ml-1">Valor Total R$</label>
                  <input type="number" step="0.01" required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[#212529] dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" value={newDebt.valueInput || ''} onChange={e => setNewDebt({...newDebt, valueInput: parseFloat(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#4e545a] dark:text-slate-700 uppercase tracking-widest ml-1">Vencimento</label>
                <input type="date" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[#212529] dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" value={newDebt.due_date} onChange={e => setNewDebt({...newDebt, due_date: e.target.value})} />
              </div>

              {!isEditing && (
                <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-[#212529] dark:text-slate-200">Compromisso Parcelado?</span>
                      <span className="text-[10px] text-slate-500">Ative para lançar várias parcelas mensais</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={isInstallment}
                        onChange={e => setIsInstallment(e.target.checked)}
                      />
                      <div className="w-9 h-5 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  {isInstallment && (
                    <div className="grid grid-cols-2 gap-4 pt-1 animate-in slide-in-from-top-2 duration-200">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-[#4e545a] dark:text-slate-600 uppercase ml-1">Número de Parcelas</label>
                        <input 
                          type="number" 
                          min="2" 
                          max="72"
                          className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-[#212529] dark:text-white outline-none text-sm font-bold" 
                          value={installmentsCount} 
                          onChange={e => {
                            const val = e.target.value;
                            setInstallmentsCount(val === '' ? '' : parseInt(val) || '');
                          }} 
                        />
                      </div>
                      <div className="space-y-1.5 flex flex-col justify-end pb-1">
                        <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">Valor por Parcela</span>
                        <span className="text-xs font-bold text-[#212529] dark:text-white">
                          R$ {(newDebt.valueInput || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[8px] text-slate-500 font-bold">Total: R$ {((newDebt.valueInput || 0) * (Number(installmentsCount) || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              <div className="bg-indigo-50 dark:bg-indigo-500/10 p-3 rounded-xl text-center">
                 <p className="text-[10px] uppercase text-indigo-400 font-bold mb-1">Resumo do Registro</p>
                 <p className="text-indigo-600 dark:text-indigo-300 font-bold text-sm">
                    {isInstallment && !isEditing 
                      ? `Parcelas: ${installmentsCount || '0'}x de R$ ${(newDebt.valueInput || 0).toFixed(2)} (Total: R$ ${((newDebt.valueInput || 0) * (Number(installmentsCount) || 0)).toFixed(2)})`
                      : `Valor Total: R$ ${(newDebt.valueInput || 0).toFixed(2)}`}
                 </p>
              </div>

              <button type="submit" className="w-full py-4 bg-indigo-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl">
                 {isEditing ? 'Atualizar Compromisso' : 'Salvar Compromisso'}
              </button>
            </form>
           </div>
        </div>
      )}
    </div>
  );
}
