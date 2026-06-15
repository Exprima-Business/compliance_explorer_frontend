# Cascade dashboard — mockup catalog

Versioned exploration for the **Cascade dashboard** (the org-wide analogue of the
per-opportunity cascade: *where you stand → what's missing → what to do*, over the
**full** obligation surface, scored by downstream leverage).

This folder is the **safety net** for an intentionally nitpicky, back-and-forth
design process. Nothing here is ever overwritten — every variation and every
revision is additive, so we can always go back to a prior look or splice pieces of
several together.

---

## Locked decisions

- **Naming triad: `Posture · Gaps · Moves`.** ("Posture" chosen over Coverage /
  Readiness — modern GRC term, competitive, neutral. "Moves" over "Plan" — catchier
  and matches the cascade.) The earlier "stand / gap / plan" wording is **retired**.
- **Document-authoritative discipline carries over from the per-opportunity cascade:**
  never assert an obligation that isn't text-backed; every item is cited; the green→coral
  authority bars tell the moat story (strong on famous frameworks, exposed in the long tail).
- **Guided, not menu-driven.** The page must answer "what do I do now / what's next / how do
  I reach my goal" without the user leaning on tabs. Two devices do this: a **journey spine**
  (setup → scope → surface → close gaps → audit-ready; stateful, shows where you are) and a
  single **next-step hero** (one explained action — *why* + *what happens next*). The hero is
  **stateful**: it recomputes per stage (first-run → "scope"; mid → "implement FIPS"; late →
  "generate SSP"; steady → "renew attestation"). Every button states its consequence; empty
  states teach.
- **Two nested scopes, signaled — never labeled.** The **org/baseline** journey is the whole
  obligation surface; a **solicitation** journey is a *subset* (one bid). Scope is carried by
  identity + provenance, NOT by "ORG/PROJECT" tags: a bid-scoped item has a **document chip +
  deadline** and says *"this solicitation requires it"*; a baseline item has no document and
  says *"across your whole program."* The cascade line (*"clears N more across your program"*)
  shows the bid **rolls up** into the baseline. Structurally the solicitation is a focused
  sub-view nested in the org, with a persistent document ribbon; a looming deadline can promote
  a bid's requirement to the org's #1 next step.

## Open decisions (must be settled before building)

- **Which layout(s) to commit to** (see recommendation below).
- **Coverage semantics** — what "covered" and "applicable" mean (the numbers that drive
  Posture/Gaps). This is the biggest product risk and gates the build.
- **Seed grain** — leverage scored from controls vs. clauses.

---

## Variations

Each `.html` is **self-contained** (open it in a browser via the shared `_shell.css`).
The content between the `MOCKUP FRAGMENT` markers is the exact source rendered in chat
by the visualize tool — to re-render or splice, that fragment is what gets used.

| File | Name | What it is | Role in the product |
|------|------|------------|---------------------|
| [A-command-center.html](A-command-center.html) | **A · command center** | Slim Posture/Gaps/Authorities strip above a hero list of **Moves ranked by what they unlock**. | **The MVP** — the dashboard widget. Action-first. |
| [B-move-detail.html](B-move-detail.html) | **B · move detail** | Drill-in for one move (FIPS crypto): the full unlock tree, grouped by authority, each obligation **cited** + open/covered. | The click-through off any move. |
| [C-gaps.html](C-gaps.html) | **C · gaps** | The overlooked obligations that apply but aren't covered, grouped by category, each traced to its triggering clause ("via …"). | The "Gaps" deep view — the surprise surface. |
| [D-posture-first.html](D-posture-first.html) | **D · posture-first** | Coverage ring + by-authority breakdown as the hero — the moat thesis at a glance. | The "Posture" deep view. |

> **v0 (retired):** the original single-view "stand / gap / plan" triad was rendered in
> chat before the naming was locked. Not saved as a file — superseded by `Posture · Gaps · Moves`
> and the split surfaces above. Reconstruct on request if ever needed.

### Assembled pages & states

The components above composed into real pages, plus journey states. These are the
closest to "what the product actually looks like."

| File | What it is |
|------|------------|
| [full-page.html](full-page.html) | The dashboard as one scroll: **Posture → Gaps → Moves**, no guidance layer. The plain composition. |
| [full-page-guided.html](full-page-guided.html) | Same page **+ the guidance layer**: journey spine + next-step hero on top. The recommended direction. |
| [first-run.html](first-run.html) | Empty/onboarding state: welcome, mostly-locked spine, and the **two nested onramps** (org questionnaire primary; solicitation upload branching off it) + a teaching strip of what's coming. |
| [scope-signaling.html](scope-signaling.html) | The two-scopes study: the **same move** framed by the baseline vs. by a live solicitation — proving scope reads without labels (document chip + deadline + "this solicitation requires it" vs. ambient "across your whole program"). |
| [solicitation-subview.html](solicitation-subview.html) | The **project-level full page** — inside one bid. Persistent document ribbon, bid-scoped spine (parsed → surfaced → checked → close gaps → bid-ready), "14 of 19 requirements / 74% bid-ready", gaps **cited to the in-document clause** (`via VAAR 852.204-71 · SOW §C.5`) + the authoritative-text caveat, and an explicit rollup footer ("62% → ~68%"). Same pattern as the org page, scoped + rolled up. |
| [audit-ready.html](audit-ready.html) | The **end-state**. Completed spine (flag planted), green 94% posture, the next step shifts from *fixing* to *proving* ("generate your OSCAL SSP + POA&M package"), honest residual ("5 remain: 3 accepted risks, 2 in progress"), and a **"Stay ready" loop** of recurring obligations with due dates — audit-ready as a *maintained* state, not a finish line. |

### Redesign exploration (2026-06-15) — legibility pass

After the live dashboard still read as confusing (Coverage vs Gaps disconnected, no
provenance, mandatory-vs-recommended unclear, gaps not tied to action), a redesign
direction. Learns from Vanta/Drata *patterns* (compliance-progress headline + domain
cards; list → detail) but stays leaner — deliberately NOT chart-heavy. Mockups only.

| File | What it is |
|------|------------|
| [redesign-overview.html](redesign-overview.html) | Matured **overview**: one coverage headline + "needs attention / X of Y" domain cards (Requirements · Controls · Renewals) + a ranked "Do next" actions list. |
| [redesign-requirements-register.html](redesign-requirements-register.html) | The **Requirements register** — the fix for the Gaps confusion. Each row ties together: identifier + title, authority, **Required/Referenced** badge, **"applies because…"** provenance (the cascade chain), coverage **status %** (same data as the headline), and a **Fix →** action. Coverage roll-up in the header. |

> Not built yet — a real restructure (Coverage + Gaps unified into one requirements
> register, provenance on every row, gap→fix wiring). The still-unmocked third surface
> is the **requirement detail** (verbatim citation + why-it-applies + how-to-fix), where
> the "how do we know this is correct" trust answer lives. Terminology: drop "owe" →
> "requirements" / "what applies to you".

### How they compose (current recommendation)

- **Dashboard widget** = **A** (the MVP; needs the new `get_cascade_leverage` backend).
- **Posture page** (dedicated deep view) = **D + C + Moves** stacked.
- **Move drill-in** = **B**, off either surface.

All read from two backends: `get_cascade_leverage` (the Moves) + a coverage roll-up
(Posture/Gaps).

---

## How we manage rollbacks & remixing

**Principle: additive + version-controlled. Nothing is lost; any prior state or hybrid
is reconstructable.**

**Mockup phase (now):**
- New variation or revision → a **new file** (e.g. `A2-...`, `A+B-hybrid-...`). Never
  overwrite an existing one.
- "Go back to D" → re-render D's fragment. "Use B's tree with A's strip" → compose a new
  file from those fragments and render it.
- Git tracks every change to this folder.

**Build phase (later):**
- Branch `feat/cascade-dashboard`, **one commit per iteration**, clear messages.
- Tag milestones (`ui-v1`, `ui-v2`) so rollback is one command (`git checkout` / `revert`).
- Build as **modular components** (`PostureRing`, `AuthorityBars`, `GapList`, `MoveRow`,
  `MoveDetail`) so "use portions of multiple versions" = swapping components, not rewriting.
- The preview tool shows each version live.

---

## Data is illustrative

Every number, identifier, and citation in these mockups is **representative**, not yet
computed from a real org. Real org-wide leverage scores start modest and grow with graph
density. Treat the mockups as layout/voice exploration — the data contract is a separate
(open) decision above.
