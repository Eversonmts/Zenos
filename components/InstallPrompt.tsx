import React, { useEffect, useState } from 'react';
import { Download, X, Share, Monitor } from 'lucide-react';
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
  const [isWindows, setIsWindows] = useState(false);

  useEffect(() => {
    if (isRunningStandalone() || wasRecentlyDismissed()) return;

    const iOSDevice = isIOSDevice();
    setIsIOS(iOSDevice);

    // Detect if running on Windows
    const win = window.navigator.userAgent.includes('Windows');
    setIsWindows(win);

    // iOS Safari never fires beforeinstallprompt - show instructions after a short delay.
    let iosTimer: ReturnType<typeof setTimeout> | null = null;
    if (iOSDevice) {
      iosTimer = setTimeout(() => setVisible(true), 2500);
    }

    const unsubscribe = subscribeInstallAvailability((canInstall) => {
      console.log(`[InstallPrompt] PWA availability updated: ${canInstall}`);
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
    <div className="fixed bottom-6 left-6 right-6 sm:left-auto sm:right-6 sm:w-96 z-[200] animate-in slide-in-from-bottom-6 fade-in duration-300">
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-6 flex gap-4 items-start relative overflow-hidden">
        {/* Decorative ambient gradient */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="bg-indigo-600/10 w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-2xl border border-indigo-600/20">
          {isWindows ? (
            <Monitor className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          ) : (
            <Download className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-[#212529] dark:text-white uppercase tracking-tight">
            {isWindows ? 'Instale o Zenos no Windows' : 'Instale o Zenos no Celular'}
          </p>
          {isIOS ? (
            <p className="text-xs text-[#4e545a] dark:text-slate-400 mt-2 leading-relaxed">
              Toque em <Share className="w-3.5 h-3.5 inline mx-0.5 -mt-0.5 text-indigo-500" /> Compartilhar e selecione <span className="font-bold">"Adicionar à Tela de Início"</span>.
            </p>
          ) : (
            <p className="text-xs text-[#4e545a] dark:text-slate-400 mt-2 leading-relaxed">
              Acesso instantâneo pela sua área de trabalho, tela cheia fluida e suporte ao modo offline.
            </p>
          )}
          <div className="flex gap-2 mt-4">
            {!isIOS && (
              <button
                onClick={handleInstallClick}
                className="px-5 py-2.5 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-500 shadow-md shadow-indigo-600/20 hover:scale-102 active:scale-98 transition-all"
              >
                Instalar Agora
              </button>
            )}
            <button
              onClick={handleDismiss}
              className="px-5 py-2.5 bg-slate-100 dark:bg-white/5 text-[#4e545a] dark:text-slate-300 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
            >
              Agora não
            </button>
          </div>
        </div>
        <button onClick={handleDismiss} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
