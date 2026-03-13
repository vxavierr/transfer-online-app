/**
 * useNetworkStatus.js — Hook para monitorar conectividade de rede
 *
 * Em plataforma nativa (Android/iOS via Capacitor):
 *   - Usa @capacitor/network para estado inicial e mudanças em tempo real
 *
 * Em web:
 *   - Usa navigator.onLine para estado inicial
 *   - Escuta eventos 'online'/'offline' da window
 *
 * Retorna { connected: boolean, connectionType: string }
 *
 * Uso:
 *   import { useNetworkStatus } from '@/native';
 *
 *   const { connected, connectionType } = useNetworkStatus();
 *   if (!connected) { return <OfflineBanner />; }
 */

import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export function useNetworkStatus() {
  const [status, setStatus] = useState({
    connected: typeof navigator !== 'undefined' ? navigator.onLine : true,
    connectionType: 'unknown',
  });

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // Nativo: usa @capacitor/network
      let listenerHandle = null;

      const setupNativeNetwork = async () => {
        try {
          const { Network } = await import('@capacitor/network');

          // Estado inicial
          const currentStatus = await Network.getStatus();
          setStatus(currentStatus);

          // Listener de mudanças
          listenerHandle = await Network.addListener('networkStatusChange', setStatus);
        } catch (err) {
          console.warn('[useNetworkStatus] @capacitor/network não disponível:', err?.message);
        }
      };

      setupNativeNetwork();

      return () => {
        if (listenerHandle) {
          listenerHandle.remove().catch(() => {});
        }
      };
    } else {
      // Web: usa eventos da window
      const handleOnline = () => setStatus({ connected: true, connectionType: 'unknown' });
      const handleOffline = () => setStatus({ connected: false, connectionType: 'none' });

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  return status;
}

export default useNetworkStatus;
