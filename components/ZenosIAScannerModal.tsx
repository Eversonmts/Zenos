import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, Upload, Sparkles, Loader2, Check, BrainCircuit, Mic, MicOff } from 'lucide-react';
import { Account, Category, Transaction, Profile, Plan } from '../types';
import { analyzeReceipt, parseIntentFromText } from '../services/gemini';

interface ZenosIAScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  categories: Category[];
  activeUser: Profile;
  activePlan: Plan | null;
  compromissos: any[];
  onAddTransaction: (t: Transaction) => void;
  onAddGoal: (g: any) => void;
  onAddCompromisso: (c: any) => void;
  onAddNote: (n: any) => void;
  onAddTask: (t: any) => void;
  onAddShoppingItem: (name: string, qty?: string) => void;
  onPayCompromisso: (compromissoId: string, accountId: string, amount: number) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onNavigate?: (view: any) => void;
}

export default function ZenosIAScannerModal({
  isOpen,
  onClose,
  accounts,
  categories,
  activeUser,
  activePlan,
  compromissos,
  onAddTransaction,
  onAddGoal,
  onAddCompromisso,
  onAddNote,
  onAddTask,
  onAddShoppingItem,
  onPayCompromisso,
  showToast,
  onNavigate
}: ZenosIAScannerModalProps) {
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceTranscription, setVoiceTranscription] = useState('');

  // Ação e Dados extraídos pela IA
  const [currentAction, setCurrentAction] = useState<string | null>(null);
  
  // States do formulário dinâmico
  const [formDescription, setFormDescription] = useState('');
  const [formAmount, setFormAmount] = useState(0);
  const [formType, setFormType] = useState<'expense' | 'income'>('expense');
  const [formDate, setFormDate] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formAccountId, setFormAccountId] = useState('');
  
  // Meta
  const [goalDeadline, setGoalDeadline] = useState('');
  const [goalTargetAmount, setGoalTargetAmount] = useState(0);

  // Nota
  const [noteContent, setNoteContent] = useState('');

  // Item de compras
  const [shoppingQty, setShoppingQty] = useState('');

  // ID de compromisso a pagar
  const [targetCompromissoId, setTargetCompromissoId] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      if (recognitionRef.current) recognitionRef.current.abort();
    };
  }, [isOpen]);

  const hasAccessToAI = activeUser.role === 'admin' || activePlan?.features_json?.includes('ai_advisor');

  if (!isOpen) return null;

  // Processa arquivo de imagem
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const readerForPreview = new FileReader();
    readerForPreview.onloadend = () => setImagePreview(readerForPreview.result as string);
    readerForPreview.readAsDataURL(file);

    const readerForBase64 = new FileReader();
    readerForBase64.onloadend = async () => {
      const base64String = (readerForBase64.result as string).split(',')[1];
      await runReceiptAnalysis(base64String);
    };
    readerForBase64.readAsDataURL(file);
  };

  const runReceiptAnalysis = async (base64Image: string) => {
    setLoading(true);
    setCurrentAction(null);
    try {
      const result = await analyzeReceipt(base64Image);
      if (result && result.amount) {
        setCurrentAction('CREATE_TRANSACTION');
        setFormDescription(result.description || result.location || result.item || 'Compra Cupom');
        setFormAmount(result.amount);
        setFormDate(result.date_at || new Date().toISOString().split('T')[0]);
        
        const matchedCat = categories.find(c => c.name.toLowerCase().includes(result.category?.toLowerCase() || ''));
        setFormCategoryId(matchedCat?.id || categories[0]?.id || '');
        setFormAccountId(accounts[0]?.id || '');
        
        showToast("Cupom analisado com sucesso pelo Zenos IA!", "success");
        speakText(`Identifiquei um cupom de ${result.description || 'compra'} de ${result.amount} reais. Confirma o lançamento?`);
      } else {
        showToast("Não consegui ler o cupom. Tente tirar outra foto.", "error");
      }
    } catch (err) {
      showToast("Falha na análise neural do cupom.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Voz (Speech-to-Text)
  const startVoiceCommand = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast("Navegador incompatível com voz.", "error");
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const rec = new SpeechRecognition();
      rec.lang = 'pt-BR';
      rec.continuous = false;
      rec.interimResults = false;

      rec.onstart = () => {
        setIsRecordingVoice(true);
        setVoiceTranscription('');
        showToast("Zenos ouvindo...", "info");
      };

      rec.onerror = () => {
        setIsRecordingVoice(false);
        showToast("Falha no microfone.", "error");
      };

      rec.onend = () => setIsRecordingVoice(false);

      rec.onresult = async (event: any) => {
        const text = event.results[0][0].transcript;
        setVoiceTranscription(text);
        await handleProcessVoiceText(text);
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err) {
      setIsRecordingVoice(false);
    }
  };

  const stopVoiceCommand = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecordingVoice(false);
    }
  };

  const handleProcessVoiceText = async (text: string) => {
    setLoading(true);
    try {
      // 1. Tenta processar o áudio localmente (Offline / Sem gastar API do Gemini)
      const localRes = parseIntentLocally(text, categories, accounts, compromissos);
      
      let res = localRes;
      if (!res) {
        // Fallback: Se não detectou comando local direto, consulta a API do Gemini
        const activeCompromissos = compromissos.filter(c => !c.status || c.status !== 'paid');
        const context = {
          compromissos: activeCompromissos.map(c => ({ id: c.id, title: c.title, amount: c.amount })),
          categories: categories.map(c => c.name),
          accounts: accounts.map(a => a.name)
        };
        res = await parseIntentFromText(text, context);
      }

      if (res && res.action && res.data) {
        // Se for comando de navegação, executa direto e fecha o modal
        if (res.action === 'NAVIGATE' as any) {
          showToast(res.speechResponse || "Navegando...", "success");
          if (res.speechResponse) {
            speakText(res.speechResponse);
          }
          if (onNavigate && res.data.target) {
            onNavigate(res.data.target);
          }
          onClose();
          return;
        }

        setCurrentAction(res.action);
        
        // Mapeamento dinâmico de dados
        const data = res.data;
        setFormDescription(data.description || data.title || '');
        setFormAmount(Math.abs(data.amount || data.target_amount || 0));
        
        // Determina o tipo (receita / despesa) a partir do valor ou tipo inferido
        const isIncomeVal = (data.amount !== undefined ? data.amount : (data.type === 'income' ? 1 : -1)) > 0;
        setFormType(isIncomeVal ? 'income' : 'expense');
        
        setFormDate(data.date_at || new Date().toISOString().split('T')[0]);
        setFormAccountId(accounts[0]?.id || '');

        const matchedCat = categories.find(c => c.name.toLowerCase().includes(data.category?.toLowerCase() || ''));
        setFormCategoryId(matchedCat?.id || categories[0]?.id || '');

        if (res.action === 'CREATE_GOAL') {
          setGoalTargetAmount(data.target_amount || data.amount || 0);
          setGoalDeadline(data.deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
        } else if (res.action === 'CREATE_NOTE') {
          setNoteContent(data.content || data.description || '');
        } else if (res.action === 'CREATE_SHOPPING_ITEM') {
          setShoppingQty(data.quantity || '');
        } else if (res.action === 'PAY_COMPROMISSO') {
          setTargetCompromissoId(data.compromisso_id || '');
          setFormAmount(data.amount || 0);
        }

        showToast(localRes ? "Comando local reconhecido!" : "Intenção processada por Zenos IA!", "success");
        if (res.speechResponse) {
          speakText(res.speechResponse);
        }
      } else {
        showToast("Não compreendi o comando. Diga novamente.", "error");
      }
    } catch (err) {
      showToast("Erro ao analisar áudio.", "error");
    } finally {
      setLoading(false);
    }
  };

  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAction) return;

    try {
      switch (currentAction) {
        case 'CREATE_TRANSACTION':
          onAddTransaction({
            id: crypto.randomUUID(),
            user_id: activeUser.id,
            description: formDescription,
            amount: Number(formAmount),
            type: formType,
            category_id: formCategoryId || null,
            subcategory_id: null,
            account_id: formAccountId,
            date_at: formDate,
            payment_method: 'Zenos IA Voice',
            is_recurring: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          showToast("Transação lançada com sucesso!", "success");
          break;

        case 'CREATE_GOAL':
          onAddGoal({
            id: crypto.randomUUID(),
            user_id: activeUser.id,
            title: formDescription,
            target_amount: Number(goalTargetAmount),
            current_amount: 0,
            deadline: goalDeadline,
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          showToast("Meta financeira criada!", "success");
          break;

        case 'CREATE_COMPROMISSO':
          onAddCompromisso({
            id: crypto.randomUUID(),
            user_id: activeUser.id,
            title: formDescription,
            amount: Number(formAmount),
            due_date: formDate,
            status: 'pending',
            type: 'expense',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          showToast("Compromisso agendado no calendário!", "success");
          break;

        case 'CREATE_NOTE':
          onAddNote({
            id: crypto.randomUUID(),
            user_id: activeUser.id,
            title: formDescription || 'Nota de Voz',
            content: noteContent,
            color: '#fbbf24',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          showToast("Nota criada com sucesso!", "success");
          break;

        case 'CREATE_TASK':
          onAddTask({
            id: crypto.randomUUID(),
            user_id: activeUser.id,
            title: formDescription,
            completed: false,
            due_date: formDate || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          showToast("Tarefa inserida na produtividade!", "success");
          break;

        case 'CREATE_SHOPPING_ITEM':
          onAddShoppingItem(formDescription, shoppingQty || undefined);
          showToast("Item adicionado à Lista de Compras!", "success");
          break;

        case 'PAY_COMPROMISSO':
          if (!targetCompromissoId || !formAccountId) {
            showToast("Selecione a conta de débito.", "error");
            return;
          }
          onPayCompromisso(targetCompromissoId, formAccountId, formAmount);
          showToast("Conta marcada como paga no calendário!", "success");
          break;

        default:
          break;
      }
      handleReset();
      onClose();
    } catch (err) {
      showToast("Erro ao confirmar ação.", "error");
    }
  };

  const handleReset = () => {
    setImagePreview(null);
    setCurrentAction(null);
    setVoiceTranscription('');
    setFormDescription('');
    setFormAmount(0);
    setFormDate('');
    setFormCategoryId('');
    setFormAccountId('');
    setGoalDeadline('');
    setGoalTargetAmount(0);
    setNoteContent('');
    setShoppingQty('');
    setTargetCompromissoId('');
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  };

  if (!hasAccessToAI) {
    return (
      <div className="fixed inset-0 bg-slate-955/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
        <div className="bg-[#0a0c14] border border-white/5 rounded-[2.5rem] p-6 max-w-md w-full text-center space-y-6 animate-in scale-in duration-200">
          <div className="p-4 bg-indigo-600/10 text-indigo-500 rounded-full w-fit mx-auto animate-pulse">
            <BrainCircuit className="w-12 h-12" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-white uppercase tracking-wider">🔒 Assistente IA Bloqueado</h2>
            <p className="text-xs text-slate-400 font-bold leading-relaxed">
              O leitor neural de notas, gerenciamento de produtividade por voz e baixa inteligente de contas são exclusivos para membros Premium e PRO.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Fechar</button>
            <button onClick={() => { onClose(); showToast("Upgrade nas configurações!", "info"); }} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 transition-all">Fazer Upgrade</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-955/65 backdrop-blur-sm z-[110] flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#0a0c14] border border-slate-200 dark:border-white/5 rounded-[2.5rem] shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col animate-in scale-in duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-slate-950/20">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-tr from-indigo-600 to-purple-600 text-white rounded-2xl shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-tight">Zenos IA Scanner</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Controle total por voz, foto ou texto</p>
            </div>
          </div>
          <button onClick={() => { handleReset(); onClose(); }} className="p-2 hover:bg-slate-200 dark:hover:bg-white/5 rounded-xl transition-all">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
              <div className="text-center">
                <p className="text-sm font-bold text-slate-900 dark:text-white">Zenos IA executando comando...</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Processando intenção e extraindo dados</p>
              </div>
            </div>
          ) : !currentAction ? (
            /* Tela Inicial - Opções de IA */
            <div className="space-y-6">
              <input type="file" ref={fileInputRef} accept="image/*" onChange={handleFileChange} className="hidden" />

              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => fileInputRef.current?.setAttribute('capture', 'environment') || fileInputRef.current?.click()} className="p-6 border border-slate-200 dark:border-white/5 hover:border-indigo-500 bg-slate-50 dark:bg-slate-950/40 rounded-3xl flex flex-col items-center justify-center space-y-2 transition-all hover:scale-[1.02] group">
                  <div className="p-3 bg-indigo-600/10 text-indigo-650 rounded-full group-hover:bg-indigo-600 group-hover:text-white transition-all"><Camera className="w-5 h-5" /></div>
                  <span className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-200 tracking-wider">Câmera</span>
                </button>
                <button onClick={() => { fileInputRef.current?.removeAttribute('capture'); fileInputRef.current?.click(); }} className="p-6 border border-slate-200 dark:border-white/5 hover:border-indigo-500 bg-slate-50 dark:bg-slate-950/40 rounded-3xl flex flex-col items-center justify-center space-y-2 transition-all hover:scale-[1.02] group">
                  <div className="p-3 bg-indigo-600/10 text-indigo-650 rounded-full group-hover:bg-indigo-600 group-hover:text-white transition-all"><Upload className="w-5 h-5" /></div>
                  <span className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-200 tracking-wider">Galeria</span>
                </button>
              </div>

              {/* Botão de Gravar Voz */}
              <div className="flex flex-col items-center justify-center p-8 border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-950/40 rounded-[2.5rem] space-y-4">
                <button type="button" onClick={isRecordingVoice ? stopVoiceCommand : startVoiceCommand} className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${isRecordingVoice ? 'bg-rose-500 text-white animate-pulse scale-105 shadow-lg shadow-rose-500/30' : 'bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30 hover:scale-105 active:scale-95'}`}>
                  {isRecordingVoice ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
                </button>
                <div className="text-center">
                  <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-200 tracking-wider">{isRecordingVoice ? 'Zenos ouvindo...' : 'Falar com Zenos IA'}</span>
                  <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-wider max-w-xs mx-auto leading-relaxed">
                    {isRecordingVoice ? 'Fale agora. Ex: "Pagar conta de energia" ou "Comprar açúcar"' : 'Toque e ordene: "Gastei R$ 5,50 com café" ou "Preciso comprar leite"'}
                  </p>
                </div>
                {voiceTranscription && (
                  <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100/50 dark:border-indigo-950/10">
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 italic text-center">"{voiceTranscription}"</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Formulários Reativos baseados na Ação */
            <form onSubmit={handleConfirmAction} className="space-y-6 animate-in fade-in duration-300">
              <div className="flex gap-4 items-center bg-slate-50 dark:bg-slate-950/30 p-4 rounded-3xl border border-slate-100 dark:border-white/5">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-505 flex items-center justify-center flex-shrink-0 animate-bounce">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Ação Identificada por Zenos IA!</h4>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Revise e aprove a ação abaixo.</p>
                </div>
              </div>

              {/* Campos do Formulário Dependendo do Tipo de Lançamento */}
              <div className="space-y-4">
                {/* Título / Descrição */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                    {currentAction === 'CREATE_SHOPPING_ITEM' ? 'Nome do Item' : 'Descrição / Nome'}
                  </label>
                  <input type="text" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs outline-none text-slate-800 dark:text-white font-bold" value={formDescription} onChange={e => setFormDescription(e.target.value)} />
                </div>

                {/* Quantidade (Lista de Compras) */}
                {currentAction === 'CREATE_SHOPPING_ITEM' && (
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Quantidade / Observação</label>
                    <input type="text" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs outline-none text-slate-800 dark:text-white font-bold" value={shoppingQty} onChange={e => setShoppingQty(e.target.value)} placeholder="Ex: 2 unidades, 1kg" />
                  </div>
                )}

                {/* Valor Financeiro (Transações, Compromissos, Baixas) */}
                {['CREATE_TRANSACTION', 'CREATE_COMPROMISSO', 'PAY_COMPROMISSO'].includes(currentAction) && (
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Valor R$</label>
                    <input type="number" step="0.01" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs outline-none text-slate-800 dark:text-white font-bold" value={formAmount} onChange={e => setFormAmount(Number(e.target.value))} />
                  </div>
                )}

                {/* Data / Prazo (Transações, Compromissos, Tarefas) */}
                {['CREATE_TRANSACTION', 'CREATE_COMPROMISSO', 'CREATE_TASK'].includes(currentAction) && (
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Data / Vencimento</label>
                    <input type="date" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs outline-none text-slate-800 dark:text-white font-bold" value={formDate} onChange={e => setFormDate(e.target.value)} />
                  </div>
                )}

                {/* Meta Financeira (Target e Deadline) */}
                {currentAction === 'CREATE_GOAL' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Valor Alvo R$</label>
                      <input type="number" step="0.01" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs outline-none text-slate-800 dark:text-white font-bold" value={goalTargetAmount} onChange={e => setGoalTargetAmount(Number(e.target.value))} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Prazo Final</label>
                      <input type="date" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs outline-none text-slate-800 dark:text-white font-bold" value={goalDeadline} onChange={e => setGoalDeadline(e.target.value)} />
                    </div>
                  </div>
                )}

                {/* Conteúdo de Nota */}
                {currentAction === 'CREATE_NOTE' && (
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Conteúdo da Nota</label>
                    <textarea rows={3} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs outline-none text-slate-800 dark:text-white font-bold" value={noteContent} onChange={e => setNoteContent(e.target.value)} />
                  </div>
                )}

                {/* Pote de Débito (Transações e Baixas) */}
                {['CREATE_TRANSACTION', 'PAY_COMPROMISSO'].includes(currentAction) && (
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Debitar de qual Pote/Conta?</label>
                    <select className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs outline-none text-slate-800 dark:text-white font-bold" value={formAccountId} onChange={e => setFormAccountId(e.target.value)}>
                      {accounts.map(a => (
                        <option key={a.id} value={a.id}>{a.name} (Saldo: R$ {(a.current_balance || 0).toLocaleString()})</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Categorias (Apenas para Transações normais) */}
                {currentAction === 'CREATE_TRANSACTION' && (
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{formType === 'income' ? 'Categoria de Ganhos' : 'Categoria de Gastos'}</label>
                    <select className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs outline-none text-slate-800 dark:text-white font-bold" value={formCategoryId} onChange={e => setFormCategoryId(e.target.value)}>
                      <option value="">Nenhuma Categoria</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Baixa de Compromisso (Informações da baixa) */}
                {currentAction === 'PAY_COMPROMISSO' && (
                  <div className="p-3 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-2xl text-[10px] font-bold uppercase tracking-wider text-center">
                    Zenos identificou o compromisso e irá marcá-lo como pago no calendário ao confirmar!
                  </div>
                )}
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-2 pt-4 border-t border-slate-100 dark:border-white/5">
                <button type="button" onClick={handleReset} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-300 transition-all">Voltar</button>
                <button type="submit" className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-1.5">
                  <Check className="w-4 h-4" /> Confirmar e Criar
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// Parser Local Offline de Intenções por Regras/Regex
const parseIntentLocally = (
  text: string, 
  categories: Category[], 
  accounts: Account[], 
  compromissos: any[]
): { action: string; data: any; speechResponse?: string } | null => {
  const normalized = text.toLowerCase().trim();

  // 1. NAVEGAÇÃO DE TELA (Offline/Local)
  if (/calend[aá]rio/i.test(normalized)) {
    return {
      action: 'NAVIGATE',
      data: { target: 'calendar' },
      speechResponse: 'Abrindo o calendário para você.'
    };
  }
  if (/compromisso/i.test(normalized) && !/lan[cç]ar|adicionar|criar/i.test(normalized)) {
    return {
      action: 'NAVIGATE',
      data: { target: 'compromissos' },
      speechResponse: 'Abrindo seus compromissos.'
    };
  }
  if (/anota[cç][oõ]es|nota/i.test(normalized) && !/lan[cç]ar|adicionar|criar|anotar/i.test(normalized)) {
    return {
      action: 'NAVIGATE',
      data: { target: 'notes' },
      speechResponse: 'Abrindo suas anotações e diário.'
    };
  }
  if (/cart[oõ]es/i.test(normalized)) {
    return {
      action: 'NAVIGATE',
      data: { target: 'cartoes' },
      speechResponse: 'Abrindo seus cartões de crédito.'
    };
  }
  if (/meta/i.test(normalized) && !/lan[cç]ar|adicionar|criar/i.test(normalized)) {
    return {
      action: 'NAVIGATE',
      data: { target: 'goals' },
      speechResponse: 'Visualizando suas metas.'
    };
  }
  if (/principal|painel|dashboard/i.test(normalized)) {
    return {
      action: 'NAVIGATE',
      data: { target: 'dashboard' },
      speechResponse: 'Indo para o painel principal.'
    };
  }

  // 2. EXTRAÇÃO DE VALOR E CONTEXTO FINANCEIRO (Lançamentos de Gastos / Ganhos)
  const valueRegex = /(?:r\$|reais|valor|de|gastei)?\s*(\d+(?:[\.,]\d{1,2})?)/i;
  const isExpense = /gasto|despesa|gastei|paguei|sa[íi]da/i.test(normalized);
  const isIncome = /ganho|receita|recebi|ganhei|sal[áa]rio|entrada/i.test(normalized);

  if (isExpense || isIncome) {
    const valueMatch = normalized.match(valueRegex);
    if (valueMatch) {
      const amountStr = valueMatch[1].replace(',', '.');
      const amount = parseFloat(amountStr);

      if (!isNaN(amount) && amount > 0) {
        // Extrai descrição limpando palavras-chave
        let description = normalized
          .replace(valueMatch[0], '')
          .replace(/lan[cç]ar|adicionar|criar|gasto|despesa|gastei|paguei|recebi|ganhei|receita|ganho|entrada|de|com|para|reais/gi, '')
          .trim();
        
        description = description.charAt(0).toUpperCase() + description.slice(1);

        // Adivinha categoria baseada em palavras-chave simples
        let categoryName = isExpense ? 'Lazer' : 'Salário';
        if (/comida|almo[cç]o|janta|mercado|restaurante|padaria/i.test(normalized)) categoryName = 'Alimentação';
        else if (/combust[ií]vel|gasolina|carro|uber|t[aá]xi/i.test(normalized)) categoryName = 'Combustível';
        else if (/aluguel|luz|agua|[aá]gua|internet|casa|moradia/i.test(normalized)) categoryName = 'Moradia';

        const matchedCat = categories.find(c => c.name.toLowerCase().includes(categoryName.toLowerCase()));

        return {
          action: 'CREATE_TRANSACTION',
          data: {
            description: description || (isExpense ? 'Gasto de Voz' : 'Receita de Voz'),
            amount: isExpense ? -amount : amount,
            category: matchedCat ? matchedCat.name : (categories[0]?.name || ''),
            date_at: new Date().toISOString().split('T')[0]
          },
          speechResponse: `Entendi. Lançando ${isExpense ? 'gasto' : 'ganho'} de ${amount} reais para ${description || 'Voz'}. Confirme o lançamento.`
        };
      }
    }
  }

  // 3. ANOTAÇÕES / DIÁRIO
  if (/anotar|criar nota|escrever nota/i.test(normalized)) {
    const noteContent = normalized.replace(/anotar|criar nota|escrever nota/gi, '').trim();
    if (noteContent) {
      return {
        action: 'CREATE_NOTE',
        data: {
          description: 'Anotação de Voz',
          content: noteContent.charAt(0).toUpperCase() + noteContent.slice(1)
        },
        speechResponse: `Anotação processada: "${noteContent}". Deseja salvar?`
      };
    }
  }

  // 4. METAS FINANCEIRAS
  if (/meta/i.test(normalized) && /reais/i.test(normalized)) {
    const valueMatch = normalized.match(valueRegex);
    if (valueMatch) {
      const targetAmount = parseFloat(valueMatch[1].replace(',', '.'));
      if (!isNaN(targetAmount) && targetAmount > 0) {
        let title = normalized
          .replace(valueMatch[0], '')
          .replace(/criar|meta|de|para|reais/gi, '')
          .trim();
        title = title.charAt(0).toUpperCase() + title.slice(1);

        return {
          action: 'CREATE_GOAL',
          data: {
            title: title || 'Meta de Voz',
            target_amount: targetAmount
          },
          speechResponse: `Criando meta de ${targetAmount} reais para ${title || 'Voz'}. Confirme para salvar.`
        };
      }
    }
  }

  return null;
}
