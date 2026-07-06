
import React, { useState } from 'react';
import { Plus, CheckCircle2, Circle, Clock, Tag, X, Trash2, Calendar, AlertCircle } from 'lucide-react';
import { Task } from '../types';

interface TasksProps {
  tasks: Task[];
  onAdd: (t: Task) => void;
  onUpdate: (t: Task) => void;
  onDelete: (id: string) => void;
}

export default function Tasks({ tasks, onAdd, onUpdate, onDelete }: TasksProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTask, setNewTask] = useState<Partial<Task>>({
    title: '', priority: 'medium', status: 'pending', category: 'Geral',
    due_date: new Date().toISOString().split('T')[0]
  });

  const categories = ['Financeiro', 'Pessoal', 'Trabalho', 'Saúde', 'Estudo', 'Geral'];
  const priorities = [
    { id: 'low', label: 'Baixa', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { id: 'medium', label: 'Média', color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { id: 'high', label: 'Alta', color: 'text-rose-500', bg: 'bg-rose-500/10' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title) return;
    onAdd({
      ...newTask as Task,
      id: Math.random().toString(36).substr(2, 9),
      created_at: new Date().toISOString()
    });
    setShowAddModal(false);
    setNewTask({ title: '', priority: 'medium', status: 'pending', category: 'Geral', due_date: new Date().toISOString().split('T')[0] });
  };

  const toggleStatus = (task: Task) => {
    onUpdate({ ...task, status: task.status === 'completed' ? 'pending' : 'completed' });
  };

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-[#212529] dark:text-white uppercase tracking-tighter">Gerenciar Atividades</h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{pendingTasks.length} tarefas pendentes</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20">
          <Plus className="w-5 h-5" /> Adicionar
        </button>
      </div>

      <div className="space-y-4">
        {pendingTasks.map(task => (
          <div key={task.id} className="bg-white dark:bg-[#111827]/60 backdrop-blur-md border border-slate-200 dark:border-white/5 rounded-3xl p-4 flex items-center gap-4 group hover:border-indigo-500/30 transition-all shadow-sm">
            <button onClick={() => toggleStatus(task)} className="text-slate-400 hover:text-indigo-500 transition-colors">
              <Circle className="w-6 h-6" />
            </button>
            <div className="flex-1">
              <h4 className="font-bold text-[#212529] dark:text-white text-sm tracking-tight">{task.title}</h4>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-[#4e545a] dark:text-slate-600 flex items-center gap-1">
                  <Tag className="w-3 h-3" /> {task.category}
                </span>
                <span className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1 ${priorities.find(p => p.id === task.priority)?.color}`}>
                  <AlertCircle className="w-3 h-3" /> {priorities.find(p => p.id === task.priority)?.label}
                </span>
                {task.due_date && (
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {new Date(task.due_date).toLocaleDateString('pt-BR')}
                  </span>
                )}
              </div>
            </div>
            <button onClick={() => onDelete(task.id)} className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-rose-500 transition-all">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}

        {pendingTasks.length === 0 && (
          <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/20 rounded-[3rem] border border-dashed border-slate-200 dark:border-white/10">
            <CheckCircle2 className="w-12 h-12 text-emerald-500/20 mx-auto mb-4" />
            <p className="text-[#4e545a] dark:text-slate-700 font-black uppercase text-xs tracking-widest">Tudo pronto! Nenhuma tarefa pendente.</p>
          </div>
        )}

        {completedTasks.length > 0 && (
          <div className="pt-6">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Concluídas ({completedTasks.length})</h3>
            <div className="space-y-3 opacity-60">
              {completedTasks.map(task => (
                <div key={task.id} className="bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-2xl p-4 flex items-center gap-4">
                  <button onClick={() => toggleStatus(task)} className="text-emerald-500">
                    <CheckCircle2 className="w-6 h-6" />
                  </button>
                  <span className="font-bold text-[#4e545a] dark:text-slate-500 text-sm line-through decoration-2 decoration-rose-500/30">{task.title}</span>
                  <button onClick={() => onDelete(task.id)} className="ml-auto p-2 text-slate-400 hover:text-rose-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-white dark:bg-[#1e293b] rounded-[2.5rem] w-full max-w-sm p-10 border border-slate-200 dark:border-white/10 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black text-[#212529] dark:text-white uppercase tracking-tighter">Registrar Atividade</h3>
              <button onClick={() => setShowAddModal(false)}><X className="text-slate-400 hover:text-white" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#4e545a] dark:text-slate-600 uppercase tracking-widest ml-1">Título</label>
                <input required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[#212529] dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} placeholder="O que precisa ser feito?" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#4e545a] dark:text-slate-600 uppercase tracking-widest ml-1">Prioridade</label>
                  <select className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[#212529] dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" value={newTask.priority} onChange={e => setNewTask({...newTask, priority: e.target.value as any})}>
                    {priorities.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#4e545a] dark:text-slate-600 uppercase tracking-widest ml-1">Vencimento</label>
                  <input type="date" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[#212529] dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 text-xs" value={newTask.due_date || ''} onChange={e => setNewTask({...newTask, due_date: e.target.value})} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#4e545a] dark:text-slate-600 uppercase tracking-widest ml-1">Categoria</label>
                <div className="flex flex-wrap gap-2">
                  {categories.map(cat => (
                    <button type="button" key={cat} onClick={() => setNewTask({...newTask, category: cat})} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${newTask.category === cat ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-white/5'}`}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" className="w-full py-4 bg-indigo-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl hover:bg-indigo-500 transition-all">
                Salvar Atividade
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
