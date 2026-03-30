/**
 * src/native/index.js — Ponto de entrada da camada nativa
 *
 * Exporta todos os serviços e hooks de abstração nativa/web.
 * Use sempre este index ao importar funcionalidade nativa:
 *
 *   import { StorageService } from '@/native';
 *   import { BrowserService, CameraService } from '@/native';
 *   import { useAppLifecycle, useNetworkStatus } from '@/native';
 *
 * Em vez de:
 *   import StorageService from '@/native/services/StorageService'; // evitar path direto
 *
 * Serviços disponíveis:
 *   - StorageService  : abstração localStorage/Capacitor Preferences (Wave 3a)
 *   - GeoService      : abstração navigator.geolocation/@capacitor/geolocation (Wave 3a)
 *   - CameraService   : câmera nativa/@capacitor/camera + fallback html5-qrcode (Wave 3b Fase 6)
 *   - BrowserService  : window.open → @capacitor/browser + App.openUrl (Wave 3b Fase 7)
 *
 * Hooks disponíveis:
 *   - useAppLifecycle  : foreground/background events via @capacitor/app (Wave 3b Fase 8)
 *   - useNetworkStatus : conectividade via @capacitor/network + navigator.onLine (Wave 3b Fase 8)
 */

// Serviços
export { default as StorageService } from './services/StorageService';
export { default as GeoService } from './services/GeoService';
export { default as CameraService } from './services/CameraService';
export { default as BrowserService } from './services/BrowserService';
export { PushNotificationService } from './services/PushNotificationService';

// Hooks nativos
export { useAppLifecycle } from './hooks/useAppLifecycle';
export { useNetworkStatus } from './hooks/useNetworkStatus';
export { useTelemetryTracker } from './hooks/useTelemetryTracker';

// Bridges nativas
export { default as TelemetryForeground } from './bridge/TelemetryForegroundBridge';

// Utilitários do Capacitor — re-exportados aqui para evitar imports diretos nos componentes.
// Componentes DEVEM usar esta camada em vez de importar @capacitor/core diretamente.
import { Capacitor } from '@capacitor/core';
export const isNativePlatform = () => Capacitor.isNativePlatform();
export const isPluginAvailable = (name) => Capacitor.isPluginAvailable(name);
