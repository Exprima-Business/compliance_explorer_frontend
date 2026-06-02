import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import LogoutIcon from '@mui/icons-material/Logout';
import ShieldIcon from '@mui/icons-material/Shield';
import { supabase } from '../lib/supabase';
import { extractErrorMessage } from '../utils/errorUtils';

/**
 * MfaChallenge — full-screen blocker shown after password login when the
 * user has an enrolled TOTP factor but the current session is only AAL1.
 *
 * Why this exists:
 *   Supabase does NOT auto-prompt for MFA after a password login. It
 *   issues an AAL1 session and returns success. To actually enforce MFA,
 *   the app has to:
 *     1. Detect that the user has a verified factor (nextLevel === 'aal2')
 *     2. Block access to protected routes until the factor is verified
 *     3. Call mfa.challenge() + mfa.verify() to upgrade the session to AAL2
 *
 * This component handles step 2 and 3. AuthGate handles step 1 and the
 * routing decision (show this vs. the app vs. /login).
 *
 * On successful verification, calls onVerified() which the parent uses to
 * re-run getAuthenticatorAssuranceLevel() and unblock the app.
 *
 * Sign-out escape hatch: if the user can't access their authenticator
 * (lost device, corrupted secret, etc.) they need a way to get back to
 * the login screen rather than being trapped here. The "Sign out" button
 * calls signOut() and routes to /login. Recovery is via account-owner
 * intervention (admin remove-factor from Supabase dashboard) — there's
 * no self-service recovery code flow yet.
 */

interface MfaChallengeProps {
  /** Called after the TOTP code verifies and the session upgrades to AAL2. */
  onVerified: () => void;
}

export const MfaChallenge: React.FC<MfaChallengeProps> = ({ onVerified }) => {
  const [factorId, setFactorId] = useState<string | null>(null);
  const [factorLoading, setFactorLoading] = useState(true);
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Load the user's verified TOTP factor ─────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setFactorLoading(true);
      setError(null);
      try {
        const { data, error: listErr } = await supabase.auth.mfa.listFactors();
        if (cancelled) return;
        if (listErr) {
          setError(extractErrorMessage(listErr.message));
          return;
        }
        // We only support TOTP factors currently. Use the first verified one.
        const totp = (data?.totp ?? []).find((f: any) => f.status === 'verified');
        if (totp) {
          setFactorId(totp.id);
        } else {
          setError(
            'No verified two-factor authentication factor was found on your account. '
            + 'If you just enrolled, sign out and back in. Otherwise contact an administrator.',
          );
        }
      } catch (err: any) {
        if (!cancelled) setError(extractErrorMessage(err?.message ?? 'Failed to load MFA factors'));
      } finally {
        if (!cancelled) setFactorLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleVerify = useCallback(async () => {
    if (!factorId) return;
    const trimmed = code.trim();
    if (!/^\d{6}$/.test(trimmed)) {
      setError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setVerifying(true);
    setError(null);
    try {
      const { data: challengeData, error: challengeErr } = await supabase.auth.mfa.challenge({
        factorId,
      });
      if (challengeErr || !challengeData) {
        setError(extractErrorMessage(challengeErr?.message ?? 'Failed to start challenge'));
        return;
      }
      const { error: verifyErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: trimmed,
      });
      if (verifyErr) {
        setError(extractErrorMessage(verifyErr.message));
        setCode('');
        return;
      }
      // Success — parent will re-check AAL and unblock the app.
      onVerified();
    } catch (err: any) {
      setError(extractErrorMessage(err?.message ?? 'Verification failed'));
    } finally {
      setVerifying(false);
    }
  }, [factorId, code, onVerified]);

  const handleSignOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      // Force a hard reload to /login so any in-memory state is dropped.
      window.location.assign('/login');
    }
  }, []);

  return (
    <Box
      sx={{
        // Full-viewport overlay — covers any parent layout constraints so the
        // challenge card centers regardless of where AuthGate is rendered in
        // the component tree. `position: fixed` + inset:0 is the bulletproof
        // pattern; minHeight alone leaves width up to the parent and on some
        // viewports the card ends up pinned left.
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        px: 2,
        zIndex: (theme) => theme.zIndex.modal,
      }}
    >
      <Card variant="outlined" sx={{ maxWidth: 480, width: '100%' }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Stack alignItems="center" spacing={1} sx={{ mb: 3 }}>
            <ShieldIcon color="primary" sx={{ fontSize: 48 }} />
            <Typography variant="h5" sx={{ fontWeight: 700, textAlign: 'center' }}>
              Two-Factor Authentication
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
              Enter the 6-digit code from your authenticator app to finish signing in.
            </Typography>
          </Stack>

          {error && (
            <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {factorLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <Stack spacing={2}>
              <TextField
                fullWidth
                size="medium"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                disabled={verifying || !factorId}
                autoFocus
                autoComplete="one-time-code"
                inputProps={{
                  inputMode: 'numeric',
                  pattern: '[0-9]*',
                  maxLength: 6,
                  style: {
                    fontFamily: 'monospace',
                    fontSize: '1.4rem',
                    letterSpacing: '0.4em',
                    textAlign: 'center',
                  },
                  'aria-label': '6-digit authentication code',
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && code.length === 6 && !verifying) {
                    void handleVerify();
                  }
                }}
              />

              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={handleVerify}
                disabled={verifying || code.length !== 6 || !factorId}
                startIcon={
                  verifying
                    ? <CircularProgress size={18} color="inherit" />
                    : <VerifiedUserIcon />
                }
              >
                {verifying ? 'Verifying…' : 'Verify and continue'}
              </Button>

              <Button
                variant="text"
                size="small"
                fullWidth
                onClick={handleSignOut}
                startIcon={<LogoutIcon fontSize="small" />}
                sx={{ color: 'text.secondary', mt: 1 }}
              >
                Sign out
              </Button>
            </Stack>
          )}

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', textAlign: 'center', mt: 3 }}
          >
            Lost access to your authenticator? Sign out and contact an administrator
            to reset your two-factor factor before signing back in.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default MfaChallenge;
