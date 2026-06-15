import {
  Box, Card, CardContent, CircularProgress, LinearProgress, Stack, Typography,
} from '@mui/material';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import { useCascadeSurface } from '../hooks/useCascadeSurface';

/** Coverage band → color, matching the dashboard's readiness palette. */
function bandColor(pct: number): string {
  if (pct >= 80) return '#15803d'; // green
  if (pct >= 50) return '#b45309'; // amber
  return '#b91c1c'; // red
}

/**
 * Cascade dashboard — "Posture" card. Overall coverage across the full
 * applicable obligation surface (ring) plus a by-authority breakdown (bars),
 * surfacing where the org is strong vs. exposed. Backed by useCascadeSurface.
 */
export default function PostureCard() {
  const { data, isLoading, error } = useCascadeSurface();
  const posture = data?.posture;

  return (
    <Card sx={{ mb: { xs: 2, md: 3 }, border: '1px solid', borderColor: 'divider' }}>
      <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.25 }}>
          <GpsFixedIcon fontSize="small" color="action" />
          <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1 }}>
            Posture
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Coverage across everything you owe — not a single-framework score.
        </Typography>

        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={24} />
          </Box>
        )}

        {!isLoading && error && (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            Couldn't load your posture right now.
          </Typography>
        )}

        {!isLoading && !error && posture && posture.total === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            No posture yet — activate a framework and we'll measure coverage across
            everything it makes you owe.
          </Typography>
        )}

        {!isLoading && !error && posture && posture.total > 0 && (
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2.5}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
          >
            {/* Coverage ring */}
            <Box sx={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
              <CircularProgress
                variant="determinate"
                value={100}
                size={92}
                thickness={4}
                sx={{ color: 'rgba(0,0,0,0.08)' }}
              />
              <CircularProgress
                variant="determinate"
                value={posture.pct}
                size={92}
                thickness={4}
                sx={{
                  color: bandColor(posture.pct),
                  position: 'absolute',
                  left: 0,
                  '& .MuiCircularProgress-circle': { strokeLinecap: 'round' },
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1 }}>
                  {posture.pct}%
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  covered
                </Typography>
              </Box>
            </Box>

            {/* By-authority bars */}
            <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
              <Typography variant="caption" color="text.secondary">
                {posture.covered} of {posture.total} obligations covered · by authority:
              </Typography>
              <Stack spacing={0.75} sx={{ mt: 0.75 }}>
                {posture.byAuthority.slice(0, 6).map((a) => (
                  <Stack key={a.authority} direction="row" alignItems="center" spacing={1}>
                    <Typography
                      variant="caption"
                      sx={{ width: 130, flexShrink: 0 }}
                      noWrap
                      title={a.authority}
                    >
                      {a.authority}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={a.pct}
                      sx={{
                        flex: 1,
                        height: 7,
                        borderRadius: 3,
                        bgcolor: 'rgba(0,0,0,0.06)',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 3,
                          bgcolor: bandColor(a.pct),
                        },
                      }}
                    />
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ width: 34, textAlign: 'right' }}
                    >
                      {a.pct}%
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
