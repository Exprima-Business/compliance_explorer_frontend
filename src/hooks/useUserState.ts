import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { UserStateService } from '../services/userStateService';
import type { UserStateResponse } from '../services/userStateService';
import { dlog } from '../utils/debugLog';

interface UseUserStateReturn {
  userState: UserStateResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const useUserState = (): UseUserStateReturn => {
  const { user, isAuthenticated } = useAuth();
  const [userState, setUserState] = useState<UserStateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stable user ID (string | undefined) — does NOT change on TOKEN_REFRESHED.
  // Using `user` (the object) as a dep would recreate this callback on every token
  // refresh (new object reference, same ID), which sets loading=true, unmounts
  // MainApp, remounts OrgProvider, calls setCurrentOrg → refreshSession → loop.
  const userId = user?.id;

  const loadUserState = useCallback(async () => {
    if (!isAuthenticated || !userId) {
      setUserState(null);
      setLoading(false);
      setError(null);
      return;
    }

    let rateLimited = false;
    try {
      setLoading(true);
      setError(null);

      dlog('useUserState: Loading user state', { userId });

      const state = await UserStateService.getUserState();
      setUserState(state);

      dlog('useUserState: User state loaded', {
        needsSetup: state.needsSetup,
        organizationsCount: state.organizations?.length || 0,
        hasCurrentOrg: !!state.currentOrganization
      });
    } catch (err: any) {
      if (err?.isRateLimited) {
        // 429 — keep spinner running and retry after the back-off window.
        // We set rateLimited=true so the finally block doesn't call setLoading(false).
        rateLimited = true;
        const delay = err.retryAfterMs ?? 15000;
        dlog('useUserState: Rate limited, retrying after', { delayMs: delay });
        setTimeout(() => loadUserState(), delay);
        return;
      }
      const errorMessage = err instanceof Error ? err.message : 'Failed to load user state';
      setError(errorMessage);
      dlog('useUserState: Error loading user state', { error: errorMessage });
    } finally {
      // Don't clear the spinner when we're waiting to retry a rate-limited request
      if (!rateLimited) {
        setLoading(false);
      }
    }
  }, [isAuthenticated, userId]);

  const refresh = useCallback(async () => {
    await loadUserState();
  }, [loadUserState]);

  // Load user state when authentication changes
  useEffect(() => {
    loadUserState();
  }, [loadUserState]);

  return {
    userState,
    loading,
    error,
    refresh
  };
}; 