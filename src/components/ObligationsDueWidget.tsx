import React, { useMemo } from 'react';
import {
  Box, Card, CardContent, Chip, CircularProgress, Divider, IconButton,
  Stack, Tooltip, Typography,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { keys } from '../queryClient';
import { listInstances } from '../services/obligationsService';

/**
 * Dashboard widget — W3 Phase 4.
 *
 * Compact card summarizing compliance-obligation status for the current org:
 *   - overdue count (anything past due, not completed/waived)
 *   - due-in-30d count
 *   - top 3 due-soon items as quick-click rows
 *
 * Self-contained — uses the same React Query keys as the Obligations page
 * so a mutation there refreshes this widget without extra plumbing.
 *
 * Fails gracefully — if the obligations endpoint errors or the user's org
 * hasn't started tracking obligations yet, the widget renders an empty
 * state and never blocks the rest of the dashboard.
 */

function daysUntil(date: string | null): number | null {
  if (!date) return null;
  const due = new Date(date + 'T00:00:00Z').getTime();
  const today = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z').getTime();
  return Math.round((due - today) / 86_400_000);
}

const ObligationsDueWidget: React.FC = () => {
  const navigate = useNavigate();

  // Pull active instances (not completed/waived) due in 90 days OR overdue
  // — single fetch covers both the count summary and the top-3 list
  const { data, isLoading, error } = useQuery({
    queryKey: keys.obligationInstancesDueSoon(90),
    queryFn: async () => {
      const resp = await listInstances({ due_within_days: 90, limit: 50 });
      if (!resp.data) {
        const msg = typeof resp.error === 'string' ? resp.error : resp.error?.message;
        throw new Error(msg || 'Failed to load obligations');
      }
      return resp.data;
    },
    staleTime: 60_000,
  });

  const summary = useMemo(() => {
    const items = data?.items ?? [];
    const today = new Date().toISOString().slice(0, 10);
    let overdue = 0, dueSoon = 0;
    for (const r of items) {
      if (r.status === 'completed' || r.status === 'waived') continue;
      if (!r.due_date) continue;
      if (r.due_date < today) overdue++;
      else {
        const d = daysUntil(r.due_date);
        if (d != null && d <= 30) dueSoon++;
      }
    }
    // Top 3 due-soon (excluding completed/waived), sorted by due date
    const upcoming = items
      .filter((r) => r.status !== 'completed' && r.status !== 'waived' && r.due_date)
      .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))
      .slice(0, 3);
    return { overdue, dueSoon, total: items.length, upcoming };
  }, [data]);

  const hasNothing = !isLoading && !error && summary.total === 0;

  return (
    <Card sx={{ mb: { xs: 2, md: 3 } }}>
      <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <AssignmentTurnedInIcon fontSize="small" color="action" />
          <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1 }}>
            Compliance Obligations
          </Typography>
          <Tooltip title="Open obligations page">
            <IconButton size="small" onClick={() => navigate('/obligations')} aria-label="Open obligations">
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
            Could not load obligations
          </Typography>
        )}

        {hasNothing && (
          <Typography variant="caption" color="text.secondary">
            No obligations tracked yet. Visit the Obligations page to add one from the catalog.
          </Typography>
        )}

        {!isLoading && !error && summary.total > 0 && (
          <>
            {/* Summary chips */}
            <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: 'wrap' }}>
              <Chip
                icon={<WarningAmberIcon fontSize="small" />}
                label={`${summary.overdue} overdue`}
                color="error"
                variant={summary.overdue ? 'filled' : 'outlined'}
                size="small"
              />
              <Chip
                icon={<AccessTimeIcon fontSize="small" />}
                label={`${summary.dueSoon} due in 30d`}
                color="warning"
                variant={summary.dueSoon ? 'filled' : 'outlined'}
                size="small"
              />
              <Chip label={`${summary.total} tracked`} size="small" variant="outlined" />
            </Stack>

            {/* Top 3 due-soon items */}
            {summary.upcoming.length > 0 && (
              <>
                <Divider sx={{ mb: 1 }} />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  Coming up
                </Typography>
                <Stack spacing={0.75}>
                  {summary.upcoming.map((row) => {
                    const d = daysUntil(row.due_date);
                    const overdue = d != null && d < 0;
                    return (
                      <Stack
                        key={row.id}
                        direction="row"
                        alignItems="center"
                        spacing={1}
                        onClick={() => navigate('/obligations')}
                        sx={{
                          cursor: 'pointer',
                          p: 0.75,
                          borderRadius: 1,
                          '&:hover': { bgcolor: 'action.hover' },
                        }}
                      >
                        <Box sx={{
                          width: 6, height: 6, borderRadius: '50%',
                          bgcolor: overdue ? 'error.main' : 'warning.main',
                        }} />
                        <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }}>
                          {row.obligation?.short_title ?? row.obligation?.title ?? '(deleted obligation)'}
                        </Typography>
                        <Typography
                          variant="caption"
                          color={overdue ? 'error.main' : 'text.secondary'}
                          sx={{ fontWeight: overdue ? 600 : 400, whiteSpace: 'nowrap' }}
                        >
                          {overdue && d != null
                            ? `${Math.abs(d)}d overdue`
                            : d === 0
                            ? 'today'
                            : d != null
                            ? `in ${d}d`
                            : row.due_date}
                        </Typography>
                      </Stack>
                    );
                  })}
                </Stack>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ObligationsDueWidget;
