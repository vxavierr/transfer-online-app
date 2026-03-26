/**
 * useTelemetryTracker.js
 *
 * Hook que abstrai o controle do Foreground Service nativo de telemetria GPS.
 * Em contextos web (não-nativos) todas as funções são no-op e isNativeAvailable = false.
 *
 * Uso:
 *   const { startNativeTracking, stopNativeTracking, flushNativeTracking, isNativeAvailable }
 *     = useTelemetryTracker();
 */

import { Capacitor } from '@capacitor/core';
import TelemetryForeground from '../bridge/TelemetryForegroundBridge';
import StorageService from '../services/StorageService';

const BASE44_URL = 'https://base44.app';
const SEND_INTERVAL_MS = 5000;

/**
 * Obtém o token de autenticação do Base44.
 *
 * Strategy (in order):
 *  1. localStorage — the Base44 SDK writes 'base44_access_token' here directly
 *     (see StorageService.js comment: SDK keys are NOT migrated to Preferences).
 *  2. StorageService fallback — covers edge cases where the app explicitly
 *     mirrored the token into native Preferences (e.g. after a native login flow).
 *
 * Called fresh on each startNativeTracking() invocation so it picks up tokens
 * that may have been set after the initial component mount.
 *
 * Veja: app/src/lib/app-params.js → getAppParamValue("access_token")
 */
async function getAuthToken() {
  // Primary: localStorage (where Base44 SDK stores it)
  try {
    const lsToken = localStorage.getItem('base44_access_token');
    if (lsToken) return lsToken;
  } catch (_) {
    // localStorage inaccessible (private mode, cleared, etc.) — continue to fallback
  }

  // Fallback: native Preferences via StorageService
  try {
    const prefToken = await StorageService.get('base44_access_token');
    if (prefToken) return prefToken;
  } catch (_) {
    // StorageService unavailable — swallow and fall through
  }

  console.warn('[TelemetryTracker] No auth token found — telemetry requests will fail with 401');
  return '';
}

export function useTelemetryTracker() {
  const isNativeAvailable = Capacitor.isNativePlatform() && TelemetryForeground !== null;

  /**
   * Inicia o rastreamento via Foreground Service nativo.
   *
   * @param {string} driverId  ID do motorista
   * @param {string} sessionId ID da sessão de telemetria (gerado pelo backend)
   * @param {string} [vehicleId] ID do veículo (opcional)
   * @returns {Promise<boolean>} true se nativo foi iniciado, false se não disponível
   */
  async function startNativeTracking(driverId, sessionId, vehicleId = '') {
    if (!isNativeAvailable) return false;

    try {
      const token = await getAuthToken();

      await TelemetryForeground.start({
        url:            BASE44_URL,
        token,
        vehicleId,
        driverId,
        sessionId,
        sendIntervalMs: SEND_INTERVAL_MS,
      });

      console.log('[useTelemetryTracker] Native tracking started — session:', sessionId);
      return true;
    } catch (err) {
      console.error('[useTelemetryTracker] startNativeTracking failed:', err);
      return false;
    }
  }

  /**
   * Para o rastreamento nativo.
   */
  async function stopNativeTracking() {
    if (!isNativeAvailable) return;

    try {
      await TelemetryForeground.stop();
      console.log('[useTelemetryTracker] Native tracking stopped');
    } catch (err) {
      console.error('[useTelemetryTracker] stopNativeTracking failed:', err);
    }
  }

  /**
   * Solicita flush imediato do buffer de eventos pendentes.
   */
  async function flushNativeTracking() {
    if (!isNativeAvailable) return;

    try {
      await TelemetryForeground.requestImmediateFlush();
    } catch (err) {
      console.warn('[useTelemetryTracker] flushNativeTracking failed:', err);
    }
  }

  return {
    startNativeTracking,
    stopNativeTracking,
    flushNativeTracking,
    isNativeAvailable,
  };
}
