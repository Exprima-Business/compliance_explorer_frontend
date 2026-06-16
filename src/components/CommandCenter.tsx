import { useMemo, useState } from 'react';
import {
  Box, Button, Card, CardContent, Chip, CircularProgress, Divider, Stack, Typography,
} from '@mui/material';
import StarIcon from '@mui/icons-material/AutoAwesome';
import {
  Shield, Description, AccountTree, VpnKey, WorkspacePremium, School, ReportProblem,
  MonitorHeart, DeleteSweep, LocalOffer, Gavel, Badge, Public, Block, Inventory2,
  BugReport, CloudUpload, TaskAlt,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCascadeSurface, obligationCoverage } from '../hooks/useCascadeSurface';
import { useProjectSummary } from '../hooks/useProjectSummary';
import { useCascadeLeverage, type CascadeMove } from '../hooks/useCascadeLeverage';
import { evaluationService, type SolicitationEvaluation } from '../services/evaluationService';
import RemediationDrawer from './RemediationDrawer';

const GREEN = '#15803d', AMBER = '#b45309', RED = '#b91c1c', PURPLE = '#534AB7';
const band = (p: number) => (p >= 80 ? GREEN : p >= 50 ? AMBER : RED);
const bandLabel = (p: number) => (p >= 80 ? 'High' : p >= 50 ? 'Medium' : 'Low');
const riskBg = (l: string) => (l === 'High' ? 'rgba(163,45,45,0.12)' : l === 'Medium' ? 'rgba(180,83,9,0.12)' : 'rgba(0,0,0,0.06)');
const riskFg = (l: string) => (l === 'High' ? '#A32D2D' : l === 'Medium' ? '#854d0e' : '#5f5e5a');

/** Map an obligation identifier to a clean "source" bucket for the by-source chart. */
function sourceOf(identifier: string, authority: string): string {
  const id = identifier.toUpperCase();
  if (id.startsWith('DFARS')) return 'DFARS';
  if (id.startsWith('FAR ') || id.startsWith('FAR52') || id.includes('FAR 52')) return 'FAR';
  if (id.includes('800-171')) return 'NIST 800-171';
  if (id.includes('800-53')) return 'NIST 800-53';
  if (id.startsWith('CMMC')) return 'CMMC';
  if (id.includes('FEDRAMP')) return 'FedRAMP';
  if (id.includes('HIPAA') || id.includes('45 CFR 164')) return 'HIPAA';
  if (id.startsWith('FIPS')) return 'NIST 800-53';
  if (authority?.startsWith('NIST')) return 'NIST';
  return 'Agency / other';
}

/**
 * Map a remediation (satisfaction-mechanism) label to an icon. Keyed off the
 * label text for now; a mechanism_type → icon mapping in the catalog would be
 * more robust (open question with the team).
 */
function iconFor(label: string) {
  const l = label.toLowerCase();
  const sx = { fontSize: 18, color: '#534AB7' };
  if (l.includes('framework control')) return <Shield sx={sx} />;
  if (l.includes('flowdown') || l.includes('subcontract')) return <AccountTree sx={sx} />;
  if (l.includes('policy') || l.includes('procedure') || l.includes('conformance')) return <Description sx={sx} />;
  if (l.includes('access') || l.includes('restriction')) return <VpnKey sx={sx} />;
  if (l.includes('authorization') || l.includes('assessment') || l.includes('certification')) return <WorkspacePremium sx={sx} />;
  if (l.includes('training')) return <School sx={sx} />;
  if (l.includes('incident')) return <ReportProblem sx={sx} />;
  if (l.includes('monitoring')) return <MonitorHeart sx={sx} />;
  if (l.includes('sanitization') || l.includes('media')) return <DeleteSweep sx={sx} />;
  if (l.includes('marking') || l.includes('handling')) return <LocalOffer sx={sx} />;
  if (l.includes('agreement') || l.includes('statut') || l.includes('attestation') || l.includes('role')) return <Gavel sx={sx} />;
  if (l.includes('personnel') || l.includes('credential')) return <Badge sx={sx} />;
  if (l.includes('residency')) return <Public sx={sx} />;
  if (l.includes('prohibition')) return <Block sx={sx} />;
  if (l.includes('evidence') || l.includes('preservation')) return <Inventory2 sx={sx} />;
  if (l.includes('vulnerability')) return <BugReport sx={sx} />;
  if (l.includes('post') || l.includes('government system')) return <CloudUpload sx={sx} />;
  return <TaskAlt sx={sx} />;
}

/** A subtle "not tracked yet" marker so placeholders never read as real data. */
function Pending({ label = 'computing' }: { label?: string }) {
  return (
    <Chip
      label={label}
      size="small"
      variant="outlined"
      sx={{ height: 18, fontSize: 10, color: 'text.secondary', borderStyle: 'dashed' }}
    />
  );
}

function KpiCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card sx={{ border: '1px solid', borderColor: 'divider', height: '100%' }}>
      <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, display: 'block', mb: 0.75 }}>
          {title}
        </Typography>
        {children}
      </CardContent>
    </Card>
  );
}

function relTime(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 1) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

/**
 * The GovCon Compliance Command Center dashboard. Layout matches the approved
 * mockups; cards are wired to live data where it exists and clearly marked
 * "computing / not tracked yet" where the supporting data isn't built yet
 * (evidence aggregation, solicitation readiness scoring, owners/risk/status,
 * activity feed) — never faked.
 */
export default function CommandCenter() {
  const navigate = useNavigate();
  const [activeMove, setActiveMove] = useState<CascadeMove | null>(null);
  const { data: obligations, isLoading: surfaceLoading } = useCascadeSurface();
  const { data: summary } = useProjectSummary();
  const { data: moves } = useCascadeLeverage();
  const { data: evals } = useQuery({
    queryKey: ['evaluations', 'recent'],
    queryFn: async () => {
      const resp = await evaluationService.list();
      if (!resp.data) throw new Error('Failed to load evaluations');
      return resp.data;
    },
    staleTime: 60_000,
  });

  const m = useMemo(() => {
    const obs = obligations ?? [];
    const fwPct: Record<string, number> = {};
    (summary?.frameworks ?? []).forEach(f => { fwPct[f.id] = f.completionPct; });
    const covs = obs.map(o => obligationCoverage(o, fwPct));
    const total = obs.length;
    const posture = total ? Math.round(covs.reduce((a, b) => a + b, 0) / total) : 0;
    const satisfied = covs.filter(c => c >= 100).length;
    const partial = covs.filter(c => c > 0 && c < 100).length;
    const notStarted = covs.filter(c => c === 0).length;
    const implemented = (summary?.frameworks ?? []).reduce((s, f) => s + f.implemented, 0);
    const totalControls = (summary?.frameworks ?? []).reduce((s, f) => s + f.totalControls, 0);
    const controlPct = totalControls ? Math.round((implemented / totalControls) * 100) : 0;

    const bySrc = new Map<string, number>();
    obs.forEach(o => {
      const s = sourceOf(o.identifier, o.sourceAuthority);
      bySrc.set(s, (bySrc.get(s) || 0) + 1);
    });
    const bySource = Array.from(bySrc.entries())
      .map(([source, count]) => ({ source, count, pct: total ? Math.round((count / total) * 100) : 0 }))
      .sort((a, b) => b.count - a.count);

    return { total, posture, satisfied, partial, notStarted, implemented, totalControls, controlPct, bySource };
  }, [obligations, summary]);

  const evalList: SolicitationEvaluation[] = evals ?? [];
  const totalSolicitationGaps = evalList.reduce((a, e) => a + (e.coverageSummary?.gaps ?? 0), 0);
  const topMove = moves?.[0];

  if (surfaceLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      {/* Header */}
      <Stack direction="row" alignItems="flex-start" sx={{ mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
        <Box sx={{ flex: 1, minWidth: 260 }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>Compliance Command Center</Typography>
          <Typography variant="body2" color="text.secondary">
            Organization-wide GovCon readiness across your frameworks, scanned solicitations, and active requirements.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip label="Organization Baseline" size="small" variant="outlined" sx={{ borderStyle: 'solid' }} />
          <Button size="small" variant="outlined" sx={{ textTransform: 'none' }} onClick={() => navigate('/document-scanner')}>
            Scan Solicitation
          </Button>
        </Stack>
      </Stack>

      {/* Next Best Action */}
      <Card sx={{ mb: 2, border: '1px solid', borderColor: 'divider', bgcolor: '#F5F4FC' }}>
        <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flexWrap: 'wrap', gap: 1 }}>
            <StarIcon sx={{ color: PURPLE }} />
            <Box sx={{ flex: 1, minWidth: 220 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#3C3489' }}>Next best action</Typography>
              <Typography variant="body2" color="text.secondary">
                {topMove
                  ? `${topMove.mechanismLabel} — resolves ${topMove.obligationsCleared} requirements across ${topMove.authoritiesCount} authorities.`
                  : 'Activate a framework to generate your remediation roadmap.'}
              </Typography>
            </Box>
            <Button size="small" variant="outlined" sx={{ textTransform: 'none' }}>View priority actions</Button>
          </Stack>
        </CardContent>
      </Card>

      {/* KPI row */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 1.5, mb: 2 }}>
        <KpiCard title="Baseline readiness">
          <Stack direction="row" alignItems="baseline" spacing={1}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: band(m.posture) }}>{m.posture}%</Typography>
            <Chip label={bandLabel(m.posture)} size="small" sx={{ height: 18, fontSize: 11, bgcolor: 'rgba(0,0,0,0.06)' }} />
          </Stack>
          <Typography variant="caption" color="text.secondary">Controls, evidence &amp; satisfied requirements</Typography>
        </KpiCard>

        <KpiCard title="Requirements">
          <Typography variant="h4" sx={{ fontWeight: 700 }}>{m.total}</Typography>
          <Stack spacing={0.25} sx={{ mt: 0.5 }}>
            <Typography variant="caption" sx={{ color: GREEN }}>● {m.satisfied} satisfied</Typography>
            <Typography variant="caption" sx={{ color: AMBER }}>● {m.partial} partial</Typography>
            <Typography variant="caption" sx={{ color: RED }}>● {m.notStarted} not started</Typography>
          </Stack>
        </KpiCard>

        <KpiCard title="Controls">
          <Typography variant="h4" sx={{ fontWeight: 700, color: PURPLE }}>
            {m.implemented}<Box component="span" sx={{ fontSize: 16, color: 'text.secondary', fontWeight: 400 }}> / {m.totalControls}</Box>
          </Typography>
          <Box sx={{ height: 6, bgcolor: 'rgba(0,0,0,0.06)', borderRadius: 3, overflow: 'hidden', my: 0.75 }}>
            <Box sx={{ width: `${m.controlPct}%`, height: '100%', bgcolor: PURPLE }} />
          </Box>
          <Typography variant="caption" color="text.secondary">{m.controlPct}% implemented</Typography>
        </KpiCard>

        <KpiCard title="Evidence">
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.secondary' }}>—</Typography>
            <Pending label="not tracked yet" />
          </Stack>
          <Typography variant="caption" color="text.secondary">Evidence mapping coming next</Typography>
        </KpiCard>

        <KpiCard title="Solicitations">
          <Typography variant="h4" sx={{ fontWeight: 700 }}>{evalList.length}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{totalSolicitationGaps} open gaps across scans</Typography>
          <Box sx={{ mt: 0.5 }}><Pending label="bid-ready scoring coming" /></Box>
        </KpiCard>
      </Box>

      {/* Priority Remediation + Solicitation Readiness */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.2fr 1fr' }, gap: 1.5, mb: 2 }}>
        <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
            <Stack direction="row" alignItems="center" sx={{ mb: 0.25 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1 }}>Priority Remediation</Typography>
              <Button size="small" sx={{ textTransform: 'none' }}>View all actions</Button>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Highest-impact actions, ranked by requirements resolved. Click an action to start it.
            </Typography>
            {(!moves || moves.length === 0) ? (
              <Typography variant="body2" color="text.secondary">No actions yet — activate a framework.</Typography>
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Box
                  component="table"
                  sx={{
                    width: '100%', borderCollapse: 'collapse', minWidth: 580,
                    '& th': { textAlign: 'left', fontSize: 11, color: 'text.secondary', fontWeight: 500, py: 0.5, px: 1, whiteSpace: 'nowrap' },
                    '& td': { py: 1, px: 1, borderTop: '0.5px solid', borderColor: 'divider', fontSize: 13, verticalAlign: 'middle' },
                  }}
                >
                  <thead>
                    <tr>
                      <th></th><th>Action</th><th>Impact</th><th>Affects</th><th>Risk reduction</th><th>Owner</th><th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {moves.slice(0, 5).map((mv, i) => (
                      <Box
                        component="tr"
                        key={mv.mechanismTypeId}
                        onClick={() => setActiveMove(mv)}
                        sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                      >
                        <td>
                          <Box sx={{ width: 22, height: 22, borderRadius: '50%', bgcolor: 'rgba(83,74,183,0.12)', color: PURPLE, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</Box>
                        </td>
                        <td>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            {iconFor(mv.mechanismLabel)}
                            <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>{mv.mechanismLabel}</Typography>
                          </Stack>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <Typography variant="body2"><Box component="span" sx={{ fontWeight: 600 }}>{mv.obligationsCleared}</Box> reqs</Typography>
                        </td>
                        <td><Typography variant="body2" color="text.secondary">{mv.affectsSolicitations > 0 ? mv.affectsSolicitations : '—'}</Typography></td>
                        <td><Chip label={mv.riskLevel} size="small" sx={{ height: 20, fontSize: 11, bgcolor: riskBg(mv.riskLevel), color: riskFg(mv.riskLevel) }} /></td>
                        <td><Typography variant="body2" color="text.secondary">Unassigned</Typography></td>
                        <td><Chip label="Not started" size="small" variant="outlined" sx={{ height: 20, fontSize: 11 }} /></td>
                      </Box>
                    ))}
                  </tbody>
                </Box>
              </Box>
            )}
            <Box sx={{ mt: 1 }}>
              <Pending label="owner (from POA&M) · status tracking — coming" />
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
            <Stack direction="row" alignItems="center" sx={{ mb: 0.25 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1 }}>Solicitation readiness</Typography>
              <Button size="small" sx={{ textTransform: 'none' }} onClick={() => navigate('/evaluations')}>View all scans</Button>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Recent solicitation scans and bid-readiness.
            </Typography>
            <Stack spacing={1}>
              {evalList.slice(0, 4).map(e => {
                const gaps = e.coverageSummary?.gaps ?? 0;
                return (
                  <Stack key={e.id} direction="row" alignItems="center" spacing={1}
                    onClick={() => navigate(`/evaluations/${e.id}`)}
                    sx={{ cursor: 'pointer', p: 0.5, borderRadius: 1, '&:hover': { bgcolor: 'action.hover' } }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: '#3C3489' }} noWrap title={e.title}>{e.title}</Typography>
                      <Typography variant="caption" color="text.secondary">{relTime(e.createdAt)}</Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: gaps > 0 ? RED : GREEN, fontWeight: 500, whiteSpace: 'nowrap' }}>
                      {gaps} blocking {gaps === 1 ? 'gap' : 'gaps'}
                    </Typography>
                  </Stack>
                );
              })}
              {evalList.length === 0 && (
                <Typography variant="body2" color="text.secondary">No solicitations scanned yet.</Typography>
              )}
            </Stack>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1.25 }}>
              <Pending label="readiness % coming" />
              <Box sx={{ flex: 1 }} />
              <Button size="small" variant="contained" sx={{ textTransform: 'none', bgcolor: PURPLE }}>Generate bid readiness report</Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>

      {/* Analytics row */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 1.5 }}>
        <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Open gaps by type</Typography>
            <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mb: 1 }}>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>{m.partial + m.notStarted}</Typography>
              <Typography variant="caption" color="text.secondary">open requirements</Typography>
            </Stack>
            <Pending label="type classification coming" />
          </CardContent>
        </Card>

        <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Requirements by source</Typography>
            <Stack spacing={0.75}>
              {m.bySource.slice(0, 7).map(s => (
                <Stack key={s.source} direction="row" alignItems="center" spacing={1}>
                  <Typography variant="caption" sx={{ width: 96, flexShrink: 0 }} noWrap>{s.source}</Typography>
                  <Box sx={{ flex: 1, height: 7, bgcolor: 'rgba(0,0,0,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                    <Box sx={{ width: `${s.pct}%`, height: '100%', bgcolor: PURPLE }} />
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ width: 50, textAlign: 'right' }}>{s.count} ({s.pct}%)</Typography>
                </Stack>
              ))}
            </Stack>
          </CardContent>
        </Card>

        <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Recent activity</Typography>
            <Pending label="activity feed coming" />
          </CardContent>
        </Card>
      </Box>

      <Divider sx={{ my: 2 }} />
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
        Readiness reflects mapped controls and available evidence. Requirements are marked satisfied only
        when all required controls and evidence are complete — which is why baseline readiness can be above 0%
        while few requirements are fully satisfied.
      </Typography>

      <RemediationDrawer move={activeMove} onClose={() => setActiveMove(null)} />
    </Box>
  );
}
