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
 * The browser only ever holds an opaque session token (HttpOnly, unreadable by
 * JS) plus the readable `ca_csrf` double-submit token. The Supabase JWT /
 * refresh token are handed to the BE once at /session and never stored by us
 * beyond what supabase-js already keeps.
 */
import { supabase } from '../lib/supabase';
import environment from '../config/environment';

const API_URL = environment.api.url;
const CSRF_COOKIE = 'ca_csrf';

/** Read a cookie value by name from document.cookie (null if absent). */
function readCookie(name: string): string | null {
  const escaped = name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1');
  const match = document.cookie.match(new RegExp('(?:^|; )' + escaped + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

/** The double-submit CSRF token the BE expects echoed in `x-csrf-token`. */
export function getCsrfToken(): string | null {
  return readCookie(CSRF_COOKIE);
}

/**
 * Whether a cookie session appears established. The session cookie itself is
 * HttpOnly (invisible to JS), so we use the readable CSRF cookie — set on the
 * same responses — as the observable proxy.
 */
export function hasCookieSession(): boolean {
  return !!readCookie(CSRF_COOKIE);
}

function csrfHeaders(): Record<string, string> {
  const token = getCsrfToken();
  return token ? { 'x-csrf-token': token } : {};
}

/**
 * Establish the BE cookie session from the current supabase-js session.
 * Idempotent: no-ops when a cookie session already appears present (unless
 * `force`), so the onAuthStateChange TOKEN_REFRESHED storm doesn't create a
 * new session row on every token refresh. Non-fatal on error (Bearer still
 * works during the transition).
 */
export async function ensureCookieSession(opts?: { force?: boolean }): Promise<void> {
  try {
    if (!opts?.force && hasCookieSession()) return;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token || !session?.refresh_token) return;
    await fetch(`${API_URL}/api/auth/session`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      }),
    });
  } catch {
    // Non-fatal — dual-send Bearer path keeps auth working.
  }
}

/**
 * Rotate the cookie session server-side. Called by api.ts on a 401 before
 * retrying once. Returns true on success.
 */
export async function refreshCookieSession(): Promise<boolean> {
  try {
    const resp = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: csrfHeaders(),
    });
    return resp.ok;
  } catch {
    return false;
  }
}

/** Revoke the cookie session server-side and clear the cookies (logout). */
export async function clearCookieSession(): Promise<void> {
  try {
    await fetch(`${API_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: csrfHeaders(),
    });
  } catch {
    // Non-fatal — supabase.auth.signOut() already cleared the client session.
  }
}
