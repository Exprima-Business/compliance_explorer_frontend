import { useMemo } from 'react';
import {
  Box, Card, CardContent, CircularProgress, Stack, Typography,
} from '@mui/material';
import ListCheckIcon from '@mui/icons-material/ChecklistRtl';
import ShieldIcon from '@mui/icons-material/Shield';
import CalendarIcon from '@mui/icons-material/EventBusy';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { keys } from '../queryClient';
import { listInstances } from '../services/obligationsService';
import { useCascadeSurface, obligationCoverage } from '../hooks/useCascadeSurface';
import { useProjectSummary } from '../hooks/useProjectSummary';

function bandColor(pct: number): string {
  if (pct >= 80) return '#15803d';
  if (pct >= 50) return '#b45309';
  return '#b91c1c';
}

/** A compact "needs attention" domain card (Vanta/Drata-style). */
function DomainCard({
  icon, label, value, sub, barPct, barColor, onClick,
}: {
  icon: React.ReactNode; label: string; value: React.ReactNode; sub: string;
  barPct: number; barColor: string; onClick?: () => void;
}) {
  return (
    <Box
      onClick={onClick}
      sx={{
        background: 'var(--mui-palette-background-paper, #fff)',
        border: '0.5px solid', borderColor: 'divider', borderRadius: 2,
        p: '13px 15px', cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick ? { bgcolor: 'action.hover' } : undefined,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ color: 'text.secondary', mb: 0.5 }}>
        {icon}
        <Typography variant="caption" color="text.secondary">{label}</Typography>
      </Stack>
      <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.1 }}>{value}</Typography>
      <Typography variant="caption" color="text.secondary">{sub}</Typography>
      <Box sx={{ height: 5, bgcolor: 'rgba(0,0,0,0.06)', borderRadius: 3, overflow: 'hidden', mt: 0.75 }}>
        <Box sx={{ width: `${Math.min(100, Math.max(0, barPct))}%`, height: '100%', bgcolor: barColor }} />
      </Box>
    </Box>
  );
}

/**
 * The matured cascade-dashboard overview: one coverage headline + a row of
 * "needs attention" domain cards (Requirements / Controls / Renewals). The
 * Requirements register and Moves render below this (in CascadeOverview).
 */
export default function OverviewHeader() {
  const navigate = useNavigate();
  const { data: obligations, isLoading } = useCascadeSurface();
  const { data: summary } = useProjectSummary();

  const { data: oblData } = useQuery({
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

  const view = useMemo(() => {
    const obs = obligations ?? [];
    const fwPct: Record<string, number> = {};
    (summary?.frameworks ?? []).forEach(f => { fwPct[f.id] = f.completionPct; });
    const implemented = (summary?.frameworks ?? []).reduce((s, f) => s + f.implemented, 0);
    const totalControls = (summary?.frameworks ?? []).reduce((s, f) => s + f.totalControls, 0);
    const total = obs.length;
    const covs = obs.map(o => obligationCoverage(o, fwPct));
    const posture = total ? Math.round(covs.reduce((a, b) => a + b, 0) / total) : 0;
    const controlPct = totalControls ? Math.round((implemented / totalControls) * 100) : 0;
    const fullyCovered = covs.filter(c => c >= 100).length;
    const needAction = covs.filter(c => c < 100).length;
    const blindSpots = obs.filter(o => !o.explicitSatisfied && o.frameworkIds.length === 0).length;
    return { total, posture, controlPct, fullyCovered, needAction, blindSpots, implemented, totalControls };
  }, [obligations, summary]);

  const renewals = useMemo(() => {
    const items = oblData?.items ?? [];
    const today = new Date().toISOString().slice(0, 10);
    let overdue = 0, due30 = 0;
    for (const r of items) {
      if (r.status === 'completed' || r.status === 'waived' || !r.due_date) continue;
      if (r.due_date < today) { overdue++; continue; }
      const d = Math.round(
        (new Date(r.due_date + 'T00:00:00Z').getTime() - new Date(today + 'T00:00:00Z').getTime()) / 86_400_000,
      );
      if (d <= 30) due30++;
    }
    return { overdue, due30 };
  }, [oblData]);

  if (isLoading) {
    return (
      <Card sx={{ mb: { xs: 2, md: 3 }, border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={24} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Box sx={{ mb: { xs: 2, md: 3 } }}>
      {/* Coverage hero */}
      <Card sx={{ mb: 1.5, border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
          <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mb: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1 }}>
              Compliance coverage
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 600, color: bandColor(view.posture) }}>
              {view.posture}%
            </Typography>
          </Stack>
          <Box sx={{ height: 9, bgcolor: 'rgba(0,0,0,0.06)', borderRadius: 5, overflow: 'hidden', mb: 1 }}>
            <Box sx={{ width: `${view.posture}%`, height: '100%', bgcolor: bandColor(view.posture) }} />
          </Box>
          <Typography variant="caption" color="text.secondary">
            {view.fullyCovered} of {view.total} requirements covered
            {' · '}
            <Box component="span" sx={{ color: '#b91c1c', fontWeight: 500 }}>{view.needAction} need action</Box>
            {' · '}driven by {view.controlPct}% of framework controls implemented
            {view.blindSpots > 0 && (
              <>
                {' · '}
                <Box component="span" sx={{ color: '#b91c1c', fontWeight: 500 }}>
                  {view.blindSpots} beyond your frameworks
                </Box>
              </>
            )}
          </Typography>
        </CardContent>
      </Card>

      {/* Domain cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 1.25 }}>
        <DomainCard
          icon={<ListCheckIcon sx={{ fontSize: 15 }} />}
          label="Requirements"
          value={<Box component="span" sx={{ color: '#b91c1c' }}>{view.needAction}</Box>}
          sub={`need action · ${view.fullyCovered} of ${view.total} covered`}
          barPct={view.total ? (view.fullyCovered / view.total) * 100 : 0}
          barColor="#639922"
        />
        <DomainCard
          icon={<ShieldIcon sx={{ fontSize: 15 }} />}
          label="Controls"
          value={<>{view.implemented}<Box component="span" sx={{ fontSize: 13, color: 'text.secondary', fontWeight: 400 }}> / {view.totalControls}</Box></>}
          sub="implemented — open the matrix"
          barPct={view.controlPct}
          barColor="#b45309"
          onClick={() => navigate('/controls')}
        />
        <DomainCard
          icon={<CalendarIcon sx={{ fontSize: 15 }} />}
          label="Renewals"
          value={renewals.overdue}
          sub={`overdue · ${renewals.due30} due in 30 days`}
          barPct={renewals.overdue === 0 ? 100 : 40}
          barColor={renewals.overdue === 0 ? '#639922' : '#b91c1c'}
          onClick={() => navigate('/obligations')}
        />
      </Box>
    </Box>
  );
}
