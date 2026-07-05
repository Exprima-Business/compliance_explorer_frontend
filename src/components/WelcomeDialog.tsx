import { useState } from 'react';
import {
  Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, Stack, Typography,
} from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import PolicyIcon from '@mui/icons-material/Policy';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import VerifiedIcon from '@mui/icons-material/Verified';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

/**
 * First-run onboarding wizard (CS3). A one-time welcome that orients a new org
 * to what ClauseAtlas does and hands off to the guided journey on the
 * dashboard. Persistence is a localStorage flag — a "don't show again" checkbox
 * (default on) lets the user opt back into seeing it. The dashboard only mounts
 * this for a fresh org (no frameworks yet) whose flag isn't set, so established
 * orgs never see it.
 */

const PURPLE = '#534AB7';
export const WELCOME_DISMISSED_KEY = 'clauseatlas_welcome_dismissed';

/** Whether the welcome has been permanently dismissed. */
export function isWelcomeDismissed(): boolean {
  try {
    return localStorage.getItem(WELCOME_DISMISSED_KEY) === 'true';
  } catch {
    return false;
  }
}

const STEPS: Array<{ icon: React.ReactNode; title: string; body: string }> = [
  {
    icon: <TuneIcon sx={{ color: PURPLE }} />,
    title: 'Scope your frameworks',
    body: 'Tell us your certifications and contract requirements — CMMC, NIST 800-171, DFARS, HIPAA, and more.',
  },
  {
    icon: <PolicyIcon sx={{ color: PURPLE }} />,
    title: 'Surface your obligations',
    body: 'We map your frameworks to the full obligation surface — including the overlooked federal regs on top of the famous ones.',
  },
  {
    icon: <PlaylistAddCheckIcon sx={{ color: PURPLE }} />,
    title: 'Close your gaps',
    body: 'Mark what you satisfy, attach evidence, and turn gaps into a tracked POA&M portfolio — one action can clear many at once.',
  },
  {
    icon: <VerifiedIcon sx={{ color: PURPLE }} />,
    title: 'Stay audit-ready',
    body: 'Export your SSP and POA&M packages and scan solicitations to see your readiness for each opportunity.',
  },
];

interface WelcomeDialogProps {
  open: boolean;
  /** Primary CTA — hand off to scope setup. */
  onGetStarted: () => void;
  /** Secondary — dismiss and explore. */
  onClose: () => void;
}

export default function WelcomeDialog({ open, onGetStarted, onClose }: WelcomeDialogProps) {
  const [dontShow, setDontShow] = useState(true);

  const persist = () => {
    if (!dontShow) return;
    try {
      localStorage.setItem(WELCOME_DISMISSED_KEY, 'true');
    } catch {
      // localStorage unavailable (private mode) — the dialog simply shows again.
    }
  };

  const handleGetStarted = () => {
    persist();
    onGetStarted();
  };
  const handleClose = () => {
    persist();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 0.5 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Welcome to ClauseAtlas</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Your compliance command center for winning and keeping federal contracts. Here's the path from setup to audit-ready:
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1.5 }}>
          {STEPS.map((s, i) => (
            <Stack key={s.title} direction="row" spacing={1.75} alignItems="flex-start">
              <Box sx={{
                width: 40, height: 40, flexShrink: 0, borderRadius: '50%',
                bgcolor: 'rgba(83,74,183,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {s.icon}
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 600 }}>
                  {i + 1}. {s.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">{s.body}</Typography>
              </Box>
            </Stack>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between' }}>
        <FormControlLabel
          control={<Checkbox size="small" checked={dontShow} onChange={(e) => setDontShow(e.target.checked)} />}
          label={<Typography variant="body2" color="text.secondary">Don't show this again</Typography>}
        />
        <Stack direction="row" spacing={1}>
          <Button onClick={handleClose} sx={{ textTransform: 'none' }}>Explore on my own</Button>
          <Button
            variant="contained"
            endIcon={<ArrowForwardIcon />}
            onClick={handleGetStarted}
            sx={{ textTransform: 'none', fontWeight: 600, bgcolor: PURPLE, '&:hover': { bgcolor: '#433a9e' } }}
          >
            Set up my scope
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
