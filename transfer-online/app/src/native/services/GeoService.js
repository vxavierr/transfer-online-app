/**
 * src/native/services/GeoService.js — Abstração de Geolocalização
 *
 * Encapsula toda a lógica de geolocalização do app.
 * Em plataforma nativa: usa @capacitor/geolocation (foreground) e
 * @capacitor-community/background-geolocation (tracking contínuo em background).
 * Na web: usa navigator.geolocation como fallback transparente.
 *
 * NOTA DE IMPLEMENTAÇÃO: @capacitor-community/background-geolocation é um plugin
 * Capacitor puro — não tem bundle JS para importar. É registrado via
 * Capacitor.registerPlugin() e acessado em runtime no nativo.
 * Isso evita erros de resolução do bundler Vite durante o build web.
 *
 * Uso:
 *   import { GeoService } from '@/native';
 *
 *   // Pedir permissão
 *   const status = await GeoService.requestPermission();
 *
 *   // Posição atual
 *   const pos = await GeoService.getCurrentPosition();
 *
 *   // Watch contínuo (foreground)
 *   const watchId = await GeoService.watchPosition(onPosition, onError);
 *   await GeoService.clearWatch(watchId);
 *
 *   // Tracking em background (motoristas)
 *   const watcherId = await GeoService.startBackgroundTracking(onPosition);
 *   await GeoService.stopBackgroundTracking(watcherId);
 */

import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { logGpsDiagnostic, setSentryUser } from '@/lib/sentry';

/**
 * Obtém o plugin BackgroundGeolocation via registerPlugin.
 * registerPlugin é a forma correta de usar plugins Capacitor sem bundle JS.
 * Retorna null se não estiver em plataforma nativa.
 */
function getBackgroundGeolocation() {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    return Capacitor.registerPlugin('BackgroundGeolocation');
  } catch (e) {
    console.warn('[GeoService] Não foi possível registrar BackgroundGeolocation:', e.message);
    return null;
  }
}

const GeoService = {
  /**
   * Pede permissão de geolocalização.
   * Retorna 'granted' | 'denied' | 'prompt'
   */
  async requestPermission() {
    if (Capacitor.isNativePlatform()) {
      try {
        const status = await Geolocation.requestPermissions();
        return status.location;
      } catch (e) {
        console.error('[GeoService] Erro ao solicitar permissão:', e);
        return 'denied';
      }
    }
    // Web: permissão é solicitada implicitamente no primeiro uso
    return 'prompt';
  },

  /**
   * Solicita permissão de localização em background (ACCESS_BACKGROUND_LOCATION).
   * No Android 11+, o sistema não mostra "Permitir sempre" no diálogo padrão —
   * este método dispara o fluxo correto via background-geolocation plugin.
   *
   * Fluxo:
   *   1. Abre um watcher temporário com requestPermissions: true
   *   2. O plugin pede ACCESS_BACKGROUND_LOCATION ao sistema
   *   3. Android 10: mostra "Permitir sempre" no próprio diálogo
   *   4. Android 11+: mostra tela de configurações com opção "Permitir sempre"
   *   5. Watcher é removido imediatamente após o pedido
   */
  async requestBackgroundPermission() {
    if (!Capacitor.isNativePlatform()) return 'granted';
    const BackgroundGeolocation = getBackgroundGeolocation();
    if (!BackgroundGeolocation) return 'denied';
    logGpsDiagnostic('requestBackgroundPermission chamado', { platform: Capacitor.getPlatform(), pluginPresent: !!BackgroundGeolocation });
    // TODO: chamar setSentryUser({ id, username, ip_address: '{{auto}}' }) aqui se o user_id estiver disponível no contexto

    let watcherId = null;
    try {
      await new Promise((resolve) => {
        const timeout = setTimeout(resolve, 3000); // timeout de segurança
        BackgroundGeolocation.addWatcher(
          {
            requestPermissions: true,
            backgroundMessage: 'Necessário para rastreamento durante viagens',
            backgroundTitle: 'Transfer Online',
            stale: true,
            distanceFilter: 999999,
          },
          async () => {
            clearTimeout(timeout);
            resolve();
          }
        ).then(id => { watcherId = id; });
      });
    } catch (e) {
      console.warn('[GeoService] Background permission request failed:', e);
    } finally {
      if (watcherId) {
        try {
          await BackgroundGeolocation.removeWatcher({ id: watcherId });
        } catch (e) {
          console.warn('[GeoService] Falha ao remover watcher temporário de permissão de background:', e.message ?? e);
        }
      }
    }
    return 'granted';
  },

  /**
   * Posição atual — substitui navigator.geolocation.getCurrentPosition
   * Retorna objeto com propriedade coords compatível com a API web.
   */
  async getCurrentPosition(options = {}) {
    if (Capacitor.isNativePlatform()) {
      const result = await Geolocation.getCurrentPosition({
        enableHighAccuracy: options.enableHighAccuracy ?? true,
        timeout: options.timeout ?? 10000,
      });
      return result;
    }
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  },

  /**
   * Watch contínuo para foreground — substitui navigator.geolocation.watchPosition
   *
   * Assinatura espelha a API do navegador intencionalmente:
   *   watchPosition(callback, errorCallback, options)
   *
   * @param {Function} callback       - Chamado com cada posição: (position) => void
   * @param {Function|null} errorCallback - Chamado em erros de GPS: (error) => void (pode ser null)
   * @param {Object}   [options={}]   - enableHighAccuracy, timeout, maximumAge
   * @returns {Promise<string|number>} watchId — string em nativo, number na web — use em clearWatch()
   *
   * IMPORTANTE: esta função é async — em nativo retorna uma Promise com o watchId.
   * Os callers devem usar `await GeoService.watchPosition(...)`.
   */
  async watchPosition(callback, errorCallback, options = {}) {
    if (Capacitor.isNativePlatform()) {
      const watchId = await Geolocation.watchPosition(
        {
          enableHighAccuracy: options.enableHighAccuracy ?? true,
          timeout: options.timeout ?? 15000,
        },
        (position, err) => {
          if (err) {
            console.warn('[GeoService] watchPosition error:', err.code ?? err.message ?? err);
            if (errorCallback) errorCallback(err);
            return;
          }
          callback(position);
        }
      );
      return watchId;
    }
    // Web: usa navigator nativo (retorna number síncrono, wrappado em Promise para API uniforme)
    return navigator.geolocation.watchPosition(callback, errorCallback, options);
  },

  /**
   * Para um watch específico.
   * Aceita tanto watchId string (nativo) quanto number (web).
   */
  async clearWatch(watchId) {
    if (watchId === null || watchId === undefined) {
      console.warn('[GeoService] clearWatch chamado com watchId nulo/undefined — ignorado');
      return;
    }
    if (Capacitor.isNativePlatform()) {
      try {
        await Geolocation.clearWatch({ id: watchId });
        console.warn('[GeoService] clearWatch nativo concluído para watchId:', watchId);
      } catch (e) {
        console.warn('[GeoService] Falha ao limpar watch nativo (id:', watchId, '):', e.message ?? e);
      }
    } else {
      navigator.geolocation.clearWatch(watchId);
    }
  },

  /**
   * Tracking em background — para motoristas que precisam de GPS mesmo com app minimizado.
   * Usa @capacitor-community/background-geolocation via registerPlugin em nativo.
   * Fallback para watchPosition em web ou quando plugin não está disponível.
   *
   * IMPORTANTE: o watcher ID retornado deve ser guardado para chamar stopBackgroundTracking.
   */
  async startBackgroundTracking(callback, options = {}) {
    const BackgroundGeolocation = getBackgroundGeolocation();

    if (!BackgroundGeolocation) {
      console.warn('[GeoService] Background tracking não disponível — usando watchPosition como fallback');
      return this.watchPosition(callback, null, options);
    }

    logGpsDiagnostic('Registrando addWatcher', { platform: Capacitor.getPlatform(), pluginPresent: !!BackgroundGeolocation });
    return BackgroundGeolocation.addWatcher(
      {
        backgroundMessage: options.backgroundMessage ?? 'Rastreando sua localização',
        backgroundTitle: options.backgroundTitle ?? 'Tracking ativo',
        requestPermissions: true,
        stale: false,
        distanceFilter: options.distanceFilter ?? 10, // metros
      },
      (location, error) => {
        logGpsDiagnostic('Callback disparou', { ts: new Date().toISOString(), hasLocation: !!location, hasError: !!error });
        if (error) {
          logGpsDiagnostic('Erro no addWatcher', { code: error.code, message: error.message ?? String(error) });
          if (error.code === 'NOT_AUTHORIZED') {
            logGpsDiagnostic('Permissão negada — verifique Configurações > Privacidade > Localização', { code: error.code });
            return;
          }
          return;
        }
        if (location) {
          logGpsDiagnostic('Localização recebida', { lat: location.latitude, lon: location.longitude, accuracy: location.accuracy });
          // Normalize flat background-geolocation format → { coords, timestamp }
          // @capacitor-community/background-geolocation returns flat { latitude, longitude, bearing, time }
          // handlePositionUpdate expects @capacitor/geolocation format: { coords: { latitude, heading }, timestamp }
          const normalized = {
            coords: {
              latitude: location.latitude,
              longitude: location.longitude,
              accuracy: location.accuracy ?? null,
              speed: location.speed ?? null,
              heading: location.bearing ?? null,
              altitude: location.altitude ?? null,
              altitudeAccuracy: location.altitudeAccuracy ?? null,
            },
            timestamp: location.time ?? Date.now(),
          };
          callback(normalized);
        }
      }
    );
  },

  /**
   * Para o tracking em background.
   * Aceita o watcherId retornado por startBackgroundTracking.
   */
  async stopBackgroundTracking(watcherId) {
    if (!watcherId) return;
    const BackgroundGeolocation = getBackgroundGeolocation();
    if (BackgroundGeolocation) {
      await BackgroundGeolocation.removeWatcher({ id: watcherId });
    } else {
      await this.clearWatch(watcherId);
    }
  },

  /**
   * Verifica se geolocalização está disponível nesta plataforma/dispositivo.
   */
  isAvailable() {
    if (Capacitor.isNativePlatform()) {
      return Capacitor.isPluginAvailable('Geolocation');
    }
    return 'geolocation' in navigator;
  },
};

export default GeoService;
