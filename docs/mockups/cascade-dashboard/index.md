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
