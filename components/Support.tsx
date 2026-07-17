import React, { useState } from 'react';
import { LifeBuoy, Image as ImageIcon, Send, Clock, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { SupportTicket } from '../types';

interface SupportProps {
  activeUserId: string;
  tickets: SupportTicket[];
  onAddTicket: (message: string, imageUrl: string | null) => void;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function Support({ activeUserId, tickets = [], onAddTicket, showToast }: SupportProps) {
  const [message, setMessage] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        if (showToast) {
          showToast("A imagem deve ter no máximo 2MB", "error");
        } else {
          alert("A imagem deve ter no máximo 2MB");
        }
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);
    try {
      await onAddTicket(message, imagePreview);
      setMessage('');
      setImagePreview(null);
      if (showToast) {
        showToast("Chamado de suporte enviado com sucesso!", "success");
      }
    } catch (err) {
      console.error(err);
      if (showToast) {
        showToast("Falha ao enviar chamado. Tente novamente.", "error");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: SupportTicket['status']) => {
    switch (status) {
      case 'Resolvido':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-xs font-bold uppercase tracking-wider">
            <CheckCircle2 className="w-3.5 h-3.5" /> Resolvido
          </span>
        );
      case 'Em Andamento':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-500/10 text-sky-500 rounded-full text-xs font-bold uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5" /> Em Andamento
          </span>
        );
      case 'Fechado':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-500/10 text-slate-500 rounded-full text-xs font-bold uppercase tracking-wider">
            <X className="w-3.5 h-3.5" /> Fechado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-500 rounded-full text-xs font-bold uppercase tracking-wider">
            <AlertCircle className="w-3.5 h-3.5" /> Pendente
          </span>
        );
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center gap-4 bg-white dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full"></div>
        <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-2xl">
          <LifeBuoy className="w-6 h-6 animate-spin-slow" />
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-wider">Suporte ao Usuário</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-tight mt-0.5">
            Abra um chamado diretamente com a equipe administrativa do ZenOS.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulário de Abertura */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-4 h-fit">
          <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">Novo Chamado</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-550 dark:text-slate-400 uppercase tracking-widest ml-1">
                Sua Mensagem / Problema
              </label>
              <textarea
                required
                rows={5}
                placeholder="Descreva detalhadamente o problema ou solicitação de suporte..."
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
                value={message}
                onChange={e => setMessage(e.target.value)}
              />
            </div>

            {/* Upload de Imagem */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-550 dark:text-slate-400 uppercase tracking-widest ml-1">
                Incluir Foto / Print (Opcional)
              </label>
              
              {!imagePreview ? (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-950/50 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <ImageIcon className="w-8 h-8 text-slate-400 mb-2" />
                    <p className="text-xs text-slate-550 dark:text-slate-400 font-bold uppercase tracking-tight">Anexar Print</p>
                    <p className="text-[9px] text-slate-400 uppercase mt-1">PNG, JPG de até 2MB</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </label>
              ) : (
                <div className="relative w-full h-32 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden group">
                  <img src={imagePreview} alt="Preview anexo" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImagePreview(null)}
                    className="absolute top-2 right-2 p-1.5 bg-rose-500 text-white rounded-full hover:bg-rose-600 transition-colors shadow-md"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !message.trim()}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-wider text-xs rounded-2xl transition-all shadow-lg shadow-indigo-600/10 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" /> {isSubmitting ? 'Enviando...' : 'Enviar Chamado'}
            </button>
          </form>
        </div>

        {/* Histórico de Chamados */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest ml-1">Meus Chamados</h2>

          {tickets.length === 0 ? (
            <div className="bg-white dark:bg-slate-900/50 p-12 rounded-3xl border border-slate-100 dark:border-slate-800/80 text-center">
              <LifeBuoy className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
              <p className="text-slate-800 dark:text-white font-bold text-sm uppercase tracking-wider">Nenhum chamado aberto</p>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Se precisar de ajuda ou suporte, utilize o formulário ao lado.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {[...tickets].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(t => (
                <div key={t.id} className="bg-white dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-4 relative overflow-hidden">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-600">
                      {new Date(t.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                    {getStatusBadge(t.status)}
                  </div>
                  
                  <div className="text-slate-700 dark:text-slate-200 text-sm whitespace-pre-wrap leading-relaxed font-medium">
                    {t.message}
                  </div>

                  {t.image_url && (
                    <div className="mt-2">
                      <p className="text-[10px] font-black text-slate-550 dark:text-slate-400 uppercase tracking-widest mb-1.5">Print Anexado:</p>
                      <a href={t.image_url} target="_blank" rel="noopener noreferrer" className="inline-block max-w-sm rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 hover:opacity-90 transition-opacity">
                        <img src={t.image_url} alt="Anexo do chamado" className="max-h-48 object-contain" />
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
