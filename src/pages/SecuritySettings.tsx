import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import ShieldIcon from '@mui/icons-material/Shield';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import LockResetIcon from '@mui/icons-material/LockReset';
import { supabase } from '../lib/supabase';
import { extractErrorMessage } from '../utils/errorUtils';
import { useAuth } from '../hooks/useAuth';
import { MfaChallenge } from '../components/MfaChallenge';

/**
 * SecuritySettings — TOTP-based multi-factor authentication enrollment.
 *
 * Why this exists:
 *   Supabase project-level "TOTP: Enabled" means the method is *available*
 *   for enrollment — it does NOT mean any user is actually challenged on
 *   login. To get real MFA protection, each user must enroll a TOTP factor
 *   into their own account. The Supabase dashboard doesn't expose
 *   enrollment to the app user; the app has to wire the flow.
 *
 * Three states (state machine):
 *   1. "Not enrolled" — no verified TOTP factor exists. Shows a CTA to
 *      start enrollment.
 *   2. "Enrolling" — supabase.auth.mfa.enroll() returned QR code + secret;
 *      user scans, enters 6-digit code, we verify.
 *   3. "Enrolled" — verified TOTP factor present. Shows enrolled date and
 *      a Remove button (confirmation required).
 *
 * Security posture:
 *   - All flows use the Supabase JS MFA API directly (no BE endpoints needed).
 *   - Unenroll requires explicit user confirmation; the existing session
 *     stays at its current AAL but next login won't challenge until a new
 *     factor is enrolled.
 *   - We don't try to enforce AAL2 on curator actions yet; that's a
 *     separate follow-up (and a real opportunity once enrollment exists).
 *
 * UX choices:
 *   - QR code is rendered straight from the data URI Supabase returns (no
 *     external QR library — keeps bundle lean).
 *   - "Copy setup key" for users on authenticators that don't scan QRs.
 *   - Cleanup of stale unverified factors before starting a new enrollment
 *     so the user can never end up with multiple half-enrolled factors.
 */

type ViewState =
  | { kind: 'loading' }
  | { kind: 'reauth' }
  | { kind: 'mfa_elevate' }
  | { kind: 'not_enrolled' }
  | { kind: 'enrolling'; factorId: string; qrCode: string; secret: string }
  | { kind: 'enrolled'; factor: EnrolledFactor };

interface EnrolledFactor {
  id: string;
  friendly_name: string | null;
  factor_type: string;
  status: string;
  created_at: string;
  updated_at: string;
}

const SecuritySettings: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [view, setView] = useState<ViewState>({ kind: 'loading' });
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const { user } = useAuth();
  const [reauthEmail, setReauthEmail] = useState('');
  const [reauthPassword, setReauthPassword] = useState('');

  // ── List factors on mount (and after any state-changing operation) ───────
  const refresh = useCallback(async () => {
    setError(null);
    try {
      const { data, error: listErr } = await supabase.auth.mfa.listFactors();
      if (listErr) {
        setError(extractErrorMessage(listErr.message));
        setView({ kind: 'not_enrolled' });
        return;
      }
      // listFactors returns { all, totp, phone }. We care about TOTP only.
      const totpFactors = (data?.totp ?? []) as EnrolledFactor[];
      const verified = totpFactors.find(f => f.status === 'verified');
      if (verified) {
        setView({ kind: 'enrolled', factor: verified });
      } else {
        setView({ kind: 'not_enrolled' });
      }
    } catch (err: any) {
      setError(extractErrorMessage(err?.message ?? 'Failed to load MFA factors'));
      setView({ kind: 'not_enrolled' });
    }
  }, []);

  // Step-up auth ("sudo mode"): MFA management needs a live supabase session,
  // which is gone after a reload (cookie auth Phase 4b — persistSession:false).
  // If there is no session, require re-authentication before any factor
  // operation; if the user already has a factor, elevate to AAL2 via an MFA
  // challenge (Supabase gates factor removal on AAL2). Standard practice for
  // changing security controls.
  const proceedAfterSession = useCallback(async () => {
    try {
      const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (data?.currentLevel === 'aal1' && data?.nextLevel === 'aal2') {
        setView({ kind: 'mfa_elevate' });
        return;
      }
    } catch {
      // fall through — refresh()/listFactors will surface any real error
    }
    await refresh();
  }, [refresh]);

  const init = useCallback(async () => {
    setView({ kind: 'loading' });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setReauthEmail(user?.email ?? '');
      setView({ kind: 'reauth' });
      return;
    }
    await proceedAfterSession();
  }, [user?.email, proceedAfterSession]);

  useEffect(() => { void init(); }, [init]);

  const handleReauth = async () => {
    const email = reauthEmail.trim();
    if (!email || !reauthPassword) {
      setError('Enter your email and password to continue.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password: reauthPassword,
      });
      if (signInErr) {
        setError(extractErrorMessage(signInErr.message));
        return;
      }
      setReauthPassword('');
      await proceedAfterSession();
    } catch (err: any) {
      setError(extractErrorMessage(err?.message ?? 'Re-authentication failed'));
    } finally {
      setBusy(false);
    }
  };

  // ── Cleanup any stale unverified factors before enrolling ────────────────
  // If the user previously clicked Set Up then closed the page without
  // verifying, Supabase keeps the unverified factor around. The next enroll
  // call would return a NEW factor and leave the old one dangling. Sweep
  // first so we never accumulate half-enrolled factors.
  const cleanupStaleFactors = async (): Promise<void> => {
    const { data } = await supabase.auth.mfa.listFactors();
    const totpFactors = (data?.totp ?? []) as EnrolledFactor[];
    const unverified = totpFactors.filter(f => f.status === 'unverified');
    for (const f of unverified) {
      try {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      } catch {
        // Best effort — if cleanup fails we'll surface the eventual error
        // from the enroll() call.
      }
    }
  };

  // ── Start enrollment ─────────────────────────────────────────────────────
  const handleStartEnroll = async () => {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await cleanupStaleFactors();
      const { data, error: enrollErr } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: `Authenticator (${new Date().toISOString().slice(0, 10)})`,
      });
      if (enrollErr) {
        setError(extractErrorMessage(enrollErr.message));
        return;
      }
      if (!data?.totp) {
        setError('Enrollment did not return TOTP setup data');
        return;
      }
      setView({
        kind: 'enrolling',
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
      });
      setVerifyCode('');
    } catch (err: any) {
      setError(extractErrorMessage(err?.message ?? 'Failed to start enrollment'));
    } finally {
      setBusy(false);
    }
  };

  // ── Verify the 6-digit code and complete enrollment ──────────────────────
  const handleVerify = async () => {
    if (view.kind !== 'enrolling') return;
    const code = verifyCode.trim();
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code from your authenticator app');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { data: challengeData, error: challengeErr } = await supabase.auth.mfa.challenge({
        factorId: view.factorId,
      });
      if (challengeErr || !challengeData) {
        setError(extractErrorMessage(challengeErr?.message ?? 'Challenge failed'));
        return;
      }
      const { error: verifyErr } = await supabase.auth.mfa.verify({
        factorId: view.factorId,
        challengeId: challengeData.id,
        code,
      });
      if (verifyErr) {
        setError(extractErrorMessage(verifyErr.message));
        return;
      }
      setInfo('Two-factor authentication enabled. You\'ll be asked for a code on your next sign-in.');
      await refresh();
    } catch (err: any) {
      setError(extractErrorMessage(err?.message ?? 'Failed to verify code'));
    } finally {
      setBusy(false);
    }
  };

  // ── Cancel an in-progress enrollment ─────────────────────────────────────
  const handleCancelEnroll = async () => {
    if (view.kind !== 'enrolling') return;
    setBusy(true);
    try {
      await supabase.auth.mfa.unenroll({ factorId: view.factorId });
    } catch {
      // Best effort — if cleanup fails the next handleStartEnroll will
      // sweep it.
    } finally {
      setBusy(false);
      setVerifyCode('');
      await refresh();
    }
  };

  // ── Remove an enrolled factor ────────────────────────────────────────────
  const handleRemove = async () => {
    if (view.kind !== 'enrolled') return;
    setBusy(true);
    setError(null);
    try {
      const { error: unenrollErr } = await supabase.auth.mfa.unenroll({
        factorId: view.factor.id,
      });
      if (unenrollErr) {
        setError(extractErrorMessage(unenrollErr.message));
        return;
      }
      setInfo('Two-factor authentication removed. Re-enroll any time to re-protect your account.');
      setConfirmRemove(false);
      await refresh();
    } catch (err: any) {
      setError(extractErrorMessage(err?.message ?? 'Failed to remove factor'));
    } finally {
      setBusy(false);
    }
  };

  const copySecret = async () => {
    if (view.kind !== 'enrolling') return;
    try {
      await navigator.clipboard.writeText(view.secret);
      setInfo('Setup key copied to clipboard.');
      window.setTimeout(() => setInfo(null), 3000);
    } catch {
      setError('Couldn\'t access clipboard — copy the key manually.');
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Elevate to AAL2 with the existing TOTP challenge before sensitive ops.
  if (view.kind === 'mfa_elevate') {
    return <MfaChallenge onVerified={() => { void refresh(); }} />;
  }

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, maxWidth: 800, mx: 'auto' }}>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.5 }}>
        <ShieldIcon color="primary" />
        <Typography variant={isMobile ? 'h5' : 'h4'} sx={{ fontWeight: 700 }}>
          Security
        </Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Manage two-factor authentication and other account-level security settings.
      </Typography>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {info && (
        <Alert severity="success" onClose={() => setInfo(null)} sx={{ mb: 2 }}>
          {info}
        </Alert>
      )}

      <Card variant="outlined">
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            {view.kind === 'enrolled'
              ? <VerifiedUserIcon color="success" />
              : <LockResetIcon color="action" />}
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Two-Factor Authentication
            </Typography>
          </Stack>

          {view.kind === 'loading' && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={24} />
            </Box>
          )}

          {/* ── Step-up re-authentication (sudo mode) ───────────────────── */}
          {view.kind === 'reauth' && (
            <Stack spacing={2}>
              <Typography variant="body2">
                For your security, confirm your password to manage two-factor
                authentication.
              </Typography>
              {user?.email ? (
                <Typography variant="body2" color="text.secondary">
                  Signed in as <strong>{user.email}</strong>
                </Typography>
              ) : (
                <TextField
                  label="Email"
                  size="small"
                  fullWidth
                  value={reauthEmail}
                  onChange={(e) => setReauthEmail(e.target.value)}
                  autoComplete="email"
                />
              )}
              <TextField
                label="Password"
                type="password"
                size="small"
                fullWidth
                value={reauthPassword}
                onChange={(e) => setReauthPassword(e.target.value)}
                autoComplete="current-password"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && reauthPassword && !busy) void handleReauth();
                }}
              />
              <Box>
                <Button
                  variant="contained"
                  onClick={handleReauth}
                  disabled={busy}
                  startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <LockResetIcon />}
                >
                  {busy ? 'Verifying…' : 'Confirm'}
                </Button>
              </Box>
            </Stack>
          )}

          {/* ── State 1: Not enrolled ───────────────────────────────────── */}
          {view.kind === 'not_enrolled' && (
            <>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Two-factor authentication is <strong>not enabled</strong> on your account.
                Adding 2FA helps protect your account even if your password is compromised
                — important if you have curator or admin permissions on the platform.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Uses TOTP (time-based one-time password). Compatible with any authenticator
                app — Google Authenticator, Microsoft Authenticator, Authy, 1Password,
                Bitwarden, etc. No phone number required.
              </Typography>
              <Button
                variant="contained"
                onClick={handleStartEnroll}
                disabled={busy}
                startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <ShieldIcon />}
              >
                {busy ? 'Setting up…' : 'Set up two-factor authentication'}
              </Button>
            </>
          )}

          {/* ── State 2: Enrolling — show QR + verify input ─────────────── */}
          {view.kind === 'enrolling' && (
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  1. Scan this QR code with your authenticator app
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Google Authenticator, Authy, 1Password, Bitwarden, Microsoft Authenticator, etc.
                </Typography>
              </Box>

              <Box sx={{
                display: 'flex',
                justifyContent: 'center',
                p: 2,
                bgcolor: 'background.default',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
              }}>
                {/* Supabase returns qr_code as a data:image/svg+xml URI — render directly */}
                <Box
                  component="img"
                  src={view.qrCode}
                  alt="TOTP QR code"
                  sx={{ width: 220, height: 220, display: 'block' }}
                />
              </Box>

              <Divider>OR</Divider>

              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  Enter this setup key manually
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box sx={{
                    flex: 1,
                    px: 1.5,
                    py: 1,
                    bgcolor: 'background.default',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    fontFamily: 'monospace',
                    fontSize: '0.9rem',
                    wordBreak: 'break-all',
                  }}>
                    {view.secret}
                  </Box>
                  <Tooltip title="Copy setup key">
                    <IconButton size="small" onClick={copySecret}>
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Box>

              <Divider />

              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  2. Enter the 6-digit code from your authenticator app
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  value={verifyCode}
                  onChange={e => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  autoFocus
                  inputProps={{
                    inputMode: 'numeric',
                    pattern: '[0-9]*',
                    maxLength: 6,
                    style: { fontFamily: 'monospace', fontSize: '1.1rem', letterSpacing: '0.3em' },
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && verifyCode.length === 6) void handleVerify();
                  }}
                />
              </Box>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ pt: 1 }}>
                <Button
                  variant="contained"
                  onClick={handleVerify}
                  disabled={busy || verifyCode.length !== 6}
                  startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <VerifiedUserIcon />}
                >
                  {busy ? 'Verifying…' : 'Verify and enable'}
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleCancelEnroll}
                  disabled={busy}
                >
                  Cancel
                </Button>
              </Stack>
            </Stack>
          )}

          {/* ── State 3: Enrolled — show factor + remove option ─────────── */}
          {view.kind === 'enrolled' && (
            <>
              <Alert severity="success" icon={<VerifiedUserIcon />} sx={{ mb: 2 }}>
                Your account is protected with TOTP-based two-factor authentication.
                You'll be asked for a code from your authenticator app when you sign in.
              </Alert>

              <Box sx={{
                p: 2,
                bgcolor: 'background.default',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                mb: 2,
              }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {view.factor.friendly_name || 'Authenticator app'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Enrolled {new Date(view.factor.created_at).toLocaleDateString()}
                      &nbsp;·&nbsp;Type: TOTP
                    </Typography>
                  </Box>
                  <Tooltip title="Remove this factor">
                    <IconButton
                      size="small"
                      onClick={() => setConfirmRemove(true)}
                      sx={{ color: 'error.main' }}
                    >
                      <DeleteOutlineIcon />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Box>

              <Typography variant="caption" color="text.secondary">
                Removing two-factor authentication will reduce your account's security.
                If you've lost access to your authenticator app, removing the factor
                here is the recovery path before re-enrolling with a new device.
              </Typography>
            </>
          )}
        </CardContent>
      </Card>

      {/* Confirmation dialog for removing MFA */}
      <Dialog open={confirmRemove} onClose={() => !busy && setConfirmRemove(false)}>
        <DialogTitle>Remove two-factor authentication?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will disable TOTP-based 2FA on your account. You'll only need your
            password to sign in until you re-enroll. Continue?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmRemove(false)} disabled={busy}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleRemove}
            disabled={busy}
            startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {busy ? 'Removing…' : 'Remove'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SecuritySettings;
