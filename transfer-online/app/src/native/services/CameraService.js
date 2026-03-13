/**
 * CameraService.js — Abstração de câmera para nativo/web
 *
 * Em plataforma nativa (Android/iOS via Capacitor):
 *   - Usa @capacitor/camera para acessar câmera com permissão nativa
 *   - Retorna { dataUrl } para que o componente processe a imagem
 *
 * Em web (browser):
 *   - Retorna { useWebScanner: true } para delegar ao html5-qrcode
 *
 * Uso:
 *   import { CameraService } from '@/native';
 *   const result = await CameraService.scanQRCode();
 *   if (result?.useWebScanner) { // usa html5-qrcode normalmente }
 *   if (result?.dataUrl) { // processa imagem nativa }
 */

import { Capacitor } from '@capacitor/core';

const CameraService = {
  /**
   * Verifica se está em plataforma nativa.
   * @returns {boolean}
   */
  isNative() {
    return Capacitor.isNativePlatform();
  },

  /**
   * Scan de QR Code.
   *
   * Em nativo: abre câmera via @capacitor/camera, retorna { dataUrl }
   * Na web: retorna { useWebScanner: true } — componente usa html5-qrcode
   *
   * @param {function} [onError] - Callback de erro opcional
   * @returns {Promise<{dataUrl?: string, useWebScanner?: boolean} | null>}
   */
  async scanQRCode(onError) {
    if (!Capacitor.isNativePlatform()) {
      return { useWebScanner: true };
    }

    try {
      // Import dinâmico para não quebrar web (onde @capacitor/camera pode não estar disponível)
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');

      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        // Câmera traseira preferida para QR
        direction: 'BACK',
      });

      return { dataUrl: image.dataUrl };
    } catch (err) {
      // Usuário cancelou a câmera — não é erro real
      if (err?.message?.includes('User cancelled') || err?.message?.includes('cancelled')) {
        return null;
      }
      console.error('[CameraService] Erro ao abrir câmera:', err);
      if (onError) onError(err);
      return null;
    }
  },

  /**
   * Solicita permissão de câmera ao sistema.
   * Em web: retorna 'granted' (browser pede na hora do uso via getUserMedia).
   *
   * @returns {Promise<'granted'|'denied'|'prompt'>}
   */
  async requestPermission() {
    if (!Capacitor.isNativePlatform()) {
      return 'granted';
    }

    try {
      const { Camera } = await import('@capacitor/camera');
      const status = await Camera.requestPermissions({ permissions: ['camera'] });
      return status.camera;
    } catch (err) {
      console.error('[CameraService] Erro ao solicitar permissão:', err);
      return 'denied';
    }
  },

  /**
   * Verifica status atual da permissão de câmera.
   * Em web: retorna 'granted'.
   *
   * @returns {Promise<'granted'|'denied'|'prompt'>}
   */
  async checkPermission() {
    if (!Capacitor.isNativePlatform()) {
      return 'granted';
    }

    try {
      const { Camera } = await import('@capacitor/camera');
      const status = await Camera.checkPermissions();
      return status.camera;
    } catch (err) {
      console.error('[CameraService] Erro ao verificar permissão:', err);
      return 'prompt';
    }
  },
};

export default CameraService;
