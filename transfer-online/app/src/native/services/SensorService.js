/**
 * SensorService.js — Abstração de sensores de movimento (acelerômetro + giroscópio)
 *
 * Em plataforma nativa: usa @capacitor/motion para dados de alta frequência
 * Na web: usa DeviceMotionEvent como fallback (ou stub se não disponível)
 *
 * Dados fornecidos:
 *   - acceleration: { x, y, z } em m/s² (sem gravidade)
 *   - rotationRate: { alpha, beta, gamma } em deg/s
 */
import { Capacitor } from '@capacitor/core';

let Motion = null;
let motionListener = null;

async function getMotionPlugin() {
  if (Motion) return Motion;
  if (Capacitor.isNativePlatform()) {
    const mod = await import('@capacitor/motion');
    Motion = mod.Motion;
    return Motion;
  }
  return null;
}

const SensorService = {
  /**
   * Start listening to motion events.
   * @param {Function} callback - ({ acceleration, rotationRate, timestamp }) => void
   *   acceleration: { x, y, z } in m/s² (gravity removed)
   *   rotationRate: { alpha, beta, gamma } in deg/s
   * @returns {Promise<boolean>} true if started successfully
   */
  async start(callback) {
    const plugin = await getMotionPlugin();

    if (plugin) {
      // Native: use Capacitor Motion plugin
      motionListener = await plugin.addListener('accel', (event) => {
        callback({
          acceleration: {
            x: event.acceleration?.x ?? 0,
            y: event.acceleration?.y ?? 0,
            z: event.acceleration?.z ?? 0,
          },
          rotationRate: {
            alpha: event.rotationRate?.alpha ?? 0,
            beta: event.rotationRate?.beta ?? 0,
            gamma: event.rotationRate?.gamma ?? 0,
          },
          timestamp: Date.now(),
        });
      });
      return true;
    }

    // Web fallback: DeviceMotionEvent
    if (typeof DeviceMotionEvent !== 'undefined') {
      const handler = (event) => {
        callback({
          acceleration: {
            x: event.acceleration?.x ?? 0,
            y: event.acceleration?.y ?? 0,
            z: event.acceleration?.z ?? 0,
          },
          rotationRate: {
            alpha: event.rotationRate?.alpha ?? 0,
            beta: event.rotationRate?.beta ?? 0,
            gamma: event.rotationRate?.gamma ?? 0,
          },
          timestamp: Date.now(),
        });
      };
      window.addEventListener('devicemotion', handler);
      motionListener = { remove: () => window.removeEventListener('devicemotion', handler) };
      return true;
    }

    console.warn('[SensorService] No motion sensor available');
    return false;
  },

  /**
   * Stop listening to motion events.
   */
  async stop() {
    if (motionListener) {
      if (typeof motionListener.remove === 'function') {
        motionListener.remove();
      }
      motionListener = null;
    }
  },

  /**
   * Check if motion sensors are available.
   */
  isAvailable() {
    if (Capacitor.isNativePlatform()) return true;
    return typeof DeviceMotionEvent !== 'undefined';
  },
};

export default SensorService;
