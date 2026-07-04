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

// The double-submit CSRF token lives in localStorage (shared across tabs), NOT
// sessionStorage (per-tab). The `ca_csrf` COOKIE is per-browser/shared, so every
// tab must echo the SAME token to match it. With a per-tab store, a second tab
// that re-established the session would rotate the shared cookie's token while
// the first tab still held a stale one — the first tab's writes then 403'd.
// localStorage + a live read on every access keeps all tabs in lockstep with the
// current cookie. The token is a double-submit value, not a secret (its security
// comes from the HttpOnly session cookie), so localStorage is an acceptable home.
function readStoredToken(): string | null {
  try {
    return localStorage.getItem(CSRF_STORAGE_KEY);
  } catch {
    return null;
  }
}

function setCsrfToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(CSRF_STORAGE_KEY, token);
    else localStorage.removeItem(CSRF_STORAGE_KEY);
  } catch {
    // localStorage unavailable (private mode quota) — degrade gracefully.
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

/** The double-submit CSRF token the BE expects echoed in `x-csrf-token`. Read
 *  live from localStorage so concurrent tabs always send the token matching the
 *  current shared `ca_csrf` cookie. */
export function getCsrfToken(): string | null {
  return readStoredToken();
}

/**
 * Whether a cookie session appears established. We can't read the HttpOnly
 * session cookie, so a stored CSRF token (set only by a successful /session,
 * /refresh, or /csrf) is the observable proxy.
 */
export function hasCookieSession(): boolean {
  return !!readStoredToken();
}

function csrfHeaders(): Record<string, string> {
  const token = readStoredToken();
  return token ? { 'x-csrf-token': token } : {};
}

// Shared in-flight recovery so concurrent callers (e.g. several bootstrap POSTs
// racing) await ONE GET /csrf rather than each minting a new token and rotating
// the shared ca_csrf cookie out from under the others' pending requests.
let csrfRecovery: Promise<void> | null = null;

/**
 * Recover a double-submit CSRF token from an existing HttpOnly cookie session.
 * GET /api/auth/csrf is CSRF-exempt (safe method), needs no Supabase session,
 * and sets a fresh `ca_csrf` cookie whose value it also returns — so after this
 * the stored token matches the cookie the browser will send. Non-fatal.
 */
async function recoverCsrfToken(): Promise<void> {
  try {
    const resp = await fetch(`${API_URL}/api/auth/csrf`, {
      method: 'GET',
      credentials: 'include',
    });
    if (resp.ok) await captureCsrf(resp);
  } catch {
    // Non-fatal — the request that triggered this will surface its own error.
  }
}

/**
 * Ensure a CSRF token is available before a state-changing cookie request.
 * No-ops when one is already stored. Recovers it from /csrf otherwise — this is
 * the fix for "localStorage cleared but the api-origin session cookie survived":
 * the user is still authenticated by the HttpOnly cookie, but had no token to
 * echo, so every POST 403'd. Concurrent callers share one recovery.
 */
export async function ensureCsrfToken(): Promise<void> {
  if (readStoredToken()) return;
  if (!csrfRecovery) {
    csrfRecovery = recoverCsrfToken().finally(() => {
      csrfRecovery = null;
    });
  }
  await csrfRecovery;
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
    if (!session?.access_token || !session?.refresh_token) {
      // No Supabase session to exchange — but a valid HttpOnly cookie session
      // may still exist (persistSession off, restored tab, or local storage
      // cleared while the api-origin cookie survived). Recover the CSRF token
      // from it so cookie-authenticated writes don't 403.
      await ensureCsrfToken();
      return;
    }
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

// Fires at most once per page life so a burst of concurrent 401s (several
// pollers hitting a just-expired session in the same tick) produces ONE
// redirect, not a stampede.
let sessionExpiredHandled = false;

/**
 * Handle a definitively-dead session: the BE rejected a cookie refresh, so the
 * HttpOnly session is gone (natural expiry, revoked elsewhere, or logout in
 * another tab). Redirect to /login, which unmounts the app shell and thereby
 * every interval poller (NotificationBell's 60s count, in-flight scan polls).
 * Without this the shell stays mounted and 401-floods forever.
 *
 * Guarded: only redirects when a session actually existed (caller checks
 * hasCookieSession() before the refresh) and never loops on /login itself. A
 * hard navigation is intentional — it guarantees all timers/EventSources die.
 */
export function handleSessionExpired(): void {
  if (sessionExpiredHandled) return;
  sessionExpiredHandled = true;
  setCsrfToken(null);
  try {
    const base = import.meta.env.PROD ? '/app' : '';
    const loginPath = `${base}/login`;
    if (!window.location.pathname.startsWith(loginPath)) {
      window.location.href = loginPath;
    }
  } catch {
    // window unavailable (non-browser) — nothing to redirect.
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
