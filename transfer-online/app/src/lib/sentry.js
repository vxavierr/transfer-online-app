import * as Sentry from '@sentry/capacitor';
import * as SentryReact from '@sentry/react';

let initialized = false;

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) {
    console.warn('[Sentry] VITE_SENTRY_DSN não definido — Sentry desabilitado neste ambiente');
    return;
  }

  Sentry.init(
    {
      dsn,
      release: 'transfer-online@1.0.4',
      environment: import.meta.env.MODE,
      tracesSampleRate: 0,
      integrations: [SentryReact.reactErrorHandler()],
    },
    SentryReact.init
  );

  initialized = true;
}

export function logGpsDiagnostic(message, data = {}) {
  const fullMessage = `[GPS-DIAG] ${message}`;
  console.log(fullMessage, data);

  if (!initialized) return;

  Sentry.captureMessage(fullMessage, {
    level: 'info',
    tags: { category: 'gps-diag' },
    extra: data,
  });
}

export function setSentryUser(user) {
  if (!initialized) return;
  Sentry.setUser(user);
}
