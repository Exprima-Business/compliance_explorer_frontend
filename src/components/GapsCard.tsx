import { useState } from 'react';
import {
  Box, Button, Card, CardContent, Chip, CircularProgress, Stack, Tooltip, Typography,
} from '@mui/material';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import { useCascadeSurface } from '../hooks/useCascadeSurface';

/**
 * Cascade dashboard — "Gaps" card. The applicable-but-uncovered obligations,
 * each tied to its authority. Items pulled in by the cascade (hop > 0) are the
 * overlooked tail. Backed by useCascadeSurface (shared cache with PostureCard).
 */
export default function GapsCard() {
  const { data, isLoading, error } = useCascadeSurface();
  const [showAll, setShowAll] = useState(false);

  const gaps = data?.gaps ?? [];
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
          What applies but isn't covered — each tied to its source authority.
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
            No open gaps — every applicable obligation is covered, or no framework
            is activated yet.
          </Typography>
        )}

        {!isLoading && !error && visible.length > 0 && (
          <Stack spacing={1}>
            {visible.map((g) => (
              <Stack
                key={g.artifactId}
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{ flexWrap: 'wrap' }}
              >
                <Typography variant="body2" sx={{ fontWeight: 500, flexShrink: 0 }}>
                  {g.identifier}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ flex: 1, minWidth: 0 }}
                  noWrap
                  title={g.title}
                >
                  {g.title}
                </Typography>
                {!g.hasMethod && (
                  <Tooltip title="No satisfaction method in the catalog yet">
                    <Chip
                      label="needs method"
                      size="small"
                      variant="outlined"
                      sx={{ height: 20, fontSize: 11 }}
                    />
                  </Tooltip>
                )}
                <Chip
                  label={g.sourceAuthority}
                  size="small"
                  sx={{ height: 20, fontSize: 11, bgcolor: 'rgba(0,0,0,0.06)' }}
                />
              </Stack>
            ))}
          </Stack>
        )}

        {!isLoading && !error && gaps.length > 6 && (
          <Button
            size="small"
            onClick={() => setShowAll((s) => !s)}
            sx={{ mt: 1, textTransform: 'none' }}
          >
            {showAll ? 'Show fewer' : `Show all ${gaps.length} gaps`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
