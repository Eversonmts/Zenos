
import React, { useState } from 'react';
import { Plus, X, Trash2, Edit2, TrendingDown, AlertCircle, CheckCircle2, ChevronRight, PieChart } from 'lucide-react';
import { Budget, Category, Transaction } from '../types';

interface BudgetsProps {
  budgets: Budget[];
  categories: Category[];
  transactions: Transaction[];
  onAdd: (b: Budget) => void;
  onDelete: (id: string) => void;
}

export default function Budgets({ budgets, categories, transactions, onAdd, onDelete }: BudgetsProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBudget, setNewBudget] = useState<Partial<Budget>>({
    limit_amount: 0, period: 'monthly'
  });

  const getSpendingForCategory = (categoryId: string) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    return transactions
      .filter(t => t.type === 'expense' && t.category_id === categoryId && new Date(t.date_at) >= startOfMonth)
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBudget.category_id || !newBudget.limit_amount) return;
    
    const cat = categories.find(c => c.id === newBudget.category_id);
    onAdd({
      ...newBudget as Budget,
      id: crypto.randomUUID(),
      category_name: cat?.name || 'Geral',
      created_at: new Date().toISOString()
    });
    setShowAddModal(false);
    setNewBudget({ limit_amount: 0, period: 'monthly' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-[#212529] dark:text-white uppercase tracking-tighter">Tetos de Gastos</h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Controle orçamentário mensal</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20">
          <Plus className="w-5 h-5" /> Novo Orçamento
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {budgets.map(budget => {
          const spent = getSpendingForCategory(budget.category_id);
          const percent = Math.min((spent / budget.limit_amount) * 100, 100);
          const isOver = spent > budget.limit_amount;
          const remaining = Math.max(budget.limit_amount - spent, 0);
          const category = categories.find(c => c.id === budget.category_id);

          return (
            <div key={budget.id} className="bg-white dark:bg-[#111827]/60 backdrop-blur-md border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-6 group hover:border-indigo-500/30 transition-all shadow-sm">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500">
                    <PieChart className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-[#212529] dark:text-white text-lg tracking-tight">{budget.category_name}</h4>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Orçamento Mensal</span>
                  </div>
                </div>
                <button onClick={() => onDelete(budget.id)} className="p-2 text-slate-400 hover:text-rose-500 transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Consumido</p>
                    <p className={`text-2xl font-black tracking-tighter ${isOver ? 'text-rose-500' : 'text-[#212529] dark:text-white'}`}>
                      R$ {spent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Limite</p>
                    <p className="text-lg font-black text-slate-400">R$ {budget.limit_amount.toLocaleString()}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 rounded-full ${isOver ? 'bg-rose-500' : percent > 80 ? 'bg-amber-500' : 'bg-indigo-500 hover:shadow-[0_0_15px_rgba(99,102,241,0.5)]'}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                    <span className={isOver ? 'text-rose-500' : 'text-slate-400'}>
                      {isOver ? 'Limite Excedido' : 'Dentro do Limite'}
                    </span>
                    <span className="text-indigo-400">{percent.toFixed(0)}%</span>
                  </div>
                </div>

                <div className={`p-4 rounded-2xl flex items-center gap-3 ${isOver ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                  {isOver ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                  <div className="flex-1">
                    <p className="text-[10px] font-black uppercase tracking-widest">
                      {isOver ? 'Atenção' : 'Status'}
                    </p>
                    <p className="text-xs font-bold leading-tight">
                      {isOver 
                        ? `Você ultrapassou o teto em R$ ${(spent - budget.limit_amount).toLocaleString('pt-BR')}`
                        : `Você ainda pode gastar R$ ${remaining.toLocaleString('pt-BR')} este mês`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {budgets.length === 0 && (
          <div className="md:col-span-2 text-center py-20 bg-slate-50 dark:bg-slate-900/20 rounded-[3rem] border border-dashed border-slate-200 dark:border-white/10">
            <TrendingDown className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
            <p className="text-[#4e545a] dark:text-slate-700 font-black uppercase text-xs tracking-[0.2em]">Sem limites definidos. Comece a monitorar seus gastos.</p>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-white dark:bg-[#1e293b] rounded-[2.5rem] w-full max-w-sm p-10 border border-slate-200 dark:border-white/10 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black text-[#212529] dark:text-white uppercase tracking-tighter">Configurar Teto</h3>
              <button onClick={() => setShowAddModal(false)}><X className="text-slate-400 hover:text-white" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#4e545a] dark:text-slate-600 uppercase tracking-widest ml-1">Categoria</label>
                <select required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[#212529] dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" value={newBudget.category_id} onChange={e => setNewBudget({...newBudget, category_id: e.target.value})}>
                  <option value="">Selecione a categoria...</option>
                  {categories.filter(c => c.type === 'expense').map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#4e545a] dark:text-slate-600 uppercase tracking-widest ml-1">Limite de Gastos R$</label>
                <input type="number" required step="0.01" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[#212529] dark:text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={newBudget.limit_amount || ''} onChange={e => setNewBudget({...newBudget, limit_amount: parseFloat(e.target.value)})} placeholder="R$ 0,00" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#4e545a] dark:text-slate-600 uppercase tracking-widest ml-1">Periodicidade</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setNewBudget({...newBudget, period: 'monthly'})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${newBudget.period === 'monthly' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-900 text-slate-500'}`}>Mensal</button>
                  <button type="button" onClick={() => setNewBudget({...newBudget, period: 'weekly'})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${newBudget.period === 'weekly' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-900 text-slate-500'}`}>Semanal</button>
                </div>
              </div>

              <button type="submit" className="w-full py-5 bg-indigo-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl hover:bg-indigo-500 transition-all">
                Criar Orçamento
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
