# ClauseAtlas — Product & Technical Overview

*A federal-cyber compliance (GRC) platform for SMB government contractors.*
Last updated: 2026-06-20.

This document is the high-level guide to what ClauseAtlas does, who it's for, the
end-user journey, and how the application is wired. It is written to sit alongside
the code as the orientation layer for engineers, new team members, and product/GTM.

---

## 1. What it is

ClauseAtlas tells a federal contractor **everything they're obligated to do for cyber
and risk compliance — not just the famous frameworks — and the single highest-leverage
action to close the gap.**

Most tools stop at CMMC / NIST 800-171 / FedRAMP. Those are necessary but **saturated**
and incomplete. A real DoD/agency contract drags in a long tail of *overlooked* federal,
agency, and statutory obligations on top of the famous frameworks (DFARS clauses, agency
supplements like HSAR/VAAR/HHSAR, OMB memos, CUI rules, statutes, Section 508, media
sanitization, FIPS-validated crypto, …). That long tail is the exposure competitors don't
surface — and it's our moat.

The product answer to that long tail is the **cascade**: federal authorities reference and
mandate one another, so one well-chosen action (a "move") clears many obligations at once
across multiple authorities. ClauseAtlas computes that graph and ranks your work by it.

### Positioning in one line
> *"Your FedRAMP/CMMC isn't enough — here's the full list you also owe, made simple, with the one move that clears the most at once."*

### Who it's for
SMB federal contractors: a startup chasing its first federal contract, a sub staying
compliant under flow-down, or a prime staying audit-ready for CMMC L2. **Not** SOC 2 / ISO
27001 for non-federal customers (owned by Vanta/Drata), and **not** legal/contracting
workflows — this is a cyber-and-risk tool.

---

## 2. The moat is the data

The product is only as good as the **regulatory graph** underneath it:

`regulatory_artifacts` · `regulatory_relationships` · `clauses` · `control_frameworks` ·
`controls` · `assessment_objectives` · `control_clause_mappings` · `clause_satisfaction_methods`

Every catalog row is anchored to verbatim federal text via `source_authority_for_link` —
**no LLM-generated obligations, no inferred requirements.** AI is used for *recon, drafting,
and extraction-with-citation* that a human always reviews; it never authors an obligation or
sets compliance state. The relationships between authorities (mandates / incorporates-by-
reference / flows-down) are the edges the cascade walks.

---

## 3. The journey

The product narrates a stateful journey (rendered literally as a "spine" on the dashboard):

```
Set up ──▶ Scope frameworks ──▶ Surface obligations ──▶ Close gaps ──▶ Audit-ready
```

| Stage | What the user does | Where in the app |
|-------|--------------------|------------------|
| **Set up / Scope** | Tell the system what applies — activate frameworks, scan a solicitation | Matrix, Document Scanner, Evaluations |
| **Surface** | See the full obligation set the scope triggers (incl. the cascade-reached long tail) | Dashboard (Posture · Gaps · Moves) |
| **Close gaps** | Do the work — implement controls, attach evidence, mark satisfaction | Controls, Clause detail |
| **Track the rest** | Plan remediation of what isn't done; keep recurring duties current | POA&M, Obligations |
| **Audit-ready** | Export the audit package | SSP export, OSCAL POA&M export |

---

## 4. Page-by-page reference

### Dashboard — `/dashboard` (Command Center)
The home base you return to each visit. It is the **director**, not a workbench — it points
you at the page that does the work. Over your **organization baseline** it shows:

- **Posture** — % of your full obligation surface that's covered. Deep view at **`/posture`**:
  a coverage ring + by-authority breakdown that surfaces long-tail exposure (strong on the
  famous frameworks, weakest in agency supplements / statutes).
- **Gaps** — what applies but isn't covered. Deep view at **`/gaps`**: uncovered obligations
  grouped by authority, each traced with "why it applies," click-through to fix.
- **Moves** — *Priority Remediation*: actions ranked by how many obligations each clears.
  Click a move → a drawer shows the **"what this clears" tree** (obligations grouped by
  authority, each cited, click-through to its clause).
- **Guided layer** — a **journey spine** (where you are) + a **next-step hero** (the single
  highest-leverage action, with *why this* and *what happens next*), both recomputed from
  live data.

### Matrix — `/matrix`
The clause-centric **scoping / activation** hub. Shows which clauses apply, surfaces
"Required" framework banners with the clauses that triggered them, and lets you **activate a
framework** — the pivot that populates your obligation surface. Includes a control-family
**heatmap** (completion % per family) and a strip for scan-detected clauses.

### Controls — `/controls` (the workhorse)
Where posture actually moves. Per activated framework you:
- Toggle each control **Not started → In progress → Implemented** (marking *Implemented* or
  *N/A* requires **evidence**: notes + optional URL/file).
- Mark **assessment objectives** (the finer OSCAL grain) and see **cross-framework credit**
  (implementing 800-53 credits 800-171).
- See SPRS score and FAR 52.204-21 rollups.
- Flag an unfinished control → opens **POA&M** pre-filled.

### POA&M — `/poam`
The Plan of Action & Milestones: each weakness with a **remediation plan, owner, risk level,
target date, and milestones**. Items arrive **manually**, **auto-created** when a control/
objective flips (flagged "ready to close"), or **auto-from-gaps** off an evaluation. Exports
**CSV** and **OSCAL POA&M** — audit deliverables.

### Obligations — `/obligations` (a parallel track)
Your recurring **calendar of duties on a schedule**: annual attestations (FedRAMP/CMMC),
incident-report submissions, periodic certifications. Each is an instance with a **due date,
status, and evidence URI**; completing a recurring one auto-creates the next period.

> ⚠️ **Two different "obligations."** The *Obligations page* (`obligation_instances` — recurring
> deadlines) is **not** the same as the cascade *obligation surface* (the full set of
> regulatory obligations your frameworks trigger, scored by coverage). Same word, distinct
> systems — do not conflate them.

### Intake — Document Scanner `/document-scanner`, Evaluations `/evaluations`
Scan a solicitation (PDF) → AI extracts the clauses it triggers (single-call Claude Haiku
4.5, self-citation guard, document-authoritative). Matched clauses roll into the org baseline;
not-in-catalog finds go to **curation** (`/admin/clause-curation`) where a product owner
fleshes out the catalog fields + "How to Satisfy" methods and promotes them — the
catalog-growth loop that widens the moat.

---

## 5. How work becomes posture (the data thread)

This is the spine of the application:

```
Controls: mark control IMPLEMENTED (+ evidence)    ─┐
Controls: mark assessment objective met             ├─▶ program status tables
Clause detail: mark satisfaction method satisfied   ─┘
        │
        └─▶ GET /api/controls/project-summary  (recomputes per-framework completion %)
                │
                └─▶ Dashboard Posture %, Matrix heatmap, /posture, /gaps
                        (one shared React Query cache key → always in sync)
                        └─▶ the journey spine advances toward "Audit-ready"
                                └─▶ export SSP + OSCAL POA&M
```

So: **Matrix turns frameworks on → Dashboard says what to do → Controls (and clause
satisfaction methods) is where you do it → that recomputes posture → POA&M tracks the
remainder → Obligations keeps recurring duties current → at high posture you export the
audit package.**

---

## 6. The cascade engine (how "Moves" and coverage are computed)

- **Seed** = the obligations your activated frameworks (and scoped/scan-added clauses) directly
  bring in (`control_clause_mappings` → `clauses.artifact_id`).
- **Walk** = a recursive traversal (default 3 hops) over `regulatory_relationships`
  (`mandates`, `incorporates_by_reference`, `flows_down_to`) to pull in everything those seeds
  reference. Hop 0 = directly applicable; hop ≥ 1 = cascade-reached (the overlooked long tail).
- **A "move"** = a shared satisfaction mechanism (e.g. "Implement FIPS-validated cryptography");
  its **leverage** = how many open obligations it clears, across how many authorities.
- **Coverage** is fractional and reuses the same per-framework % as Program Readiness, so the
  dashboard number can never disagree with the Controls page.

Backend: `cascadeService` + `get_obligation_surface` / `get_cascade_leverage` /
`get_cascade_move_obligations` RPCs, exposed program-scoped (`/api/cascade/*`) and org-scoped
(`/api/cascade/org/*`).

---

## 7. Architecture notes & honest caveats

- **Org baseline vs program scope (mid-migration).** The platform is moving posture and POA&M
  from *program/project* scope up to the *organization*: the org is the durable compliance
  posture; a bid/solicitation is an overlay that inherits it and badges net-new requirements.
  Today the **Dashboard reads the org baseline**, while **Matrix / Controls / Obligations /
  POA&M are still program-scoped.** With a single program == the org baseline these line up
  exactly; unifying status writes onto the org tier (so Controls feeds an org-level posture
  directly) is the remaining "program-tier retirement."
- **No faked data.** Placeholders are explicitly labeled "computing / not tracked yet" and
  never rendered as real numbers (e.g. the Evidence KPI, bid-readiness scoring).
- **Coarse vs precise provenance.** Gaps currently show coarse "why it applies" ("in your
  NIST 800-171 scope"); precise "via {parent clause}" is a planned backend follow-up
  (returning the cascade root + edge from the surface RPC).
- **Auth.** Sole credential is an HttpOnly `ca_session` cookie + double-submit CSRF; no tokens
  in localStorage. Curation/graph mutations are gated to platform reviewers.

---

## 8. Stack & deploy

- **Frontend:** React + MUI + Vite, TanStack Query. Build = `tsc -b && vite build`. Hosted on
  Vercel (auto-deploy on push to `main`).
- **Backend:** Express + Supabase (Postgres), `@anthropic-ai/sdk` (Claude Haiku 4.5 for
  extraction/enrichment). Hosted on Railway.
- **Data:** the regulatory graph in Postgres; schema changes ship as numbered SQL migrations
  run in Supabase Studio.

---

## 9. Glossary

| Term | Meaning |
|------|---------|
| **Obligation surface** | The full set of regulatory obligations your scope triggers, incl. cascade-reached ones. |
| **Posture** | Fractional coverage across the obligation surface — broader than any single framework %. |
| **Gap** | An applicable obligation that isn't yet covered. |
| **Move** | A shared satisfaction mechanism; its value = obligations cleared (leverage). |
| **Cascade** | The graph walk that turns one action into many obligations cleared across authorities. |
| **Org baseline** | The organization's durable compliance posture (vs a per-bid overlay). |
| **Satisfaction method** | A curated, citation-backed way to satisfy a clause ("How to Satisfy"). |
| **Obligations (page)** | Recurring compliance *deadlines/attestations* — a separate system from the obligation surface. |
