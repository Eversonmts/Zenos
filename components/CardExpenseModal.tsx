import React, { useState, useMemo } from 'react';
import { X, CreditCard as CardIcon } from 'lucide-react';
import { CreditCard, Debt, Category, Subcategory } from '../types';
import { calculateInstallmentDueDates, formatCurrency, formatDisplayDate } from '../lib/utils';

interface CardExpenseModalProps {
  cards: CreditCard[];
  categories: Category[];
  subcategories: Subcategory[];
  onClose: () => void;
  onSubmit: (debts: Debt[]) => void;
  userId: string;
}

export default function CardExpenseModal({ cards, categories, subcategories, onClose, onSubmit, userId }: CardExpenseModalProps) {
  const [cardId, setCardId] = useState(cards[0]?.id || '');
  const [description, setDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [installments, setInstallments] = useState(1);
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');

  const debtCategories = categories.filter(c => c.type === 'debt');
  const availableSubcategories = subcategories.filter(s => s.category_id === categoryId);

  const selectedCard = cards.find(c => c.id === cardId);

  const preview = useMemo(() => {
    if (!selectedCard || !totalAmount) return [];
    const dueDates = calculateInstallmentDueDates(purchaseDate, selectedCard.closing_day, selectedCard.due_day, installments);
    const perInstallment = Math.round((totalAmount / installments) * 100) / 100;
    return dueDates.map((d, i) => ({ date: d, amount: perInstallment, index: i + 1 }));
  }, [selectedCard, totalAmount, installments, purchaseDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCard || !description.trim() || totalAmount <= 0) return;

    let allocated = 0;
    const debts: Debt[] = preview.map((p, idx) => {
      const isLast = idx === preview.length - 1;
      const amount = isLast ? Math.round((totalAmount - allocated) * 100) / 100 : p.amount;
      allocated += amount;
      return {
        id: crypto.randomUUID(),
        user_id: userId,
        description: installments > 1 ? `${description.trim()} (${p.index}/${installments})` : description.trim(),
        total_amount: amount,
        paid_amount: 0,
        due_date: p.date.toISOString().split('T')[0],
        status: 'active',
        installments: installments,
        installment_number: p.index,
        card_id: selectedCard.id,
        category_id: categoryId || null,
        subcategory_id: subcategoryId || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Debt;
    });

    onSubmit(debts);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-white dark:bg-[#1e293b] rounded-[3rem] w-full max-w-lg p-8 border border-slate-200 dark:border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-2xl"><CardIcon className="w-6 h-6 text-indigo-500" /></div>
            <h3 className="text-xl font-black text-[#212529] dark:text-white uppercase tracking-tighter">Gasto no Cartão</h3>
          </div>
          <button onClick={onClose}><X className="text-slate-400 hover:text-white" /></button>
        </div>

        {cards.length === 0 ? (
          <p className="text-sm text-slate-500 py-10 text-center">Você ainda não cadastrou nenhum cartão. Vá em "Cartões" no menu para adicionar um.</p>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-[#4e545a] dark:text-slate-600 uppercase tracking-widest ml-1">Cartão</label>
            <select required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[#212529] dark:text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={cardId} onChange={e => setCardId(e.target.value)}>
              {cards.map(c => <option key={c.id} value={c.id}>{c.name} {c.last_4_digits ? `•••• ${c.last_4_digits}` : ''}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-[#4e545a] dark:text-slate-600 uppercase tracking-widest ml-1">Descrição</label>
            <input required className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[#212529] dark:text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Compras no mercado" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[#4e545a] dark:text-slate-600 uppercase tracking-widest ml-1">Categoria</label>
              <select className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[#212529] dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" value={categoryId} onChange={e => { setCategoryId(e.target.value); setSubcategoryId(''); }}>
                <option value="">Sem categoria</option>
                {debtCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[#4e545a] dark:text-slate-600 uppercase tracking-widest ml-1">Subcategoria</label>
              <select disabled={!categoryId} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[#212529] dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50" value={subcategoryId} onChange={e => setSubcategoryId(e.target.value)}>
                <option value="">Nenhuma</option>
                {availableSubcategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[#4e545a] dark:text-slate-600 uppercase tracking-widest ml-1">Valor Total</label>
              <input required type="number" step="0.01" min="0.01" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[#212529] dark:text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={totalAmount || ''} onChange={e => setTotalAmount(parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[#4e545a] dark:text-slate-600 uppercase tracking-widest ml-1">Parcelas</label>
              <input required type="number" min="1" max="24" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[#212529] dark:text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={installments} onChange={e => setInstallments(Math.max(1, parseInt(e.target.value) || 1))} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-[#4e545a] dark:text-slate-600 uppercase tracking-widest ml-1">Data da Compra</label>
            <input required type="date" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[#212529] dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} />
          </div>

          {preview.length > 0 && (
            <div className="p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl space-y-1.5 max-h-40 overflow-y-auto">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2">Prévia das faturas</p>
              {preview.map(p => (
                <div key={p.index} className="flex justify-between text-xs">
                  <span className="text-slate-500">Parcela {p.index}/{installments} · vence {formatDisplayDate(p.date.toISOString())}</span>
                  <span className="font-bold text-[#212529] dark:text-white">{formatCurrency(p.amount)}</span>
                </div>
              ))}
            </div>
          )}

          <button type="submit" className="w-full py-5 bg-indigo-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl hover:bg-indigo-500 transition-all">
            Lançar Gasto no Cartão
          </button>
        </form>
        )}
      </div>
    </div>
  );
}
