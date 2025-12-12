// Service Worker Registration Utility
// Handles PWA service worker registration and updates

export interface SWRegistrationOptions {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onOfflineReady?: () => void;
  onError?: (error: Error) => void;
}

export async function registerServiceWorker(
  options: SWRegistrationOptions = {}
): Promise<ServiceWorkerRegistration | undefined> {
  const { onSuccess, onUpdate, onOfflineReady, onError } = options;

  // Check if service workers are supported
  if (!('serviceWorker' in navigator)) {
    console.log('[PWA] Service workers not supported');
    return undefined;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });

    console.log('[PWA] Service worker registered:', registration.scope);

    // Check for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            // New update available
            console.log('[PWA] New content available');
            onUpdate?.(registration);
          } else {
            // Content cached for offline use
            console.log('[PWA] Content cached for offline use');
            onOfflineReady?.();
            onSuccess?.(registration);
          }
        }
      });
    });

    // Handle controller change (when skipWaiting is called)
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    return registration;
  } catch (error) {
    console.error('[PWA] Service worker registration failed:', error);
    onError?.(error as Error);
    return undefined;
  }
}

export function unregisterServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return Promise.resolve(false);
  }

  return navigator.serviceWorker.ready
    .then((registration) => registration.unregister())
    .catch((error) => {
      console.error('[PWA] Unregister failed:', error);
      return false;
    });
}

// Prompt user to update when new version is available
export function promptUpdate(registration: ServiceWorkerRegistration): void {
  const waiting = registration.waiting;
  if (waiting) {
    waiting.postMessage({ type: 'SKIP_WAITING' });
  }
}

// Check if app is running as installed PWA
export function isRunningAsPWA(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

// Check if app can be installed
export function canInstallPWA(): boolean {
  return 'BeforeInstallPromptEvent' in window;
}
