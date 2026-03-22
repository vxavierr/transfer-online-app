/**
 * capacitor.config.ts — Transfer Online
 * Arquivo definitivo de configuração do Capacitor 8
 *
 * Gerado por: @architect (Aria)
 * Data: 2026-03-13
 * Baseado em: docs/architecture/capacitor-transformation-architecture.md
 *
 * INSTRUÇÕES DE USO:
 *   Desenvolvimento: NODE_ENV=development npm run build && npx cap sync && npx cap run android
 *   Produção:       npm run build && npx cap sync
 *
 * NOTA: Este arquivo é a cópia canônica para o build Capacitor.
 * O arquivo na raiz do projeto (../capacitor.config.ts) é referência de arquitetura apenas.
 */

import type { CapacitorConfig } from '@capacitor/cli';

// Detecção de ambiente para live reload (desenvolvimento apenas)
// Em produção, server.url NUNCA deve estar presente — remove o binding ao servidor local
const isDev = process.env.NODE_ENV === 'development';

// IP do servidor de desenvolvimento para uso no emulador Android
// 10.0.2.2 é o alias do localhost do host dentro do emulador Android
// Para dispositivo físico: substituir pelo IP local da máquina (ex: 192.168.1.100)
const DEV_SERVER_URL = process.env.DEV_SERVER_URL ?? 'http://10.0.2.2:5173';

const config: CapacitorConfig = {
  // ─── Identificação do App ─────────────────────────────────────────────────
  appId: 'com.transferonline.app',
  appName: 'Transfer Online',

  // ─── Build Web ───────────────────────────────────────────────────────────
  // Deve corresponder exatamente ao `build.outDir` do vite.config.js
  // O Vite usa 'dist' por padrão — confirmado na auditoria (codebase-audit.md seção 10)
  webDir: 'dist',

  // ─── Servidor de Desenvolvimento (Live Reload) ────────────────────────────
  // ATENÇÃO: Este bloco é REMOVIDO automaticamente em produção via isDev check
  // Em produção, a WebView serve os arquivos locais de android/app/src/main/assets/public/
  ...(isDev && {
    server: {
      // URL do servidor Vite rodando localmente
      url: DEV_SERVER_URL,
      // cleartext permite HTTP (necessário para dev; produção usa HTTPS implícito via androidScheme)
      cleartext: true,
    },
  }),

  // ─── Logging ─────────────────────────────────────────────────────────────
  // 'debug': logs verbosos (desenvolvimento)
  // 'production': apenas erros críticos
  // 'none': silencioso
  loggingBehavior: isDev ? 'debug' : 'production',

  // ─── Android ──────────────────────────────────────────────────────────────
  android: {
    // androidScheme: 'https' faz a WebView servir o app como https://localhost ao invés de
    // capacitor://localhost. Isso reduz restrições de CORS para requests ao Base44 API.
    // CRÍTICO: O Base44 SDK precisa aceitar esta origin nas políticas CORS.
    // Se CORS falhar com 'https', tentar 'http' + cleartext: true no server block.
    //
    // ADR-01 detalha a estratégia de CORS — este é o primeiro ponto a validar na Fase 1.
    androidScheme: 'https',

    // Configurações de build para release (preencher durante Fase 11)
    buildOptions: {
      // keystorePath: 'release.keystore',
      // keystorePassword: process.env.KEYSTORE_PASSWORD,
      // keystoreAlias: 'transfer-online',
      // keystoreAliasPassword: process.env.KEYSTORE_ALIAS_PASSWORD,
    },

    // Edge-to-edge: No Capacitor 8, controlado via @capacitor/system-bars plugin
    // Configurado via CSS env(safe-area-inset-*) — ver viewport-fit=cover no index.html
  },

  // ─── iOS ─────────────────────────────────────────────────────────────────
  ios: {
    // scheme: nome do URL scheme interno usado pela WebView no iOS
    // Padrão 'App' — evitar 'capacitor' para não conflitar com outros apps Capacitor
    scheme: 'App',

    // contentInset: como o conteúdo lida com safe areas (notch, home indicator)
    // 'automatic': o iOS gerencia — recomendado para compatibilidade com múltiplos devices
    contentInset: 'automatic',

    // Requisito iOS: viewport-fit=cover deve estar em index.html para safe areas funcionarem
    // <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  },

  // ─── Configuração de Plugins ──────────────────────────────────────────────
  plugins: {

    // CapacitorHttp: intercepta fetch/XHR e usa HTTP nativo do Android
    // Isso bypassa CORS completamente — requests não passam pela WebView
    CapacitorHttp: {
      enabled: true,
    },

    // @capacitor/push-notifications
    // ADR-04: Substitui Web Push/VAPID para o app nativo
    // Requer: google-services.json (Android) + APNs key .p8 (iOS)
    // BLOQUEIO EXTERNO: sem esses artefatos, push não funciona (ver ADR-04)
    PushNotifications: {
      // presentationOptions: comportamento das notificações no FOREGROUND do iOS
      // 'badge': atualiza badge counter no ícone
      // 'sound': toca som de notificação
      // 'alert': exibe banner mesmo com app aberto
      presentationOptions: ['badge', 'sound', 'alert'],
    },

    // @capacitor/splash-screen
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#2563eb',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },

    // @capacitor/keyboard
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: false,
      style: 'dark',
    },

    // @capacitor/local-notifications
    LocalNotifications: {
      smallIcon: 'ic_notification',
      iconColor: '#2563eb',
      sound: 'default',
    },

    // @capacitor/browser — ADR-07: openUrl
    Browser: {},
  },
};

export default config;
