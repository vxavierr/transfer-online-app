/**
 * StorageService — Abstração de persistência nativa/web
 *
 * Em plataformas nativas (Android/iOS via Capacitor):
 *   - Usa @capacitor/preferences (SharedPreferences no Android, UserDefaults no iOS)
 *   - Persiste dados mesmo após limpeza do cache do browser
 *   - Adequado para tokens de auth e preferências críticas do usuário
 *
 * Em browser (web):
 *   - Delega para localStorage (comportamento original preservado)
 *   - Sem quebra de compatibilidade com a versão web
 *
 * IMPORTANTE: O Base44 SDK gerencia internamente suas próprias chaves
 * (base44_access_token, base44_app_id, etc.) via app-params.js usando
 * localStorage diretamente. NÃO migrar essas chaves aqui — o SDK não
 * passará por este service. Esta abstração é para uso do app, não do SDK.
 *
 * Chaves do app que DEVEM usar StorageService em vez de localStorage direto:
 *   - app_language          (src/components/LanguageContext.jsx)
 *   - gps_permission_granted (dashboard/viagem motorista)
 *   - driver_preferred_map_app (detalhes viagem motorista)
 *   - dismissedDriverAlerts  (DashboardMotoristaV2)
 *   - nova_reserva_booking_state (NovaReserva — carrinho)
 *   - driver_safety_alert_{tripId} (DetalhesViagemMotoristaV2)
 *   - Cache de dados de receptivo (ReceptiveListEventView)
 */

import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const StorageService = {
  /**
   * Recupera um valor pelo key.
   * @param {string} key
   * @returns {Promise<string|null>}
   */
  async get(key) {
    if (Capacitor.isNativePlatform()) {
      const { value } = await Preferences.get({ key });
      return value;
    }
    return localStorage.getItem(key);
  },

  /**
   * Persiste um valor associado ao key.
   * @param {string} key
   * @param {string} value — valores não-string são convertidos via String()
   * @returns {Promise<void>}
   */
  async set(key, value) {
    if (Capacitor.isNativePlatform()) {
      await Preferences.set({ key, value: String(value) });
    } else {
      localStorage.setItem(key, value);
    }
  },

  /**
   * Remove o valor associado ao key.
   * @param {string} key
   * @returns {Promise<void>}
   */
  async remove(key) {
    if (Capacitor.isNativePlatform()) {
      await Preferences.remove({ key });
    } else {
      localStorage.removeItem(key);
    }
  },

  /**
   * Remove TODOS os valores. Use com cuidado — afeta todas as chaves do app.
   * NÃO remove chaves do Base44 SDK (que ficam em localStorage separado).
   * @returns {Promise<void>}
   */
  async clear() {
    if (Capacitor.isNativePlatform()) {
      await Preferences.clear();
    } else {
      localStorage.clear();
    }
  },
};

export default StorageService;
