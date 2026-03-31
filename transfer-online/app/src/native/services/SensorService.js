/**
 * SensorService.js — Abstração de sensores de movimento
 *
 * Prioridade:
 * 1. Generic Sensor API (Accelerometer/Gyroscope) — funciona em Android WebView 67+
 * 2. DeviceMotionEvent — fallback para browsers desktop
 * 3. Stub vazio — se nada disponível
 */
import { Capacitor } from '@capacitor/core';

const SensorService = {
  _accel: null,
  _gyro: null,
  _webHandler: null,
  _callback: null,

  async start(callback) {
    this._callback = callback;

    // Tentativa 1: Generic Sensor API (Android WebView)
    if (typeof Accelerometer !== 'undefined') {
      try {
        const accel = new Accelerometer({ frequency: 20 });
        let gyro = null;

        if (typeof Gyroscope !== 'undefined') {
          gyro = new Gyroscope({ frequency: 20 });
        }

        accel.addEventListener('reading', () => {
          callback({
            acceleration: { x: accel.x, y: accel.y, z: accel.z },
            rotationRate: gyro && gyro.activated
              ? { alpha: gyro.x * (180 / Math.PI), beta: gyro.y * (180 / Math.PI), gamma: gyro.z * (180 / Math.PI) }
              : { alpha: 0, beta: 0, gamma: 0 },
            timestamp: Date.now(),
          });
        });

        accel.addEventListener('error', (e) => {
          console.warn('[SensorService] Accelerometer error:', e.error);
        });

        accel.start();
        if (gyro) {
          gyro.addEventListener('error', (e) => {
            console.warn('[SensorService] Gyroscope error:', e.error);
          });
          gyro.start();
        }

        this._accel = accel;
        this._gyro = gyro;
        console.log('[SensorService] Started via Generic Sensor API');
        return true;
      } catch (e) {
        console.warn('[SensorService] Generic Sensor API failed:', e.message);
      }
    }

    // Tentativa 2: DeviceMotionEvent (web browsers)
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
      this._webHandler = handler;
      console.log('[SensorService] Started via DeviceMotionEvent fallback');
      return true;
    }

    console.warn('[SensorService] No motion sensor available');
    return false;
  },

  async stop() {
    if (this._accel) {
      this._accel.stop();
      this._accel = null;
    }
    if (this._gyro) {
      this._gyro.stop();
      this._gyro = null;
    }
    if (this._webHandler) {
      window.removeEventListener('devicemotion', this._webHandler);
      this._webHandler = null;
    }
    this._callback = null;
  },

  isAvailable() {
    return typeof Accelerometer !== 'undefined' || typeof DeviceMotionEvent !== 'undefined';
  },
};

export default SensorService;
