import { Box, Typography } from '@mui/material';
import OverviewHeader from './OverviewHeader';
import CascadeLeverageWidget from './CascadeLeverageWidget';
import RequirementsRegister from './RequirementsRegister';

/**
 * The cascade dashboard, redesigned for legibility:
 *   Overview (coverage headline + domain cards) → Do next (Moves) → Requirements
 *   register (Coverage + Gaps unified, with provenance + Required badge + Fix).
 * Replaces the old Coverage widget + separate Posture/Gaps cards.
 */
export default function CascadeOverview() {
  return (
    <Box sx={{ mb: { xs: 2, md: 3 } }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.25 }}>
        Your compliance
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Where you stand → what to do → everything that applies to you.
      </Typography>
      <OverviewHeader />
      <CascadeLeverageWidget />
      <RequirementsRegister />
    </Box>
  );
}
