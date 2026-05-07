# Frontend Security Audit & Remediation — May 2026

_Last updated: 2026-05-07_

This is the frontend-side companion to the full security audit. The
authoritative record is in the backend repo at
[`docs/SECURITY_AUDIT_2026-05.md`](../../../../../Compliance_Explorer_Backend/docs/SECURITY_AUDIT_2026-05.md).

---

## What was audited

- Whole-repo source scan for XSS sinks, dangerous DOM patterns, eval-likes,
  open redirects, postMessage handlers
- Supabase client usage (auth-only vs direct table access)
- Build configuration (Vite, Vercel)
- Dependency CVEs
- Deployment env var hygiene
- Local git config (PAT exposure)

## Findings & remediations

### Application code

**No exploitable vulnerabilities found.** The codebase is clean of:

- `dangerouslySetInnerHTML`, `innerHTML=`, `eval`, `new Function`,
  `document.write`, `srcdoc`, `javascript:` URIs
- Direct `supabase.from()` / `supabase.rpc()` calls (only `auth.*` and a
  single Realtime channel on `bookmarks`)
- `postMessage` listeners without origin checks
- Service workers that cache user data without scoping
- Source maps in production builds

`target="_blank"` at `src/components/ClauseCard.tsx:401` correctly pairs with
`rel="noopener noreferrer"`.

### Dependencies — all closed

| Issue | Action | Commit |
|---|---|---|
| `jspdf 4.2.0` (CRITICAL: HTML injection in new-window output, CVSS 9.6) — not reachable in our code (we use `autoTable` + `doc.save()` only) | Bumped to 4.2.1 anyway | `1e1dc56` (cherry-picked to `main` as `420aea4`) |
| `lodash-es <= 4.17.23` (HIGH: `_.template` injection) — not reachable, no `_.template` calls | `npm audit fix` | `1e1dc56` |
| `dompurify` transitive (CRITICAL: prototype pollution) — not reachable, no direct dompurify imports | `npm audit fix` | `1e1dc56` |
| `yaml` transitive (MODERATE: stack overflow on deep nesting) — build-time only | `npm audit fix` | `1e1dc56` |

Final state: `npm audit` reports **0 vulnerabilities** of any severity.

### Repo hygiene

| Issue | Action | Commit |
|---|---|---|
| `.env.txt` filename didn't match conventional gitignore patterns (real keys committed in commit `e337765`, scrubbed in `b5416e4` 9 months prior) | Renamed to `.env.example` | `1e1dc56` |
| Orphaned `src/db/migrations/{001_initial_schema.{sql,d.ts},003_add_anon_policies.sql}` from a never-applied prototype — the 003 file would grant anon SELECT on tables if mistakenly applied | Deleted | `1e1dc56` |

### Local-machine hygiene

| Issue | Action |
|---|---|
| Frontend `.git/config` remote URL contained an embedded GitHub PAT (`ghp_oh0kIBE8…`) — not committed, but readable to anything with file system access | URL rewritten to authless HTTPS; PAT revoked at GitHub by user 2026-05-07 |

## What stays clean by design

- Supabase client is initialized with the publishable key only, never the
  secret. Verify `src/lib/supabase.ts` if changes are ever made.
- All API calls go through `${VITE_API_URL}/api/*` with `Authorization: Bearer
  ${session.access_token}`. Backend handles all data access; frontend never
  bypasses to Supabase REST for tenant data.
- No PII or auth tokens stored in localStorage by app code beyond Supabase's
  own session storage (which is industry standard).
- `vercel.json` ships sane security headers: `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy:
  strict-origin-when-cross-origin`, `Permissions-Policy` denying camera/mic/geo.

## Final state

- 0 production-tree dependency vulnerabilities
- No exploitable application code paths
- Modern Supabase publishable key in use (`sb_publishable_*`)
- Clean local git config

See backend [`docs/SECURITY_AUDIT_2026-05.md`](../../../../../Compliance_Explorer_Backend/docs/SECURITY_AUDIT_2026-05.md)
for the full incident record, including the leaked credentials in backend
git history that prompted the migration to modern Supabase keys.
