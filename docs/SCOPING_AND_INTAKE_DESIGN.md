# Unified Scoping & Solicitation Intake — Design

**Status:** Draft for review · 2026-06-16
**Author:** design pass with Elliott
**Scope:** how an org's compliance *posture* (the obligations it owes) is determined,
combining a guided baseline, document-authoritative solicitation scans, and AI
assistance — without ever letting AI author obligations.

---

## 1. Problem

Today, **framework activation** (`program_frameworks`) is the *only* scoping
primitive. Activating a framework seeds the obligation surface (clauses mapped to
it, plus a ≤3-hop cascade walk). This works, but:

- "Framework" conflates two different ideas: **a control framework you *implement*
  (800-171, 800-53)** vs. **an authority that *applies* to you (HIPAA, CUI rules,
  CJIS)** — the latter is driven by your business/contracts, not a checkbox.
- It's a manual toggle, so scope quality depends on the user picking correctly.
  A DHS-only shop that activates 800-53 inherits the entire federal-civilian
  surface (Education, Commerce, VA…) it may not actually owe.
- It doesn't connect cleanly to the thing that *proves* what you owe: the actual
  solicitation/contract document.

## 2. Goal

**One posture, fed by three inputs at different confidence levels**, with AI
assisting (never authoring):

| Input | Answers | Confidence | Grain |
|---|---|---|---|
| **Profile** (guided questionnaire) | "What do I owe as a *baseline*?" | Self-declared (cold-start) | Framework |
| **Solicitation scan** (shipped) | "What does *this bid* require?" | **Document-authoritative** | Clause |
| **Manual** (power user) | overrides / additions | Explicit | Either |

The scan is the *higher-authority* signal — a clause printed in your RFP is proof
it applies. The profile removes the cold-start problem; the scan confirms,
refines, and **extends** it.

## 3. Principles & guardrails (non-negotiable)

1. **The catalog is curated and provenance-backed — never LLM-generated.** Every
   obligation traces to verbatim federal text (`source_authority_for_link`). AI
   **matches / extracts / explains**; it never *authors* an obligation or
   auto-applies a compliance status. (Precedent: `aiRelationshipProposalService`
   — enum-constrained, reviewer-gated, writes to `auto_proposed_*`; SSP parser —
   never auto-applies LLM-derived statuses.)
2. **Guided, not menu.** Users describe what they do; scope is derived.
3. **Two-scope model.** Ambient baseline (profile) vs. doc-scoped bid (scan) stay
   distinguishable in the UI (doc chip = bid / ambient = baseline).
4. **Tenant isolation.** Every scope write is gated on program ownership.
5. **Federal-cyber focus.** Scoping covers DFARS/FAR cyber, CMMC, 800-171/53,
   HIPAA Security Rule, 508 — not adjacent markets, not legal/contracting flows.
6. **NIST/FIPS publications ARE obligations** (800-171 mandatable independent of
   CMMC L2). Never prune obligations by `artifact_type`.

## 4. Data model

```
                         ┌───────────────────────────┐
   profile questionnaire │  program_scope_profile     │  (NEW)
        │ deterministic  │  program_id, handles_cui,  │
        │ mapping        │  handles_phi, handles_fti, │
        ▼                │  agencies[], cmmc_level…   │
   program_frameworks ◄──┘   (framework-grain scope, existing)
        │
        │   solicitation scan ──► solicitation_evaluations / _clauses (existing)
        │        │ apply (human-gated)
        ▼        ▼
   ┌──────────────────────────────────────────────┐
   │ program_scoped_clauses  (NEW)                 │  clause-grain scope
   │ program_id, clause_id (or artifact_id),       │  with provenance
   │ source ('profile'|'scan:<evalId>'|'manual'),  │
   │ confidence, added_by, added_at                │
   └──────────────────────────────────────────────┘
        │
        ▼
   get_obligation_surface / get_cascade_leverage
   seed = (clauses of activated frameworks)  ∪  (program_scoped_clauses)
```

**Key change:** the obligation-surface seed gains a **second source**. Today it's
only "clauses mapped to activated frameworks." We add "clauses explicitly scoped
in for this program" — so a scanned clause that isn't under any activated
framework can still enter posture at clause grain (document-proven, precise).

**Provenance is first-class:** every in-scope clause records *why* it's in scope
(which framework activated it, and/or which solicitation detected it). This powers
the "why is this in my scope?" explainer and the ambient-vs-bid UI signaling.

## 5. Flows

### 5.1 Onboarding (profile → baseline)
1. Guided questionnaire (evolve the existing `FrameworkQuestionnaire`): *Do you
   handle CUI? PHI? FTI? Which agencies do you contract with? Required CMMC level?*
2. Answers persist to `program_scope_profile`.
3. **Deterministic** mapping (rules, not LLM) derives framework activations
   (e.g., CUI + DoD → 800-171/CMMC; PHI → HIPAA; FTI → IRS 1075 / 800-53).
4. Manual framework toggle remains as a secondary/power-user override.

### 5.2 Solicitation scan (document-authoritative delta)
1. Upload an RFP/contract → existing scan pipeline (`/api/scans`,
   `solicitation_evaluations`).
2. **AI-assisted extraction** finds cited/incorporated clauses (incl.
   "incorporated by reference" lists, fill-in tables). Each detection is
   **grounded twice**: mapped to a curated catalog entry **and** cited to its
   in-document location. A detected clause absent from the catalog is a *curation
   gap* (fill deterministically) — never an AI-invented obligation.
3. **Reconcile** against the current posture: *"This bid invokes 5 obligations — 3
   you already track, 2 new (CJIS, IRS 1075)."*
4. User clicks **Apply** → writes `program_scoped_clauses` (source = `scan:<id>`),
   optionally offering to activate the mapped framework for broader coverage.

### 5.3 Ongoing
- Grounded assistant answers *"why is HSAR 3052.204-72 in my scope?"* /
  *"does 800-171 cover my CJIS obligation?"* from the catalog + cascade graph.

## 6. AI touchpoints (all propose-not-apply, human-gated)

| # | Use | Grounding / guardrail |
|---|---|---|
| 1 | **Solicitation clause extraction** (highest value) | Map detections → curated catalog rows; cite in-document location; unknown clause = curation gap, not invented obligation |
| 2 | **Conversational profile intake** | AI runs the dialogue; deterministic rules do answer→framework mapping |
| 3 | **Grounded assistant / "why in scope" + coaching** | Read-only over catalog + graph + program data; explains, never decides |
| 4 | **Scan→posture reconciliation summary** | AI drafts the diff; human clicks Apply; never mutates status |

**Model:** default to the latest Claude model for these features. Outputs are
schema/enum-constrained (function-calling), cost-gated, and reviewer/AAL-gated
where they touch shared data — mirroring `aiRelationshipProposalService`.

**Hard line:** AI never writes a compliance status, never marks satisfaction, and
never adds an obligation that isn't a curated catalog row.

## 7. Scope semantics

- A clause may be in scope via **both** a framework activation and a scan — posture
  **dedupes by clause**, but keeps *all* provenance reasons for the explainer.
- **Removing scope:** deactivate a framework (removes its framework-grain clauses
  unless also scan-scoped) or remove a scanned clause.
- Ambient (profile/baseline) vs. bid (scan) clauses are visually distinguished.

## 8. Build sequence (each phase independently shippable + verifiable)

- **Phase 1 — Clause-grain scope foundation.** Add `program_scoped_clauses`; make
  the surface/leverage functions read `activated-frameworks ∪ scoped-clauses`;
  wire the scan **Apply** step to write scoped clauses. *Unlocks: scans add to
  posture precisely.* (No UX change to the questionnaire yet.)
- **Phase 2 — Profile-driven baseline.** `program_scope_profile` + deterministic
  mapping → activations; questionnaire writes the profile; manual toggle demoted
  to secondary. *Unlocks: guided scope, fixes over-broad activation.*
- **Phase 3 — AI extraction on scan.** Improve clause-detection recall on messy
  docs; grounded to catalog + citations. *Unlocks: fewer missed clauses.*
- **Phase 4 — AI assistant + reconciliation + conversational intake.** The "why
  in scope" / coaching assistant; scan-diff summaries; chat-style profile intake.

Phases 1–2 are the structural core (no AI required). Phases 3–4 layer AI onto a
system that already works deterministically — so AI is an accelerant, never a
dependency or a source of truth.

## 9. Open decisions (need your call before building)

1. **Profile questions** — reuse/extend the existing `FrameworkQuestionnaire`
   6-step flow, or design a fresh intake? What's the canonical question set
   (data types handled, agencies/vehicles, CMMC level, prime vs. sub)?
2. **Auto-apply threshold** — does a high-confidence scan detection get
   pre-checked for one-click apply, or always require explicit confirm?
3. **Clause-grain vs. framework-grain default** when a scan adds something — add
   just the clause (precise) or offer to activate the whole framework (broad)?
4. **Section 508 / non-cyber** authorities — in or out of this scoping surface
   (principle: cyber + risk only)?
5. **AI rollout** — start with extraction (Phase 3) or the explainer assistant
   (Phase 4) first, once the structural core lands?

## 11. Decisions & verification (locked 2026-06-16)

**Decisions:**
1. **Keep the existing intake** (`FrameworkQuestionnaire`) for now — works today; revisit later.
2. **Pre-check high-confidence** scan detections for one-click apply.
3. **Scan adds clause-grain only** — precise to what the document expects; do *not*
   auto-activate whole frameworks.
4. **Section 508 + non-cyber security ARE in scope**, but exclude
   contracting/business obligations (hiring, finance, procurement-process, etc.).
   Principle stays "cyber & risk."
5. **AI build order:** confirm extraction exists (done — see below) → **grounded
   assistant / "why in scope" + coaching (MVP)** → conversational intake →
   scan→posture reconciliation summary.

**Scan-pipeline verification (backend trace, 2026-06-16):** solicitation clause
extraction is **in place (~80%)** and grounded:
- ✅ Parse: `documentProcessingService.extractTextFromBuffer()` — PDF/DOCX/XLSX/TXT
  (no OCR; scanned-image docs fail).
- ✅ Detect: `openAIProcessingService` — **gpt-4o-mini** + function-calling/JSON
  schema, temp 0.1, confidence 0.6–1.0, captures a 50–300 char verbatim
  `supporting_context` excerpt + free-text `location`.
- ✅ Ground to catalog: `scanValidationService` — exact → normalized → fuzzy match
  to `clauses` (`clause_code`/`normalized_code`); unmatched → `clause_id = null`
  (free-text, coverage `unknown`).
- ✅ Triggered obligations: `getTriggeredObligations()` → `get_evaluation_triggered_obligations`
  (mig 126) walks the cascade. Read-only analysis is complete.
- ⚠️ **Gap (this is Phase 1, not an extraction gap):** `POST /:id/apply` writes
  detected clauses to `project_matrix_data` + bookmarks only — it does **not** feed
  the cascade obligation surface (no `program_scoped_clauses` yet), does not create
  `obligation_instances`, and does not (by decision #3, correctly) auto-activate
  frameworks. So a scanned clause shows in the Controls matrix but not necessarily
  in the cascade dashboard's Posture/Gaps. Bridging `apply → program_scoped_clauses`
  IS Phase 1.
- ⚠️ `location` is free-text, not page/offset; `get_triggered_obligations_provenance`
  (mig 127) exists but is unused. Fine for MVP; formalize later if audit needs it.

**Net:** extraction needs no new work for the MVP. The grounded assistant reads
existing catalog + cascade-graph + program data, so it does **not** depend on the
Phase 1 bridge and can be built now.

## 10. Non-goals

- No LLM-authored or LLM-inferred obligations; no AI-applied compliance status.
- No legal/contracting workflow (cyber + risk tool only).
- No adjacent markets (SOC 2 / ISO 27001 for non-federal customers).
