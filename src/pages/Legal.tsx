import { Box, Typography, Alert, Link as MuiLink, Divider } from '@mui/material';

/**
 * Static legal/trust pages: /security (factual), /privacy and /terms (beta
 * drafts pending counsel). Routed in MainApp; linked from the global footer.
 * Beta trust requirement — keeps the data boundary, deletion/export promise,
 * and "informational, not legal advice" framing visible to customers.
 */

const SUPPORT = 'support@clauseatlas.com';
const UPDATED = 'June 2026';

type Block =
  | { h: string }
  | { p: string }
  | { ul: string[] };

interface Doc {
  title: string;
  intro: string;
  beta?: boolean;
  blocks: Block[];
}

const DOCS: Record<'security' | 'privacy' | 'terms', Doc> = {
  security: {
    title: 'Security & trust',
    intro: 'How ClauseAtlas protects your account and your documents.',
    blocks: [
      { h: 'Authentication' },
      { p: 'Sessions ride on an HttpOnly, Secure session cookie — credentials are never stored in browser-accessible storage. State-changing requests are protected by double-submit CSRF tokens. Multi-factor authentication (TOTP) is supported, and sensitive operations require a stepped-up (AAL2) session.' },
      { h: 'Tenant isolation' },
      { p: 'Your data is separated by organization and enforced at two layers: database row-level security and per-request API authorization that re-validates organization and project membership. One customer cannot read another customer’s data.' },
      { h: 'Encryption' },
      { p: 'All traffic is encrypted in transit (TLS). Data and uploaded documents are encrypted at rest by our managed Postgres and object-storage providers.' },
      { h: 'Document uploads' },
      { ul: [
        'A hard acknowledgment gate requires you to confirm — before any upload — that the document contains no CUI, classified, or export-controlled information.',
        'Uploads are limited to 25 MB and an allowlist of document types, validated by file signature (magic bytes), not just the declared type.',
        'Documents are stored in per-organization isolated storage keyed to your scan.',
      ] },
      { h: 'Data lifecycle, deletion & export' },
      { p: 'Scans are retained on a rolling schedule and pruned automatically. You can request deletion or an export of your data at any time by emailing support; we action these promptly.' },
      { h: 'Auditing, rate limiting & monitoring' },
      { p: 'Administrative and compliance-relevant actions are recorded to an audit log. API traffic is rate-limited to protect against abuse, and a health endpoint backs uptime monitoring.' },
      { h: 'What ClauseAtlas is not' },
      { p: 'ClauseAtlas is informational tooling. It is not an assessment, authorization, or accreditation body, and it does not issue ATOs or CMMC certifications.' },
      { h: 'Responsible disclosure' },
      { p: `Found a security issue? Email ${SUPPORT} and we’ll respond quickly.` },
    ],
  },
  privacy: {
    title: 'Privacy policy',
    intro: 'What we collect, how we use it, and your choices.',
    beta: true,
    blocks: [
      { h: 'What we collect' },
      { ul: [
        'Account information you provide (name, email, organization).',
        'Documents you upload and the analysis results derived from them.',
        'Basic usage data needed to operate and improve the service.',
      ] },
      { h: 'How we use it' },
      { p: 'To provide the service — analyzing your documents, computing your obligation surface and posture, and supporting your account. We do not sell your data.' },
      { h: 'AI processing' },
      { p: 'Uploaded documents are processed by AI models (via Anthropic) to extract clause references with citations. Processing is per-request; your documents are not used to train models.' },
      { h: 'Service providers' },
      { p: 'We share data only with infrastructure providers that operate the service under contract (application hosting, managed database/storage, and the AI processor named above).' },
      { h: 'The data boundary' },
      { p: 'Do not upload Controlled Unclassified Information (CUI), classified, or export-controlled material. You acknowledge this before each upload.' },
      { h: 'Your choices' },
      { p: `You can request deletion or export of your data at any time by emailing ${SUPPORT}.` },
      { h: 'Contact' },
      { p: `Questions about privacy? Email ${SUPPORT}.` },
    ],
  },
  terms: {
    title: 'Terms of service',
    intro: 'The terms for using ClauseAtlas during beta.',
    beta: true,
    blocks: [
      { h: 'Informational use only' },
      { p: 'ClauseAtlas provides informational compliance tooling. It is not legal advice and not a CMMC, FedRAMP, or other compliance assessment or authorization. You are responsible for verifying findings against official source authority and for your own compliance decisions.' },
      { h: 'Acceptable use' },
      { ul: [
        'Upload only documents you have the right to upload.',
        'Do not upload CUI, classified, or export-controlled material.',
        'Do not attempt to access other organizations’ data or to disrupt the service.',
      ] },
      { h: 'Your data and ownership' },
      { p: 'You retain ownership of the documents and content you upload. You grant ClauseAtlas the limited license needed to process that content to provide the service.' },
      { h: 'Beta service' },
      { p: 'The service is provided “as is” during beta and may change. To the extent permitted by law, ClauseAtlas disclaims warranties and limits liability. We’ll give reasonable notice of material changes.' },
      { h: 'Termination' },
      { p: 'You may stop using the service and request deletion of your data at any time.' },
      { h: 'Contact' },
      { p: `Questions about these terms? Email ${SUPPORT}.` },
    ],
  },
};

export default function Legal({ doc }: { doc: 'security' | 'privacy' | 'terms' }) {
  const d = DOCS[doc];
  return (
    <Box sx={{ maxWidth: 760, mx: 'auto', p: { xs: 2, md: 3 } }}>
      <Typography variant="h4" sx={{ fontWeight: 600 }}>{d.title}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{d.intro}</Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
        Last updated {UPDATED}.
      </Typography>

      {d.beta && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Beta draft — being finalized with counsel. The commitments below reflect how we operate today.
        </Alert>
      )}

      <Divider sx={{ my: 2 }} />

      {d.blocks.map((b, i) => {
        if ('h' in b) return <Typography key={i} variant="subtitle1" sx={{ fontWeight: 600, mt: 2, mb: 0.5 }}>{b.h}</Typography>;
        if ('ul' in b) return (
          <Box key={i} component="ul" sx={{ pl: 3, my: 0.5 }}>
            {b.ul.map((li, j) => <Typography key={j} component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5, lineHeight: 1.6 }}>{li}</Typography>)}
          </Box>
        );
        return <Typography key={i} variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>{b.p}</Typography>;
      })}

      <Divider sx={{ my: 2 }} />
      <Typography variant="caption" color="text.secondary">
        Contact <MuiLink href={`mailto:${SUPPORT}`}>{SUPPORT}</MuiLink>.
      </Typography>
    </Box>
  );
}
