# ClauseAtlas — Full-Demo Punchlist (post org-baseline)

Created 2026-06-24. Context: the org-baseline re-architecture (Phases A→D) is
complete and deployed — org is the sole scope, program tier retired. This list
is everything between "demo-ready for a casual showcase" and "polished full
demo where every surface a prospect touches works."

**Legend** — Impact (to the demo) · LOE (S ≈ <1h, M ≈ 1–4h, L ≈ 4h+) ·
Risk (platform/code-change risk, per principle 1: tenant isolation + writes).

## Master priority (recommended order)

| # | Item | Impact | LOE | Risk |
|---|------|:------:|:---:|:----:|
| V1 | Smoke-test the deployed refactor (full demo path) | **High** | S | none |
| V2 | Verify Executive Report (`/report`) renders at org | Med | S | none |
| V3 | Verify org deactivate-framework clears org_control/objective_status (no orphan readiness) | Med | S | none |
| V4 | Verify SPRS / FAR / Section 508 panels populate at org | Med | S | none |
| P1 | Fix stale "Select a program to ask about your scope" copy (assistant) | Med | S | low |
| F1 | **Org auto-POA&M** — fire autoPoamService on org control/objective status changes | **High** | M | **Med** |
| F2 | POA&M-from-gaps at org (re-enable EvaluationDetail button) | Med-High | M | Med |
| F3 | Owner/lead assignment at org (RemediationDrawer owner menu) | Med | M | Med |
| I1 | xlsx Import Assessment → org route + real upload | Med | M | Med |
| I2 | SSP parse-apply → org (AI parser apply path) | Med | L | Med-High |
| P2–P6 | Cosmetic cleanup (comments, drawer scope default, ProjectGate rename, dead route, stray .d.ts) | Low | S | low |
| D1–D4 | Catalog depth (graph densification, CSF discussion_text, CMMC L1, citation precision) | Low-Med | M each | data |

---

## Tier 0 — Verify before trusting any demo (no code)

The whole program-tier retirement was shipped on typecheck only; it has not been
click-tested. This tier is pure verification.

- **V1 — Full smoke-test.** Log in → Dashboard renders → Matrix (activate a
  framework) → Controls (flip a control to Implemented w/ evidence) → back to
  Dashboard, readiness moved → Scan Solicitation → open the evaluation
  ("In baseline / New requirement" badges) → Posture → Gaps → Ask AI → Bookmarks
  → Evaluations list. Any white-screen/500 is a P0 fix.
- **V2 — Executive Report.** `/report` was flipped to org (useOrg + controlService
  org aliases) but never rendered. Confirm it loads.
- **V3 — Deactivate cleanup.** Earlier we saw 130 orphaned `program_control_status`
  rows when a framework deactivated without cascade. `deactivateOrgFramework`
  was written to clear org_control_status + org_objective_status — confirm a
  deactivate at org leaves no orphan rows inflating readiness.
- **V4 — SPRS/FAR/508.** Controls.tsx imports `fetchSPRSScoreOrg`,
  `fetchFARDetailOrg`, `fetchScopingOrg` (Section 508). These read org_control_status
  (wired in B2) so they likely work — confirm the cards populate, don't assume.

## Tier 1 — Core feature restoration (the "it used to work" gaps)

These were degraded by the refactor and are part of the headline story.

- **F1 — Org auto-POA&M.** `control.ts:1595 TODO(org-autoPoam)`: autoPoamService
  dedups/inserts keyed on `project_id`. `updateOrgControlStatus` and
  `bulkUpdateOrgObjectiveStatus` do NOT fire the hook, so flipping gaps at org
  scope creates no POA&Ms — the POA&M page stays empty after marking work. Add an
  org code path in autoPoamService (mig 144 already added the org autopopulate
  scaffolding). **Risk: Med** — POA&M inserts are tenant-isolation-sensitive;
  audit org_id on every insert/dedup query.
- **F2 — POA&M-from-gaps at org.** `solicitationEvaluations.ts:227`
  `bulkCreateFromGaps` is program-membership keyed; EvaluationDetail's button is
  disabled (program=null). Add an org variant so "create POA&Ms from this bid's
  gaps" works. Depends on F1's org POA&M path.
- **F3 — Owner/lead assignment at org.** RemediationDrawer owner menu is disabled
  (programId=null; `/api/cascade/lead/:programId/...` is program-scoped). Needs an
  org cascade-lead endpoint + lead storage at org scope. (User flagged this live
  during Phase B.)

## Tier 2 — Import / advanced (differentiators, more LOE)

- **I1 — xlsx Import Assessment.** `importAssessmentOrg` is a no-op stub. Add a BE
  `org/import-assessment` route (parse workbook → match objective identifiers →
  `bulkUpdateOrgObjectiveStatus`, which already exists) + a real multipart FE
  upload. Needs a correctly-formatted sample xlsx to demo.
- **I2 — SSP parse-apply.** `parseSSPDocumentOrg` is a stub. The AI SSP parser
  (Haiku) extracts control statuses; the apply path must write org_control_status
  via `updateOrgControlStatus`. Larger + AI-in-the-loop → highest risk in this
  tier. Keep the existing prompt-injection guard (never auto-apply LLM-derived
  status without the confirm step).

## Tier 3 — Polish & cosmetics (quick, low-risk)

- **P1 — Assistant copy.** ComplianceAssistant.tsx:125-129 still says "Select a
  program to ask about your scope" and the input is gated on `programId`
  (= org id). Reword to org; this shows during the Ask-AI demo. Also the header
  caption (line 80) and the file/service doc comments say "program's scope".
- **P2** — assistantService.ts:19 comment "active program's scope" → org.
- **P3** — RemediationDrawer default `scope='program'` (line 45) is now misleading;
  the drawer is always org. Default to 'org' and retire the vestigial `isOrg`
  plumbing.
- **P4** — Rename `ProjectGate` → `AppReadyGate` (it's an org-init gate now).
- **P5** — Remove the dead `/matrix/:projectId` route in MainApp.tsx.
- **P6** — Delete stray `SatisfactionMethodsPanel.d.ts` build artifact in src.

## Tier 4 — Catalog depth (data; ongoing, "the database IS the product")

Not demo-breaking, but improves credibility when a prospect drills into a clause.
From the standing task backlog:

- **D1** — P2 graph densification: backfill outgoing DFARS/FAR edges.
- **D2** — Backfill 53 NIST CSF v2.0 missing `discussion_text`.
- **D3** — Modernize CMMC L1 to v2.13 structure (17→15 + identifier scheme).
- **D4** — Audit speculative guidance_doc imports (isolated nodes) + residual
  citation precision (HSAR 3052.204-71, older C-4 088–094 items).

---

## Recommended cut for a "polished full demo"

Minimum to make every surface a prospect would touch work end-to-end:

**V1–V4 (verify) → P1 (assistant copy) → F1 (org auto-POA&M) → F2 (POA&M-from-gaps).**

That makes the POA&M story real (flip a gap → a POA&M appears; scan a bid →
generate POA&Ms) and removes the one visibly-wrong piece of copy. F3 + I1/I2 add
operational polish but aren't load-bearing for the core narrative. Tier 3 cosmetics
and Tier 4 data can trail.

## Deploy / sequencing notes

- F1/F2 are BE + (re-enable) FE; F1 may need a small migration only if the dedup
  index needs an org-keyed variant (mig 144 already laid groundwork — check first).
- I1/I2 are file-upload paths → cannot be verified without auth + sample files;
  ship behind their existing buttons and self-test before relying on them live.
- Everything in Tier 1–2 touches write paths → run the tenant-isolation check
  (org_id on every insert/update/dedup) before merge.
