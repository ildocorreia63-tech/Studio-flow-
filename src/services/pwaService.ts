import { supabase, isSupabaseConfigured } from './supabase';

export interface PwaUpdateInfo {
  isUpdateAvailable: boolean;
  registration: ServiceWorkerRegistration | null;
}

export interface PushSubscriptionData {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export class PwaService {
  private static deferredInstallPrompt: any = null;
  private static registration: ServiceWorkerRegistration | null = null;

  /**
   * Register Service Worker
   */
  static registerServiceWorker(onUpdateFound?: (reg: ServiceWorkerRegistration) => void) {
    if ('serviceWorker' in navigator && process.env.NODE_ENV !== 'development') {
      window.addEventListener('load', async () => {
        try {
          const reg = await navigator.serviceWorker.register('/sw.js');
          PwaService.registration = reg;

          // Check for SW update
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  if (onUpdateFound) {
                    onUpdateFound(reg);
                  }
                }
              });
            }
          });

          // Check if there is already a waiting worker
          if (reg.waiting && navigator.serviceWorker.controller) {
            if (onUpdateFound) {
              onUpdateFound(reg);
            }
          }
        } catch (err) {
          console.error('Service Worker registration failed:', err);
        }
      });

      // Reload page when new SW takes control
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }
  }

  /**
   * Trigger SW update application
   */
  static applyUpdate(registration: ServiceWorkerRegistration) {
    if (registration && registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }

  /**
   * Listen to beforeinstallprompt for PWA installation
   */
  static initInstallListener(onInstallableChange?: (canInstall: boolean) => void) {
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      PwaService.deferredInstallPrompt = e;
      if (onInstallableChange) {
        onInstallableChange(true);
      }
    });

    window.addEventListener('appinstalled', () => {
      PwaService.deferredInstallPrompt = null;
      if (onInstallableChange) {
        onInstallableChange(false);
      }
    });
  }

  /**
   * Prompt user to install PWA
   */
  static async promptInstall(): Promise<boolean> {
    if (!PwaService.deferredInstallPrompt) return false;

    try {
      PwaService.deferredInstallPrompt.prompt();
      const choice = await PwaService.deferredInstallPrompt.userChoice;
      PwaService.deferredInstallPrompt = null;
      return choice.outcome === 'accepted';
    } catch (err) {
      console.error('Error prompting PWA install:', err);
      return false;
    }
  }

  /**
   * Request browser Notification permission (Non-invasive)
   */
  static async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      throw new Error('Este navegador não suporta notificações de sistema.');
    }

    const permission = await Notification.requestPermission();
    return permission;
  }

  /**
   * Save Push Subscription to Supabase / Storage
   */
  static async savePushSubscriptionAsync(
    businessId: string,
    userId: string,
    subscription: PushSubscription
  ): Promise<boolean> {
    const rawSub = subscription.toJSON();
    const endpoint = subscription.endpoint;
    const p256dh = rawSub.keys?.p256dh || '';
    const auth = rawSub.keys?.auth || '';

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('push_subscriptions')
          .upsert(
            {
              business_id: businessId,
              user_id: userId,
              endpoint,
              p256dh,
              auth,
              user_agent: navigator.userAgent,
              is_active: true,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'endpoint' }
          );

        if (error) {
          console.error('Error saving push subscription to Supabase:', error);
          return false;
        }
        return true;
      } catch (err) {
        console.error('Push subscription error:', err);
      }
    }

    // Local fallback
    const key = `push_sub_${businessId}`;
    localStorage.setItem(key, JSON.stringify({ endpoint, p256dh, auth, userId }));
    return true;
  }

  /**
   * Register push notification with Service Worker if supported
   */
  static async subscribeUserToPushAsync(
    businessId: string,
    userId: string,
    vapidPublicKey?: string
  ): Promise<boolean> {
    try {
      const permission = await PwaService.requestNotificationPermission();
      if (permission !== 'granted') return false;

      if (!('serviceWorker' in navigator)) return false;

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();

      if (!sub) {
        // If VAPID key is provided, convert and subscribe
        const options: PushSubscriptionOptionsInit = {
          userVisibleOnly: true,
        };
        if (vapidPublicKey) {
          options.applicationServerKey = PwaService.urlBase64ToUint8Array(vapidPublicKey);
        }
        sub = await reg.pushManager.subscribe(options);
      }

      if (sub) {
        return await PwaService.savePushSubscriptionAsync(businessId, userId, sub);
      }
      return false;
    } catch (err) {
      console.error('Error subscribing to push notifications:', err);
      return false;
    }
  }

  private static urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}
