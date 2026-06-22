import { Typography } from '@mui/material';

/**
 * The standard product disclaimer. ClauseAtlas surfaces obligations and coverage
 * from a curated, citation-backed catalog, but it is informational tooling — not
 * legal advice and not an authoritative compliance assessment. Shown in the
 * global footer and inline on result/report surfaces (beta trust requirement).
 */
export const DISCLAIMER_TEXT =
  'ClauseAtlas is informational compliance tooling — not legal advice and not a CMMC, FedRAMP, or other ' +
  'compliance assessment or authorization. Findings are drawn from a curated catalog cited to source ' +
  'authority; verify against the official text before relying on them.';

export default function Disclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{ display: 'block', lineHeight: 1.6, ...(compact ? { fontSize: 11 } : {}) }}
    >
      {DISCLAIMER_TEXT}
    </Typography>
  );
}
