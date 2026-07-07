
import React, { useState, useMemo } from 'react';
import { Account, Transaction } from '../types';
import { Plus, Trash2, Edit2, Archive, X, Save, Settings, Calendar } from 'lucide-react';

import { parseLocalDate, formatCurrency } from '../lib/utils';

interface PotesProps {
  activeUserId: string;
  accounts: Account[];
  transactions: Transaction[];
  onUpdate: (accounts: Account[]) => void;
}

export default function Potes({ activeUserId, accounts, transactions, onUpdate }: PotesProps) {
  const [showModal, setShowModal] = useState<'add' | 'edit' | null>(null);
  const [currentAccount, setCurrentAccount] = useState<Partial<Account>>({ name: '', percentage: 0, type: 'bank' });
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  // Rascunho de redistribuição: percentuais editáveis dos OUTROS potes, usados quando
  // a soma ultrapassa 100% ao criar/editar um pote.
  const [redistribution, setRedistribution] = useState<Record<string, number>>({});

  const totalPercentage = accounts.reduce((acc, p) => acc + (p.percentage || 0), 0);

  const otherAccounts = useMemo(() => {
    return showModal === 'edit' ? accounts.filter(p => p.id !== currentAccount.id) : accounts;
  }, [accounts, showModal, currentAccount.id]);

  const redistributedTotal = useMemo(() => {
    const othersSum = otherAccounts.reduce((acc, p) => acc + (redistribution[p.id] ?? p.percentage ?? 0), 0);
    return othersSum + (currentAccount.percentage || 0);
  }, [otherAccounts, redistribution, currentAccount.percentage]);

  const needsRedistribution = redistributedTotal > 100;

  const openAddModal = () => {
    setCurrentAccount({ name: '', percentage: 0, type: 'bank' });
    setRedistribution({});
    setShowModal('add');
  };

  const openEditModal = (account: Account) => {
    setCurrentAccount(account);
    setRedistribution({});
    setShowModal('edit');
  };

  // Calcula o saldo do período se datas forem selecionadas
  const periodBalances = useMemo(() => {
    if (!dateRange.start && !dateRange.end) return null;

    let totalIncome = 0;
    const expenseByAccount: Record<string, number> = {};

    transactions.forEach(t => {
      const txDate = t.date_at;
      const afterStart = !dateRange.start || txDate >= dateRange.start;
      const beforeEnd = !dateRange.end || txDate <= dateRange.end;

      if (afterStart && beforeEnd) {
        if (t.type === 'income') {
          totalIncome += t.amount;
        } else if (t.type === 'expense' && t.account_id) {
          expenseByAccount[t.account_id] = (expenseByAccount[t.account_id] || 0) + t.amount;
        }
      }
    });

    return accounts.reduce((acc, account) => {
      const allocatedIncome = totalIncome * ((account.percentage || 0) / 100);
      const expenses = expenseByAccount[account.id] || 0;
      acc[account.id] = allocatedIncome - expenses;
      return acc;
    }, {} as Record<string, number>);

  }, [transactions, accounts, dateRange]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (redistributedTotal > 100) {
      alert("A soma total das porcentagens ainda ultrapassa 100%. Ajuste os valores antes de confirmar.");
      return;
    }

    // Aplica as mudanças de percentual dos OUTROS potes (se o usuário redistribuiu),
    // sem tocar no saldo/current_balance de nenhum deles - isso é só o rateio de
    // ENTRADAS FUTURAS. O que já foi alocado no passado permanece intacto.
    const accountsWithRedistribution = accounts.map(acc => {
      if (acc.id in redistribution && redistribution[acc.id] !== acc.percentage) {
        return { ...acc, percentage: redistribution[acc.id], updated_at: new Date().toISOString() };
      }
      return acc;
    });

    if (showModal === 'add') {
      const account: Account = { 
        id: crypto.randomUUID(), 
        user_id: activeUserId,
        name: currentAccount.name || 'Nova Conta', 
        type: currentAccount.type || 'bank',
        percentage: currentAccount.percentage || 0, 
        current_balance: 0,
        balance_initial: 0,
        is_active: true,
        color: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      onUpdate([...accountsWithRedistribution, account]);
    } else {
      onUpdate(accountsWithRedistribution.map(p => p.id === currentAccount.id ? { ...p, ...currentAccount } as Account : p));
    }
    setShowModal(null);
    setRedistribution({});
  };

  return (
    <div className="space-y-8">
      {/* Resumo da Estrutura */}
      <div className="bg-white dark:bg-[#0a0c14] p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/5 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 shadow-2xl dark:shadow-none">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-5 w-full xl:w-auto">
           <div className="flex items-center gap-5">
             <div className="p-4 bg-indigo-600/10 rounded-2xl border border-indigo-600/20">
                <Settings className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
             </div>
             <div>
                <h2 className="text-xl font-black text-[#212529] dark:text-white uppercase tracking-tighter">Arquitetura de Rateio</h2>
                <p className="text-[#4e545a] dark:text-slate-600 text-[11px] font-bold uppercase tracking-[0.2em] mt-1">
                  Alocação: <span className={`px-2 py-0.5 rounded-lg ${totalPercentage > 100 ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400' : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'}`}>{totalPercentage}% / 100%</span>
                </p>
             </div>
           </div>
           
           {/* Date Filter in Potes */}
           <div className="flex items-center gap-2 mt-4 md:mt-0 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-2xl border border-slate-200 dark:border-white/5">
              <div className="relative">
                 <input 
                   type="date" 
                   className="pl-3 pr-2 py-2 bg-transparent text-[#212529] dark:text-slate-200 text-[10px] outline-none font-bold uppercase w-28"
                   value={dateRange.start}
                   onChange={e => setDateRange({...dateRange, start: e.target.value})}
                 />
              </div>
              <span className="text-slate-400 text-xs">-</span>
              <div className="relative">
                 <input 
                   type="date" 
                   className="pl-2 pr-2 py-2 bg-transparent text-[#212529] dark:text-slate-200 text-[10px] outline-none font-bold uppercase w-28"
                   value={dateRange.end}
                   onChange={e => setDateRange({...dateRange, end: e.target.value})}
                 />
              </div>
              {(dateRange.start || dateRange.end) && (
                <button 
                  onClick={() => setDateRange({start: '', end: ''})}
                  className="p-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg text-slate-600 hover:text-rose-500"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
           </div>
        </div>

        <button 
          onClick={openAddModal}
          className="w-full xl:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/20"
        >
          <Plus className="w-5 h-5" /> Adicionar Pote
        </button>
      </div>

      {/* Grid de Potes Editáveis */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {accounts.map((account) => {
          const displayBalance = periodBalances ? periodBalances[account.id] : account.current_balance;
          const isPeriodView = !!periodBalances;

          return (
            <div key={account.id} className="bg-white dark:bg-[#111827]/40 p-6 rounded-[2rem] border border-slate-200 dark:border-white/5 group relative overflow-hidden transition-all hover:border-indigo-500/30 shadow-sm dark:shadow-none">
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                <button onClick={() => openEditModal(account)} className="p-2 text-[#4e545a] dark:text-slate-700 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => { if(confirm(`Excluir ${account.name}? As transações vinculadas perderão a referência de conta.`)) onUpdate(accounts.filter(p => p.id !== account.id)) }} className="p-2 text-[#4e545a] dark:text-slate-700 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl"><Trash2 className="w-4 h-4" /></button>
              </div>

              <div className="bg-indigo-500/10 w-12 h-12 flex items-center justify-center rounded-2xl border border-indigo-500/20 mb-6">
                <Archive className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>

              <h3 className="text-lg font-black text-[#212529] dark:text-white mb-1 tracking-tight truncate pr-10">{account.name}</h3>
              <span className="text-[10px] font-black text-indigo-600/80 dark:text-indigo-500/80 uppercase tracking-widest block mb-4">Rateio: {account.percentage}%</span>

              <div className="pt-4 border-t border-slate-100 dark:border-white/5">
                <p className="text-[9px] text-[#4e545a] dark:text-slate-700 uppercase font-black tracking-widest mb-1">
                  {isPeriodView ? 'Fluxo do Período' : 'Saldo Acumulado'}
                </p>
                <p className={`text-4xl font-black tracking-tighter ${displayBalance >= 0 ? 'text-[#212529] dark:text-slate-200' : 'text-rose-500'}`}>
                  R$ {formatCurrency(displayBalance)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Configuração de Pote */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/95 backdrop-blur-md">
          <div className="bg-white dark:bg-[#1e293b] rounded-[2.5rem] w-full max-w-md p-10 border border-slate-200 dark:border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black text-[#212529] dark:text-white uppercase tracking-tighter">{showModal === 'add' ? 'Novo Pote' : 'Configurar Pote'}</h3>
              <button onClick={() => { setShowModal(null); setRedistribution({}); }} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full"><X className="w-5 h-5 text-[#4e545a] dark:text-slate-700" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#4e545a] dark:text-slate-700 uppercase tracking-widest ml-1">Identificação</label>
                <input type="text" required className="w-full px-5 py-4 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-[#212529] dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" value={currentAccount.name} onChange={e => setCurrentAccount({...currentAccount, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#4e545a] dark:text-slate-700 uppercase tracking-widest ml-1">Percentual de Entrada (%)</label>
                <div className="relative">
                  <input type="number" required min="0" max="100" className="w-full px-5 py-4 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-[#212529] dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" value={currentAccount.percentage || ''} onChange={e => setCurrentAccount({...currentAccount, percentage: parseInt(e.target.value) || 0})} />
                  <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[#4e545a] dark:text-slate-700 font-black">%</span>
                </div>
              </div>

              {/* Indicador de soma total */}
              <div className={`flex items-center justify-between px-4 py-3 rounded-2xl border text-xs font-black uppercase tracking-widest ${
                redistributedTotal > 100 ? 'bg-rose-500/10 border-rose-500/30 text-rose-500' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
              }`}>
                <span>Soma total do rateio</span>
                <span>{redistributedTotal}% / 100%</span>
              </div>

              {/* Redistribuição: aparece quando a soma ultrapassa 100% */}
              {needsRedistribution && otherAccounts.length > 0 && (
                <div className="space-y-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
                  <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">
                    Passou de 100% — reduza o rateio de algum pote existente:
                  </p>
                  {otherAccounts.map(acc => (
                    <div key={acc.id} className="flex items-center gap-3">
                      <span className="flex-1 text-xs font-bold text-[#212529] dark:text-slate-200 truncate">{acc.name}</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="w-20 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-center text-[#212529] dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                        value={redistribution[acc.id] ?? acc.percentage ?? 0}
                        onChange={e => setRedistribution({ ...redistribution, [acc.id]: parseInt(e.target.value) || 0 })}
                      />
                      <span className="text-xs text-[#4e545a] dark:text-slate-600 font-black">%</span>
                    </div>
                  ))}
                  <p className="text-[9px] text-[#4e545a] dark:text-slate-600 leading-relaxed pt-1">
                    Isso só muda como as <strong>próximas</strong> entradas serão divididas. O saldo que já está em cada pote continua exatamente igual.
                  </p>
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => { setShowModal(null); setRedistribution({}); }} className="flex-1 py-4 text-[#4e545a] dark:text-slate-700 font-black uppercase text-xs tracking-widest hover:text-[#212529] dark:hover:text-white transition-colors">Cancelar</button>
                <button type="submit" disabled={redistributedTotal > 100} className="flex-1 py-4 bg-indigo-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-indigo-500 shadow-xl transition-all">
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
