import React from 'react';
import {
  Alert, Box, Chip, CircularProgress, Divider, Stack, Tooltip, Typography,
  List, ListItem, ListItemText, ListItemIcon, Paper,
} from '@mui/material';
import CallMadeIcon from '@mui/icons-material/CallMade';
import CallReceivedIcon from '@mui/icons-material/CallReceived';
import { useQuery } from '@tanstack/react-query';
import { keys } from '../queryClient';
import {
  fetchCrossFrameworkCredit,
  type CrossFrameworkEdge,
} from '../services/crossFrameworkCreditService';

/**
 * Cross-framework control credit panel — W2.
 *
 * Renders the lateral graph for one control:
 *
 *   SATISFIES (this control credits THESE controls in other frameworks):
 *     ▸ 800-171 03.01.01 — Limit system access to authorized users
 *     ▸ CMMC L2 AC.L2-3.1.1 — Limit information system access
 *     ▸ ...
 *
 *   SATISFIED BY (these other-framework controls would credit THIS one):
 *     ▸ (typically empty for 800-53 — it's a root; populated for 800-171
 *        which derives from 800-53)
 *
 * Each edge carries the source_authority (e.g., "NIST 800-171 Rev 3
 * Appendix B mapping table"), exposed via tooltip.
 *
 * Used both standalone (as the body of CrossFrameworkCreditDialog) and
 * eventually embeddable on a future per-control detail page.
 */

interface PanelProps {
  controlId: string;
  /** Compact = single-column lists. Wide = side-by-side. */
  variant?: 'compact' | 'wide';
}

const CrossFrameworkCreditPanel: React.FC<PanelProps> = ({ controlId, variant = 'compact' }) => {
  const { data, isLoading, error } = useQuery({
    queryKey: keys.crossFwCredit(controlId),
    queryFn: async () => {
      const resp = await fetchCrossFrameworkCredit(controlId);
      if (!resp.data) {
        const msg = typeof resp.error === 'string' ? resp.error : resp.error?.message;
        throw new Error(msg || 'Failed to load cross-framework credit');
      }
      return resp.data;
    },
    // Cross-framework data is fully static reference content; cache for 10 min
    staleTime: 10 * 60_000,
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }
  if (error) {
    return <Alert severity="error">{(error as Error).message}</Alert>;
  }
  if (!data) return null;

  const { control, satisfies, satisfied_by } = data;
  const hasAnyCredit = satisfies.length > 0 || satisfied_by.length > 0;

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" alignItems="baseline" spacing={1.5} sx={{ mb: 2 }}>
        <Chip
          label={control.framework_short_name ?? control.framework_name}
          size="small"
          variant="outlined"
          sx={{ fontWeight: 500 }}
        />
        <Typography variant="subtitle1" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
          {control.identifier}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {control.title}
        </Typography>
      </Stack>

      {!hasAnyCredit && (
        <Alert severity="info" sx={{ mb: 2 }}>
          No cross-framework relationships recorded for this control yet.
          As the crosswalk table grows (800-171, CMMC L2, SSDF ↔ 800-53),
          more edges will appear here.
        </Alert>
      )}

      <Box sx={{
        display: 'grid',
        gridTemplateColumns: variant === 'wide' ? '1fr 1fr' : '1fr',
        gap: 2,
      }}>
        {/* SATISFIES — outgoing credit */}
        {satisfies.length > 0 && (
          <CreditSection
            icon={<CallMadeIcon fontSize="small" />}
            title="Satisfies these (lateral credit gained)"
            subtitle="Implementing this control also credits these controls in other frameworks."
            edges={satisfies}
            tone="success"
          />
        )}

        {/* SATISFIED BY — incoming credit */}
        {satisfied_by.length > 0 && (
          <CreditSection
            icon={<CallReceivedIcon fontSize="small" />}
            title="Satisfied by these (lateral credit possible)"
            subtitle="To satisfy this control, you can implement one of these in another framework."
            edges={satisfied_by}
            tone="info"
          />
        )}
      </Box>
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CreditSection — the satisfies / satisfied-by list
// ─────────────────────────────────────────────────────────────────────────────

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  edges: CrossFrameworkEdge[];
  tone: 'success' | 'info';
}

const TONE_COLORS: Record<SectionProps['tone'], string> = {
  success: '#16a34a',
  info: '#0891b2',
};

const CreditSection: React.FC<SectionProps> = ({ icon, title, subtitle, edges, tone }) => {
  const accent = TONE_COLORS[tone];

  // Group edges by framework so we render one block per framework
  const byFramework = React.useMemo(() => {
    const map = new Map<string, { name: string; short: string | null; edges: CrossFrameworkEdge[] }>();
    for (const e of edges) {
      const key = e.control.framework_id;
      if (!map.has(key)) {
        map.set(key, {
          name: e.control.framework_name,
          short: e.control.framework_short_name,
          edges: [],
        });
      }
      map.get(key)!.edges.push(e);
    }
    // Sort edges within each framework by control identifier
    const arr = Array.from(map.values());
    for (const grp of arr) {
      grp.edges.sort((a, b) => a.control.identifier.localeCompare(b.control.identifier));
    }
    return arr.sort((a, b) => (a.short ?? a.name).localeCompare(b.short ?? b.name));
  }, [edges]);

  return (
    <Paper variant="outlined" sx={{ p: 2, borderLeft: `4px solid ${accent}` }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
        <Box sx={{ color: accent, display: 'flex', alignItems: 'center' }}>{icon}</Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{title}</Typography>
        <Chip label={edges.length} size="small" sx={{ height: 20, fontSize: 11 }} />
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
        {subtitle}
      </Typography>
      <Divider sx={{ mb: 1 }} />

      {byFramework.map((grp) => (
        <Box key={grp.short ?? grp.name} sx={{ mb: 1.5 }}>
          <Chip
            label={grp.short ?? grp.name}
            size="small"
            sx={{ mb: 0.75, fontWeight: 500 }}
          />
          <List dense disablePadding>
            {grp.edges.map((e) => (
              <ListItem key={e.control.id} disableGutters sx={{ py: 0.25 }}>
                <ListItemIcon sx={{ minWidth: 26 }}>
                  <Box sx={{
                    width: 6, height: 6, borderRadius: '50%', bgcolor: accent,
                  }} />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={1} alignItems="baseline">
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                        {e.control.identifier}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                        {e.control.title}
                      </Typography>
                      {e.source_authority && (
                        <Tooltip title={`Source: ${e.source_authority}`}>
                          <Chip label="?" size="small" sx={{ height: 16, fontSize: 9, opacity: 0.6 }} />
                        </Tooltip>
                      )}
                    </Stack>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Box>
      ))}
    </Paper>
  );
};

export default CrossFrameworkCreditPanel;
