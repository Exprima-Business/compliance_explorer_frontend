import React, { useMemo } from 'react';
import {
  Box, Card, CardContent, Chip, CircularProgress, Divider, IconButton,
  Stack, Tooltip, Typography,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { evaluationService, type SolicitationEvaluation } from '../services/evaluationService';

/**
 * Dashboard widget — Phase B-4.
 *
 * Compact card surfacing the three most recent document evaluations for
 * the current org, with each evaluation's gap count as the headline
 * signal — the analyst's first-look answer to "what came out of recent
 * scans, and what needs my attention?"
 *
 * Why this lives on the dashboard:
 *   1. Phase B re-scoped the scanner from "solicitation" to "any
 *      compliance-bearing document" (BAA, SSP, supplier flow-down,
 *      agency policy memo). The entry-point copy was updated to reflect
 *      that, but the dashboard didn't surface the resulting evaluations
 *      anywhere — they only appeared on the Evaluations index page.
 *      Adding the widget closes the loop: the dashboard now shows that
 *      recent scans produced something actionable.
 *   2. Gap count is the single highest-signal field on an evaluation —
 *      it's the number of new requirements the document introduces that
 *      the program does not yet track. Surfacing it on the dashboard
 *      avoids a click-through just to learn whether action is needed.
 *
 * Fails gracefully — if the evaluations endpoint errors or the user
 * hasn't scanned anything yet, the widget renders an empty state and
 * never blocks the rest of the dashboard.
 *
 * Cache: 60s staleTime matches ObligationsDueWidget. Evaluations are
 * created infrequently (manual scan + save flow), so a 60s window is
 * tight enough that a just-saved evaluation appears on the next
 * dashboard visit without burning quota.
 */

/** Format an ISO timestamp as a short relative-time string. */
function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  const now = Date.now();
  const diffMs = now - t;
  const days = Math.floor(diffMs / 86_400_000);
  if (days < 1) {
    const hours = Math.floor(diffMs / 3_600_000);
    if (hours < 1) return 'just now';
    return `${hours}h ago`;
  }
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

const RecentEvaluationsWidget: React.FC = () => {
  const navigate = useNavigate();

  // Pull the org's evaluations (newest first per BE convention) and take
  // the top 3. We fetch the full list rather than paginate — Phase B users
  // are SMBs with a handful of recent scans, not enterprises with hundreds.
  // If that assumption ever breaks, add a `?limit=3` param to the BE
  // endpoint rather than slice client-side.
  const { data, isLoading, error } = useQuery({
    queryKey: ['evaluations', 'recent'],
    queryFn: async () => {
      const resp = await evaluationService.list();
      if (!resp.data) {
        const msg = typeof resp.error === 'string' ? resp.error : resp.error?.message;
        throw new Error(msg || 'Failed to load evaluations');
      }
      return resp.data;
    },
    staleTime: 60_000,
  });

  const summary = useMemo(() => {
    const items: SolicitationEvaluation[] = data ?? [];
    const recent = items.slice(0, 3);
    const totalGaps = items.reduce((acc, e) => acc + (e.coverageSummary?.gaps ?? 0), 0);
    return { recent, total: items.length, totalGaps };
  }, [data]);

  const hasNothing = !isLoading && !error && summary.total === 0;

  return (
    <Card sx={{ mb: { xs: 2, md: 3 } }}>
      <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <FactCheckIcon fontSize="small" color="action" />
          <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1 }}>
            Recent Document Evaluations
          </Typography>
          <Tooltip title="Open evaluations page">
            <IconButton size="small" onClick={() => navigate('/evaluations')} aria-label="Open evaluations">
              <OpenInNewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>

        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={20} />
          </Box>
        )}

        {error && (
          <Typography variant="caption" color="text.secondary">
            Could not load evaluations
          </Typography>
        )}

        {hasNothing && (
          <Typography variant="caption" color="text.secondary">
            No evaluations yet. Scan a compliance document in the Document
            Scanner and choose &ldquo;Save as Evaluation&rdquo; to track it here.
          </Typography>
        )}

        {!isLoading && !error && summary.total > 0 && (
          <>
            {/* Summary chips — totals across all evaluations */}
            <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: 'wrap' }}>
              <Chip
                label={`${summary.total} tracked`}
                size="small"
                variant="outlined"
              />
              <Chip
                label={`${summary.totalGaps} total gaps`}
                color={summary.totalGaps > 0 ? 'warning' : 'default'}
                variant={summary.totalGaps > 0 ? 'filled' : 'outlined'}
                size="small"
              />
            </Stack>

            {/* Top 3 most-recent evaluations */}
            <Divider sx={{ mb: 1 }} />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              Most recent
            </Typography>
            <Stack spacing={0.75}>
              {summary.recent.map((e) => {
                const gaps = e.coverageSummary?.gaps ?? 0;
                return (
                  <Stack
                    key={e.id}
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    onClick={() => navigate(`/evaluations/${e.id}`)}
                    sx={{
                      cursor: 'pointer',
                      p: 0.75,
                      borderRadius: 1,
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    {/* Gap-severity dot — same visual language as
                        ObligationsDueWidget's overdue/due-soon dot. */}
                    <Box sx={{
                      width: 6, height: 6, borderRadius: '50%',
                      bgcolor: gaps > 0 ? 'warning.main' : 'success.main',
                      flexShrink: 0,
                    }} />
                    <Typography
                      variant="body2"
                      sx={{
                        flex: 1,
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={e.title}
                    >
                      {e.title}
                    </Typography>
                    <Typography
                      variant="caption"
                      color={gaps > 0 ? 'warning.main' : 'text.secondary'}
                      sx={{ fontWeight: gaps > 0 ? 600 : 400, whiteSpace: 'nowrap' }}
                    >
                      {gaps > 0 ? `${gaps} gap${gaps === 1 ? '' : 's'}` : 'no gaps'}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.disabled"
                      sx={{ whiteSpace: 'nowrap', minWidth: '4rem', textAlign: 'right' }}
                    >
                      {relativeTime(e.createdAt)}
                    </Typography>
                  </Stack>
                );
              })}
            </Stack>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentEvaluationsWidget;
