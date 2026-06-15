import React, { useMemo, useState } from 'react';
import {
  Box, Card, CardContent, Chip, CircularProgress, Collapse, Divider,
  IconButton, LinearProgress, Stack, Tooltip, Typography, Button,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { keys } from '../queryClient';
import { useProjectSummary, type FrameworkSummary } from '../hooks/useProjectSummary';
import { useCascadeSurface, obligationCoverage } from '../hooks/useCascadeSurface';
import { listInstances } from '../services/obligationsService';
import { PieChart, Pie, Cell } from 'recharts';

/**
 * Program Readiness widget — Phase D-2.1 + D-2.2.
 *
 * The "am I ready to bid?" north-star view for Motion A users (greenfield
 * SMB getting their first federal contract). Composes data that already
 * lives in two existing widgets (compliance progress + obligations) into
 * one headline traffic-light signal so the user doesn't have to mentally
 * roll up across cards.
 *
 * Two visual layers:
 *   LAYER 1 — traffic-light badge (READY / EVALUATE / NOT READY) with a
 *     one-line plain-English reason
 *   LAYER 2 — supporting metrics (per-framework % implemented, top
 *     frameworks to work next, obligations due)
 *
 * Click the header to expand/collapse the supporting metrics.
 *
 * Data sources:
 *   - useProjectSummary() for framework completion % (shared cache with
 *     Dashboard's existing Compliance Progress card and Matrix heatmap)
 *   - listInstances({due_within_days:90}) for obligations — same query
 *     key as ObligationsDueWidget so a single fetch serves both widgets
 *
 * Evidence-coverage rate: TBD. The current /api/controls/project-summary
 * response (ProjectSummary in useProjectSummary.ts) doesn't expose a
 * "% of IMPLEMENTED controls with evidence_notes" metric. Wiring it
 * would require either (a) extending the BE summary endpoint, or (b) a
 * dedicated /api/controls/evidence-coverage roll-up. Deferred to the
 * next sprint; widget renders without it rather than fabricating a
 * value.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Traffic-light thresholds — locally defined constants. Not user-configurable
// in this MVP (per briefing). Revisit when a customer asks for per-program
// overrides (probably never — these are pretty universal "ready to bid"
// heuristics).
// ─────────────────────────────────────────────────────────────────────────────
const READY_FRAMEWORK_PCT = 80;          // GREEN floor for every framework
const EVALUATE_FRAMEWORK_PCT = 50;       // YELLOW floor; below = RED
const YELLOW_DUE_SOON_DAYS = 7;          // any obligation due in <=7d → at-least YELLOW

type Signal = 'GREEN' | 'YELLOW' | 'RED';

const SIGNAL_META: Record<Signal, { label: string; color: string; bg: string }> = {
  GREEN: { label: 'READY',     color: '#15803d', bg: 'rgba(34,197,94,0.12)'  },
  YELLOW:{ label: 'EVALUATE',  color: '#b45309', bg: 'rgba(245,158,11,0.14)' },
  RED:   { label: 'NOT READY', color: '#b91c1c', bg: 'rgba(239,68,68,0.12)'  },
};

function daysUntil(date: string | null): number | null {
  if (!date) return null;
  const due = new Date(date + 'T00:00:00Z').getTime();
  const today = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z').getTime();
  return Math.round((due - today) / 86_400_000);
}

interface ObligationStats {
  overdue: number;
  dueWithin7: number;
  dueWithin30: number;
}

interface Readiness {
  signal: Signal;
  reason: string;
  /** Frameworks sorted ascending by completionPct — the "top to work next" list. */
  worstFrameworks: FrameworkSummary[];
  overallPct: number | null;
}

function computeReadiness(
  frameworks: FrameworkSummary[],
  obligations: ObligationStats,
): Readiness {
  const worstFrameworks = [...frameworks].sort((a, b) => a.completionPct - b.completionPct);
  const overallPct = frameworks.length > 0
    ? frameworks.reduce((s, f) => s + f.completionPct, 0) / frameworks.length
    : null;

  // RED conditions — any one trips the whole light
  const redFrameworks = frameworks.filter(f => f.completionPct < EVALUATE_FRAMEWORK_PCT);
  if (obligations.overdue > 0 || redFrameworks.length > 0) {
    const reasons: string[] = [];
    if (obligations.overdue > 0) {
      reasons.push(`${obligations.overdue} overdue obligation${obligations.overdue === 1 ? '' : 's'}`);
    }
    if (redFrameworks.length > 0) {
      const f = redFrameworks[0];
      reasons.push(`${f.name} at ${Math.round(f.completionPct)}%`);
    }
    return {
      signal: 'RED',
      reason: reasons.join(' + ') + '.',
      worstFrameworks,
      overallPct,
    };
  }

  // YELLOW conditions
  const yellowFrameworks = frameworks.filter(
    f => f.completionPct >= EVALUATE_FRAMEWORK_PCT && f.completionPct < READY_FRAMEWORK_PCT,
  );
  if (yellowFrameworks.length > 0 || obligations.dueWithin7 > 0) {
    const reasons: string[] = [];
    if (yellowFrameworks.length > 0) {
      reasons.push(
        `${yellowFrameworks.length} framework${yellowFrameworks.length === 1 ? '' : 's'} below ${READY_FRAMEWORK_PCT}%`,
      );
    }
    if (obligations.dueWithin7 > 0) {
      reasons.push(
        `${obligations.dueWithin7} obligation${obligations.dueWithin7 === 1 ? '' : 's'} due within ${YELLOW_DUE_SOON_DAYS}d`,
      );
    }
    return {
      signal: 'YELLOW',
      reason: reasons.join(' + ') + '.',
      worstFrameworks,
      overallPct,
    };
  }

  // GREEN — every framework at or above ready floor, no overdue, no imminent due
  if (frameworks.length === 0) {
    return {
      signal: 'YELLOW',
      reason: 'No frameworks activated yet — activate one to track readiness.',
      worstFrameworks,
      overallPct,
    };
  }
  return {
    signal: 'GREEN',
    reason: `All ${frameworks.length} framework${frameworks.length === 1 ? '' : 's'} at or above ${READY_FRAMEWORK_PCT}% with no overdue obligations.`,
    worstFrameworks,
    overallPct,
  };
}

const ProgramReadinessWidget: React.FC = () => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<boolean>(true);
  // Which framework's control/objective detail is expanded (merged in from the
  // old standalone Compliance Progress card). Null = all collapsed.
  const [openFw, setOpenFw] = useState<string | null>(null);

  // Compliance frameworks — same query key + hook the Compliance Progress
  // card already uses, so this is a cache hit on dashboard re-render.
  const { data: summary, isLoading: summaryLoading } = useProjectSummary();

  // Obligations — same query key as ObligationsDueWidget for shared cache.
  const { data: obligationsData, isLoading: obligationsLoading } = useQuery({
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

  const obligationStats: ObligationStats = useMemo(() => {
    const items = obligationsData?.items ?? [];
    const today = new Date().toISOString().slice(0, 10);
    let overdue = 0, dueWithin7 = 0, dueWithin30 = 0;
    for (const r of items) {
      if (r.status === 'completed' || r.status === 'waived') continue;
      if (!r.due_date) continue;
      if (r.due_date < today) {
        overdue++;
        continue;
      }
      const d = daysUntil(r.due_date);
      if (d == null) continue;
      if (d <= YELLOW_DUE_SOON_DAYS) dueWithin7++;
      if (d <= 30) dueWithin30++;
    }
    return { overdue, dueWithin7, dueWithin30 };
  }, [obligationsData]);

  const frameworks = summary?.frameworks ?? [];
  const readiness = useMemo(
    () => computeReadiness(frameworks, obligationStats),
    [frameworks, obligationStats],
  );

  // Posture — coverage across the FULL obligation surface (the cascade), derived
  // from the SAME framework %s as readiness so the two are consistent. Posture is
  // broader than control implementation: it also counts non-control obligations
  // and the overlooked tail that lies beyond your activated frameworks (the
  // "blind spots"), so it comes out at or below the control-implementation %.
  const { data: obligations } = useCascadeSurface();
  const coverage = useMemo(() => {
    const obs = obligations ?? [];
    if (obs.length === 0) return null;
    const fwPct: Record<string, number> = {};
    frameworks.forEach(f => { fwPct[f.id] = f.completionPct; });
    const covs = obs.map(o => obligationCoverage(o, fwPct));
    const posturePct = Math.round(covs.reduce((a, b) => a + b, 0) / obs.length);
    const blindSpots = obs.filter(o => !o.explicitSatisfied && o.frameworkIds.length === 0).length;
    return { posturePct, blindSpots, total: obs.length };
  }, [obligations, frameworks]);

  const isLoading = summaryLoading || obligationsLoading;
  const meta = SIGNAL_META[readiness.signal];

  return (
    <Card sx={{ mb: { xs: 2, md: 3 }, border: '1px solid', borderColor: 'divider' }}>
      <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
          <RocketLaunchIcon fontSize="small" color="action" />
          <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1 }}>
            Coverage
          </Typography>
          <Tooltip title="Open controls page">
            <IconButton size="small" onClick={() => navigate('/controls')} aria-label="Open controls">
              <OpenInNewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={expanded ? 'Collapse details' : 'Expand details'}>
            <IconButton
              size="small"
              onClick={() => setExpanded(v => !v)}
              aria-label={expanded ? 'Collapse readiness details' : 'Expand readiness details'}
            >
              {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Stack>

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={20} />
          </Box>
        ) : (
          <>
            {/* LAYER 1 — Traffic-light badge + reason */}
            <Box
              onClick={() => setExpanded(v => !v)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: 1.5,
                borderRadius: 1,
                bgcolor: meta.bg,
                cursor: 'pointer',
                '&:hover': { filter: 'brightness(0.98)' },
              }}
            >
              <Chip
                label={meta.label}
                sx={{
                  bgcolor: meta.color,
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  height: 32,
                  px: 1,
                  letterSpacing: 0.5,
                }}
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 500 }}>
                  {coverage
                    ? `${coverage.posturePct}% of everything you owe is covered`
                    : readiness.reason}
                </Typography>
                {coverage && readiness.overallPct != null && (
                  <Typography variant="caption" color="text.secondary">
                    driven by {Math.round(readiness.overallPct)}% of your framework controls implemented
                    {coverage.blindSpots > 0 && (
                      <>
                        {' · '}
                        <Box component="span" sx={{ color: '#b91c1c', fontWeight: 600 }}>
                          {coverage.blindSpots} beyond your frameworks
                        </Box>
                      </>
                    )}
                  </Typography>
                )}
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: meta.color, whiteSpace: 'nowrap' }}>
                {coverage
                  ? `${coverage.posturePct}%`
                  : (readiness.overallPct != null ? `${Math.round(readiness.overallPct)}%` : '')}
              </Typography>
            </Box>

            {/* LAYER 2 — Supporting metrics */}
            <Collapse in={expanded} timeout="auto" unmountOnExit>
              <Box sx={{ mt: 2 }}>
                {/* Per-framework progress bars */}
                {frameworks.length > 0 ? (
                  <>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 600 }}>
                      Framework progress — click a framework for control &amp; objective detail
                    </Typography>
                    <Stack spacing={1} sx={{ mb: 2 }}>
                      {frameworks.map(fw => {
                        const pct = fw.completionPct;
                        const barColor = pct >= READY_FRAMEWORK_PCT ? '#22c55e'
                          : pct >= EVALUATE_FRAMEWORK_PCT ? '#f59e0b'
                          : '#ef4444';
                        const isOpen = openFw === fw.id;
                        const controlSegs = [
                          { label: 'Implemented', value: fw.implemented, color: '#22c55e', muted: false },
                          { label: 'In Progress', value: fw.inProgress, color: '#f59e0b', muted: false },
                          { label: 'Not Started', value: fw.notStarted, color: '#e5e7eb', muted: true },
                        ];
                        const o = fw.objectives;
                        return (
                          <Box
                            key={fw.id}
                            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}
                          >
                            {/* Clickable header row */}
                            <Box
                              onClick={() => setOpenFw(isOpen ? null : fw.id)}
                              sx={{ cursor: 'pointer', p: 1, '&:hover': { bgcolor: 'action.hover' } }}
                            >
                              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.25 }}>
                                {isOpen
                                  ? <ExpandLessIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                                  : <ExpandMoreIcon sx={{ fontSize: 18, color: 'text.secondary' }} />}
                                <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }}>
                                  {fw.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {fw.implemented}/{fw.totalControls}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{ fontWeight: 700, color: barColor, minWidth: 36, textAlign: 'right' }}
                                >
                                  {Math.round(pct)}%
                                </Typography>
                              </Stack>
                              <LinearProgress
                                variant="determinate"
                                value={Math.min(100, Math.max(0, pct))}
                                sx={{
                                  height: 6,
                                  borderRadius: 3,
                                  bgcolor: 'rgba(0,0,0,0.06)',
                                  '& .MuiLinearProgress-bar': { borderRadius: 3, bgcolor: barColor },
                                }}
                              />
                            </Box>

                            {/* Expanded detail — completion gauge + controls + objectives */}
                            <Collapse in={isOpen} timeout="auto" unmountOnExit>
                              <Box sx={{ p: 1.5, pt: 1, bgcolor: 'action.hover' }}>
                                {/* Completion gauge */}
                                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                                  <Box sx={{ position: 'relative', width: 170, height: 96 }}>
                                    <PieChart width={170} height={96}>
                                      <Pie
                                        data={[{ value: pct }, { value: Math.max(0, 100 - pct) }]}
                                        cx={85}
                                        cy={90}
                                        startAngle={180}
                                        endAngle={0}
                                        innerRadius={50}
                                        outerRadius={70}
                                        dataKey="value"
                                        stroke="none"
                                      >
                                        <Cell fill={barColor} />
                                        <Cell fill="#f1f5f9" />
                                      </Pie>
                                    </PieChart>
                                    <Box sx={{ position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
                                      <Typography variant="h6" sx={{ fontWeight: 800, color: barColor, lineHeight: 1 }}>
                                        {Math.round(pct)}%
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                                        controls implemented
                                      </Typography>
                                    </Box>
                                  </Box>
                                </Box>

                                {/* Controls breakdown */}
                                <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                                  Controls ({fw.totalControls})
                                </Typography>
                                <Box sx={{ display: 'flex', height: 14, borderRadius: 1, overflow: 'hidden', bgcolor: 'rgba(0,0,0,0.06)' }}>
                                  {controlSegs.filter(s => s.value > 0).map(s => (
                                    <Box key={s.label} sx={{ width: `${(s.value / Math.max(1, fw.totalControls)) * 100}%`, bgcolor: s.color }} />
                                  ))}
                                </Box>
                                <Stack direction="row" spacing={1.5} sx={{ mt: 0.5, flexWrap: 'wrap', rowGap: 0.25 }}>
                                  {controlSegs.map(s => (
                                    <Typography key={s.label} variant="caption" sx={{ color: s.muted ? 'text.secondary' : s.color }}>
                                      {s.value} {s.label}
                                    </Typography>
                                  ))}
                                </Stack>

                                {/* Assessment objectives breakdown */}
                                {o && o.total > 0 && (
                                  <>
                                    <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mt: 1.25, mb: 0.5 }}>
                                      Assessment objectives ({o.total})
                                    </Typography>
                                    <Box sx={{ display: 'flex', height: 14, borderRadius: 1, overflow: 'hidden', bgcolor: 'rgba(0,0,0,0.06)' }}>
                                      {o.fullyMet > 0 && <Box sx={{ width: `${(o.fullyMet / o.total) * 100}%`, bgcolor: '#22c55e' }} />}
                                      {o.partiallyMet > 0 && <Box sx={{ width: `${(o.partiallyMet / o.total) * 100}%`, bgcolor: '#f59e0b' }} />}
                                      {o.notMet > 0 && <Box sx={{ width: `${(o.notMet / o.total) * 100}%`, bgcolor: '#ef4444' }} />}
                                    </Box>
                                    <Stack direction="row" spacing={1.5} sx={{ mt: 0.5, flexWrap: 'wrap', rowGap: 0.25 }}>
                                      <Typography variant="caption" sx={{ color: '#15803d' }}>{o.fullyMet} Met</Typography>
                                      <Typography variant="caption" sx={{ color: '#b45309' }}>{o.partiallyMet} Partial</Typography>
                                      <Typography variant="caption" sx={{ color: '#b91c1c' }}>{o.notMet} Not Met</Typography>
                                    </Stack>
                                  </>
                                )}

                                {/* Explainer — the two number sets, related */}
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.25, fontStyle: 'italic' }}>
                                  Each control is one requirement that breaks into finer assessment objectives.
                                  Implemented / In Progress / Not Started is the status of the controls;
                                  Met / Partial / Not Met is the status of the objectives underneath them.
                                </Typography>
                              </Box>
                            </Collapse>
                          </Box>
                        );
                      })}
                    </Stack>
                  </>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    No frameworks activated yet.
                  </Typography>
                )}

                <Divider sx={{ mb: 1 }} />

                {/* Obligations rollup */}
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ flex: 1, fontWeight: 600 }}>
                    Obligations
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => navigate('/obligations')}
                    sx={{ textTransform: 'none', fontSize: '0.7rem', minWidth: 0, p: 0.25 }}
                  >
                    View all
                  </Button>
                </Stack>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
                  <Chip
                    label={`${obligationStats.overdue} overdue`}
                    size="small"
                    color="error"
                    variant={obligationStats.overdue ? 'filled' : 'outlined'}
                  />
                  <Chip
                    label={`${obligationStats.dueWithin30} due in 30d`}
                    size="small"
                    color="warning"
                    variant={obligationStats.dueWithin30 ? 'filled' : 'outlined'}
                  />
                </Stack>

                {/* Evidence coverage rate — TBD.
                    The project-summary endpoint returns per-framework status
                    counts but no evidence_notes presence metric. Wiring this
                    cleanly requires either:
                      (a) extending /api/controls/project-summary with an
                          `evidenceCoverage: { withEvidence, total, pct }`
                          field, or
                      (b) a dedicated /api/controls/evidence-coverage
                          aggregate.
                    Both are BE-side. Deferred to a follow-up rather than
                    shipping a computed-from-thin-air value. */}
              </Box>
            </Collapse>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ProgramReadinessWidget;
