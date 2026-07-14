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
        // Strip query + fragment from the URL. The /auth/callback URL carries
        // Supabase access/refresh tokens in the hash (detectSessionInUrl) until
        // supabase-js strips it — never let that reach the error store.
        if (typeof event.request.url === 'string') {
          event.request.url = event.request.url.split('#')[0].split('?')[0];
        }
      }
      // Same scrub for navigation/fetch breadcrumb URLs.
      if (event.breadcrumbs) {
        for (const b of event.breadcrumbs) {
          const u = (b as { data?: { url?: unknown } }).data?.url;
          if (typeof u === 'string') {
            (b as { data: { url: string } }).data.url = u.split('#')[0].split('?')[0];
          }
        }
      }
      return event;
    },
  });
}

export { Sentry };
