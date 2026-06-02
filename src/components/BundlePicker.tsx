import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import QuizIcon from '@mui/icons-material/Quiz';
import ListAltIcon from '@mui/icons-material/ListAlt';
import {
  onboardingService,
  type ApplyBundleResult,
  type CuratedBundle,
} from '../services/onboardingService';
import { extractErrorMessage } from '../utils/errorUtils';
import { FrameworkQuestionnaire } from './FrameworkQuestionnaire';

interface BundlePickerProps {
  /** Called after a bundle is successfully applied so the parent can reload. */
  onApplied: (result: ApplyBundleResult) => void;
}

export const BundlePicker: React.FC<BundlePickerProps> = ({ onApplied }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [bundles, setBundles] = useState<CuratedBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  // Mode toggle — quiz is the default (most SMB users don't know which
  // bundle applies); browse is the power-user fallback. Persist user choice
  // in localStorage so a returning user who switched to browse doesn't get
  // bounced back into the quiz on each visit.
  const [mode, setMode] = useState<'quiz' | 'browse'>(() => {
    if (typeof window === 'undefined') return 'quiz';
    return (localStorage.getItem('bundlePickerMode') as 'quiz' | 'browse') || 'quiz';
  });

  const switchMode = (next: 'quiz' | 'browse') => {
    setMode(next);
    try {
      localStorage.setItem('bundlePickerMode', next);
    } catch {
      // localStorage may be unavailable (private mode etc.) — fail soft.
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const resp = await onboardingService.listBundles();
      if (cancelled) return;
      if (resp.error) {
        setError(extractErrorMessage(resp.error));
      } else {
        setBundles(resp.data ?? []);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const handlePick = async (bundleId: string) => {
    setApplyingId(bundleId);
    setError(null);
    try {
      const resp = await onboardingService.applyBundle(bundleId);
      if (resp.error) {
        setError(extractErrorMessage(resp.error));
        return;
      }
      if (resp.data) onApplied(resp.data);
    } finally {
      setApplyingId(null);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>;
  }

  // Quiz mode: surface the guided FrameworkQuestionnaire. Browse mode:
  // fall through to the existing bundle-card grid below.
  if (mode === 'quiz') {
    return (
      <Box>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant={isMobile ? 'h5' : 'h4'} sx={{ fontWeight: 700, mb: 1 }}>
            Find your federal compliance starting point
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 720, mx: 'auto' }}>
            Six quick questions about your federal contracting profile. We'll
            recommend a bundle of authoritative control frameworks (NIST, HHS,
            GSA) and activate them for you. Takes about a minute.
          </Typography>
        </Box>
        <FrameworkQuestionnaire
          bundles={bundles}
          applying={!!applyingId}
          onPickBundle={handlePick}
          onSwitchToBrowse={() => switchMode('browse')}
        />
      </Box>
    );
  }

  // Browse mode — the original bundle-card grid.
  return (
    <Box>
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Stack direction="row" justifyContent="center" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <Typography variant={isMobile ? 'h5' : 'h4'} sx={{ fontWeight: 700 }}>
            Browse all bundles
          </Typography>
          <Button
            size="small"
            startIcon={<QuizIcon />}
            onClick={() => switchMode('quiz')}
            sx={{ textTransform: 'none' }}
          >
            Take the quiz instead
          </Button>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 720, mx: 'auto' }}>
          Pick the profile that best matches your business. We&apos;ll activate the
          right control frameworks for your program — you can always add more
          later. Every framework is sourced authoritatively (NIST, GSA, HHS) and
          tracks against the verbatim regulation.
        </Typography>
      </Box>

      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', lg: 'repeat(3, 1fr)' },
        gap: 2,
        mb: 3,
      }}>
        {bundles.map(bundle => {
          const missing = bundle.resolvedFrameworks.filter(f => !f.frameworkId);
          const isApplying = applyingId === bundle.id;
          return (
            <Card key={bundle.id} variant="outlined" sx={{ display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                  {bundle.title}
                </Typography>
                <Typography variant="caption" color="primary.main" sx={{ display: 'block', mb: 1.5, fontStyle: 'italic' }}>
                  {bundle.persona}
                </Typography>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.5 }}>
                  {bundle.description}
                </Typography>

                <Divider sx={{ my: 1.5 }} />

                <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  Activates
                </Typography>
                <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mb: 2 }}>
                  {bundle.resolvedFrameworks.map(f => (
                    <Chip
                      key={f.shortLabel}
                      label={f.shortLabel}
                      size="small"
                      icon={f.frameworkId ? <CheckCircleIcon sx={{ fontSize: 14 }} /> : undefined}
                      color={f.frameworkId ? 'primary' : 'default'}
                      variant={f.frameworkId ? 'filled' : 'outlined'}
                      sx={{ fontWeight: 600 }}
                    />
                  ))}
                </Stack>

                <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  Signs this is you
                </Typography>
                <Box component="ul" sx={{ pl: 2, my: 0 }}>
                  {bundle.signals.map(s => (
                    <Typography
                      key={s}
                      component="li"
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'list-item', lineHeight: 1.5 }}
                    >
                      {s}
                    </Typography>
                  ))}
                </Box>

                {missing.length > 0 && (
                  <Alert severity="warning" sx={{ mt: 1.5, py: 0.5 }}>
                    <Typography variant="caption">
                      {missing.length === bundle.resolvedFrameworks.length
                        ? 'None of these frameworks are loaded yet — pick another bundle or load them via migrations.'
                        : `${missing.length} of ${bundle.resolvedFrameworks.length} frameworks not yet loaded — activation will be partial.`}
                    </Typography>
                  </Alert>
                )}
              </CardContent>
              <CardActions sx={{ p: 2, pt: 0 }}>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={() => handlePick(bundle.id)}
                  disabled={isApplying || missing.length === bundle.resolvedFrameworks.length}
                  startIcon={isApplying ? <CircularProgress size={16} color="inherit" /> : undefined}
                >
                  {isApplying ? 'Activating…' : 'Use this bundle'}
                </Button>
              </CardActions>
            </Card>
          );
        })}
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
        Not sure? You can also activate individual frameworks below.
      </Typography>
    </Box>
  );
};
