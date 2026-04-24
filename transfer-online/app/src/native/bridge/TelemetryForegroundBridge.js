/**
 * TelemetryForegroundBridge.js
 *
 * Ponte entre o JavaScript/React e o Plugin Capacitor nativo
 * TelemetryForeground (Android Foreground Service de GPS).
 *
 * Em plataformas web (não-nativas) exporta null — o hook
 * useTelemetryTracker usa isso para decidir o fallback.
 */

import { Capacitor, registerPlugin } from '@capacitor/core';

/**
 * TelemetryForeground plugin nativo.
 * null quando não estiver em plataforma nativa (ex: browser web).
 *
 * Métodos disponíveis (Android):
 *   start({ url, token, vehicleId, driverId, sessionId, sendIntervalMs })
 *   stop()
 *   requestImmediateFlush()
 */
const TelemetryForeground = Capacitor.isNativePlatform()
  ? registerPlugin('TelemetryForeground')
  : null;

export default TelemetryForeground;
