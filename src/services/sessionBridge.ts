/**
 * Session bridge — establishes/clears the backend HttpOnly cookie session
 * from the supabase-js session (cookie auth Phase 3, docs in the BE repo's
 * COOKIE_AUTH_MIGRATION.md).
 *
 * Transition strategy (dual-send): during Phase 3 the app KEEPS sending the
 * Supabase Bearer token (api.ts) AND establishes the cookie here. If anything
 * in the cookie path misbehaves, auth still succeeds via Bearer — zero
 * downtime. Phase 4 removes the Bearer path once the cookie flow is verified.
 *
 * CSRF token sourcing — IMPORTANT: the BE sets `ca_session` (HttpOnly) and
 * `ca_csrf` cookies on the API origin (api.clauseatlas.com). The SPA runs on a
 * DIFFERENT host (app.clauseatlas.com), so `document.cookie` here CANNOT read
 * `ca_csrf` — cookies are host-scoped. We therefore source the double-submit
 * token from the RESPONSE BODY (`/session`, `/refresh`, `/csrf` all return
 * `csrf_token`) and keep it in memory + sessionStorage. The browser still
 * attaches the `ca_csrf` COOKIE automatically to api.clauseatlas.com requests;
 * the BE compares that cookie against the `x-csrf-token` header we echo from
 * the stored value. (The earlier document.cookie approach silently returned
 * null cross-subdomain and got every cookie write 403'd by CSRF.)
 */
import { supabase } from '../lib/supabase';
import environment from '../config/environment';

const API_URL = environment.api.url;
const CSRF_STORAGE_KEY = 'ca_csrf_token';

// In-memory token, mirrored to sessionStorage so it survives a same-tab reload
// (the ca_session cookie outlives the JS context; the token must too).
let csrfToken: string | null = readStoredToken();

function readStoredToken(): string | null {
  try {
    return sessionStorage.getItem(CSRF_STORAGE_KEY);
  } catch {
    return null;
  }
}

function setCsrfToken(token: string | null): void {
  csrfToken = token;
  try {
    if (token) sessionStorage.setItem(CSRF_STORAGE_KEY, token);
    else sessionStorage.removeItem(CSRF_STORAGE_KEY);
  } catch {
    // sessionStorage unavailable (private mode quota) — in-memory still works.
  }
}

/** Pull `data.csrf_token` out of an auth-endpoint JSON response and store it. */
async function captureCsrf(resp: Response): Promise<void> {
  try {
    const json = await resp.clone().json();
    const token = json?.data?.csrf_token;
    if (typeof token === 'string' && token) setCsrfToken(token);
  } catch {
    // body absent/non-JSON — leave the existing token in place.
  }
}

/** The double-submit CSRF token the BE expects echoed in `x-csrf-token`. */
export function getCsrfToken(): string | null {
  return csrfToken;
}

/**
 * Whether a cookie session appears established. We can't read the HttpOnly
 * session cookie, so a stored CSRF token (set only by a successful /session,
 * /refresh, or /csrf) is the observable proxy.
 */
export function hasCookieSession(): boolean {
  return !!csrfToken;
}

function csrfHeaders(): Record<string, string> {
  return csrfToken ? { 'x-csrf-token': csrfToken } : {};
}

/**
 * Establish the BE cookie session from the current supabase-js session.
 * Idempotent: no-ops when a token is already stored (unless `force`), so the
 * onAuthStateChange storm (INITIAL_SESSION / TOKEN_REFRESHED / MFA SIGNED_IN)
 * doesn't create a new session row each time. Non-fatal on error (Bearer still
 * works during the transition).
 */
export async function ensureCookieSession(opts?: { force?: boolean }): Promise<void> {
  try {
    if (!opts?.force && hasCookieSession()) return;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token || !session?.refresh_token) return;
    const resp = await fetch(`${API_URL}/api/auth/session`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      }),
    });
    if (resp.ok) await captureCsrf(resp);
  } catch {
    // Non-fatal — dual-send Bearer path keeps auth working.
  }
}

/**
 * Rotate the cookie session server-side. Called by api.ts on a 401 before
 * retrying once. Stores the rotated CSRF token from the response. Returns true
 * on success.
 */
export async function refreshCookieSession(): Promise<boolean> {
  try {
    const resp = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: csrfHeaders(),
    });
    if (resp.ok) {
      await captureCsrf(resp);
      return true;
    }
    // Refresh failed — the cookie session is gone; drop the stale token so the
    // FE stops sending it and re-establishes on the next signed-in event.
    setCsrfToken(null);
    return false;
  } catch {
    return false;
  }
}

/** Revoke the cookie session server-side and clear local CSRF state (logout). */
export async function clearCookieSession(): Promise<void> {
  try {
    await fetch(`${API_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: csrfHeaders(),
    });
  } catch {
    // Non-fatal — supabase.auth.signOut() already cleared the client session.
  } finally {
    setCsrfToken(null);
  }
}
