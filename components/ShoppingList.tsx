import React, { useState } from 'react';
import { ShoppingCart, Plus, Trash2, CheckCircle2, Circle, ShoppingBag, X } from 'lucide-react';
import { ShoppingItem } from '../types';

interface ShoppingListProps {
  items: ShoppingItem[];
  onAddItem: (name: string, quantity?: string) => void;
  onToggleItem: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onClearCompleted: () => void;
}

export default function ShoppingList({
  items,
  onAddItem,
  onToggleItem,
  onDeleteItem,
  onClearCompleted
}: ShoppingListProps) {
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    onAddItem(newItemName.trim(), newItemQty.trim() || undefined);
    setNewItemName('');
    setNewItemQty('');
  };

  const pendingItems = items.filter(item => !item.completed);
  const completedItems = items.filter(item => item.completed);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-[#212529] dark:text-white uppercase tracking-tighter">Lista de Compras</h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">
            {pendingItems.length} item(ns) pendente(s) · {completedItems.length} adquirido(s)
          </p>
        </div>
        {completedItems.length > 0 && (
          <button 
            onClick={onClearCompleted}
            className="px-4 py-2 border border-rose-500/20 hover:bg-rose-500 hover:text-white text-rose-500 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all"
          >
            Limpar Adquiridos
          </button>
        )}
      </div>

      {/* Formulário de Inclusão Rápida */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-[#111827]/60 border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-6 flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input 
            type="text"
            placeholder="O que você precisa comprar? (Ex: Açúcar)"
            className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-2xl text-xs outline-none text-slate-800 dark:text-white font-bold"
            value={newItemName}
            onChange={e => setNewItemName(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-44">
          <input 
            type="text"
            placeholder="Qtd / Obs (Ex: 2 pacotes)"
            className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-2xl text-xs outline-none text-slate-800 dark:text-white font-bold"
            value={newItemQty}
            onChange={e => setNewItemQty(e.target.value)}
          />
        </div>
        <button 
          type="submit"
          className="px-6 py-3.5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-750 transition-all flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/10"
        >
          <Plus className="w-5 h-5" /> Adicionar
        </button>
      </form>

      {/* Listagem dos Itens */}
      {items.length === 0 ? (
        <div className="py-20 text-center bg-white dark:bg-[#111827]/60 border border-slate-200 dark:border-white/5 rounded-[2.5rem] space-y-4">
          <ShoppingCart className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
          <div className="space-y-1">
            <p className="text-[#4e545a] dark:text-slate-400 font-black uppercase text-xs tracking-widest">Sua lista está vazia</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider max-w-xs mx-auto leading-relaxed">
              Adicione itens manualmente acima ou fale com a IA: "Zenos, coloque açúcar na lista de compras".
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pendentes */}
          {pendingItems.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">Pendentes</h3>
              <div className="bg-white dark:bg-[#111827]/60 border border-slate-200 dark:border-white/5 rounded-[2.5rem] overflow-hidden divide-y divide-slate-100 dark:divide-white/5">
                {pendingItems.map(item => (
                  <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                    <button 
                      onClick={() => onToggleItem(item.id)}
                      className="flex items-center gap-3.5 flex-1 text-left"
                    >
                      <Circle className="w-5 h-5 text-slate-400 flex-shrink-0" />
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">{item.name}</p>
                        {item.quantity && (
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{item.quantity}</p>
                        )}
                      </div>
                    </button>
                    <button 
                      onClick={() => onDeleteItem(item.id)}
                      className="p-2 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-rose-500/5 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Adquiridos */}
          {completedItems.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">Adquiridos</h3>
              <div className="bg-white dark:bg-[#111827]/60 border border-slate-200 dark:border-white/5 rounded-[2.5rem] overflow-hidden divide-y divide-slate-100 dark:divide-white/5">
                {completedItems.map(item => (
                  <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors bg-slate-50/40 dark:bg-slate-900/10">
                    <button 
                      onClick={() => onToggleItem(item.id)}
                      className="flex items-center gap-3.5 flex-1 text-left opacity-60"
                    >
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                      <div>
                        <p className="font-bold text-slate-500 dark:text-slate-400 text-sm line-through">{item.name}</p>
                        {item.quantity && (
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{item.quantity}</p>
                        )}
                      </div>
                    </button>
                    <button 
                      onClick={() => onDeleteItem(item.id)}
                      className="p-2 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-rose-500/5 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
