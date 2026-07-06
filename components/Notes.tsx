
import React, { useState } from 'react';
import { Plus, X, Search, Trash2, Pin, Tag, Edit3, Grid, List } from 'lucide-react';
import { Note } from '../types';

interface NotesProps {
  notes: Note[];
  onAdd: (n: Note) => void;
  onUpdate: (n: Note) => void;
  onDelete: (id: string) => void;
}

export default function Notes({ notes, onAdd, onUpdate, onDelete }: NotesProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isGridView, setIsGridView] = useState(true);
  const [currentNote, setCurrentNote] = useState<Partial<Note>>({
    title: '', content: '', color: 'indigo', tags: [], is_pinned: false
  });

  const colors = [
    { name: 'indigo', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
    { name: 'emerald', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    { name: 'rose', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
    { name: 'amber', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    { name: 'slate', bg: 'bg-slate-500/10', border: 'border-slate-500/20' }
  ];

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    n.content.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => {
    if (a.is_pinned === b.is_pinned) return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    return a.is_pinned ? -1 : 1;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentNote.title || !currentNote.content) return;
    
    if (currentNote.id) {
      onUpdate({ ...currentNote as Note, updated_at: new Date().toISOString() });
    } else {
      onAdd({
        ...currentNote as Note,
        id: Math.random().toString(36).substr(2, 9),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    setShowModal(false);
    setCurrentNote({ title: '', content: '', color: 'indigo', tags: [], is_pinned: false });
  };

  const togglePin = (note: Note) => {
    onUpdate({ ...note, is_pinned: !note.is_pinned });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#212529] dark:text-white uppercase tracking-tighter">Bloco de Notas</h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{notes.length} anotações arquivadas</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button onClick={() => setIsGridView(!isGridView)} className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl text-slate-500 hover:text-indigo-500 transition-all">
            {isGridView ? <List className="w-5 h-5" /> : <Grid className="w-5 h-5" />}
          </button>
          <button onClick={() => setShowModal(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20">
            <Plus className="w-5 h-5" /> Criar Nota
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input 
          type="text" 
          placeholder="Pesquisar em suas notas..." 
          className="w-full pl-12 pr-6 py-4 bg-white dark:bg-[#111827]/60 border border-slate-200 dark:border-white/5 rounded-[2rem] text-sm text-[#212529] dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className={isGridView ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-4"}>
        {filteredNotes.map(note => (
          <div key={note.id} className={`bg-white dark:bg-[#111827]/60 backdrop-blur-md border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-6 group hover:border-indigo-500/30 transition-all shadow-sm flex flex-col ${!isGridView ? 'flex-row items-center gap-6' : ''}`}>
            <div className="flex justify-between items-start mb-4">
              <div className={`p-2 rounded-xl bg-${note.color}-500/10 text-${note.color}-500`}>
                <Edit3 className="w-5 h-5" />
              </div>
              <div className="flex gap-1">
                <button onClick={() => togglePin(note)} className={`p-2 rounded-full hover:bg-white/50 dark:hover:bg-white/5 transition-all ${note.is_pinned ? 'text-indigo-500' : 'text-slate-400'}`}>
                  <Pin className="w-4 h-4" />
                </button>
                <button onClick={() => onDelete(note.id)} className="p-2 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-hidden" onClick={() => { setCurrentNote(note); setShowModal(true); }}>
              <h4 className="font-black text-[#212529] dark:text-white text-lg tracking-tight mb-2 truncate">{note.title}</h4>
              <p className="text-[#4e545a] dark:text-slate-500 text-sm leading-relaxed line-clamp-3 mb-4">{note.content}</p>
            </div>

            <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100 dark:border-white/5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(note.created_at).toLocaleDateString('pt-BR')}</span>
              <div className="flex gap-1">
                {note.tags.map(tag => (
                  <span key={tag} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5 text-[9px] font-black text-[#6c757d] dark:text-slate-600 uppercase tracking-tighter rounded-md">{tag}</span>
                ))}
              </div>
            </div>
          </div>
        ))}

        {filteredNotes.length === 0 && (
          <div className="lg:col-span-3 text-center py-24 bg-slate-50 dark:bg-slate-900/20 rounded-[3rem] border border-dashed border-slate-200 dark:border-white/10">
            <Search className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
            <p className="text-[#4e545a] dark:text-slate-700 font-black uppercase text-xs tracking-[0.2em]">Nenhuma nota encontrada.</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-white dark:bg-[#1e293b] rounded-[2.5rem] w-full max-w-lg p-10 border border-slate-200 dark:border-white/10 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black text-[#212529] dark:text-white uppercase tracking-tighter">
                {currentNote.id ? 'Editar Nota' : 'Nova Anotação'}
              </h3>
              <button onClick={() => setShowModal(false)}><X className="text-slate-400 hover:text-white" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#4e545a] dark:text-slate-600 uppercase tracking-widest ml-1">Título</label>
                <input required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[#212529] dark:text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={currentNote.title} onChange={e => setCurrentNote({...currentNote, title: e.target.value})} placeholder="Do que se trata?" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#4e545a] dark:text-slate-600 uppercase tracking-widest ml-1">Conteúdo</label>
                <textarea required rows={5} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[2rem] text-[#212529] dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 resize-none" value={currentNote.content} onChange={e => setCurrentNote({...currentNote, content: e.target.value})} placeholder="Suas idéias aqui..." />
              </div>

              <div className="flex gap-3">
                {colors.map(c => (
                  <button key={c.name} type="button" onClick={() => setCurrentNote({...currentNote, color: c.name})} className={`w-8 h-8 rounded-full border-2 transition-all ${c.bg} ${currentNote.color === c.name ? 'border-white ring-2 ring-indigo-500 scale-125' : 'border-black/20'}`} />
                ))}
              </div>

              <button type="submit" className="w-full py-5 bg-indigo-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl hover:bg-indigo-500 transition-all active:scale-95">
                Salvar Anotação
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
