
import React, { useState } from 'react';
import { Goal, Account } from '../types';
import { Target, Trophy, Calendar, Plus, X, ArrowUpRight, Wallet, Edit2, TrendingUp, History } from 'lucide-react';
import { parseLocalDate, formatCurrency, formatDisplayDate } from '../lib/utils';

interface GoalsProps {
  activeUserId: string;
  goals: Goal[];
  accounts: Account[];
  onAdd: (g: Goal) => void;
  onUpdate: (goals: Goal[]) => void;
  onDeposit: (amount: number, accountId: string, goalTitle: string) => void;
  onEdit?: (g: Goal) => void;
}

export default function Goals({ activeUserId, goals, accounts, onAdd, onUpdate, onDeposit, onEdit }: GoalsProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [newGoal, setNewGoal] = useState({ title: '', target_amount: 0, deadline: '' });
  
  const [depositModal, setDepositModal] = useState<{ goalId: string, goalTitle: string } | null>(null);
  const [detailsModal, setDetailsModal] = useState<Goal | null>(null);
  const [depositAmount, setDepositAmount] = useState(0);
  const [selectedAccountId, setSelectedAccountId] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoal.title || newGoal.target_amount <= 0) return;
    const goal: Goal = {
      id: Math.random().toString(36).substr(2, 9),
      user_id: activeUserId,
      title: newGoal.title,
      target_amount: newGoal.target_amount,
      current_amount: 0,
      deadline: newGoal.deadline || new Date().toISOString().split('T')[0],
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    onAdd(goal);
    setNewGoal({ title: '', target_amount: 0, deadline: '' });
    setShowAdd(false);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if(editingGoal && onEdit) {
        onEdit(editingGoal);
        setEditingGoal(null);
    }
  };

  const handleDepositSubmit = () => {
    if (depositAmount <= 0 || !selectedAccountId || !depositModal) return;
    
    // Atualiza a meta
    onUpdate(goals.map(g => g.id === depositModal.goalId ? { 
      ...g, 
      current_amount: g.current_amount + depositAmount,
      updated_at: new Date().toISOString()
    } : g));
    
    // Aciona a lógica de transação (débito da conta)
    onDeposit(depositAmount, selectedAccountId, depositModal.goalTitle);
    
    // Limpa estado
    setDepositModal(null);
    setDepositAmount(0);
    setSelectedAccountId('');
  };

  const removeGoal = (id: string) => {
    if(confirm('Deseja realmente remover esta meta?')) {
        onUpdate(goals.filter(g => g.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-[#212529] dark:text-white uppercase tracking-tighter">Grandes Sonhos</h2>
          <p className="text-[#4e545a] dark:text-slate-600 text-xs font-bold uppercase tracking-widest">Acompanhe sua evolução financeira</p>
        </div>
        <button 
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/20"
        >
          <Plus className="w-4 h-4" /> Criar Meta
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {goals.map((goal) => {
          const progress = (goal.current_amount / goal.target_amount) * 100;
          const remaining = Math.max(0, goal.target_amount - goal.current_amount);
          
          // Cálculo de Depósito Diário Recomendado
          const today = new Date();
          const deadlineDate = goal.deadline ? parseLocalDate(goal.deadline) : today;
          
          // Diferença em dias (evitar divisão por zero se for hoje)
          const diffTime = deadlineDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
          
          let dailyRecommendation = 0;
          if (remaining > 0 && diffDays > 0) {
            dailyRecommendation = remaining / diffDays;
          }

          return (
            <div key={goal.id} className="bg-white dark:bg-[#0a0c14] p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-xl dark:shadow-none flex gap-6 group relative overflow-hidden">
              <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 flex gap-2 transition-all z-10">
                <button 
                    onClick={() => setEditingGoal(goal)}
                    className="p-2 text-[#4e545a] dark:text-slate-700 hover:text-indigo-500 transition-all bg-white dark:bg-black/20 rounded-full"
                >
                    <Edit2 className="w-4 h-4" />
                </button>
                <button 
                    onClick={() => removeGoal(goal.id)}
                    className="p-2 text-[#4e545a] dark:text-slate-700 hover:text-rose-500 transition-all bg-white dark:bg-black/20 rounded-full"
                >
                    <X className="w-5 h-5" />
                </button>
              </div>

              <div className="hidden sm:flex flex-col items-center justify-center bg-indigo-600/10 w-24 rounded-[1.5rem] p-4 border border-indigo-600/20">
                <Trophy className="w-8 h-8 text-indigo-600 dark:text-indigo-400 mb-2" />
                <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400">{progress.toFixed(0)}%</span>
              </div>
              
              <div className="flex-1 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-black text-[#212529] dark:text-white tracking-tight">{goal.title}</h3>
                    <div className="flex items-center gap-2 text-[#4e545a] dark:text-slate-600 text-[10px] font-bold uppercase tracking-widest mt-1">
                      <Calendar className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />
                      {goal.deadline ? formatDisplayDate(goal.deadline) : 'Sem prazo'}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-[#4e545a] dark:text-slate-600 font-black uppercase">Faltam</p>
                    <p className="font-black text-rose-500 dark:text-rose-400 text-lg">R$ {formatCurrency(remaining)}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="w-full bg-slate-100 dark:bg-slate-900 h-3 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-600 h-full transition-all duration-1000 ease-out"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                    <span className="text-[#4e545a] dark:text-slate-600">R$ {formatCurrency(goal.current_amount)} acumulado</span>
                    <span className="text-[#212529] dark:text-slate-200">Alvo: R$ {formatCurrency(goal.target_amount)}</span>
                  </div>
                </div>

                {/* Recomendação Diária */}
                {dailyRecommendation > 0 && (
                   <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-xl flex items-center justify-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                        Recomendação: Economizar <strong className="font-black">R$ {dailyRecommendation.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / dia</strong>
                      </span>
                   </div>
                )}
                {remaining > 0 && diffDays <= 0 && (
                   <div className="bg-rose-500/10 border border-rose-500/20 p-2 rounded-xl text-center">
                      <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wide">Prazo Expirado</span>
                   </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={() => setDepositModal({ goalId: goal.id, goalTitle: goal.title })}
                    className="flex-1 py-3 bg-slate-50 dark:bg-white/5 text-[#212529] dark:text-slate-200 border border-slate-200 dark:border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all flex items-center justify-center gap-2"
                  >
                    <ArrowUpRight className="w-4 h-4" /> Realizar Aporte
                  </button>
                  <button 
                    onClick={() => setDetailsModal(goal)}
                    className="px-4 py-3 bg-slate-50 dark:bg-white/5 text-[#212529] dark:text-slate-200 border border-slate-200 dark:border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all flex items-center justify-center gap-2"
                  >
                    <History className="w-4 h-4" /> Detalhes
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {goals.length === 0 && (
          <div className="lg:col-span-2 text-center py-20 bg-slate-100 dark:bg-slate-900/20 rounded-3xl border border-dashed border-slate-300 dark:border-white/10">
            <p className="text-[#4e545a] dark:text-slate-700 font-black uppercase text-xs tracking-[0.2em]">Nenhuma meta ativa</p>
          </div>
        )}
      </div>

      {/* Modal Criar Meta */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/90 backdrop-blur-md">
          <div className="bg-white dark:bg-[#1e293b] rounded-[2.5rem] w-full max-w-sm p-10 border border-slate-200 dark:border-white/10 shadow-2xl animate-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black text-[#212529] dark:text-white uppercase tracking-tighter">Novo Sonho</h3>
              <button onClick={() => setShowAdd(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full"><X className="w-6 h-6 text-[#4e545a] dark:text-slate-600" /></button>
            </div>
            <form onSubmit={handleAdd} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#4e545a] dark:text-slate-700 uppercase tracking-widest ml-1">Descrição do Sonho</label>
                <input required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[#212529] dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" value={newGoal.title} onChange={e => setNewGoal({...newGoal, title: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#4e545a] dark:text-slate-700 uppercase tracking-widest ml-1">Meta Financeira R$</label>
                <input type="number" required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[#212529] dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" value={newGoal.target_amount || ''} onChange={e => setNewGoal({...newGoal, target_amount: parseFloat(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#4e545a] dark:text-slate-700 uppercase tracking-widest ml-1">Prazo Estimado</label>
                <input type="date" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[#212529] dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" value={newGoal.deadline} onChange={e => setNewGoal({...newGoal, deadline: e.target.value})} />
              </div>
              <button type="submit" className="w-full py-4 bg-indigo-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl">Ativar Sonho</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Meta */}
      {editingGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/90 backdrop-blur-md">
          <div className="bg-white dark:bg-[#1e293b] rounded-[2.5rem] w-full max-w-sm p-10 border border-slate-200 dark:border-white/10 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black text-[#212529] dark:text-white uppercase tracking-tighter">Editar Sonho</h3>
              <button onClick={() => setEditingGoal(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full"><X className="w-6 h-6 text-[#4e545a] dark:text-slate-600" /></button>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#4e545a] dark:text-slate-700 uppercase tracking-widest ml-1">Descrição</label>
                <input required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[#212529] dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" value={editingGoal.title} onChange={e => setEditingGoal({...editingGoal, title: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#4e545a] dark:text-slate-700 uppercase tracking-widest ml-1">Meta R$</label>
                <input type="number" required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[#212529] dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" value={editingGoal.target_amount} onChange={e => setEditingGoal({...editingGoal, target_amount: parseFloat(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#4e545a] dark:text-slate-700 uppercase tracking-widest ml-1">Prazo</label>
                <input type="date" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[#212529] dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" value={editingGoal.deadline || ''} onChange={e => setEditingGoal({...editingGoal, deadline: e.target.value})} />
              </div>
              <button type="submit" className="w-full py-4 bg-indigo-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl">Salvar Alterações</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Aporte */}
      {depositModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/90 backdrop-blur-md">
          <div className="bg-white dark:bg-[#1e293b] rounded-[2.5rem] w-full max-w-sm p-10 border border-slate-200 dark:border-white/10 shadow-2xl animate-in zoom-in-95">
             <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-black text-[#212529] dark:text-white uppercase tracking-tighter">Aportar na Meta</h3>
                  <p className="text-[#4e545a] dark:text-slate-600 text-[10px] uppercase font-bold">{depositModal.goalTitle}</p>
                </div>
                <button onClick={() => setDepositModal(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full"><X className="w-5 h-5 text-[#4e545a] dark:text-slate-600" /></button>
             </div>
             
             <div className="space-y-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-[#4e545a] dark:text-slate-700 uppercase tracking-widest ml-1">Valor do Aporte R$</label>
                   <input 
                      type="number" 
                      className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[#212529] dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 text-lg font-bold"
                      value={depositAmount || ''}
                      onChange={e => setDepositAmount(parseFloat(e.target.value))}
                      placeholder="0.00"
                   />
                </div>
                
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-[#4e545a] dark:text-slate-700 uppercase tracking-widest ml-1">Sair de qual Conta?</label>
                   <div className="grid grid-cols-1 gap-2">
                      {accounts.map(p => (
                        <button 
                          key={p.id}
                          type="button"
                          onClick={() => setSelectedAccountId(p.id)}
                          className={`flex justify-between items-center p-3 rounded-xl border transition-all ${selectedAccountId === p.id ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-[#4e545a] dark:text-slate-500 hover:border-indigo-500/50'}`}
                        >
                          <span className="text-xs font-bold">{p.name}</span>
                          <span className="text-xs">R$ {formatCurrency(p.current_balance)}</span>
                        </button>
                      ))}
                   </div>
                </div>

                <button 
                  onClick={handleDepositSubmit}
                  className="w-full py-4 bg-emerald-500 text-emerald-950 font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl hover:bg-emerald-400 transition-all"
                >
                  Confirmar Aporte
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Modal Detalhes do Histórico */}
      {detailsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/90 backdrop-blur-md">
          <div className="bg-white dark:bg-[#1e293b] rounded-[2.5rem] w-full max-w-md p-10 border border-slate-200 dark:border-white/10 shadow-2xl animate-in zoom-in-95">
             <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-black text-[#212529] dark:text-white uppercase tracking-tighter">Histórico de Aportes</h3>
                  <p className="text-[#4e545a] dark:text-slate-600 text-[10px] uppercase font-bold">{detailsModal.title}</p>
                </div>
                <button onClick={() => setDetailsModal(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full"><X className="w-5 h-5 text-[#4e545a] dark:text-slate-600" /></button>
             </div>
             
             <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar text-center py-10">
                 <p className="text-[#4e545a] dark:text-slate-700 font-black uppercase text-[10px] tracking-widest">Aguardando implementação do histórico sincronizado</p>
             </div>

             <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/5 flex justify-between items-center">
                <div>
                  <p className="text-[9px] text-[#4e545a] dark:text-slate-600 font-black uppercase">Total Acumulado</p>
                  <p className="text-lg font-black text-[#212529] dark:text-white">R$ {formatCurrency(detailsModal.current_amount)}</p>
                </div>
                <button 
                  onClick={() => setDetailsModal(null)}
                  className="px-6 py-3 bg-indigo-600 text-white font-black uppercase text-[10px] tracking-widest rounded-xl shadow-lg"
                >
                  Fechar
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
