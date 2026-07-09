
import React, { useState, useRef, useEffect } from 'react';
import { BrainCircuit, Send, Loader2, Sparkles, Check, Mic, MicOff, Volume2 } from 'lucide-react';
import { FinancialData, Transaction } from '../types';
import { getFinancialAdvice } from '../services/gemini';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  suggestedTransaction?: Partial<Transaction>;
}

// Audio Helpers as per Gemini SDK guidelines
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function createBlob(data: Float32Array) {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

export default function AIAdvisor({ data, onTransactionCommand }: { data: FinancialData, onTransactionCommand: (t: Transaction) => void }) {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'ai', content: 'ZenOS Neural Link Ativo. Clique no microfone para enviar comandos de voz ou digite sua solicitação.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [liveTranscription, setLiveTranscription] = useState('');
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<any>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, liveTranscription]);

  const stopListening = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsListening(false);
    if (liveTranscription.trim()) {
      handleSend(null, liveTranscription);
    }
    setLiveTranscription('');
  };

  const startListening = async () => {
    try {
      setIsListening(true);
      setLiveTranscription('');
      const apiKey = localStorage.getItem('zenos_gemini_api_key') || process.env.GEMINI_API_KEY || (import.meta as any).env.VITE_GEMINI_API_KEY;
      const ai = new GoogleGenAI({ apiKey });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;

      const sessionPromise = ai.live.connect({
        model: 'gemini-3.1-flash-live-preview',
        callbacks: {
          onopen: () => {
            const source = audioCtx.createMediaStreamSource(stream);
            const scriptProcessor = audioCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
              setLiveTranscription(prev => prev + message.serverContent!.inputTranscription!.text);
            }
            if (message.serverContent?.turnComplete) {
              // Auto-stop on turn complete for command-like behavior
              stopListening();
            }
          },
          onerror: (e) => console.error('Live Error:', e),
          onclose: () => setIsListening(false),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          systemInstruction: 'Você é um assistente financeiro. Transcreva o que o usuário diz com precisão.'
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error(err);
      setIsListening(false);
    }
  };

  const handleSend = async (e: React.FormEvent | null, textOverride?: string) => {
    if (e) e.preventDefault();
    const content = textOverride || input;
    if (!content.trim() || isLoading) return;
    
    const userMessage: Message = { id: Date.now().toString(), role: 'user', content };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const advice = await getFinancialAdvice(data, content);
    
    let cleanContent = advice;
    let suggestedTx: Partial<Transaction> | undefined = undefined;

    try {
      const jsonMatch = advice.match(/\{[\s\S]*"action"\s*:\s*"ADD_TRANSACTION"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        suggestedTx = parsed.transaction;
        cleanContent = advice.replace(jsonMatch[0], '').trim();
      }
    } catch (e) {
      console.warn("AI malformed command");
    }

    const aiMessage: Message = { 
      id: (Date.now() + 1).toString(), 
      role: 'ai', 
      content: cleanContent || 'Entendido. Algo mais?',
      suggestedTransaction: suggestedTx
    };

    setMessages(prev => [...prev, aiMessage]);
    setIsLoading(false);
  };

  const confirmTransaction = (msgId: string, tx: Partial<Transaction>) => {
    const fullTx: Transaction = {
      id: crypto.randomUUID(),
      user_id: '', // to be set by caller or handleAddTransaction
      description: tx.description || 'Voz Contexto',
      amount: tx.amount || 0,
      type: tx.type || 'expense',
      category_id: (tx as any).category_id || null,
      subcategory_id: (tx as any).subcategory_id || null,
      account_id: (tx as any).account_id || (data.accounts.length > 0 ? data.accounts[0].id : null),
      date_at: (tx as any).date_at || new Date().toISOString().split('T')[0],
      payment_method: 'Comando de Voz',
      is_recurring: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    onTransactionCommand(fullTx);
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, suggestedTransaction: undefined } : m));
  };

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] bg-[#0a0c14] rounded-3xl border border-white/5 overflow-hidden shadow-2xl animate-in fade-in duration-500">
      <div className="bg-indigo-600 px-5 py-4 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BrainCircuit className="w-5 h-5" />
          <h2 className="text-sm font-black uppercase tracking-widest">ZenAI Advisor</h2>
        </div>
        <div className="flex items-center gap-2">
          {isListening && (
            <div className="flex gap-1">
              {[1,2,3].map(i => (
                <div key={i} className="w-1 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: `${i * 0.1}s` }}></div>
              ))}
            </div>
          )}
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
          <span className="text-[8px] font-black uppercase">Live</span>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#030712]/40 no-scrollbar">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`
              max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed
              ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-[#111827] text-slate-300 rounded-tl-none border border-white/5 shadow-sm'}
            `}>
              {msg.content}
            </div>

            {msg.suggestedTransaction && (
              <div className="mt-2 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl w-[85%] animate-in slide-in-from-left-2">
                <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" /> Detectado: Registrar {msg.suggestedTransaction.type === 'income' ? 'Ganho' : 'Gasto'}?
                </p>
                <div className="flex justify-between items-center">
                   <div className="min-w-0">
                      <p className="text-[10px] font-bold text-white truncate">{msg.suggestedTransaction.description}</p>
                      <p className="text-[9px] text-slate-600 font-black">R$ {msg.suggestedTransaction.amount?.toLocaleString()}</p>
                   </div>
                   <button 
                    onClick={() => confirmTransaction(msg.id, msg.suggestedTransaction!)}
                    className="p-1.5 bg-emerald-500 text-emerald-950 rounded-lg shadow-lg active:scale-90 transition-all"
                   >
                    <Check className="w-3.5 h-3.5" />
                   </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {liveTranscription && (
          <div className="flex justify-end">
            <div className="max-w-[85%] bg-indigo-600/50 text-white/70 rounded-2xl p-3 text-xs italic">
              {liveTranscription}...
            </div>
          </div>
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-[#111827] px-3 py-2 rounded-xl flex items-center gap-2 border border-white/5">
              <Loader2 className="w-3 h-3 text-indigo-500 animate-spin" />
              <span className="text-[8px] text-slate-600 font-black uppercase tracking-widest">Processando...</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-[#0a0c14] border-t border-white/5 safe-pb">
        <div className="flex gap-2">
          <button 
            type="button"
            onClick={isListening ? stopListening : startListening}
            className={`p-3 rounded-xl transition-all shadow-lg active:scale-95 ${isListening ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-800 text-indigo-400 hover:bg-slate-700'}`}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          <form onSubmit={(e) => handleSend(e)} className="flex-1 relative flex gap-2">
            <input 
              className="flex-1 pl-4 pr-4 py-3 bg-slate-900 border border-white/5 rounded-xl text-white text-xs outline-none focus:ring-1 focus:ring-indigo-600 transition-all"
              placeholder={isListening ? "Ouvindo seu comando..." : "Digite ou fale um comando..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isListening}
            />
            <button type="submit" className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg active:scale-95 transition-all" disabled={isListening}>
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
