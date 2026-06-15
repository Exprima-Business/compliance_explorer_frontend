import { Box, Typography } from '@mui/material';
import ProgramReadinessWidget from './ProgramReadinessWidget';
import GapsCard from './GapsCard';
import CascadeLeverageWidget from './CascadeLeverageWidget';

/**
 * The cascade dashboard — one "obligation surface" story:
 *   Coverage (ProgramReadinessWidget — Posture headline driven by framework
 *   control progress, with blind spots called out) → Gaps → Moves.
 * Coverage and the old standalone Posture card are now merged into one widget,
 * so there's a single coverage number, not two rival percentages.
 */
export default function CascadeOverview() {
  return (
    <Box sx={{ mb: { xs: 2, md: 3 } }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.25 }}>
        Your obligation surface
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Where you stand → what's missing → what to do, across everything you owe.
      </Typography>
      <ProgramReadinessWidget />
      <GapsCard />
      <CascadeLeverageWidget />
    </Box>
  );
}
