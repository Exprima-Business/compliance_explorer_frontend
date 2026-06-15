import { useState } from 'react';
import {
  Box, Button, Card, CardContent, Chip, CircularProgress, Stack, Typography,
} from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import { useCascadeLeverage } from '../hooks/useCascadeLeverage';

// Cascade-leverage accent (matches the dashboard mockups' "leverage" purple).
const LEVERAGE = '#534AB7';

/**
 * Cascade dashboard — "Moves" widget. Ranked satisfaction-mechanism actions for
 * the active program, each scored by the obligations it would clear. The org
 * analogue of the per-opportunity cascade. Backed by useCascadeLeverage.
 */
export default function CascadeLeverageWidget() {
  const { data, isLoading, error } = useCascadeLeverage();
  const [showAll, setShowAll] = useState(false);

  const moves = data ?? [];
  const visible = showAll ? moves : moves.slice(0, 5);

  return (
    <Card sx={{ mb: { xs: 2, md: 3 }, border: '1px solid', borderColor: 'divider' }}>
      <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.25 }}>
          <BoltIcon fontSize="small" sx={{ color: LEVERAGE }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1 }}>
            Moves
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Ranked by what they unlock — do these in order.
        </Typography>

        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={24} />
          </Box>
        )}

        {!isLoading && error && (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            Couldn't load your moves right now.
          </Typography>
        )}

        {!isLoading && !error && moves.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            No moves yet — activate a framework and we'll rank your highest-leverage
            actions here, each scored by how many obligations it clears.
          </Typography>
        )}

        {!isLoading && !error && visible.length > 0 && (
          <Stack spacing={1.25}>
            {visible.map((m, i) => (
              <Stack
                key={m.mechanismTypeId}
                direction="row"
                alignItems="center"
                spacing={1.5}
              >
                <Box
                  sx={{
                    flexShrink: 0,
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    bgcolor: 'rgba(83,74,183,0.12)',
                    color: LEVERAGE,
                    fontSize: 13,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {i + 1}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>
                    {m.mechanismLabel}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    across {m.authoritiesCount}{' '}
                    {m.authoritiesCount === 1 ? 'authority' : 'authorities'}
                  </Typography>
                </Box>
                <Chip
                  label={`unlocks ${m.obligationsCleared}`}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(83,74,183,0.10)',
                    color: LEVERAGE,
                    fontWeight: 600,
                    height: 22,
                  }}
                />
              </Stack>
            ))}
          </Stack>
        )}

        {!isLoading && !error && moves.length > 5 && (
          <Button
            size="small"
            onClick={() => setShowAll((s) => !s)}
            sx={{ mt: 1, textTransform: 'none' }}
          >
            {showAll ? 'Show fewer' : `Show all ${moves.length} moves`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
