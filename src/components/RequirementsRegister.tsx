import { useMemo, useState } from 'react';
import {
  Box, Button, Card, CardContent, Chip, CircularProgress, Stack, Typography,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useNavigate } from 'react-router-dom';
import { useCascadeSurface, obligationCoverage, type CascadeObligation } from '../hooks/useCascadeSurface';
import { useProjectSummary } from '../hooks/useProjectSummary';

function statusColor(pct: number): string {
  if (pct >= 100) return '#15803d';
  if (pct > 0) return '#854d0e';
  return '#A32D2D';
}

type Filter = 'all' | 'open' | 'covered';

interface Row {
  o: CascadeObligation;
  cov: number;
  provenance: string;
}

/**
 * The Requirements register — Coverage and Gaps unified into one list. Every row
 * shows where the requirement came from (provenance), whether it's required,
 * its coverage status (the same data that drives the headline %), and a Fix
 * action that jumps to the clause detail where it's satisfied.
 */
export default function RequirementsRegister() {
  const navigate = useNavigate();
  const { data: obligations, isLoading, error } = useCascadeSurface();
  const { data: summary } = useProjectSummary();
  const [filter, setFilter] = useState<Filter>('all');
  const [showAll, setShowAll] = useState(false);

  const { rows, total, posture, needAction } = useMemo(() => {
    const obs = obligations ?? [];
    const fwPct: Record<string, number> = {};
    const fwName: Record<string, string> = {};
    (summary?.frameworks ?? []).forEach(f => { fwPct[f.id] = f.completionPct; fwName[f.id] = f.name; });
    const r: Row[] = obs.map(o => {
      const cov = obligationCoverage(o, fwPct);
      const names = o.frameworkIds.map(id => fwName[id]).filter(Boolean);
      const provenance = o.explicitSatisfied
        ? 'marked satisfied'
        : names.length
          ? `in your ${names[0]} scope`
          : 'beyond your activated frameworks';
      return { o, cov, provenance };
    }).sort((a, b) => a.cov - b.cov);
    const tot = obs.length;
    const post = tot ? Math.round(r.reduce((s, x) => s + x.cov, 0) / tot) : 0;
    const need = r.filter(x => x.cov < 100).length;
    return { rows: r, total: tot, posture: post, needAction: need };
  }, [obligations, summary]);

  const filtered = useMemo(() => {
    if (filter === 'open') return rows.filter(r => r.cov < 100);
    if (filter === 'covered') return rows.filter(r => r.cov >= 100);
    return rows;
  }, [rows, filter]);

  const visible = showAll ? filtered : filtered.slice(0, 8);

  const chip = (key: Filter, label: string) => (
    <Box
      onClick={() => { setFilter(key); setShowAll(false); }}
      sx={{
        fontSize: 12, px: 1.25, py: 0.5, borderRadius: 1.5, cursor: 'pointer',
        border: '0.5px solid', borderColor: filter === key ? 'transparent' : 'var(--color-border-secondary, rgba(0,0,0,0.26))',
        bgcolor: filter === key ? '#534AB7' : 'transparent',
        color: filter === key ? '#fff' : 'text.secondary',
      }}
    >
      {label}
    </Box>
  );

  return (
    <Card sx={{ mb: { xs: 2, md: 3 }, border: '1px solid', borderColor: 'divider' }}>
      <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
        <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mb: 0.25 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1 }}>
            Requirements
          </Typography>
          {!isLoading && !error && (
            <Typography variant="caption" color="text.secondary">
              <Box component="span" sx={{ color: '#854d0e', fontWeight: 500 }}>{posture}% covered</Box>
              {' · '}{total} total · <Box component="span" sx={{ color: '#A32D2D', fontWeight: 500 }}>{needAction} need action</Box>
            </Typography>
          )}
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>
          Everything that applies to you, where each came from, and how to close it.
        </Typography>

        {!isLoading && !error && rows.length > 0 && (
          <Stack direction="row" spacing={1} sx={{ mb: 1.25, flexWrap: 'wrap', rowGap: 0.5 }}>
            {chip('all', `All ${total}`)}
            {chip('open', `Open ${needAction}`)}
            {chip('covered', `Covered ${total - needAction}`)}
          </Stack>
        )}

        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={24} />
          </Box>
        )}

        {!isLoading && error && (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            Couldn't load your requirements right now.
          </Typography>
        )}

        {!isLoading && !error && rows.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            No requirements yet — activate a framework and we'll list everything that applies to you.
          </Typography>
        )}

        {!isLoading && !error && visible.length > 0 && (
          <Box sx={{ border: '0.5px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden' }}>
            {visible.map(({ o, cov, provenance }, i) => (
              <Box
                key={o.artifactId}
                sx={{
                  p: '11px 14px',
                  borderBottom: i < visible.length - 1 ? '0.5px solid' : 'none',
                  borderColor: 'divider',
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1} sx={{ flexWrap: 'wrap' }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{o.identifier}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ flex: 1, minWidth: 0 }} noWrap title={o.title}>
                    {o.title}
                  </Typography>
                  <Chip label="Required" size="small" variant="outlined" sx={{ height: 18, fontSize: 11 }} />
                  <Typography variant="caption" sx={{ fontWeight: 500, color: statusColor(cov), width: 34, textAlign: 'right' }}>
                    {cov}%
                  </Typography>
                </Stack>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ flex: 1, minWidth: 0 }} noWrap>
                    {o.sourceAuthority} · applies because it's {provenance}
                  </Typography>
                  <Box
                    onClick={() => navigate(`/clauses/${encodeURIComponent(o.identifier)}`)}
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.25, color: '#3C3489', cursor: 'pointer', flexShrink: 0 }}
                  >
                    <Typography variant="caption" sx={{ fontWeight: 500, color: '#3C3489' }}>Fix</Typography>
                    <OpenInNewIcon sx={{ fontSize: 13 }} />
                  </Box>
                </Stack>
              </Box>
            ))}
          </Box>
        )}

        {!isLoading && !error && filtered.length > 8 && (
          <Button size="small" onClick={() => setShowAll(s => !s)} sx={{ mt: 1, textTransform: 'none' }}>
            {showAll ? 'Show fewer' : `Show all ${filtered.length}`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
