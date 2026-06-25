import { useMemo, useState } from 'react';
import {
  Box, Button, Card, CardContent, Chip, CircularProgress, Divider, Stack, Typography,
} from '@mui/material';
import StarIcon from '@mui/icons-material/AutoAwesome';
import CloudUpload from '@mui/icons-material/CloudUpload';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { obligationCoverage } from '../hooks/useCascadeSurface';
import { useOrgSummary } from '../hooks/useOrgSummary';
import { type CascadeMove } from '../hooks/useCascadeLeverage';
import { useCascadeOrgSurface, useCascadeOrgLeverage } from '../hooks/useCascadeOrg';
import { useOrgMembers, memberLabel } from '../hooks/useOrgMembers';
import { evaluationService, type SolicitationEvaluation, type CoverageSummary } from '../services/evaluationService';
import RemediationDrawer from './RemediationDrawer';
import ComplianceAssistant from './ComplianceAssistant';
import ScopeSetupAssistant from './ScopeSetupAssistant';
import JourneyGuide from './JourneyGuide';
import { PieChart, Pie, Cell } from 'recharts';
import { GREEN, AMBER, RED, GRAY, PURPLE, riskBg, riskFg, statusSx, iconFor } from './remediationVisuals';

const band = (p: number) => (p >= 80 ? GREEN : p >= 50 ? AMBER : RED);
const bandLabel = (p: number) => (p >= 80 ? 'High' : p >= 50 ? 'Medium' : 'Low');

/** Derive a solicitation doc type from the title/number — evals don't store one. */
function deriveType(title: string, num: string | null): string {
  const s = `${title} ${num ?? ''}`.toUpperCase();
  if (/\bRFP\b|REQUEST FOR PROPOSAL/.test(s)) return 'RFP';
  if (/\bRFQ\b|REQUEST FOR QUOT/.test(s)) return 'RFQ';
  if (/\bRFI\b|REQUEST FOR INFORMATION/.test(s)) return 'RFI';
  if (/\bBPA\b|BLANKET PURCHASE/.test(s)) return 'BPA';
  if (/\bIDIQ\b/.test(s)) return 'IDIQ';
  if (/TASK ORDER/.test(s)) return 'Task Order';
  if (/\bSOW\b|STATEMENT OF WORK/.test(s)) return 'SOW';
  return '—';
}
/** Readiness = share of detected obligations already covered by the baseline. */
function readinessOf(c: CoverageSummary): number {
  return c.detected > 0 ? Math.round((c.covered / c.detected) * 100) : 0;
}
/** Bid status bands: 0 blocking gaps → Bid-ready; ≥50% covered → At risk; else Not ready. */
function solStatus(c: CoverageSummary): 'Bid-ready' | 'At risk' | 'Not ready' {
  if (c.detected > 0 && c.gaps === 0) return 'Bid-ready';
  return readinessOf(c) >= 50 ? 'At risk' : 'Not ready';
}
const solStatusSx = (s: string) =>
  s === 'Bid-ready' ? { bgcolor: 'rgba(21,128,61,0.12)', color: GREEN }
    : s === 'At risk' ? { bgcolor: 'rgba(180,83,9,0.12)', color: AMBER }
      : { bgcolor: 'rgba(185,28,28,0.12)', color: RED };

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

/** A compact donut (recharts) with optional centered content. */
function Donut({ data, size = 72, inner = 24, center }: {
  data: { value: number; color: string }[];
  size?: number;
  inner?: number;
  center?: React.ReactNode;
}) {
  const total = data.reduce((a, b) => a + b.value, 0);
  const slices = total > 0 ? data.filter(d => d.value > 0) : [{ value: 1, color: '#e5e7eb' }];
  return (
    <Box sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <PieChart width={size} height={size}>
        <Pie
          data={slices} dataKey="value" cx="50%" cy="50%"
          innerRadius={inner} outerRadius={size / 2 - 2}
          startAngle={90} endAngle={-270} stroke="none" isAnimationActive={false}
        >
          {slices.map((d, i) => <Cell key={i} fill={d.color} />)}
        </Pie>
      </PieChart>
      {center && (
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          {center}
        </Box>
      )}
    </Box>
  );
}

/** Legend row: a vivid color dot + readable gray label + bold value. Decouples
 *  the color-coding (dot) from the text so labels stay legible at any hue. */
function LegendRow({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <Stack direction="row" alignItems="center" spacing={0.75}>
      <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
      <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }} noWrap>{label}</Typography>
      <Typography variant="caption" sx={{ fontWeight: 600 }}>{value}</Typography>
    </Stack>
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
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  // Org-wide surface + moves + posture summary — all on the org baseline now
  // (org-baseline Phase B1; the single-program-summary bridge is retired).
  const { data: obligations, isLoading: surfaceLoading } = useCascadeOrgSurface();
  const { data: summary } = useOrgSummary();
  const { data: moves } = useCascadeOrgLeverage();
  const { data: members = [] } = useOrgMembers();
  const leadLabel = (userId: string | null) => {
    if (!userId) return null;
    const m = members.find((x) => x.userId === userId);
    return m ? memberLabel(m) : 'Assigned';
  };
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
  const solRows = evalList.map(e => {
    const c = e.coverageSummary ?? { detected: 0, covered: 0, gaps: 0, unknown: 0 };
    return {
      id: e.id,
      title: e.title,
      type: deriveType(e.title, e.solicitationNumber),
      customer: e.agency ?? '—',
      scanDate: e.createdAt,
      status: solStatus(c),
      gaps: c.gaps,
      readiness: readinessOf(c),
    };
  });
  const solCounts = {
    bidReady: solRows.filter(r => r.status === 'Bid-ready').length,
    atRisk: solRows.filter(r => r.status === 'At risk').length,
    notReady: solRows.filter(r => r.status === 'Not ready').length,
  };
  const topMove = moves?.[0];
  const riskMoves = moves ?? [];
  const riskCounts = {
    high: riskMoves.filter(mv => mv.riskLevel === 'High').length,
    medium: riskMoves.filter(mv => mv.riskLevel === 'Medium').length,
    low: riskMoves.filter(mv => mv.riskLevel !== 'High' && mv.riskLevel !== 'Medium').length,
  };
  const openActions = riskMoves.length;

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    try {
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ]);
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text('Bid Readiness Report', 14, 18);
      doc.setFontSize(10);
      doc.setTextColor(110);
      doc.text(`Organization baseline readiness: ${m.posture}%  ·  ${m.satisfied}/${m.total} requirements covered`, 14, 26);
      doc.text(`Generated ${new Date().toLocaleString()}`, 14, 31);
      autoTable(doc, {
        startY: 38,
        head: [['Opportunity', 'Type', 'Customer', 'Scan date', 'Status', 'Blocking gaps', 'Readiness']],
        body: solRows.map(r => [
          r.title, r.type, r.customer, new Date(r.scanDate).toLocaleDateString(),
          r.status, String(r.gaps), `${r.readiness}%`,
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [83, 74, 183] },
      });
      doc.save(`bid-readiness-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch {
      // best-effort export; the button re-enables on failure
    } finally {
      setGeneratingReport(false);
    }
  };

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
        {/* Key workflow actions — kept prominent. "Set up scope" is driven by
            the next-step hero below, so it isn't repeated as a top button. */}
        <Stack direction="row" spacing={1.25} alignItems="center" flexWrap="wrap" sx={{ rowGap: 1 }}>
          <Chip label="Organization Baseline" size="small" variant="outlined" sx={{ borderStyle: 'solid' }} />
          <Button
            variant="contained"
            startIcon={<CloudUpload sx={{ fontSize: 20 }} />}
            sx={{ textTransform: 'none', fontWeight: 600, px: 2, boxShadow: 'none' }}
            onClick={() => navigate('/document-scanner')}
          >
            Scan Solicitation
          </Button>
          <Button
            variant="contained"
            startIcon={<StarIcon sx={{ fontSize: 18 }} />}
            sx={{
              textTransform: 'none', fontWeight: 600, px: 2, boxShadow: 'none',
              bgcolor: PURPLE, '&:hover': { bgcolor: '#433a9e' },
            }}
            onClick={() => setAssistantOpen(true)}
          >
            Ask AI
          </Button>
        </Stack>
      </Stack>

      {/* Guided layer: journey spine + next-step hero */}
      <JourneyGuide
        hasFrameworks={m.totalControls > 0}
        hasSurface={m.total > 0}
        posture={m.posture}
        covered={m.satisfied}
        total={m.total}
        gapsOpen={m.partial + m.notStarted}
        topMove={topMove ?? null}
        moveCount={moves?.length ?? 0}
        onSetupScope={() => setSetupOpen(true)}
        onStartMove={(mv) => setActiveMove(mv)}
        onViewAllMoves={() => navigate('/actions')}
        onGenerateReport={() => navigate('/report')}
      />

      {/* KPI row */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 1.5, mb: 2 }}>
        <KpiCard title="Baseline readiness">
          <Stack direction="row" alignItems="baseline" spacing={1}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: band(m.posture) }}>{m.posture}%</Typography>
            <Chip label={bandLabel(m.posture)} size="small" sx={{ height: 18, fontSize: 11, bgcolor: 'rgba(0,0,0,0.06)' }} />
          </Stack>
          <Typography
            variant="caption"
            sx={{ color: PURPLE, cursor: 'pointer', fontWeight: 500 }}
            onClick={() => navigate('/posture')}
          >
            Full posture by authority →
          </Typography>
        </KpiCard>

        <KpiCard title="Requirements">
          <Stack direction="row" alignItems="center" spacing={1.25}>
            <Donut
              size={66} inner={21}
              data={[{ value: m.satisfied, color: GREEN }, { value: m.partial, color: AMBER }, { value: m.notStarted, color: GRAY }]}
              center={<Typography sx={{ fontSize: 17, fontWeight: 700, lineHeight: 1 }}>{m.total}</Typography>}
            />
            <Stack spacing={0.4} sx={{ flex: 1, minWidth: 0 }}>
              <LegendRow color={GREEN} label="Satisfied" value={m.satisfied} />
              <LegendRow color={AMBER} label="Partial" value={m.partial} />
              <LegendRow color={GRAY} label="Not started" value={m.notStarted} />
            </Stack>
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
          <Stack direction="row" alignItems="center" spacing={1.25}>
            <Donut
              size={66} inner={21}
              data={[{ value: solCounts.bidReady, color: GREEN }, { value: solCounts.atRisk, color: AMBER }, { value: solCounts.notReady, color: RED }]}
              center={<Typography sx={{ fontSize: 17, fontWeight: 700, lineHeight: 1 }}>{evalList.length}</Typography>}
            />
            <Stack spacing={0.4} sx={{ flex: 1, minWidth: 0 }}>
              <LegendRow color={GREEN} label="Bid-ready" value={solCounts.bidReady} />
              <LegendRow color={AMBER} label="At risk" value={solCounts.atRisk} />
              <LegendRow color={RED} label="Not ready" value={solCounts.notReady} />
            </Stack>
          </Stack>
        </KpiCard>
      </Box>

      {/* Priority Remediation + Solicitation Readiness */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.2fr 1fr' }, gap: 1.5, mb: 2 }}>
        <Card id="priority-remediation" sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
            <Stack direction="row" alignItems="center" sx={{ mb: 0.25 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1 }}>Priority Remediation</Typography>
              <Button size="small" sx={{ textTransform: 'none' }} onClick={() => navigate('/actions')}>View all actions</Button>
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
                        <td>
                          {leadLabel(mv.leadUserId)
                            ? <Typography variant="body2" noWrap>{leadLabel(mv.leadUserId)}</Typography>
                            : <Typography variant="body2" color="text.secondary">Unassigned</Typography>}
                        </td>
                        <td><Chip label={mv.status} size="small" sx={{ height: 20, fontSize: 11, ...statusSx(mv.status) }} /></td>
                      </Box>
                    ))}
                  </tbody>
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>

        <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
            <Stack direction="row" alignItems="center" sx={{ mb: 0.25 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1 }}>Solicitation readiness</Typography>
              <Button size="small" sx={{ textTransform: 'none' }} onClick={() => navigate('/evaluations')}>View all scans</Button>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Bid-readiness for each scanned opportunity, against your baseline.
            </Typography>
            {solRows.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No solicitations scanned yet.</Typography>
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Box
                  component="table"
                  sx={{
                    width: '100%', borderCollapse: 'collapse', minWidth: 540,
                    '& th': { textAlign: 'left', fontSize: 11, color: 'text.secondary', fontWeight: 500, py: 0.5, px: 1, whiteSpace: 'nowrap' },
                    '& td': { py: 1, px: 1, borderTop: '0.5px solid', borderColor: 'divider', fontSize: 12.5, verticalAlign: 'middle', whiteSpace: 'nowrap' },
                  }}
                >
                  <thead>
                    <tr>
                      <th>Opportunity</th><th>Type</th><th>Customer</th><th>Scan date</th><th>Status</th><th>Gaps</th><th>Readiness</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {solRows.slice(0, 6).map(r => (
                      <Box
                        component="tr" key={r.id}
                        onClick={() => navigate(`/evaluations/${r.id}`)}
                        sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                      >
                        <td><Typography variant="body2" sx={{ fontWeight: 500, color: '#3C3489', maxWidth: 150 }} noWrap title={r.title}>{r.title}</Typography></td>
                        <td>{r.type}</td>
                        <td><Typography variant="body2" noWrap sx={{ maxWidth: 100 }} title={r.customer}>{r.customer}</Typography></td>
                        <td>{new Date(r.scanDate).toLocaleDateString()}</td>
                        <td><Chip label={r.status} size="small" sx={{ height: 20, fontSize: 11, ...solStatusSx(r.status) }} /></td>
                        <td><Typography variant="body2" sx={{ color: r.gaps > 0 ? RED : GREEN, fontWeight: 600, textAlign: 'center' }}>{r.gaps}</Typography></td>
                        <td><Typography variant="body2" sx={{ fontWeight: 600, color: band(r.readiness) }}>{r.readiness}%</Typography></td>
                        <td>
                          <Button size="small" sx={{ textTransform: 'none', minWidth: 0, px: 1 }}
                            onClick={(ev) => { ev.stopPropagation(); navigate(`/evaluations/${r.id}`); }}>
                            {r.status === 'Bid-ready' ? 'Export' : 'Review'}
                          </Button>
                        </td>
                      </Box>
                    ))}
                  </tbody>
                </Box>
              </Box>
            )}
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1.25 }}>
              <Box sx={{ flex: 1 }} />
              <Button
                size="small" variant="contained"
                sx={{ textTransform: 'none', bgcolor: PURPLE }}
                disabled={solRows.length === 0 || generatingReport}
                onClick={handleGenerateReport}
              >
                {generatingReport ? 'Generating…' : 'Generate bid readiness report'}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>

      {/* Analytics row */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 1.5 }}>
        <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.25 }}>Open gaps by risk</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Open remediation actions by risk priority.
            </Typography>
            {openActions === 0 ? (
              <Typography variant="body2" color="text.secondary">No open actions — every surfaced requirement is covered.</Typography>
            ) : (
              <Stack direction="row" alignItems="center" spacing={1.75}>
                <Donut
                  size={96} inner={31}
                  data={[{ value: riskCounts.high, color: RED }, { value: riskCounts.medium, color: AMBER }, { value: riskCounts.low, color: GRAY }]}
                  center={(
                    <>
                      <Typography sx={{ fontSize: 20, fontWeight: 700, lineHeight: 1 }}>{openActions}</Typography>
                      <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>actions</Typography>
                    </>
                  )}
                />
                <Stack spacing={0.4} sx={{ flex: 1, minWidth: 0 }}>
                  <LegendRow color={RED} label="High risk" value={riskCounts.high} />
                  <LegendRow color={AMBER} label="Medium risk" value={riskCounts.medium} />
                  <LegendRow color={GRAY} label="Low risk" value={riskCounts.low} />
                </Stack>
              </Stack>
            )}
            <Typography
              variant="caption"
              sx={{ color: PURPLE, cursor: 'pointer', fontWeight: 500, display: 'block', mt: 1 }}
              onClick={() => navigate('/actions')}
            >
              View all remediation actions →
            </Typography>
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
      <ComplianceAssistant open={assistantOpen} onClose={() => setAssistantOpen(false)} />
      <ScopeSetupAssistant open={setupOpen} onClose={() => setSetupOpen(false)} />
    </Box>
  );
}
