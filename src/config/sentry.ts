import * as Sentry from '@sentry/react';

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

/**
 * Frontend error monitoring. No-op (disabled) unless VITE_SENTRY_DSN is set.
 * Conservative for the federal-data posture: no auto-attached PII, no tracing,
 * and request payloads/cookies stripped before sending. Init installs global
 * window.onerror + unhandledrejection handlers; the ErrorBoundary additionally
 * reports caught React render errors.
 */
export function initSentry(): void {
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend(event) {
      if (event.request) {
        delete (event.request as any).cookies;
        delete (event.request as any).data;
      }
      return event;
    },
  });
}

export { Sentry };
