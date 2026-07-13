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
    // The browser only fires this when it currently considers the app NOT
    // installed - so if we see it, any stale "installed before" flag from a
    // previous install (that was later uninstalled) is now wrong. Clear it.
    localStorage.removeItem('zen_app_installed');
    notify();
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    deferredPrompt = null;
    localStorage.setItem('zen_app_installed', 'true');
    notify();
  });
};

// Best-effort memory of a past successful install, since the browser gives
// no reliable way to ask "is this already installed?" once we're viewing
// the site in a normal tab instead of the installed shortcut.
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
