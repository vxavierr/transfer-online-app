/**
 * BrowserService.js — Substituto de window.open para plataforma nativa
 *
 * Em plataforma nativa (Android/iOS via Capacitor):
 *   - URLs de protocolo (tel:, mailto:, whatsapp:, maps) → App.openUrl (sistema nativo)
 *   - URLs https:// → Browser.open (in-app browser)
 *
 * Em web (browser):
 *   - Delega para window.open normalmente
 *
 * Uso:
 *   import { BrowserService } from '@/native';
 *   await BrowserService.open('https://wa.me/55...');
 *   await BrowserService.open('tel:+55...');
 *
 * NOTA: Casos NÃO migrados (window.open original deve ser mantido):
 *   - window.open('', '_blank') para impressão inline (BoardingPassModal, TermosAceiteMotoristas)
 *   - window.open(standaloneUrl, '_top') em NovaReserva (redireciona na própria aba)
 */

import { Capacitor } from '@capacitor/core';

/**
 * Detecta se uma URL é de protocolo do sistema (não é HTTP/HTTPS genérico).
 * Essas URLs precisam ser abertas pelo sistema operacional via App.openUrl.
 */
function isSystemProtocolUrl(url) {
  if (!url) return false;
  return (
    url.startsWith('tel:') ||
    url.startsWith('mailto:') ||
    url.startsWith('whatsapp:') ||
    url.startsWith('geo:') ||
    url.startsWith('maps:') ||
    url.includes('wa.me/') ||
    url.includes('api.whatsapp.com/send') ||
    url.includes('maps.google.com') ||
    url.includes('maps.apple.com') ||
    url.includes('m.uber.com') ||
    url.includes('calendar.google.com')
  );
}

const BrowserService = {
  /**
   * Abre uma URL. Substituto direto de window.open para uso nativo.
   *
   * @param {string} url - URL a abrir
   * @param {string} [target='_blank'] - Alvo (usado apenas no web fallback)
   * @returns {Promise<void>}
   */
  async open(url, target = '_blank') {
    if (!url) return;

    if (!Capacitor.isNativePlatform()) {
      window.open(url, target);
      return;
    }

    if (isSystemProtocolUrl(url)) {
      // Abre no app nativo do sistema (Telefone, WhatsApp, Mapas...)
      try {
        const { App } = await import('@capacitor/app');
        await App.openUrl({ url });
      } catch (err) {
        console.error('[BrowserService] Erro ao abrir URL do sistema:', url, err);
        // Fallback para window.open se App.openUrl falhar
        window.open(url, target);
      }
    } else {
      // Abre no in-app browser do Capacitor
      try {
        const { Browser } = await import('@capacitor/browser');
        await Browser.open({ url, presentationStyle: 'popover' });
      } catch (err) {
        console.error('[BrowserService] Erro ao abrir in-app browser:', url, err);
        // Fallback para window.open se Browser.open falhar
        window.open(url, target);
      }
    }
  },

  /**
   * Fecha o in-app browser se estiver aberto.
   * No-op em web.
   *
   * @returns {Promise<void>}
   */
  async close() {
    if (!Capacitor.isNativePlatform()) return;

    try {
      const { Browser } = await import('@capacitor/browser');
      await Browser.close();
    } catch (err) {
      // Silencioso — browser pode não estar aberto
    }
  },

  /**
   * Verifica se está em plataforma nativa.
   * @returns {boolean}
   */
  isNative() {
    return Capacitor.isNativePlatform();
  },
};

export default BrowserService;
