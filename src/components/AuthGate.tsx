import React, { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { MfaChallenge } from './MfaChallenge';

/**
 * AuthGate blocks access to protected parts of the app until:
 *   1. The Supabase session has been resolved (loading: false)
 *   2. A user is authenticated (isAuthenticated: true)
 *   3. If the user has an enrolled MFA factor, the session is upgraded to
 *      AAL2 via a TOTP challenge.
 *
 * The MFA check uses supabase.auth.mfa.getAuthenticatorAssuranceLevel():
 *   - currentLevel === 'aal1', nextLevel === 'aal2' → user has factor but
 *     hasn't completed challenge this session → render <MfaChallenge>
 *   - currentLevel === 'aal2' → MFA satisfied → render children
 *   - nextLevel === 'aal1' → user has no factor → render children (no MFA
 *     required because none enrolled)
 *
 * Supabase doesn't auto-prompt for MFA after a password login — it issues
 * an AAL1 session and returns success. The application has to detect the
 * needed upgrade and present the challenge. This gate is where that
 * detection lives. Pair with the "Limit AAL1 sessions" setting in the
 * Supabase project so any AAL1 session that bypasses this gate (e.g. a
 * tab restored from before MFA enrollment) gets terminated after 15 min.
 */

type MfaState = 'checking' | 'required' | 'satisfied';

const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const [mfaState, setMfaState] = useState<MfaState>('checking');

  const checkAal = useCallback(async () => {
    setMfaState('checking');
    try {
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (error) {
        // Conservative: on AAL-check failure, treat as satisfied so we don't
        // lock out the user from a transient Supabase error. The user can
        // still access /settings/security to enroll/verify. If the user
        // actually has a factor and the check failed, their next refresh
        // will retry.
        setMfaState('satisfied');
        return;
      }
      const next = data?.nextLevel;
      const current = data?.currentLevel;
      // Need to challenge if the user has a factor (nextLevel === 'aal2')
      // and the current session is only aal1.
      if (next === 'aal2' && current === 'aal1') {
        setMfaState('required');
      } else {
        setMfaState('satisfied');
      }
    } catch {
      // Same conservative path as above
      setMfaState('satisfied');
    }
  }, []);

  // Run the AAL check whenever auth state resolves to authenticated.
  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      // Reset state so a later re-auth re-runs the check
      setMfaState('checking');
      return;
    }
    void checkAal();
  }, [loading, isAuthenticated, checkAal]);

  // Also re-run on Supabase auth events so a fresh login (or a factor
  // verify that elevates aal1 → aal2) flips state without a page reload.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'MFA_CHALLENGE_VERIFIED' || event === 'TOKEN_REFRESHED') {
        void checkAal();
      }
    });
    return () => { sub?.subscription?.unsubscribe(); };
  }, [checkAal]);

  // While Supabase is still restoring or verifying a session, show a spinner
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // If no user, kick them to the login page
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Authenticated — check whether MFA challenge is needed
  if (mfaState === 'checking') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (mfaState === 'required') {
    // Pass an onVerified callback that re-runs the AAL check so the gate
    // unblocks immediately after the TOTP code verifies.
    return <MfaChallenge onVerified={checkAal} />;
  }

  // AAL satisfied (or no factor) — render the protected app
  return <>{children}</>;
};

export default AuthGate;
