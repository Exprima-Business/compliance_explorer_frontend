# ClauseAtlas — Data Boundary & Security FAQ

*For design partners, beta testers, and pilots. Last updated June 2026.*

This is the plain-language answer to "is it safe to put our solicitation into ClauseAtlas?"
It is the customer-facing companion to the in-app **Security & trust** page (`/security`).

---

## The data boundary (read this first)

**Upload only public or appropriately redacted solicitations.**
**Do not upload Controlled Unclassified Information (CUI), classified, or export-controlled
(ITAR/EAR) material.**

Before every upload, ClauseAtlas requires you to affirmatively acknowledge this — the uploader
is disabled until you check the box:

> *"I confirm this document contains no CUI, classified, or export-controlled information, and I
> have the right to upload it."*

ClauseAtlas is **informational tooling** — not legal advice, and not a CMMC/FedRAMP/assessment or
authorization authority. Findings come from a curated catalog cited to source authority; verify
against the official text before relying on them.

---

## FAQ

**Q: What happens to a document after I upload it?**
It is stored in encrypted, per-organization isolated storage, and its text is analyzed by an AI
model to extract the clauses and authorities it references (each with a citation). The result is
a scan you can review and save as an evaluation.

**Q: Who can see my documents and results?**
Only members of your organization. Data is separated by organization and enforced at two layers:
database row-level security and per-request API authorization that re-validates your organization
and project membership. One customer cannot read another customer's data.

**Q: Is my data encrypted?**
Yes — in transit (TLS) and at rest (managed Postgres and object storage).

**Q: Do you use my documents to train AI models?**
No. Documents are processed per-request by the AI provider (Anthropic) solely to produce your
results; they are not used to train models.

**Q: Who are your subprocessors?**
Application hosting (Railway), the frontend host (Vercel), the managed database/storage
(Supabase), and the AI processor (Anthropic). Each operates the service under contract.

**Q: How is my account protected?**
Sessions use an HttpOnly, Secure cookie (no credentials in browser-accessible storage), CSRF
protection on every state-changing request, and optional multi-factor authentication (TOTP), with
step-up (AAL2) required for sensitive operations.

**Q: How long do you keep my scans, and can I delete them?**
Scans are retained on a rolling schedule and pruned automatically. You can request **deletion or
an export** of your data at any time by emailing support — we action these promptly.

**Q: What file types and sizes can I upload?**
PDF, Word, Excel, and text, up to 25 MB. Uploads are validated by file signature (magic bytes),
not just the declared type, and rejected if they don't match.

**Q: What if I find a security issue?**
Email us and we'll respond quickly (see contact below). We welcome responsible disclosure.

**Q: Is ClauseAtlas an assessor / can it certify me?**
No. ClauseAtlas helps you understand and track your obligations and coverage. It does not perform
assessments, issue ATOs, or grant CMMC certifications.

---

## Current security controls (summary)

| Area | Control |
|------|---------|
| Authentication | HttpOnly Secure session cookie · CSRF double-submit · MFA (TOTP) · AAL2 step-up |
| Tenant isolation | Postgres row-level security + per-request org/project authorization |
| Encryption | TLS in transit · encryption at rest |
| Uploads | Pre-upload CUI/classified acknowledgment gate · 25 MB limit · type allowlist + magic-byte validation · per-org isolated storage |
| Data lifecycle | Automatic retention pruning · deletion + export on request |
| Operations | Administrative audit log · API rate limiting · health endpoint for monitoring |

---

## Contact

Security questions, deletion/export requests, or disclosure: **support@clauseatlas.com**

*Note: the in-app Privacy and Terms pages are beta drafts being finalized with counsel; the
commitments above reflect how the product operates today.*
