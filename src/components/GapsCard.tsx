import { useMemo, useState } from 'react';
import {
  Box, Button, Card, CardContent, Chip, CircularProgress, Stack, Typography,
} from '@mui/material';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import { useCascadeSurface, obligationCoverage } from '../hooks/useCascadeSurface';
import { useProjectSummary } from '../hooks/useProjectSummary';

/**
 * Cascade dashboard — "Gaps" card. Obligations that aren't yet fully covered
 * (coverage < 100%). Coverage is fractional and derived on the client (control
 * implementation feeds it), so an obligation leaves the list only once it's
 * fully covered. Shares the useCascadeSurface fetch with PostureCard.
 */
export default function GapsCard() {
  const { data: obligations, isLoading, error } = useCascadeSurface();
  const { data: summary } = useProjectSummary();
  const [showAll, setShowAll] = useState(false);

  const gaps = useMemo(() => {
    const obs = obligations ?? [];
    const fwPct: Record<string, number> = {};
    (summary?.frameworks ?? []).forEach(f => { fwPct[f.id] = f.completionPct; });
    return obs
      .map(o => ({ o, cov: obligationCoverage(o, fwPct) }))
      .filter(x => x.cov < 100)
      .sort((a, b) => a.cov - b.cov); // least-covered first
  }, [obligations, summary]);

  const visible = showAll ? gaps : gaps.slice(0, 6);

  return (
    <Card sx={{ mb: { xs: 2, md: 3 }, border: '1px solid', borderColor: 'divider' }}>
      <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.25 }}>
          <ReportProblemOutlinedIcon fontSize="small" color="action" />
          <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1 }}>
            Gaps
          </Typography>
          {!isLoading && !error && gaps.length > 0 && (
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#b91c1c' }}>
              {gaps.length} open
            </Typography>
          )}
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          What isn't fully covered yet — each shows how far along it is.
        </Typography>

        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={24} />
          </Box>
        )}

        {!isLoading && error && (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            Couldn't load your gaps right now.
          </Typography>
        )}

        {!isLoading && !error && gaps.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            No open gaps — every applicable obligation is fully covered, or no
            framework is activated yet.
          </Typography>
        )}

        {!isLoading && !error && visible.length > 0 && (
          <Stack spacing={1}>
            {visible.map(({ o, cov }) => (
              <Stack
                key={o.artifactId}
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{ flexWrap: 'wrap' }}
              >
                <Typography variant="body2" sx={{ fontWeight: 500, flexShrink: 0 }}>
                  {o.identifier}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ flex: 1, minWidth: 0 }}
                  noWrap
                  title={o.title}
                >
                  {o.title}
                </Typography>
                {cov > 0 && (
                  <Chip
                    label={`${cov}%`}
                    size="small"
                    sx={{ height: 18, fontSize: 11, bgcolor: 'rgba(180,83,9,0.12)', color: '#854d0e' }}
                  />
                )}
                <Chip
                  label={o.sourceAuthority}
                  size="small"
                  sx={{ height: 18, fontSize: 11, bgcolor: 'rgba(0,0,0,0.06)' }}
                />
              </Stack>
            ))}
          </Stack>
        )}

        {!isLoading && !error && gaps.length > 6 && (
          <Button
            size="small"
            onClick={() => setShowAll(s => !s)}
            sx={{ mt: 1, textTransform: 'none' }}
          >
            {showAll ? 'Show fewer' : `Show all ${gaps.length} gaps`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
