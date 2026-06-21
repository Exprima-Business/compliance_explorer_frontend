import { useMemo } from 'react';
import { Box, Card, CardContent, Chip, CircularProgress, Stack, Typography, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useNavigate } from 'react-router-dom';
import { useCascadeOrgSurface } from '../hooks/useCascadeOrg';
import { obligationCoverage, type CascadeObligation } from '../hooks/useCascadeSurface';
import { useProjectSummary } from '../hooks/useProjectSummary';
import { authorityGroup, provenanceOf } from '../utils/obligationGrouping';

/**
 * Gaps deep view (mockup C): what applies but isn't covered, grouped by authority
 * and traced to why it applies — the overlooked long tail most tools never
 * surface. Provenance is coarse (FE-derived); precise "via {parent clause}" is a
 * BE follow-up (get_obligation_surface root+edge).
 */

interface Gap { o: CascadeObligation; cov: number; provenance: string; }

export default function ComplianceGaps() {
  const navigate = useNavigate();
  const { data: obligations, isLoading } = useCascadeOrgSurface();
  const { data: summary } = useProjectSummary();

  const { groups, openCount } = useMemo(() => {
    const obs = obligations ?? [];
    const fwPct: Record<string, number> = {};
    const fwName: Record<string, string> = {};
    (summary?.frameworks ?? []).forEach(f => { fwPct[f.id] = f.completionPct; fwName[f.id] = f.name; });

    const open: Gap[] = obs
      .map(o => ({ o, cov: obligationCoverage(o, fwPct), provenance: provenanceOf(o, fwName) }))
      .filter(g => g.cov < 100);

    const byGroup = new Map<string, Gap[]>();
    for (const g of open) {
      const k = authorityGroup(g.o);
      const arr = byGroup.get(k) ?? [];
      arr.push(g);
      byGroup.set(k, arr);
    }
    // Most-exposed groups (most open gaps) first; within a group, least-covered first.
    const grouped = Array.from(byGroup.entries())
      .map(([name, items]) => ({ name, items: items.sort((a, b) => a.cov - b.cov) }))
      .sort((a, b) => b.items.length - a.items.length);
    return { groups: grouped, openCount: open.length };
  }, [obligations, summary]);

  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      <Button size="small" startIcon={<ArrowBackIcon />} sx={{ textTransform: 'none', mb: 1 }} onClick={() => navigate('/dashboard')}>
        Command Center
      </Button>
      <Stack direction="row" alignItems="baseline" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>Gaps</Typography>
        <Typography variant="body2" color="text.secondary">what applies but isn't covered</Typography>
        <Box sx={{ flex: 1 }} />
        {openCount > 0 && <Typography variant="body2" sx={{ fontWeight: 600, color: '#A32D2D' }}>{openCount} open</Typography>}
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
        Concentrated in the long tail — obligations most tools never surface. Each traces to your active scope.
      </Typography>

      {openCount === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No open gaps. Everything that applies to you is covered — or you haven't surfaced your obligations yet.
        </Typography>
      ) : (
        <Card sx={{ border: '1px solid', borderColor: 'divider', maxWidth: 820 }}>
          <CardContent sx={{ p: { xs: 1.5, md: 2.25 } }}>
            {groups.map((g, gi) => (
              <Box key={g.name} sx={{ mb: gi < groups.length - 1 ? 2.25 : 0 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>{g.name}</Typography>
                  <Chip size="small" label={g.items.length} sx={{ height: 18, fontSize: 11 }} />
                </Stack>
                <Stack spacing={1}>
                  {g.items.map(({ o, cov, provenance }) => (
                    <Stack key={o.artifactId} direction="row" alignItems="center" spacing={1}
                      onClick={() => navigate(`/clauses/${encodeURIComponent(o.identifier)}`)}
                      sx={{ cursor: 'pointer', p: 0.75, borderRadius: 1, flexWrap: 'wrap', '&:hover': { bgcolor: 'action.hover' } }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{o.identifier}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ flex: 1, minWidth: 0 }} noWrap title={o.title}>
                        {o.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                        {provenance}
                      </Typography>
                      <Chip size="small" label={cov > 0 ? `${cov}%` : 'open'}
                        sx={{ height: 18, fontSize: 11, color: '#993C1D', border: '0.5px solid #D85A30', bgcolor: 'transparent' }} variant="outlined" />
                      <OpenInNewIcon sx={{ fontSize: 14, color: 'text.secondary', flexShrink: 0 }} />
                    </Stack>
                  ))}
                </Stack>
              </Box>
            ))}
            <Box sx={{ borderTop: '0.5px solid', borderColor: 'divider', mt: 2, pt: 1.25 }}>
              <Typography variant="caption" color="text.secondary">
                Work each requirement to mark satisfaction — or{' '}
                <Box component="span" sx={{ color: '#3C3489', fontWeight: 500, cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
                  clear most via your top moves →
                </Box>
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
