import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { AuthProvider } from './contexts/AuthContext'
import { DEBUG_LOG } from './config/debug'
import { DebugErrorBoundary } from './components/DebugErrorBoundary'
import './utils/setupDebug'
import { supabase } from './lib/supabase';

// ─────────────────────────────────────────────────────────────────────────────
// Auth debugging blocks below are gated on DEBUG_LOG (per security audit
// 2026-06 v2, Critical FE finding). Earlier versions of this file printed
// session.access_token / session.refresh_token to the browser console on
// EVERY auth event, EVERY page load, and via window-attached debug helpers
// — unconditionally, in production. Anyone with devtools access (the user,
// a coworker over screen share, a malicious browser extension, a captured
// recording, a console-forwarding tool) could exfiltrate the JWT and
// refresh token. Refresh tokens survive browser restart and can be
// exchanged for fresh access tokens until revoked at Supabase.
//
// All sensitive logging now requires `DEBUG_LOG === true` AND the window
// helpers attach only in that mode. In production the entire block is dead
// code, eliminated by the Vite bundler's dead-code elimination.
// ─────────────────────────────────────────────────────────────────────────────

if (DEBUG_LOG) {
  // --- Supabase Auth Event Logging ---
  if (typeof window !== 'undefined' && !(window as any).__SUPABASE_AUTH_LOGGED) {
    (window as any).__SUPABASE_AUTH_LOGGED = true;
    supabase.auth.onAuthStateChange((event, session) => {
      console.log('[SUPABASE AUTH EVENT]', event, session ? { hasSession: true, userId: session.user?.id } : null);
      if (session) {
        const now = Math.floor(Date.now() / 1000);
        console.log('[SUPABASE AUTH SESSION STATE]', {
          // Tokens intentionally NOT logged. Need them? Run
          // window.debugRefreshSession() and copy from the structured object
          // — but only do that on your own dev machine, never on a customer
          // browser.
          expires_at: session.expires_at,
          expires_in: session.expires_in,
          now,
          expires_in_seconds: session.expires_at ? session.expires_at - now : undefined,
          userId: session.user?.id,
        });
      }
    });
  }

  // --- Global fetch interceptor for refresh token requests ---
  if (typeof window !== 'undefined' && !(window as any).__SUPABASE_FETCH_LOGGED) {
    (window as any).__SUPABASE_FETCH_LOGGED = true;
    const origFetch = window.fetch;
    window.fetch = async (...args) => {
      if (typeof args[0] === 'string' && args[0].includes('/auth/v1/token?grant_type=refresh_token')) {
        console.log('[SUPABASE REFRESH REQUEST]', { url: args[0] });
      }
      const resp = await origFetch(...args);
      if (typeof args[0] === 'string' && args[0].includes('/auth/v1/token?grant_type=refresh_token')) {
        // Refresh response body contains the new access_token + refresh_token
        // — don't log the body. Log only the status so we can see refresh
        // failures without leaking tokens.
        console.log('[SUPABASE REFRESH RESPONSE]', { status: resp.status });
      }
      return resp;
    };
  }

  // --- Log session presence after reload (no tokens) ---
  if (typeof window !== 'undefined') {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const now = Math.floor(Date.now() / 1000);
      console.log('[SSE DEBUG] Session after reload:', {
        hasSession: !!session,
        userId: session?.user?.id,
        expires_in_seconds: session?.expires_at ? session.expires_at - now : undefined,
      });
    });
  }

  // --- Manual refreshSession utility (dev-only window helper) ---
  if (typeof window !== 'undefined') {
    (window as any).debugRefreshSession = async () => {
      try {
        const result = await supabase.auth.refreshSession();
        // result.data.session contains the new access_token + refresh_token.
        // We intentionally do NOT print it here; the helper still REFRESHES
        // the session (the side effect devs actually want), and the dev can
        // inspect `result.data.session` from the returned promise in devtools
        // if they truly need to see token values.
        console.log('[SUPABASE REFRESHSESSION RESULT] (tokens redacted)', {
          hasError: !!result.error,
          hasSession: !!result.data.session,
          userId: result.data.session?.user?.id,
          expires_at: result.data.session?.expires_at,
        });
        return result;
      } catch (e) {
        console.error('[SUPABASE REFRESHSESSION ERROR]', e);
        return null;
      }
    };
    console.log('[SUPABASE DEBUG] window.debugRefreshSession() available (DEBUG_LOG mode).');
  }

  // --- Organization Validation debugging utility ---
  if (typeof window !== 'undefined') {
    (window as any).debugOrganizationValidation = async () => {
      try {
        const { OrganizationValidationService } = await import('./services/organizationValidationService');
        const userOrgs = await OrganizationValidationService.getUserOrganizations();
        console.log('[ORGANIZATION VALIDATION DEBUG]', { userOrganizations: userOrgs });
      } catch (e) {
        console.error('[ORGANIZATION VALIDATION DEBUG ERROR]', e);
      }
    };

    (window as any).debugRawOrganizationValidation = async () => {
      try {
        const { OrganizationValidationService } = await import('./services/organizationValidationService');
        const result = await OrganizationValidationService.validateOrganization();
        const { supabase: sb } = await import('./lib/supabase');
        const { data: { session } } = await sb.auth.getSession();
        console.log('[RAW ORGANIZATION VALIDATION DEBUG]', {
          result,
          hasSession: !!session,
          userId: session?.user?.id,
        });
      } catch (e) {
        console.error('[RAW ORGANIZATION VALIDATION DEBUG ERROR]', e);
      }
    };

    console.log('[ORGANIZATION VALIDATION DEBUG] window.debugOrganizationValidation() / debugRawOrganizationValidation() available (DEBUG_LOG mode).');
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      {DEBUG_LOG ? (
        <DebugErrorBoundary>
          <App />
        </DebugErrorBoundary>
      ) : (
        <App />
      )}
    </AuthProvider>
  </StrictMode>,
)
