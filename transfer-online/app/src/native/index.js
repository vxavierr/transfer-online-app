/**
 * src/native/index.js — Ponto de entrada da camada nativa
 *
 * Exporta todos os serviços e hooks de abstração nativa/web.
 * Use sempre este index ao importar funcionalidade nativa:
 *
 *   import { StorageService } from '@/native';
 *
 * Em vez de:
 *   import StorageService from '@/native/services/StorageService'; // evitar path direto
 */

export { default as StorageService } from './services/StorageService';

// Hooks nativos (Wave 3b+)
// export { useGeolocation } from './hooks/useGeolocation';
// export { useDeepLink } from './hooks/useDeepLink';

// Bridge (Wave 3b+)
// export { openUrl } from './bridge/BrowserBridge';
// export { shareContent } from './bridge/ShareBridge';
