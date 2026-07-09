
import React, { useEffect } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
}

export default function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const config = {
    success: { icon: CheckCircle, bg: 'bg-emerald-500/10', border: 'border-emerald-500/50', text: 'text-emerald-400' },
    error: { icon: XCircle, bg: 'bg-rose-500/10', border: 'border-rose-500/50', text: 'text-rose-400' },
    info: { icon: Info, bg: 'bg-indigo-500/10', border: 'border-indigo-500/50', text: 'text-indigo-400' },
  };

  const { icon: Icon, bg, border, text } = config[type];

  return (
    <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl border ${bg} ${border} backdrop-blur-xl shadow-2xl animate-in slide-in-from-bottom-4 duration-300 min-w-[300px]`}>
      <Icon className={`w-5 h-5 ${text}`} />
      <p className={`text-xs font-black uppercase tracking-widest ${text} flex-1`}>{message}</p>
      <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-lg transition-colors">
        <X className="w-4 h-4 text-slate-500" />
      </button>
    </div>
  );
}
