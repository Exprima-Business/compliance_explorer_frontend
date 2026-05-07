# ClauseAtlas Roadmap & Strategic Plan

_Last updated: 2026-05-07_

This document is the canonical reference for ClauseAtlas's product strategy,
prioritized roadmap, and architectural decisions. Update it as decisions are
made; treat anything not captured here as informal.

---

## 1. Positioning

**ClauseAtlas is a federal-cyber Vanta for SMBs.**

- **Buyer:** Small and mid-sized businesses entering or growing in the US public
  sector market — startups going after their first federal contract,
  subcontractors becoming primes, civilian SaaS vendors pursuing FedRAMP, etc.
- **Buyer is NOT:** Large primes (Raytheon, Lockheed, GDIT, SAIC, Northrop)
  with mature federal compliance organizations.
- **Wedge:** Vanta / Drata / Secureframe own SOC2, ISO 27001, HIPAA. None of
  them seriously cover federal frameworks — FAR/DFARS, NIST 800-53, 800-171,
  CMMC, FedRAMP, ATO packages, Section 508. ClauseAtlas owns this space.
- **Scope discipline:** This is a **cyber and risk tool**, not a legal /
  contracting tool. We do not catalog labor, payment, IP, transportation, or
  other non-cyber clauses even though they appear in federal RFPs. ITAR / EAR
  are in scope **only for their cybersecurity / privacy aspects** (encryption
  export rules, deemed export, etc.).
- **Customer journey we optimize for:**
  1. SMB establishes baseline compliance to qualify for federal contracts
  2. SMB maintains posture across active frameworks
  3. New solicitation arrives → SMB drops it into ClauseAtlas → instant gap
     analysis against current posture → "can we bid? what's our roadmap?"

## 2. Customer profile assumptions

The whole product follows from these:

- **No CISO, no compliance officer.** Founder or COO wears the hat.
- **No time to read 600-page security policies.** Need plain-English action items.
- **No budget for $50k/year tools.** Need to undercut Vanta tier on price for
  the federal-specific value.
- **Stack is typical SMB SaaS:** AWS (or Azure / GCP), Okta or Auth0, Google
  Workspace or M365, Slack, GitHub, a few SaaS tools.
- **Pressure is bid-driven:** "We have an RFP due in 30 days, can we even bid?"

The product earns its keep when the SMB can:

- Onboard with minimal questionnaire, no cyber expertise
- Drop their existing artifacts (policies, SOC reports, AWS exports) and have
  the platform pre-populate compliance status across frameworks
- Get specific, stack-aware implementation guidance per control
- Have evidence pulled automatically from connected systems
- Hear from ClauseAtlas only when something requires their action
- Generate auditor-ready deliverables (SSP, POAM, ATO package) themselves

## 3. Current state (2026-05-07)

### Frameworks loaded with full control tracking

- **NIST SP 800-171 Rev 2** — 110 controls (31 basic, 79 derived), 14 families,
  full project tracking, assessment XLSX import, reciprocity mappings to DFARS
  252.204-7012, FAR 52.204-21, DFARS 252.204-7021
- **NIST SP 800-53 Moderate** — ~289 controls

### Clause catalog (`clauses` table, 183 entries)

Federal cyber/IT/privacy slice across:
FAR (53), NIST publications (18), Executive Orders (18), DFARS (14), VAAR (12),
OMB (10), CFR (7), PRIVACY (7), FIPS (5), HHSAR (5), HSAR (4), AIDAR (4),
DOSAR (3), EDAR (3), and 14 more families with 1–2 entries each.

The catalog is intentionally tilted toward cybersecurity, IT services,
privacy, and identity. Non-cyber FAR/DFARS subseries (labor, payment, IP,
transport) are **out of scope** by design.

### Architecture

- React 18 + TypeScript + Vite frontend on Vercel
- Express + TypeScript backend on Railway
- Supabase (Postgres) database
- Supabase Auth with modern API keys (`sb_publishable_*`, `sb_secret_*`),
  legacy keys retired 2026-05-07
- OpenAI integration scoped to `chat.completions` only via service-account key
- Modern JWT signing key (ECC P-256), legacy HS256 secret revoked

See [SECURITY_AUDIT_2026-05.md](./SECURITY_AUDIT_2026-05.md) for the
full security baseline.

## 4. Roadmap

### Strategic split: commodity foundation + federal differentiators

| Layer | Features | What it earns |
|---|---|---|
| **Commodity foundation** (table stakes) | Cross-framework reuse engine; stack-aware implementation guides; integrations (AWS, Okta, GitHub, M365) | Parity with Vanta/Drata so we're not deficient |
| **Federal differentiators** (where we win) | Bid-Readiness Agent; Regulation Watcher; ATO Package Generator; Drift Monitor (federal-specific notifications) | The reasons SMBs pick us over Vanta |
| **Wow-moment AI** (horizontal) | Artifact-drop inference engine | The reason SMBs adopt and stay |

### Build sequence

| Quarter | Build | Customer-visible win |
|---|---|---|
| Q1 | **P0** Cross-framework reuse engine + **artifact-drop inference engine** | "I dropped our infosec policy and 30% of 800-171 turned green" |
| Q1 | First 3 frameworks beyond NIST: **Section 508, CMMC, HIPAA** | Three new frameworks, evidence reused |
| Q2 | **P1** Stack-aware implementation guide + **AWS integration** | "ClauseAtlas told me exactly what to click in AWS" |
| Q2 | Okta + GitHub + M365 integrations | "I haven't uploaded a screenshot in months" |
| Q3 | **P3 Bid Readiness Agent** | "Drop the RFP, get a yes/no with cost & timeline" |
| Q3 | **P5b Regulation Watcher** | "ClauseAtlas told me 800-171 Rev 3 changed 11 of my controls" |
| Q4 | **P6 ATO Package Generator** | "Generated my ATO package in 30 minutes; consultant quoted $50k" |
| Q4 | **P5a Drift Monitor** (operational drift in connected systems) | "MFA broke on 2 accounts, ClauseAtlas opened a ticket" |
| Q5 | **P7** Onboarding Scope Inference (chat agent) | Trial-conversion polish |

### What we explicitly will NOT build

- **Auto-remediation** of customer systems (legal exposure)
- **Auto-submission** to government portals (eMASS, FedRAMP, SAM.gov)
- A generic policy library competing with PolicyMedical / PowerDMS
- Cross-customer benchmarking (privacy-sensitive) — defer until federal-specific spin like "X% of CMMC L2 candidates were ready in N months"

## 5. Standout features in detail

### P3 — Bid Readiness Agent

Reframes the existing scan output ("DFARS 252.204-7012 was found") into a
yes/no bid decision with a roadmap.

**Pipeline:**

```
Scan → detected clauses → required frameworks per clause → customer's current
posture → eligibility pre-checks (SAM, CAGE, NAICS, set-asides, clearances) →
effort estimate per gap → sequencing engine → bid-readiness traffic light + plan
```

**Outputs that win demos:**

- Single-page bid memo for SMB leadership: contract value, time-to-readiness,
  remediation cost, hires/changes needed
- Plain-English explanation of every cyber clause in the RFP, written for a
  founder who has never read DFARS
- Federal-specific eligibility checks (SAM status, NAICS match, past
  performance fit, required clearances, FedRAMP P-ATO presence)

### P5a — Drift Monitor (operational)

Schedule-driven scans of connected integrations. Detects:

- Configuration regression (MFA disabled, firewall loosened, public bucket,
  EOL OS, missed patches)
- Personnel changes affecting privileged access
- Cert / license expirations approaching
- New high-risk findings from cloud-native security tools

Tags findings to specific controls. Auto-opens remediation tasks. Customer sees
"Control IA-2 was IMPLEMENTED last Tuesday; today it's IN_PROGRESS because of
[evidence chain]."

### P5b — Regulation Watcher

Subscribes to:

- NIST CSRC publications RSS
- Federal Register cyber-tagged rules
- CISA Emergency / Binding Operational Directives
- DFARS Procedures, Guidance, and Information (PGI) updates
- Federal Acquisition Circulars
- OMB memoranda
- Executive Orders tagged cyber/IT/privacy
- DPC Memoranda (DoD)

For each new doc, AI:

1. Classifies relevance against the customer's active frameworks
2. Localizes the delta vs. prior version
3. Generates customer-specific impact:
   _"Your 18 controls in 800-171 family AC just changed. 11 retain valid
   evidence; 7 require re-attestation."_

This is **uniquely federal-Vanta territory**. Commodity platforms watch SOC2
changes (rare). We watch FAR, DFARS, NIST, OMB, EOs.

### P6 — ATO Package Generator

The single highest-revenue deliverable. SMBs are routinely quoted **$50k–$200k**
by consultants to write an ATO package. Tool-driven generation collapses this
to hours.

**Deliverables:**

| Artifact | NIST source | Generation approach |
|---|---|---|
| System Categorization | NIST SP 800-60 + FIPS 199 | AI from system inventory + data types |
| System Security Plan (SSP) | NIST SP 800-18 | AI from controls + evidence + system architecture |
| Plan of Action & Milestones (POAM) | NIST SP 800-37 | Generated from open gaps in `project_control_status` (already in data model) |
| Risk Assessment Report (RAR) | NIST SP 800-30 | AI from system inventory + threat modeling + control state |
| Security Assessment Report (SAR) | NIST SP 800-53A | Auto-formatted from existing assessment-import feature |
| Continuous Monitoring Plan | NIST SP 800-137 | Template-based |
| Incident Response Plan | NIST SP 800-61 | Template + customer-specific contacts |
| Contingency Plan (BCP/DR) | NIST SP 800-34 | Template + AI from system criticality |
| Configuration Management Plan | NIST SP 800-128 | Template-based |
| Privacy Impact Assessment | OMB M-03-22 | Conditional on PII presence |
| Authorization Letter | — | Finalization template |

**FedRAMP-specific additions:**

- FedRAMP SSP template (different format from generic NIST SSP)
- Control Implementation Summary (CIS)
- Control Implementation Matrix
- FedRAMP Penetration Test Plan
- Significant Change Form

**Output:** downloadable ZIP of Word/PDF documents that an Authorizing Official
can read, sign, and accept. Not a generic policy library.

**Killer feature:** versioning + diff. SSP regenerates with track-changes
against the prior version when a control changes. Auditors love change history.

### Artifact-drop inference engine (horizontal capability)

This is **one engine** that powers five customer journeys:

| Journey | What gets dropped | What comes out |
|---|---|---|
| Onboarding | Existing infosec policy, AUP, last SOC report, prior cyber Q&A | Pre-populated control statuses + gap list |
| Stack mapping | AWS Config export, Okta SSO config, M365 audit log sample | Auto-attached evidence + status updates |
| Bid prep | New RFP cyber attestation form / DFARS 7019 questionnaire | Auto-filled answers from stored posture |
| ATO assembly | System architecture diagram, dataflow doc, vendor SOC reports | Pre-populated SSP sections; auto-extracted system boundaries |
| Regulation update | New 800-171 Rev 3 / OMB memo | Customer-specific delta with which of *their* controls just changed |

**Architecture:** RAG over the customer's frameworks + controls + evidence +
their uploaded artifacts. Strong confidence-scoring on AI-derived statuses;
human review loop before anything is committed as "IMPLEMENTED."

## 6. Framework expansion plan

The catalog stays roughly where it is. The value is in **depth-of-control
beneath each clause**, not breadth.

### Clauses by tracking depth (current state)

| Tracking depth | Examples |
|---|---|
| Full framework loaded (controls + tracking) | NIST SP 800-171, NIST SP 800-53 Moderate |
| Has clear framework, not yet loaded — high priority | Section 508, CMMC L1/L2/L3, HIPAA Security Rule, FedRAMP overlays, CJIS Security Policy, IRS Pub 1075, CUI (32 CFR 2002), NISPOM (32 CFR 117), FIPS 201/PIV, OMB M-22-09 Zero Trust, EAR §740.17 ENC, ITAR §120.54 |
| Implicit in 800-53 (better as profiles/overlays) | NIST SP 800-37, 800-39, 800-30, 800-160, 800-161, FedRAMP |
| Reference / context only (not control sets) | All 18 EOs, OMB circulars, HSPDs, privacy laws (HIPAA / CCPA / CPRA / GDPR mentions) |
| Out of scope | Non-cyber FAR/DFARS subseries (labor, payment, IP, transportation) |

### Priority order for adding control tracking

| # | Framework | Customer leverage | Effort |
|---:|---|---|---|
| 1 | **Section 508 (Revised 2017)** | Every federal IT contract requires VPAT/ACR; small clean catalog (~38 success criteria) | Small |
| 2 | **CMMC L1 / L2 / L3** | Defense contractors; enforcement starting; L2 reuses 800-171 | Medium (mostly mapping) |
| 3 | **HIPAA Security Rule** | Federal healthcare; 54 standards + 24 specs | Medium |
| 4 | **FedRAMP Moderate / High** | Overlay on 800-53; tailoring metadata | Small-Medium |
| 5 | **CJIS Security Policy** | State/local LE IT contractors; ~250 areas | Large |
| 6 | **IRS Publication 1075** | FTI handlers; ~150 requirements | Medium |
| 7 | **CUI (32 CFR 2002) + NISPOM (32 CFR 117)** | Handling/marking/training; small surfaces | Small each |
| 8 | **OMB M-22-09 Zero Trust Maturity Model** | Trending federal customer ask | Small-Medium |

### Per-framework deliverable shape

For each new framework, produce four things — not just the catalog seed:

1. **Catalog seed** (controls + objectives) — the table-data work
2. **Implementation guide stubs** (AI-generated per control, customer-stack-aware) — the AI work
3. **Cross-framework mappings** to existing 800-171/800-53 — the reuse engine
4. **Evidence templates** (what proves this control is met, how to collect) — the integration work

**Status enum decision (open):** Section 508 uses
`SUPPORTS / PARTIALLY_SUPPORTS / DOES_NOT_SUPPORT / NOT_APPLICABLE` instead of
the 800-171 enum `NOT_STARTED / IN_PROGRESS / IMPLEMENTED`. Either extend the
status enum globally or store a per-framework status-config. Decide before
building Section 508.

## 7. Open questions to resolve before building

1. **Lead with the artifact-drop inference engine or the cross-framework
   reuse engine?** Both are foundational; pick one to build first. The reuse
   engine is more architecturally invasive; the inference engine has higher
   demo punch.
2. **First integration: AWS or Okta?** AWS covers more controls; Okta is
   smaller scope but cleaner contract.
3. **Status enum strategy** for non-implementation-style frameworks (Section
   508, HIPAA addressable specs, CMMC maturity)
4. **Pricing model** for ATO package generation — per package, per system, or
   tiered subscription?
5. **Hosting model for evidence artifacts** — Supabase Storage (current,
   simple) or S3 with KMS (future, enterprise)?

## 8. References

- [SECURITY_AUDIT_2026-05.md](./SECURITY_AUDIT_2026-05.md) — security baseline
- Backend: [`docs/SECURITY_AUDIT_2026-05.md`](../../../../../Compliance_Explorer_Backend/docs/SECURITY_AUDIT_2026-05.md)
- [improvements.md](./improvements.md) — pre-2026 improvement notes
- [ai-document-scanner-plan.md](./ai-document-scanner-plan.md) — original scanner
  feature design (Q4 2025)
