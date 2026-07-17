import React, { useState, useMemo } from 'react';
import { Plus, X, Trash2, Edit2, CreditCard as CardIcon, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { CreditCard, Debt, Account, Profile, Plan } from '../types';
import { formatCurrency, formatDisplayDate } from '../lib/utils';

interface CartoesProps {
  cards: CreditCard[];
  debts: Debt[];
  accounts: Account[];
  userId: string;
  onUpdateCards: (cards: CreditCard[]) => void;
  onDeleteCard: (id: string) => void;
  onPayInvoice: (debtIds: string[], accountId: string, amount: number) => void;
  activeUser: Profile;
  activePlan: Plan | null;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const CARD_COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function Cartoes({ 
  cards, debts, accounts, userId, onUpdateCards, onDeleteCard, onPayInvoice,
  activeUser, activePlan, showToast 
}: CartoesProps) {
  const [showCardModal, setShowCardModal] = useState(false);
  const [editingCard, setEditingCard] = useState<Partial<CreditCard> | null>(null);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [expandedInvoiceKey, setExpandedInvoiceKey] = useState<string | null>(null);
  const [payingInvoice, setPayingInvoice] = useState<{ cardId: string, monthKey: string, debtIds: string[], amount: number } | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState('');

  // Agrupa as dívidas de cada cartão por mês/ano de vencimento = "fatura"
  const invoicesByCard = useMemo(() => {
    const map: Record<string, Record<string, Debt[]>> = {};
    debts.filter(d => d.card_id).forEach(d => {
      if (!d.due_date) return;
      const monthKey = d.due_date.slice(0, 7); // YYYY-MM
      if (!map[d.card_id!]) map[d.card_id!] = {};
      if (!map[d.card_id!][monthKey]) map[d.card_id!][monthKey] = [];
      map[d.card_id!][monthKey].push(d);
    });
    return map;
  }, [debts]);

  const openAddCard = () => {
    // Validação de Limites de Cota de Cartões (Administradores são isentos)
    const maxCards = activePlan?.limits_json?.max_cards || 99;
    if (activeUser.role !== 'admin' && cards.length >= maxCards) {
      showToast(`Limite atingido! O plano ${activePlan?.name || 'Básico'} permite no máximo ${maxCards} cartão(ões). Faça upgrade para desbloquear mais.`, 'error');
      return;
    }

    setEditingCard({ name: '', last_4_digits: '', limit: 0, closing_day: '' as any, due_day: '' as any, color: CARD_COLORS[cards.length % CARD_COLORS.length] });
    setShowCardModal(true);
  };

  const openEditCard = (card: CreditCard) => {
    setEditingCard(card);
    setShowCardModal(true);
  };

  const handleSaveCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCard?.name) return;

    if (editingCard.id) {
      onUpdateCards(cards.map(c => c.id === editingCard.id ? { ...c, ...editingCard } as CreditCard : c));
    } else {
      const newCard: CreditCard = {
        id: crypto.randomUUID(),
        user_id: userId,
        name: editingCard.name!,
        last_4_digits: editingCard.last_4_digits || '',
        limit: editingCard.limit || 0,
        closing_day: Number(editingCard.closing_day) || 1,
        due_day: Number(editingCard.due_day) || 1,
        color: editingCard.color || CARD_COLORS[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      onUpdateCards([...cards, newCard]);
    }
    setShowCardModal(false);
    setEditingCard(null);
  };

  const handleDeleteCard = (id: string) => {
    if (confirm('Excluir este cartão? As parcelas já lançadas continuam em Dívidas.')) {
      onDeleteCard(id);
    }
  };

  const openPayInvoice = (cardId: string, monthKey: string, invoiceDebts: Debt[]) => {
    const pending = invoiceDebts.filter(d => d.status !== 'paid');
    const amount = pending.reduce((s, d) => s + (d.total_amount - d.paid_amount), 0);
    if (amount <= 0) return;
    setPayingInvoice({ cardId, monthKey, debtIds: pending.map(d => d.id), amount });
    setSelectedAccountId(accounts[0]?.id || '');
  };

  const confirmPayInvoice = () => {
    if (!payingInvoice || !selectedAccountId) return;
    onPayInvoice(payingInvoice.debtIds, selectedAccountId, payingInvoice.amount);
    setPayingInvoice(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-[#212529] dark:text-white uppercase tracking-tighter">Cartões</h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{cards.length} cartão(ões) cadastrado(s)</p>
        </div>
        <button onClick={openAddCard} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20">
          <Plus className="w-5 h-5" /> Novo Cartão
        </button>
      </div>

      {cards.length === 0 && (
        <div className="py-20 text-center bg-white dark:bg-[#111827]/60 border border-slate-200 dark:border-white/5 rounded-[2.5rem]">
          <CardIcon className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
          <p className="text-[#4e545a] dark:text-slate-700 font-black uppercase text-xs tracking-widest">Nenhum cartão cadastrado ainda</p>
        </div>
      )}

      <div className="space-y-4">
        {cards.map(card => {
          const cardInvoices = invoicesByCard[card.id] || {};
          const monthKeys = Object.keys(cardInvoices).sort();
          const isExpanded = expandedCardId === card.id;
          const totalOpen = (Object.values(cardInvoices).flat() as Debt[]).filter(d => d.status !== 'paid').reduce((s, d) => s + (d.total_amount - d.paid_amount), 0);

          return (
            <div key={card.id} className="bg-white dark:bg-[#111827]/60 border border-slate-200 dark:border-white/5 rounded-[2.5rem] overflow-hidden">
              <div className="p-6 flex items-center justify-between" style={{ borderLeft: `6px solid ${card.color}` }}>
                <button className="flex items-center gap-4 flex-1 text-left" onClick={() => setExpandedCardId(isExpanded ? null : card.id)}>
                  <div className="p-3 rounded-2xl" style={{ backgroundColor: `${card.color}22` }}>
                    <CardIcon className="w-6 h-6" style={{ color: card.color }} />
                  </div>
                  <div>
                    <p className="font-black text-[#212529] dark:text-white">{card.name} {card.last_4_digits && <span className="text-slate-400 font-normal">•••• {card.last_4_digits}</span>}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Fecha dia {card.closing_day} · Vence dia {card.due_day} · Limite {formatCurrency(card.limit)}
                    </p>
                  </div>
                </button>
                <div className="flex items-center gap-2">
                  <div className="text-right mr-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Em aberto</p>
                    <p className="font-black text-rose-500">{formatCurrency(totalOpen)}</p>
                    <p className="text-[9px] font-bold text-slate-400 mt-0.5">Disponível: <span className="text-emerald-500 font-extrabold">{formatCurrency(card.limit - totalOpen)}</span></p>
                  </div>
                  <button onClick={() => openEditCard(card)} className="p-2 text-slate-400 hover:text-indigo-500"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => handleDeleteCard(card.id)} className="p-2 text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                  <button onClick={() => setExpandedCardId(isExpanded ? null : card.id)} className="p-2 text-slate-400">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="px-6 pb-6 space-y-3 border-t border-slate-200 dark:border-white/5 pt-4">
                  {monthKeys.length === 0 && <p className="text-xs text-slate-500 py-4">Nenhuma fatura ainda.</p>}
                  {monthKeys.map(monthKey => {
                    const invoiceDebts = cardInvoices[monthKey];
                    const total = invoiceDebts.reduce((s, d) => s + d.total_amount, 0);
                    const openAmount = invoiceDebts.filter(d => d.status !== 'paid').reduce((s, d) => s + (d.total_amount - d.paid_amount), 0);
                    const isPaid = openAmount <= 0;
                    const invKey = `${card.id}-${monthKey}`;
                    const [year, month] = monthKey.split('-');
                    const monthLabel = new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

                    return (
                      <div key={monthKey} className="bg-slate-50 dark:bg-white/5 rounded-2xl overflow-hidden">
                        <button onClick={() => setExpandedInvoiceKey(expandedInvoiceKey === invKey ? null : invKey)} className="w-full flex items-center justify-between p-4">
                          <div className="text-left">
                            <p className="text-xs font-black uppercase tracking-widest text-[#212529] dark:text-white capitalize">Fatura {monthLabel}</p>
                            <p className="text-[10px] text-slate-400 font-bold">{invoiceDebts.length} compra(s)</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-sm font-black ${isPaid ? 'text-emerald-500' : 'text-rose-500'}`}>{formatCurrency(total)}</span>
                            {isPaid && <Check className="w-4 h-4 text-emerald-500" />}
                          </div>
                        </button>

                        {expandedInvoiceKey === invKey && (
                          <div className="px-4 pb-4 space-y-2">
                            {invoiceDebts.map(d => (
                              <div key={d.id} className="flex justify-between items-center text-xs px-3 py-2 bg-white dark:bg-slate-900/60 rounded-xl">
                                <span className="text-slate-600 dark:text-slate-300">{d.description}</span>
                                <span className={`font-bold ${d.status === 'paid' ? 'text-emerald-500' : 'text-[#212529] dark:text-white'}`}>{formatCurrency(d.total_amount)}</span>
                              </div>
                            ))}
                            {!isPaid && (
                              <button
                                onClick={() => openPayInvoice(card.id, monthKey, invoiceDebts)}
                                className="w-full mt-2 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-500 transition-all"
                              >
                                Pagar Fatura ({formatCurrency(openAmount)})
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {/* Divisor */}
                  <hr className="border-slate-200 dark:border-white/5 my-4" />
                  
                  {/* Histórico Corrido de Gastos */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest ml-1">Histórico de Gastos</h4>
                    {(() => {
                      const cardDebts = debts.filter(d => d.card_id === card.id);
                      const sortedCardDebts = [...cardDebts].sort((a,b) => b.due_date.localeCompare(a.due_date));
                      if (sortedCardDebts.length === 0) {
                        return <p className="text-xs text-slate-400 dark:text-slate-550 italic py-2 ml-1">Nenhum gasto registrado neste cartão.</p>;
                      }
                      return (
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {sortedCardDebts.map(d => (
                            <div key={d.id} className="flex justify-between items-center text-xs p-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                              <div className="text-left font-bold">
                                <p className="text-[#212529] dark:text-white">{d.description}</p>
                                <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Vence em: {d.due_date ? new Date(d.due_date + 'T12:00:00').toLocaleDateString('pt-BR') : 'Indefinido'}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-black text-[#212529] dark:text-white">{formatCurrency(d.total_amount)}</span>
                                {d.status === 'paid' ? (
                                  <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 rounded text-[8px] font-black uppercase">Pago</span>
                                ) : (
                                  <span className="px-1.5 py-0.5 bg-rose-500/10 text-rose-500 rounded text-[8px] font-black uppercase">Aberto</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal: Adicionar/Editar Cartão */}
      {showCardModal && editingCard && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-white dark:bg-[#1e293b] rounded-[3rem] w-full max-w-md p-8 border border-slate-200 dark:border-white/10 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-[#212529] dark:text-white uppercase tracking-tighter">{editingCard.id ? 'Editar Cartão' : 'Novo Cartão'}</h3>
              <button onClick={() => { setShowCardModal(false); setEditingCard(null); }}><X className="text-slate-400 hover:text-white" /></button>
            </div>
            <form onSubmit={handleSaveCard} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#4e545a] dark:text-slate-600 uppercase tracking-widest ml-1">Nome / Apelido do Cartão</label>
                <input required autoFocus className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[#212529] dark:text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={editingCard.name} onChange={e => setEditingCard({ ...editingCard, name: e.target.value })} placeholder="Ex: Nubank Roxinho" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#4e545a] dark:text-slate-600 uppercase tracking-widest ml-1">Últimos 4 números</label>
                  <input maxLength={4} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[#212529] dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" value={editingCard.last_4_digits || ''} onChange={e => setEditingCard({ ...editingCard, last_4_digits: e.target.value.replace(/\D/g, '') })} placeholder="1234" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#4e545a] dark:text-slate-600 uppercase tracking-widest ml-1">Limite</label>
                  <input required type="number" step="0.01" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[#212529] dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" value={editingCard.limit || ''} onChange={e => setEditingCard({ ...editingCard, limit: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#4e545a] dark:text-slate-600 uppercase tracking-widest ml-1">Melhor dia de compra</label>
                  <input 
                    required 
                    type="text" 
                    inputMode="numeric"
                    maxLength={2} 
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[#212529] dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" 
                    value={editingCard.closing_day ?? ''} 
                    onChange={e => {
                      const cleaned = e.target.value.replace(/\D/g, '').slice(0, 2);
                      const num = parseInt(cleaned);
                      setEditingCard({ ...editingCard, closing_day: cleaned === '' ? undefined as any : num > 31 ? 31 : num });
                    }} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#4e545a] dark:text-slate-600 uppercase tracking-widest ml-1">Vencimento</label>
                  <input 
                    required 
                    type="text" 
                    inputMode="numeric"
                    maxLength={2} 
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[#212529] dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" 
                    value={editingCard.due_day ?? ''} 
                    onChange={e => {
                      const cleaned = e.target.value.replace(/\D/g, '').slice(0, 2);
                      const num = parseInt(cleaned);
                      setEditingCard({ ...editingCard, due_day: cleaned === '' ? undefined as any : num > 31 ? 31 : num });
                    }} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#4e545a] dark:text-slate-600 uppercase tracking-widest ml-1">Cor</label>
                <div className="flex gap-2">
                  {CARD_COLORS.map(color => (
                    <button key={color} type="button" onClick={() => setEditingCard({ ...editingCard, color })} className="w-8 h-8 rounded-full transition-all" style={{ backgroundColor: color, outline: editingCard.color === color ? `2px solid ${color}` : 'none', outlineOffset: '2px' }} />
                  ))}
                </div>
              </div>

              <button type="submit" className="w-full py-5 bg-indigo-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl hover:bg-indigo-500 transition-all">
                {editingCard.id ? 'Salvar Alterações' : 'Cadastrar Cartão'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Pagar Fatura (escolher pote) */}
      {payingInvoice && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-white dark:bg-[#1e293b] rounded-[3rem] w-full max-w-md p-8 border border-slate-200 dark:border-white/10 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-[#212529] dark:text-white uppercase tracking-tighter">Pagar Fatura</h3>
              <button onClick={() => setPayingInvoice(null)}><X className="text-slate-400 hover:text-white" /></button>
            </div>
            <p className="text-sm text-slate-500 mb-4">Valor: <strong className="text-[#212529] dark:text-white">{formatCurrency(payingInvoice.amount)}</strong></p>
            <div className="space-y-2 mb-6">
              <label className="text-[10px] font-black text-[#4e545a] dark:text-slate-600 uppercase tracking-widest ml-1">De qual pote sairá o pagamento?</label>
              <select className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[#212529] dark:text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)}>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.current_balance)})</option>)}
              </select>
            </div>
            <button onClick={confirmPayInvoice} className="w-full py-5 bg-indigo-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl hover:bg-indigo-500 transition-all">
              Confirmar Pagamento
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
