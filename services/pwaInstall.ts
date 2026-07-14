// Shared singleton that captures the browser's `beforeinstallprompt` event
// ONCE at app startup, so multiple components (the floating banner AND the
// button inside Ajustes) can both offer "Install" without fighting over the
// same one-shot browser event.

let deferredPrompt: any = null;
let installed = false;
const listeners: Array<(canInstall: boolean) => void> = [];

const notify = () => {
  const canInstall = !!deferredPrompt && !installed;
  console.log(`[PWA Install] Notifying listeners. Can install? ${canInstall}`);
  listeners.forEach(cb => cb(canInstall));
};

export const initPwaInstallListener = () => {
  console.log('[PWA Install] Initializing listeners...');
  
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    console.log('[PWA Install] beforeinstallprompt event fired and captured!');
    e.preventDefault();
    deferredPrompt = e;
    localStorage.removeItem('zen_app_installed');
    notify();
  });

  window.addEventListener('appinstalled', () => {
    console.log('[PWA Install] App was successfully installed!');
    installed = true;
    deferredPrompt = null;
    localStorage.setItem('zen_app_installed', 'true');
    notify();
  });
};

// Best-effort memory of a past successful install
export const wasEverInstalled = () => localStorage.getItem('zen_app_installed') === 'true';

export const isIOSDevice = () =>
  /iPad|iPhone|iPod/.test(window.navigator.userAgent) && !(window as any).MSStream;

export const isRunningStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (window.navigator as any).standalone === true;

export const canPromptInstall = () => !!deferredPrompt && !installed;

export const subscribeInstallAvailability = (cb: (canInstall: boolean) => void) => {
  listeners.push(cb);
  cb(canPromptInstall());
  return () => {
    const idx = listeners.indexOf(cb);
    if (idx >= 0) listeners.splice(idx, 1);
  };
};

// Returns 'accepted' | 'dismissed' | 'unavailable'
export const triggerInstallPrompt = async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
  if (!deferredPrompt) {
    console.warn('[PWA Install] triggerInstallPrompt called but no deferredPrompt available.');
    return 'unavailable';
  }
  console.log('[PWA Install] Triggering browser install prompt...');
  deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  console.log(`[PWA Install] User choice outcome: ${choice.outcome}`);
  deferredPrompt = null;
  notify();
  return choice.outcome === 'accepted' ? 'accepted' : 'dismissed';
};

export const shareInstallLinkViaWhatsApp = () => {
  const url = window.location.origin;
  const text = `Baixe o Zenos Finance, meu app de controle financeiro: ${url}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
};
