
import React, { useState } from 'react';
import { Plus, X, Smile, Meh, Frown, Zap, Coffee, Calendar, Trash2, Heart, Search } from 'lucide-react';
import { JournalEntry } from '../types';

interface JournalProps {
  entries: JournalEntry[];
  onAdd: (e: JournalEntry) => void;
  onDelete: (id: string) => void;
}

export default function Journal({ entries, onAdd, onDelete }: JournalProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newEntry, setNewEntry] = useState<Partial<JournalEntry>>({
    title: '', content: '', mood: 'happy', date: new Date().toISOString().split('T')[0]
  });

  const moods = [
    { id: 'happy', icon: Smile, label: 'Feliz', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { id: 'neutral', icon: Meh, label: 'Neutro', color: 'text-slate-500', bg: 'bg-slate-500/10' },
    { id: 'sad', icon: Frown, label: 'Triste', color: 'text-rose-500', bg: 'bg-rose-500/10' },
    { id: 'productive', icon: Zap, label: 'Produtivo', color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { id: 'tired', icon: Coffee, label: 'Cansado', color: 'text-indigo-500', bg: 'bg-indigo-500/10' }
  ];

  const filteredEntries = entries.filter(e => 
    e.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.content.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntry.title || !newEntry.content) return;
    onAdd({
      ...newEntry as JournalEntry,
      id: Math.random().toString(36).substr(2, 9),
      created_at: new Date().toISOString()
    });
    setShowAddModal(false);
    setNewEntry({ title: '', content: '', mood: 'happy', date: new Date().toISOString().split('T')[0] });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-[#212529] dark:text-white uppercase tracking-tighter">Diário de Bordo</h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{entries.length} registros no histórico</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20">
          <Plus className="w-5 h-5" /> Novo Registro
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input 
          type="text" 
          placeholder="Refletir sobre o passado..." 
          className="w-full pl-12 pr-6 py-4 bg-white dark:bg-[#111827]/60 border border-slate-200 dark:border-white/5 rounded-[2rem] text-sm text-[#212529] dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-6 relative before:absolute before:left-8 before:top-4 before:bottom-4 before:w-px before:bg-slate-200 dark:before:bg-white/5">
        {filteredEntries.map(entry => {
          const mood = moods.find(m => m.id === entry.mood) || moods[1];
          return (
            <div key={entry.id} className="relative pl-16 group">
              <div className={`absolute left-[26px] top-6 w-3 h-3 rounded-full border-2 border-slate-50 dark:border-[#030712] z-10 ${mood.bg.replace('/10', '')} ring-4 ring-slate-100 dark:ring-white/5`} />
              
              <div className="bg-white dark:bg-[#111827]/60 backdrop-blur-md border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-6 group hover:border-indigo-500/30 transition-all shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${mood.bg} ${mood.color}`}>
                      <mood.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-black text-[#212529] dark:text-white text-lg tracking-tight">{entry.title}</h4>
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#4e545a] dark:text-slate-600 flex items-center gap-2">
                        <Calendar className="w-3 h-3" /> {new Date(entry.date).toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => onDelete(entry.id)} className="p-2 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <p className="text-[#4e545a] dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{entry.content}</p>
                
                <div className="mt-6 flex items-center gap-2">
                  <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${mood.bg} ${mood.color}`}>
                    Sentimento: {mood.label}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {filteredEntries.length === 0 && (
          <div className="ml-16 py-20 bg-slate-50 dark:bg-slate-900/20 rounded-[3rem] border border-dashed border-slate-200 dark:border-white/10 text-center">
            <Heart className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
            <p className="text-[#4e545a] dark:text-slate-700 font-black uppercase text-xs tracking-[0.2em]">O diário está em silêncio. Que tal começar a escrever?</p>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-white dark:bg-[#1e293b] rounded-[3rem] w-full max-w-lg p-10 border border-slate-200 dark:border-white/10 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black text-[#212529] dark:text-white uppercase tracking-tighter">Novo Momento</h3>
              <button onClick={() => setShowAddModal(false)}><X className="text-slate-400 hover:text-white" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#4e545a] dark:text-slate-600 uppercase tracking-widest ml-1">Como resumiria este momento?</label>
                <input required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[#212529] dark:text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={newEntry.title} onChange={e => setNewEntry({...newEntry, title: e.target.value})} placeholder="Título da entrada" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#4e545a] dark:text-slate-600 uppercase tracking-widest ml-1">Explore seus pensamentos</label>
                <textarea required rows={5} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[2rem] text-[#212529] dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 resize-none" value={newEntry.content} onChange={e => setNewEntry({...newEntry, content: e.target.value})} placeholder="Escreva aqui..." />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#4e545a] dark:text-slate-600 uppercase tracking-widest ml-1">Humor</label>
                  <div className="flex justify-between p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl">
                    {moods.map(m => (
                      <button key={m.id} type="button" onClick={() => setNewEntry({...newEntry, mood: m.id as any})} className={`p-3 rounded-xl transition-all ${newEntry.mood === m.id ? `${m.bg} ${m.color} scale-110 shadow-lg shadow-black/5 ring-2 ring-indigo-500/20` : 'text-slate-400'}`}>
                        <m.icon className="w-6 h-6" />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#4e545a] dark:text-slate-600 uppercase tracking-widest ml-1">Data</label>
                  <input type="date" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[#212529] dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" value={newEntry.date} onChange={e => setNewEntry({...newEntry, date: e.target.value})} />
                </div>
              </div>

              <button type="submit" className="w-full py-5 bg-indigo-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl hover:bg-indigo-500 transition-all">
                Registrar no Diário
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
