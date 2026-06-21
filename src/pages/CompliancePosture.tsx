import { useMemo } from 'react';
import { Box, Card, CardContent, Chip, CircularProgress, Stack, Typography, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import { useCascadeOrgSurface } from '../hooks/useCascadeOrg';
import { obligationCoverage } from '../hooks/useCascadeSurface';
import { useProjectSummary } from '../hooks/useProjectSummary';
import { authorityGroup } from '../utils/obligationGrouping';

/**
 * Posture deep view (mockup D): coverage across the FULL obligation surface,
 * broken down by authority group — the moat made visible (strong on the famous
 * frameworks, exposed in the overlooked long tail). Coverage % per group is the
 * mean per-obligation coverage, the same fractional measure as the headline.
 */

const GREEN = '#639922', AMBER = '#BA7517', RED = '#D85A30';
const barColor = (p: number) => (p >= 70 ? GREEN : p >= 45 ? AMBER : RED);
const ringColor = (p: number) => (p >= 80 ? GREEN : p >= 50 ? AMBER : RED);

function Ring({ pct }: { pct: number }) {
  const r = 50, c = 2 * Math.PI * r; // 314
  const offset = c * (1 - pct / 100);
  return (
    <svg width="116" height="116" viewBox="0 0 120 120" style={{ flexShrink: 0 }} role="img" aria-label={`${pct} percent covered`}>
      <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="12" />
      <circle cx="60" cy="60" r={r} fill="none" stroke={ringColor(pct)} strokeWidth="12" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={offset} transform="rotate(-90 60 60)" />
      <text x="60" y="56" textAnchor="middle" fontSize="27" fontWeight="500" fill="currentColor">{pct}%</text>
      <text x="60" y="76" textAnchor="middle" fontSize="12" fill="rgba(0,0,0,0.55)">covered</text>
    </svg>
  );
}

export default function CompliancePosture() {
  const navigate = useNavigate();
  const { data: obligations, isLoading } = useCascadeOrgSurface();
  const { data: summary } = useProjectSummary();

  const view = useMemo(() => {
    const obs = obligations ?? [];
    const fwPct: Record<string, number> = {};
    (summary?.frameworks ?? []).forEach(f => { fwPct[f.id] = f.completionPct; });

    const groups = new Map<string, { sum: number; count: number }>();
    let totalCov = 0;
    for (const o of obs) {
      const cov = obligationCoverage(o, fwPct);
      totalCov += cov;
      const g = authorityGroup(o);
      const prev = groups.get(g) ?? { sum: 0, count: 0 };
      groups.set(g, { sum: prev.sum + cov, count: prev.count + 1 });
    }
    const posture = obs.length ? Math.round(totalCov / obs.length) : 0;
    const rows = Array.from(groups.entries())
      .map(([name, v]) => ({ name, pct: Math.round(v.sum / v.count), count: v.count }))
      .sort((a, b) => b.pct - a.pct);
    // The two most-exposed groups (lowest coverage) drive the "long tail" callout.
    const exposed = [...rows].sort((a, b) => a.pct - b.pct).slice(0, 2).filter(r => r.pct < 70);
    return { posture, rows, exposed, total: obs.length };
  }, [obligations, summary]);

  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      <Button size="small" startIcon={<ArrowBackIcon />} sx={{ textTransform: 'none', mb: 1 }} onClick={() => navigate('/dashboard')}>
        Command Center
      </Button>
      <Typography variant="h5" sx={{ fontWeight: 600 }}>Posture</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Coverage across your full obligation surface — not a single-framework score.
      </Typography>

      {view.total === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No obligations yet. Activate a framework or scan a solicitation to surface your obligation set.
        </Typography>
      ) : (
        <Card sx={{ border: '1px solid', borderColor: 'divider', maxWidth: 760 }}>
          <CardContent sx={{ p: { xs: 1.75, md: 2.25 } }}>
            <Stack direction="row" alignItems="center" spacing={2.5} sx={{ flexWrap: 'wrap', mb: 2 }}>
              <Ring pct={view.posture} />
              <Box sx={{ flex: 1, minWidth: 220 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  Strong on the famous frameworks. Exposed in the long tail.
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                  {view.exposed.length > 0
                    ? 'Your biggest exposure is where competitors don’t look:'
                    : 'Coverage is even across your authorities.'}
                </Typography>
                {view.exposed.length > 0 && (
                  <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
                    {view.exposed.map(e => (
                      <Chip key={e.name} size="small" label={`${e.name} ${e.pct}%`}
                        sx={{ height: 22, fontSize: 12, fontWeight: 500, color: '#993C1D', bgcolor: 'rgba(216,90,48,0.10)' }} />
                    ))}
                  </Stack>
                )}
              </Box>
            </Stack>

            <Box sx={{ borderTop: '0.5px solid', borderColor: 'divider', pt: 1.75 }}>
              <Stack spacing={1.25}>
                {view.rows.map(r => (
                  <Stack key={r.name} direction="row" alignItems="center" spacing={1.25}>
                    <Typography variant="body2" sx={{ width: 168, flexShrink: 0, fontWeight: r.pct < 45 ? 600 : 400 }} noWrap title={r.name}>
                      {r.name}
                    </Typography>
                    <Box sx={{ flex: 1, height: 8, bgcolor: 'rgba(0,0,0,0.08)', borderRadius: 1, overflow: 'hidden' }}>
                      <Box sx={{ width: `${r.pct}%`, height: '100%', bgcolor: barColor(r.pct) }} />
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ width: 64, textAlign: 'right' }}>
                      {r.pct}% · {r.count}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
                % = mean coverage of that authority’s obligations; the count is how many apply to you.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
