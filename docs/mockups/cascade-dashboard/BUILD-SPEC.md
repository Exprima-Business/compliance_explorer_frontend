# Cascade dashboard — build spec

Turns the [mockup catalog](index.md) into a buildable backend contract. Coverage
semantics locked 2026-06-14. **No code written yet** — this is the spec to build against.

> Column/table names below are from the known schema (principle 4 catalog) but MUST be
> verified against the live DB at build time — do not trust a name here over `\d` output.

---

## Locked coverage semantics

### 1. "Covered" = objective-grain status
An obligation is **covered** when **every assessment objective** mapped to it is `met`.
- Path: obligation (clause/artifact) → `control_clause_mappings` → control(s) → `assessment_objectives`.
- Reuses the grain POA&M already runs on; honest about partial coverage (a half-done control does NOT count as covered).
- **Evidence is a secondary sub-state** (`evidenced ✓`), shown but NOT required for the coverage %. A later "audit-true" toggle can gate on evidence; v1 does not.

### 2. "Applicable" = profile for org, document for bid
Scope-dependent — this IS the two-paths design, and it encodes the document-authoritative rule.
- **Org-wide:** seed = obligations in scoped frameworks (`program_framework_scoping`) + questionnaire answers. Downstream-walked obligations are **"likely applies — confirm,"** never asserted.
- **Solicitation:** seed = clauses **detected in the document only**. Never beyond what the text names. (Already implemented: `get_evaluation_triggered_obligations`.)

### 3. Moves = controls; leverage = obligations cleared
- A **move** is an action a human takes (implement a control), not "satisfy clause X."
- **Leverage score** = count of applicable-but-uncovered obligations the control satisfies, **expanded downstream** through `regulatory_relationships` (the cascade edges: `mandates` / `incorporates_by_reference` / `flows_down_to`).
- Seed at clause grain → group by satisfying control (`control_clause_mappings`) → score by obligations cleared.

---

## The unifying insight: one walk, two seeds

Both scopes are the **same cascade walk** with a different seed set:

| | Seed | Result |
|---|------|--------|
| **Org** | obligations in scoped frameworks | full applicable surface (incl. overlooked tail) |
| **Bid** | clauses detected in the solicitation | the bid's applicable surface |

`get_evaluation_triggered_obligations` already does the bid seed. The org analogue
(`get_cascade_leverage`) is the same recursive CTE seeded from `program_framework_scoping`.

---

## `get_cascade_leverage` — function contract (migration 131)

**Signature (proposed):** `get_cascade_leverage(p_org_id uuid, p_project_id uuid, p_max_hops int default 3)`

**Steps:**
1. **Seed** — applicable obligations for the org: clauses/artifacts in the project's scoped
   frameworks (`program_framework_scoping`), filtered to `is_obligation`.
2. **Expand** — recursive CTE over `regulatory_relationships` along cascade edge types only,
   with a cycle guard + hop cap (mirror the per-eval fn). Each downstream obligation carries
   provenance (which seed + via which edge).
3. **Subtract covered** — drop obligations whose mapped assessment objectives are all `met`
   (the coverage definition). Keep the applicable-but-uncovered set.
4. **Group into moves** — join uncovered obligations to satisfying controls via
   `control_clause_mappings`. One move per control.
5. **Score** — per move: `downstream_count` (obligations it clears incl. cascade) ×
   `authority_breadth` (distinct authorities touched). Rank desc.

**Output rows (per move):** control id + label, obligations-cleared count, authorities-touched
count, the cleared-obligation ids (for the drill-in tree / move-detail view).

**Security (principle 1 — non-negotiable):**
- Filter by `p_org_id` / `p_project_id` on every per-org table; **never** return cross-tenant rows.
- If `SECURITY DEFINER`, the function body must enforce the org filter itself (RLS is bypassed).
  Audit every join that touches an org-scoped table. This is the failure mode the schema-unification
  `as any` bugs produced — design against it.

---

## Build phases

1. **M131** — `get_cascade_leverage` SQL fn (+ verify columns against live schema first).
2. **BE** — `cascadeService.ts` (rpc wrapper, non-fatal) + `cascade` route, mirroring
   `solicitationEvaluationService.getTriggeredObligations`.
3. **FE** — `useCascadeLeverage.ts` hook (React Query, keyed) + the **command-center widget (A)**
   as the MVP surface, then the guided full page, then drill-in (B).
4. **Later** — Posture roll-up (coverage % by authority), Gaps deep view, solicitation sub-view
   reuse, audit-ready/stay-ready (wire to `obligation_instances`).

## Data-readiness caveats

- Leverage richness ∝ `control_clause_mappings` density + graph edge coverage. Sparse mappings →
  obligations that can't be grouped into a move (surface them as "needs a control mapping," don't
  silently drop). Modest early numbers are expected and improve as the catalog deepens (principle 4).
- Org "applicable" is **confirmable, not asserted** — the UI must let a user mark a likely-applies
  obligation as not-applicable (with a reason), or the % will overstate exposure.
