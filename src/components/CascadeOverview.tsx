import { Box, Typography } from '@mui/material';
import PostureCard from './PostureCard';
import GapsCard from './GapsCard';
import CascadeLeverageWidget from './CascadeLeverageWidget';

/**
 * The cascade dashboard trio — Posture → Gaps → Moves — over the full
 * obligation surface (everything the program's activated frameworks make it
 * owe, expanded through the regulatory graph). Posture and Gaps share one
 * fetch (useCascadeSurface); Moves has its own (useCascadeLeverage).
 */
export default function CascadeOverview() {
  return (
    <Box sx={{ mb: { xs: 2, md: 3 } }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.25 }}>
        Your obligation surface
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Everything you owe across your activated frameworks — where you stand,
        what's missing, and what to do next.
      </Typography>
      <PostureCard />
      <GapsCard />
      <CascadeLeverageWidget />
    </Box>
  );
}
