import React, { useEffect, useState } from 'react';
import { Download, X, Share } from 'lucide-react';
import { isIOSDevice, isRunningStandalone, subscribeInstallAvailability, triggerInstallPrompt } from '../services/pwaInstall';

const DISMISS_KEY = 'zen_install_prompt_dismissed_at';
const SNOOZE_DAYS = 7;

const wasRecentlyDismissed = () => {
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const dismissedAt = parseInt(raw, 10);
  if (Number.isNaN(dismissedAt)) return false;
  const daysSince = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
  return daysSince < SNOOZE_DAYS;
};

export default function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (isRunningStandalone() || wasRecentlyDismissed()) return;

    const iOSDevice = isIOSDevice();
    setIsIOS(iOSDevice);

    // iOS Safari never fires beforeinstallprompt - show instructions after a short delay.
    let iosTimer: ReturnType<typeof setTimeout> | null = null;
    if (iOSDevice) {
      iosTimer = setTimeout(() => setVisible(true), 2500);
    }

    const unsubscribe = subscribeInstallAvailability((canInstall) => {
      if (canInstall) setVisible(true);
    });

    return () => {
      unsubscribe();
      if (iosTimer) clearTimeout(iosTimer);
    };
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setVisible(false);
  };

  const handleInstallClick = async () => {
    const outcome = await triggerInstallPrompt();
    if (outcome !== 'unavailable') setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-[200] animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl p-5 flex gap-4 items-start">
        <div className="bg-indigo-500/10 w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-2xl border border-indigo-500/20">
          <Download className="w-5 h-5 text-indigo-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-[#212529] dark:text-white">Instale o Zenos no seu celular</p>
          {isIOS ? (
            <p className="text-xs text-[#4e545a] dark:text-slate-400 mt-1 leading-snug">
              Toque em <Share className="w-3 h-3 inline mx-0.5 -mt-0.5" /> Compartilhar e depois em "Adicionar à Tela de Início".
            </p>
          ) : (
            <p className="text-xs text-[#4e545a] dark:text-slate-400 mt-1 leading-snug">
              Acesso mais rápido, tela cheia e funciona offline.
            </p>
          )}
          <div className="flex gap-2 mt-3">
            {!isIOS && (
              <button
                onClick={handleInstallClick}
                className="px-4 py-2 bg-indigo-600 text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-500 transition-all"
              >
                Instalar
              </button>
            )}
            <button
              onClick={handleDismiss}
              className="px-4 py-2 bg-slate-100 dark:bg-white/5 text-[#4e545a] dark:text-slate-400 text-[11px] font-black uppercase tracking-widest rounded-xl"
            >
              Agora não
            </button>
          </div>
        </div>
        <button onClick={handleDismiss} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
