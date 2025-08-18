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

  const loadUserState = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setUserState(null);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      dlog('useUserState: Loading user state', { userId: user.id });
      
      const state = await UserStateService.getUserState();
      setUserState(state);
      
      dlog('useUserState: User state loaded', {
        needsSetup: state.needsSetup,
        organizationsCount: state.organizations?.length || 0,
        hasCurrentOrg: !!state.currentOrganization
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load user state';
      setError(errorMessage);
      dlog('useUserState: Error loading user state', { error: errorMessage });
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

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