/**
 * safeHref — protocol allowlist for `<a href={…}>` values that come from
 * the server.
 *
 * Per security audit 2026-06 v2 (V2-H-08): URLs from
 * `regulatory_artifacts.source_url` and `clauses.reference_url` are
 * rendered into anchor tags with `target="_blank"`. Today these are
 * curated values from migrations + the controlled DITA ingest path, but
 * the regulatory-graph roadmap will add automated imports from
 * eCFR / Federal Register / NIST publications. If any future ingest
 * lets a non-https URL slip in, a `javascript:alert(document.cookie)`
 * link is one click away from full XSS (and because target="_blank"
 * opens a new tab, the user may not notice the address bar).
 *
 * Returns the URL when it starts with `https://`, `http://`, or
 * `mailto:`. Returns `undefined` (drops the `href` prop) otherwise —
 * React will render an anchor that does nothing on click, which is the
 * safe default.
 */
export function safeHref(url: string | null | undefined): string | undefined {
  if (!url || typeof url !== 'string') return undefined;
  // Strip leading whitespace defensively — `\tjavascript:` would otherwise
  // pass URL constructor checks in some browsers.
  const trimmed = url.trim();
  if (!/^(https?:\/\/|mailto:)/i.test(trimmed)) return undefined;
  return trimmed;
}
