import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, Upload, Sparkles, Loader2, Check, BrainCircuit, Mic, MicOff } from 'lucide-react';
import { Account, Category, Transaction, Profile, Plan } from '../types';
import { analyzeReceipt, parseTransactionFromText } from '../services/gemini';
import { formatCurrency } from '../lib/utils';

interface ZenosIAScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  categories: Category[];
  activeUser: Profile;
  activePlan: Plan | null;
  onAddTransaction: (t: Transaction) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function ZenosIAScannerModal({
  isOpen,
  onClose,
  accounts,
  categories,
  activeUser,
  activePlan,
  onAddTransaction,
  showToast
}: ZenosIAScannerModalProps) {
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceTranscription, setVoiceTranscription] = useState('');

  // Dados extraídos pela IA do Cupom ou Voz
  const [extractedData, setExtractedData] = useState<{
    description: string;
    amount: number;
    date_at: string;
    category: string;
    type: 'income' | 'expense';
  } | null>(null);

  // States do Formulário de Confirmação
  const [formDescription, setFormDescription] = useState('');
  const [formAmount, setFormAmount] = useState(0);
  const [formDate, setFormDate] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formAccountId, setFormAccountId] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Cancela a fala do navegador se o modal fechar
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [isOpen]);

  // Verifica se o usuário tem privilégio de admin ou se o plano dele inclui a IA
  const hasAccessToAI = activeUser.role === 'admin' || activePlan?.features_json?.includes('ai_advisor');

  if (!isOpen) return null;

  // Converte arquivo de imagem em Base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview local da imagem
    const readerForPreview = new FileReader();
    readerForPreview.onloadend = () => {
      setImagePreview(readerForPreview.result as string);
    };
    readerForPreview.readAsDataURL(file);

    // Processamento com Gemini
    const readerForBase64 = new FileReader();
    readerForBase64.onloadend = async () => {
      const base64String = (readerForBase64.result as string).split(',')[1];
      await runReceiptAnalysis(base64String);
    };
    readerForBase64.readAsDataURL(file);
  };

  // Envia a imagem em base64 para a API do Gemini
  const runReceiptAnalysis = async (base64Image: string) => {
    setLoading(true);
    setExtractedData(null);
    try {
      const result = await analyzeReceipt(base64Image);
      if (result && result.amount) {
        setExtractedData(result);
        setFormDescription(result.description || result.location || result.item || 'Compra Cupom');
        setFormAmount(result.amount);
        setFormDate(result.date_at || new Date().toISOString().split('T')[0]);
        
        // Tenta achar categoria recomendada correspondente
        const matchedCat = categories.find(c => c.name.toLowerCase().includes(result.category?.toLowerCase() || ''));
        setFormCategoryId(matchedCat?.id || categories[0]?.id || '');
        
        // Pote/Conta padrão
        setFormAccountId(accounts[0]?.id || '');
        showToast("Cupom analisado com sucesso pelo Zenos IA!", "success");

        // Síntese de voz para retorno auditivo
        const typeLabel = result.type === 'income' ? 'receita' : 'despesa';
        const categoryLabel = matchedCat ? matchedCat.name : (result.category || 'Alimentação');
        const speechText = `Ok, identifiquei um cupom de ${result.description} no valor de ${result.amount.toFixed(2).replace('.', ',')} reais, classificado como ${typeLabel} na categoria ${categoryLabel}. Confirma o lançamento?`;
        speakText(speechText);
      } else {
        showToast("Zenos IA não conseguiu ler o cupom. Tente tirar outra foto mais nítida.", "error");
      }
    } catch (err) {
      showToast("Falha na análise neural do cupom.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Inicia e gerencia o Reconhecimento de Voz nativo (Speech-to-Text)
  const startVoiceCommand = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast("Seu navegador não suporta reconhecimento de voz.", "error");
      return;
    }

    try {
      // Para reprodução anterior se houver
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }

      const rec = new SpeechRecognition();
      rec.lang = 'pt-BR';
      rec.continuous = false;
      rec.interimResults = false;

      rec.onstart = () => {
        setIsRecordingVoice(true);
        setVoiceTranscription('');
        showToast("Zenos IA ouvindo... Fale seu comando!", "info");
      };

      rec.onerror = (e: any) => {
        console.error("Speech error:", e);
        setIsRecordingVoice(false);
        showToast("Falha ao escutar voz. Verifique o microfone.", "error");
      };

      rec.onend = () => {
        setIsRecordingVoice(false);
      };

      rec.onresult = async (event: any) => {
        const text = event.results[0][0].transcript;
        setVoiceTranscription(text);
        
        // Dispara a interpretação do texto
        await handleProcessVoiceText(text);
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err) {
      console.error(err);
      setIsRecordingVoice(false);
    }
  };

  const stopVoiceCommand = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecordingVoice(false);
    }
  };

  // Envia a transcrição do áudio para o Gemini processar
  const handleProcessVoiceText = async (text: string) => {
    setLoading(true);
    try {
      const result = await parseTransactionFromText(text);
      if (result && result.amount) {
        setExtractedData(result);
        setFormDescription(result.description || 'Gasto por Comando');
        setFormAmount(result.amount);
        setFormDate(result.date_at || new Date().toISOString().split('T')[0]);

        // Tenta achar categoria correspondente
        const matchedCat = categories.find(c => c.name.toLowerCase().includes(result.category?.toLowerCase() || ''));
        setFormCategoryId(matchedCat?.id || categories[0]?.id || '');
        setFormAccountId(accounts[0]?.id || '');

        showToast("Comando de voz processado pelo Zenos IA!", "success");

        // Síntese de Voz de Confirmação (Text-to-Speech)
        const typeLabel = result.type === 'income' ? 'receita' : 'despesa';
        const categoryLabel = matchedCat ? matchedCat.name : (result.category || 'Alimentação');
        const speechText = `Ok, estou lançando ${result.amount.toFixed(2).replace('.', ',')} reais de ${typeLabel} na data de hoje, categoria ${categoryLabel}, ${result.description}. Precisa de algo mais?`;
        speakText(speechText);
      } else {
        showToast("Zenos IA não compreendeu a transação. Diga o valor e o que comprou.", "error");
      }
    } catch (err) {
      showToast("Erro ao processar comando de voz com o Zenos IA.", "error");
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
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error("Speech synthesis failed:", err);
    }
  };

  const handleConfirmTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDescription.trim() || !formAmount || !formAccountId) {
      showToast("Preencha todos os campos obrigatórios", "error");
      return;
    }

    const newTx: Transaction = {
      id: crypto.randomUUID(),
      user_id: activeUser.id,
      description: formDescription.trim(),
      amount: Number(formAmount),
      type: extractedData?.type || 'expense',
      category_id: formCategoryId || null,
      subcategory_id: null,
      account_id: formAccountId,
      date_at: formDate,
      payment_method: 'Zenos IA Scanner',
      is_recurring: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    onAddTransaction(newTx);
    showToast("Transação adicionada com sucesso pelo Scanner!", "success");
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setImagePreview(null);
    setExtractedData(null);
    setVoiceTranscription('');
    setFormDescription('');
    setFormAmount(0);
    setFormDate('');
    setFormCategoryId('');
    setFormAccountId('');
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  // Se o usuário não tiver acesso à IA no plano
  if (!hasAccessToAI) {
    return (
      <div className="fixed inset-0 bg-slate-955/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
        <div className="bg-[#0a0c14] border border-white/5 rounded-[2.5rem] p-6 max-w-md w-full text-center space-y-6 animate-in scale-in duration-200">
          <div className="p-4 bg-indigo-600/10 text-indigo-500 rounded-full w-fit mx-auto animate-pulse">
            <BrainCircuit className="w-12 h-12" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-white uppercase tracking-wider">🔒 Scanner IA Bloqueado</h2>
            <p className="text-xs text-slate-400 font-bold leading-relaxed">
              O escaneamento automático de cupons fiscais e a interpretação de comandos por voz estão disponíveis exclusivamente para membros Premium e PRO.
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={onClose}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
            >
              Fechar
            </button>
            <button 
              onClick={() => {
                onClose();
                showToast("Vá para Ajustes > Assinatura para fazer upgrade!", "info");
              }}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 transition-all"
            >
              Fazer Upgrade
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-955/65 backdrop-blur-sm z-[110] flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#0a0c14] border border-slate-200 dark:border-white/5 rounded-[2.5rem] shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col animate-in scale-in duration-200">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-slate-950/20">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-tr from-indigo-600 to-purple-600 text-white rounded-2xl shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-tight">Zenos IA Scanner</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Escaneie notas, envie fotos ou fale transações</p>
            </div>
          </div>
          <button 
            onClick={() => { handleReset(); onClose(); }}
            className="p-2 hover:bg-slate-200 dark:hover:bg-white/5 rounded-xl transition-all"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
              <div className="text-center">
                <p className="text-sm font-bold text-slate-900 dark:text-white">Zenos IA processando comando...</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Extraindo detalhes da transação financeira</p>
              </div>
            </div>
          ) : !extractedData ? (
            /* Tela de Ações de IA */
            <div className="space-y-6">
              <input 
                type="file" 
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Opções Visuais */}
              <div className="grid grid-cols-2 gap-4">
                {/* Botão de Câmera */}
                <button 
                  onClick={() => fileInputRef.current?.setAttribute('capture', 'environment') || fileInputRef.current?.click()}
                  className="p-6 border border-slate-200 dark:border-white/5 hover:border-indigo-500 bg-slate-50 dark:bg-slate-950/40 rounded-3xl flex flex-col items-center justify-center space-y-2 transition-all hover:scale-[1.02] group"
                >
                  <div className="p-3 bg-indigo-600/10 text-indigo-650 rounded-full group-hover:bg-indigo-600 group-hover:text-white transition-all">
                    <Camera className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-200 tracking-wider">Câmera</span>
                </button>

                {/* Botão de Upload */}
                <button 
                  onClick={() => {
                    fileInputRef.current?.removeAttribute('capture');
                    fileInputRef.current?.click();
                  }}
                  className="p-6 border border-slate-200 dark:border-white/5 hover:border-indigo-500 bg-slate-50 dark:bg-slate-950/40 rounded-3xl flex flex-col items-center justify-center space-y-2 transition-all hover:scale-[1.02] group"
                >
                  <div className="p-3 bg-indigo-600/10 text-indigo-650 rounded-full group-hover:bg-indigo-600 group-hover:text-white transition-all">
                    <Upload className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-200 tracking-wider">Galeria</span>
                </button>
              </div>

              {/* Comando de Voz */}
              <div className="flex flex-col items-center justify-center p-8 border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-950/40 rounded-[2.5rem] space-y-4">
                <button
                  type="button"
                  onClick={isRecordingVoice ? stopVoiceCommand : startVoiceCommand}
                  className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${isRecordingVoice ? 'bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/35 scale-105' : 'bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30 hover:scale-105 active:scale-95'}`}
                >
                  {isRecordingVoice ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
                </button>
                <div className="text-center">
                  <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-200 tracking-wider">
                    {isRecordingVoice ? 'Zenos ouvindo...' : 'Falar Transação'}
                  </span>
                  <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-wider max-w-xs mx-auto leading-relaxed">
                    {isRecordingVoice ? 'Fale agora. Exemplo: "Gastei R$ 5,50 com café hoje"' : 'Clique no botão acima e fale seu gasto ou entrada'}
                  </p>
                </div>
                {voiceTranscription && (
                  <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100/50 dark:border-indigo-950/10">
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 italic text-center">
                      "{voiceTranscription}"
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-slate-50 dark:bg-slate-950/20 p-4 rounded-3xl border border-slate-100 dark:border-white/5 text-center text-[10px] font-bold text-slate-400 leading-relaxed uppercase tracking-wider">
                A tecnologia neural do Zenos IA lê imagens ou ouve sua voz para organizar suas contas instantaneamente!
              </div>
            </div>
          ) : (
            /* Formulário de Confirmação */
            <form onSubmit={handleConfirmTransaction} className="space-y-6 animate-in fade-in duration-300">
              <div className="flex gap-4 items-center bg-slate-50 dark:bg-slate-950/30 p-4 rounded-3xl border border-slate-100 dark:border-white/5">
                {imagePreview ? (
                  <img 
                    src={imagePreview} 
                    alt="Cupom fiscal preview" 
                    className="w-16 h-16 rounded-xl object-cover border border-slate-200 dark:border-white/5"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center flex-shrink-0 animate-bounce">
                    <Mic className="w-6 h-6" />
                  </div>
                )}
                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Dados Extraídos por Zenos IA!</h4>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Revise os valores e selecione o pote de débito.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Descrição */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Estabelecimento / Descrição</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs outline-none text-slate-955 dark:text-white font-bold"
                    value={formDescription}
                    onChange={e => setFormDescription(e.target.value)}
                  />
                </div>

                {/* Valor */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Valor do Lançamento</label>
                  <input 
                    type="number" 
                    step="0.01"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs outline-none text-slate-955 dark:text-white font-bold"
                    value={formAmount}
                    onChange={e => setFormAmount(Number(e.target.value))}
                  />
                </div>

                {/* Data */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Data da Compra</label>
                  <input 
                    type="date" 
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs outline-none text-slate-955 dark:text-white font-bold"
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                  />
                </div>

                {/* Categoria */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Categoria Recomendada</label>
                  <select 
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs outline-none text-slate-955 dark:text-white font-bold"
                    value={formCategoryId}
                    onChange={e => setFormCategoryId(e.target.value)}
                  >
                    <option value="">Nenhuma Categoria</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Pote/Conta */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Debitar de qual Pote/Conta?</label>
                  <select 
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs outline-none text-slate-955 dark:text-white font-bold"
                    value={formAccountId}
                    onChange={e => setFormAccountId(e.target.value)}
                  >
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>{a.name} (Saldo: R$ {(a.current_balance || 0).toLocaleString()})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-2 pt-4 border-t border-slate-100 dark:border-white/5">
                <button 
                  type="button"
                  onClick={handleReset}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-300 transition-all"
                >
                  Voltar
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Confirmar e Lançar
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
