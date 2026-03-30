import { Capacitor } from '@capacitor/core';

let _PushNotifications = null;

async function getPushPlugin() {
  if (_PushNotifications) return _PushNotifications;
  if (!Capacitor.isNativePlatform()) return null;
  const mod = await import('@capacitor/push-notifications');
  _PushNotifications = mod.PushNotifications;
  return _PushNotifications;
}

export const PushNotificationService = {
  async register() {
    const Push = await getPushPlugin();
    if (!Push) return;

    const result = await Push.requestPermissions();
    if (result.receive !== 'granted') {
      console.warn('[Push] Permission not granted:', result.receive);
      return;
    }

    await Push.register();

    Push.addListener('registration', (token) => {
      console.log('[Push] FCM token:', token.value);
    });

    Push.addListener('registrationError', (err) => {
      console.error('[Push] Registration error:', err.error);
    });
  },

  async onNotificationReceived(callback) {
    const Push = await getPushPlugin();
    if (!Push) return;
    Push.addListener('pushNotificationReceived', callback);
  },

  async onNotificationTapped(callback) {
    const Push = await getPushPlugin();
    if (!Push) return;
    Push.addListener('pushNotificationActionPerformed', callback);
  },

  async removeAllListeners() {
    const Push = await getPushPlugin();
    if (!Push) return;
    await Push.removeAllListeners();
  },
};

export default PushNotificationService;
