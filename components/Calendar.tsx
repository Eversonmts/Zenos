import React, { useState, useMemo } from 'react';
import { Plus, X, Trash2, ChevronLeft, ChevronRight, CalendarDays, Clock } from 'lucide-react';
import { CalendarEvent } from '../types';

interface CalendarProps {
  events: CalendarEvent[];
  onAdd: (e: CalendarEvent) => void;
  onDelete: (id: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  pessoal: '#6366F1',
  trabalho: '#F59E0B',
  financeiro: '#10B981',
  saude: '#EF4444',
  outro: '#64748B',
};

export default function CalendarView({ events, onAdd, onDelete }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEvent, setNewEvent] = useState<Partial<CalendarEvent>>({
    title: '', description: '', category: 'pessoal', color: CATEGORY_COLORS.pessoal
  });

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach(ev => {
      const day = ev.start_date?.split('T')[0];
      if (!day) return;
      if (!map[day]) map[day] = [];
      map[day].push(ev);
    });
    return map;
  }, [events]);

  const selectedDayEvents = (eventsByDay[selectedDate] || []).sort((a, b) => a.start_date.localeCompare(b.start_date));

  const goToPrevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const goToNextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title) return;

    const time = (newEvent as any)._time || '09:00';
    const startDate = `${selectedDate}T${time}:00`;

    onAdd({
      id: crypto.randomUUID(),
      title: newEvent.title,
      description: newEvent.description || '',
      start_date: startDate,
      end_date: startDate,
      category: newEvent.category || 'pessoal',
      color: newEvent.color || CATEGORY_COLORS.pessoal,
    } as CalendarEvent);

    setShowAddModal(false);
    setNewEvent({ title: '', description: '', category: 'pessoal', color: CATEGORY_COLORS.pessoal });
  };

  const monthLabel = currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-[#212529] dark:text-white uppercase tracking-tighter">Calendário</h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{events.length} compromissos no total</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20">
          <Plus className="w-5 h-5" /> Novo Evento
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Month grid */}
        <div className="lg:col-span-2 bg-white dark:bg-[#111827]/60 border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-6">
          <div className="flex items-center justify-between mb-6">
            <button onClick={goToPrevMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full">
              <ChevronLeft className="w-5 h-5 text-slate-500" />
            </button>
            <h3 className="font-black text-[#212529] dark:text-white uppercase tracking-tight capitalize">{monthLabel}</h3>
            <button onClick={goToNextMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full">
              <ChevronRight className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
              <div key={i} className="text-center text-[9px] font-black uppercase tracking-widest text-slate-400 py-2">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`empty-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayEvents = eventsByDay[dateStr] || [];
              const isSelected = dateStr === selectedDate;
              const isToday = dateStr === todayStr;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-1 transition-all relative ${
                    isSelected ? 'bg-indigo-600 text-white' : isToday ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'hover:bg-slate-100 dark:hover:bg-white/5 text-[#212529] dark:text-slate-300'
                  }`}
                >
                  <span className="text-xs font-bold">{day}</span>
                  {dayEvents.length > 0 && (
                    <div className="flex gap-0.5">
                      {dayEvents.slice(0, 3).map((ev, idx) => (
                        <span key={idx} className="w-1 h-1 rounded-full" style={{ backgroundColor: isSelected ? '#fff' : ev.color || '#6366F1' }} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected day agenda */}
        <div className="bg-white dark:bg-[#111827]/60 border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-6">
          <div className="flex items-center gap-2 mb-6">
            <CalendarDays className="w-5 h-5 text-indigo-500" />
            <h3 className="font-black text-[#212529] dark:text-white text-sm uppercase tracking-tight">
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>
          </div>

          <div className="space-y-3">
            {selectedDayEvents.length === 0 && (
              <div className="py-12 text-center">
                <CalendarDays className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                <p className="text-[#4e545a] dark:text-slate-700 font-black uppercase text-[10px] tracking-[0.2em]">Nenhum evento neste dia</p>
              </div>
            )}
            {selectedDayEvents.map(ev => (
              <div key={ev.id} className="p-4 rounded-2xl border border-slate-200 dark:border-white/5 group hover:border-indigo-500/30 transition-all" style={{ borderLeftWidth: 4, borderLeftColor: ev.color || '#6366F1' }}>
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <p className="font-bold text-sm text-[#212529] dark:text-white">{ev.title}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3" /> {ev.start_date?.split('T')[1]?.slice(0, 5) || '--:--'}
                    </p>
                    {ev.description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{ev.description}</p>}
                  </div>
                  <button onClick={() => onDelete(ev.id)} className="p-1.5 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-white dark:bg-[#1e293b] rounded-[3rem] w-full max-w-lg p-10 border border-slate-200 dark:border-white/10 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black text-[#212529] dark:text-white uppercase tracking-tighter">Novo Evento</h3>
              <button onClick={() => setShowAddModal(false)}><X className="text-slate-400 hover:text-white" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#4e545a] dark:text-slate-600 uppercase tracking-widest ml-1">Título</label>
                <input required autoFocus className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[#212529] dark:text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={newEvent.title} onChange={e => setNewEvent({ ...newEvent, title: e.target.value })} placeholder="Ex: Reunião com o banco" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#4e545a] dark:text-slate-600 uppercase tracking-widest ml-1">Data</label>
                  <input type="date" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[#212529] dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#4e545a] dark:text-slate-600 uppercase tracking-widest ml-1">Hora</label>
                  <input type="time" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[#212529] dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" defaultValue="09:00" onChange={e => setNewEvent({ ...newEvent, ['_time' as any]: e.target.value })} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#4e545a] dark:text-slate-600 uppercase tracking-widest ml-1">Categoria</label>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(CATEGORY_COLORS).map(([key, color]) => (
                    <button key={key} type="button" onClick={() => setNewEvent({ ...newEvent, category: key, color })}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${newEvent.category === key ? 'text-white' : 'text-slate-500 bg-slate-100 dark:bg-slate-900'}`}
                      style={newEvent.category === key ? { backgroundColor: color } : {}}
                    >
                      {key}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#4e545a] dark:text-slate-600 uppercase tracking-widest ml-1">Descrição (opcional)</label>
                <textarea rows={3} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[2rem] text-[#212529] dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 resize-none" value={newEvent.description} onChange={e => setNewEvent({ ...newEvent, description: e.target.value })} placeholder="Detalhes do evento..." />
              </div>

              <button type="submit" className="w-full py-5 bg-indigo-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl hover:bg-indigo-500 transition-all">
                Salvar Evento
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
