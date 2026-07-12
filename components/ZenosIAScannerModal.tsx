import React, { useState, useRef } from 'react';
import { X, Camera, Upload, Sparkles, Loader2, Check, ArrowRight, BrainCircuit, Mic, MicOff, KeyRound } from 'lucide-react';
import { Account, Category, Transaction, Profile, Plan } from '../types';
import { analyzeReceipt, analyzeAudioCommand } from '../services/gemini';
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
  
  // Dados extraídos pela IA do Cupom
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
      } else {
        showToast("Zenos IA não conseguiu ler o cupom. Tente tirar outra foto mais nítida.", "error");
      }
    } catch (err) {
      showToast("Falha na análise neural do cupom.", "error");
    } finally {
      setLoading(false);
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
    setFormDescription('');
    setFormAmount(0);
    setFormDate('');
    setFormCategoryId('');
    setFormAccountId('');
  };

  // Se o usuário não tiver acesso à IA no plano
  if (!hasAccessToAI) {
    return (
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
        <div className="bg-[#0a0c14] border border-white/5 rounded-[2.5rem] p-6 max-w-md w-full text-center space-y-6 animate-in scale-in duration-200">
          <div className="p-4 bg-indigo-600/10 text-indigo-500 rounded-full w-fit mx-auto animate-pulse">
            <BrainCircuit className="w-12 h-12" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-white uppercase tracking-wider">🔒 Scanner IA Bloqueado</h2>
            <p className="text-xs text-slate-400 font-bold leading-relaxed">
              O escaneamento automático de cupons fiscais e a interpretação neural de recibos por imagem estão disponíveis exclusivamente para membros Premium e PRO.
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
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Escaneie notas, recibos e preencha na hora</p>
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
                <p className="text-sm font-bold text-slate-900 dark:text-white">Zenos IA está analisando a imagem...</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Extraindo data, valores e categorias do cupom</p>
              </div>
            </div>
          ) : !extractedData ? (
            /* Tela de Upload e Envio de Imagem */
            <div className="space-y-6">
              <input 
                type="file" 
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Botão de Tirar Foto (Câmera) */}
                <button 
                  onClick={() => fileInputRef.current?.setAttribute('capture', 'environment') || fileInputRef.current?.click()}
                  className="p-8 border border-slate-200 dark:border-white/5 hover:border-indigo-500 bg-slate-50 dark:bg-slate-950/40 rounded-3xl flex flex-col items-center justify-center space-y-3 transition-all hover:scale-[1.02] group"
                >
                  <div className="p-4 bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 rounded-full group-hover:bg-indigo-600 group-hover:text-white transition-all">
                    <Camera className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-200 tracking-wider">Tirar Foto</span>
                  <span className="text-[9px] text-slate-400 font-bold">Use a câmera do seu celular</span>
                </button>

                {/* Botão de Upload da Galeria */}
                <button 
                  onClick={() => {
                    fileInputRef.current?.removeAttribute('capture');
                    fileInputRef.current?.click();
                  }}
                  className="p-8 border border-slate-200 dark:border-white/5 hover:border-indigo-500 bg-slate-50 dark:bg-slate-950/40 rounded-3xl flex flex-col items-center justify-center space-y-3 transition-all hover:scale-[1.02] group"
                >
                  <div className="p-4 bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 rounded-full group-hover:bg-indigo-600 group-hover:text-white transition-all">
                    <Upload className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-200 tracking-wider">Enviar Imagem</span>
                  <span className="text-[9px] text-slate-400 font-bold">Formatos suportados: PNG, JPG</span>
                </button>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950/20 p-4 rounded-3xl border border-slate-100 dark:border-white/5 text-center text-[10px] font-bold text-slate-400 leading-relaxed uppercase tracking-wider">
                A tecnologia neural do Zenos IA lê notas fiscais, cupons de mercado e recibos de transferência PIX automaticamente!
              </div>
            </div>
          ) : (
            /* Formulário de Confirmação dos Dados Extraídos */
            <form onSubmit={handleConfirmTransaction} className="space-y-6 animate-in fade-in duration-300">
              <div className="flex gap-4 items-center bg-slate-50 dark:bg-slate-950/30 p-4 rounded-3xl border border-slate-100 dark:border-white/5">
                {imagePreview && (
                  <img 
                    src={imagePreview} 
                    alt="Cupom fiscal preview" 
                    className="w-16 h-16 rounded-xl object-cover border border-slate-200 dark:border-white/5"
                  />
                )}
                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Cupom Escaneado com Sucesso!</h4>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Revise os valores abaixo e selecione a conta de débito.</p>
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
                  Escanear Outro
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
