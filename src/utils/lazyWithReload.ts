import { lazy, type ComponentType } from 'react';

/**
 * React.lazy that survives a redeploy.
 *
 * Vite emits content-hashed chunk filenames (e.g. EvaluationDetail-CmiiBMKf.js).
 * When a new FE build ships to Vercel, those hashes change. A browser tab that
 * was loaded from the OLD build still references the OLD filenames; the first
 * time it lazy-loads a page that hasn't been fetched yet, the request 404s and
 * Vercel serves index.html (SPA fallback) in its place. The dynamic import then
 * throws "Failed to fetch dynamically imported module" / a text/html MIME error,
 * Suspense never resolves, and the user gets a blank page that also breaks
 * subsequent navigation.
 *
 * The fix: on a dynamic-import failure, force a single full-page reload. That
 * re-fetches the current index.html, which points at the new chunk filenames,
 * and the navigation succeeds. We guard with a short-lived sessionStorage stamp
 * so a genuinely-missing chunk can't loop — after one reload, a second failure
 * propagates to the ErrorBoundary instead of reloading again.
 */

const RELOAD_KEY = 'ca:chunk-reload-at';
const RELOAD_WINDOW_MS = 10_000;

function reloadedRecently(): boolean {
  try {
    const at = sessionStorage.getItem(RELOAD_KEY);
    return !!at && Date.now() - Number(at) < RELOAD_WINDOW_MS;
  } catch {
    return false; // sessionStorage unavailable (private mode) — never block.
  }
}

function markReloaded(): void {
  try {
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function lazyWithReload<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (err) {
      // The factory only does a dynamic import, so any throw here is a
      // chunk-load failure. Reload once to pick up the fresh build.
      if (!reloadedRecently()) {
        markReloaded();
        window.location.reload();
        // Stall this import until the reload swaps the page out, so React
        // doesn't flash the error boundary before navigation happens.
        return await new Promise<{ default: T }>(() => {});
      }
      throw err;
    }
  });
}
