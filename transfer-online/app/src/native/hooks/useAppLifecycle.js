/**
 * useAppLifecycle.js — Hook para reagir ao lifecycle do app nativo
 *
 * Em plataforma nativa (Android/iOS via Capacitor):
 *   - Usa @capacitor/app para detectar foreground/background
 *
 * Em web:
 *   - No-op silencioso (compatibilidade mantida)
 *
 * Uso:
 *   import { useAppLifecycle } from '@/native';
 *
 *   useAppLifecycle({
 *     onForeground: () => { console.log('App voltou ao primeiro plano'); queryClient.invalidateQueries(); },
 *     onBackground: () => { console.log('App foi para background'); },
 *   });
 *
 * @param {object} handlers
 * @param {function} [handlers.onForeground] - app voltou ao primeiro plano (isActive = true)
 * @param {function} [handlers.onBackground] - app foi para background (isActive = false)
 * @param {function} [handlers.onResume] - alias para onForeground
 * @param {function} [handlers.onPause] - alias para onBackground
 */

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export function useAppLifecycle({ onForeground, onBackground, onResume, onPause } = {}) {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      // Web: no-op. Manter compatibilidade sem nenhum side effect.
      return;
    }

    let listenerHandle = null;

    const setupListener = async () => {
      try {
        const { App } = await import('@capacitor/app');

        listenerHandle = await App.addListener('appStateChange', ({ isActive }) => {
          if (isActive) {
            if (onForeground) onForeground();
            if (onResume) onResume();
          } else {
            if (onBackground) onBackground();
            if (onPause) onPause();
          }
        });
      } catch (err) {
        // Graceful degradation — @capacitor/app pode não estar disponível
        console.warn('[useAppLifecycle] @capacitor/app não disponível:', err?.message);
      }
    };

    setupListener();

    return () => {
      if (listenerHandle) {
        listenerHandle.remove().catch(() => {});
      }
    };
  }, [onForeground, onBackground, onResume, onPause]);
}

export default useAppLifecycle;
