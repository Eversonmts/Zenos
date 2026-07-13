// Shared singleton that captures the browser's `beforeinstallprompt` event
// ONCE at app startup, so multiple components (the floating banner AND the
// button inside Ajustes) can both offer "Install" without fighting over the
// same one-shot browser event.

let deferredPrompt: any = null;
let installed = false;
const listeners: Array<(canInstall: boolean) => void> = [];

const notify = () => listeners.forEach(cb => cb(!!deferredPrompt && !installed));

export const initPwaInstallListener = () => {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    deferredPrompt = e;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    deferredPrompt = null;
    notify();
  });
};

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
  if (!deferredPrompt) return 'unavailable';
  deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  deferredPrompt = null;
  notify();
  return choice.outcome === 'accepted' ? 'accepted' : 'dismissed';
};

export const shareInstallLinkViaWhatsApp = () => {
  const url = window.location.origin;
  const text = `Baixe o Zenos Finance, meu app de controle financeiro: ${url}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
};
