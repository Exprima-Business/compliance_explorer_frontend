import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import { ensureCookieSession, clearCookieSession } from '../services/sessionBridge';
import { UserStateService } from '../services/userStateService';

export interface AuthContextValue {
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // When there is no supabase-js session (persistSession disabled, or a tab
    // restored without one), derive auth state from the BE HttpOnly cookie —
    // the cookie is the source of truth (cookie auth Phase 4b). Dormant while
    // persistSession is on, since getSession() then always returns a session.
    const hydrateFromCookie = async () => {
      try {
        const state = await UserStateService.getUserState();
        setUser(
          state?.userId
            ? ({ id: state.userId, email: state.email ?? undefined } as User)
            : null,
        );
      } catch {
        setUser(null);
      }
    };

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
        } else {
          await hydrateFromCookie();
        }
        setLoading(false);
      } catch (error) {
        console.error('Auth initialization error:', error);
        setError('Authentication initialization failed');
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for changes on auth state. ensureCookieSession() is idempotent
    // (no-ops when a cookie session already exists), so TOKEN_REFRESHED /
    // INITIAL_SESSION events don't spawn extra server-side sessions. This one
    // listener covers every sign-in path: password, magic-link, restore.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        // Revoke the cookie session server-side, then clear local org context.
        void clearCookieSession();
        localStorage.removeItem('orgId');
        setLoading(false);
        return;
      }
      if (session) {
        // Establish/refresh the BE cookie BEFORE the app proceeds so cookie-only
        // API calls (user-state, etc.) don't race ahead of the cookie on a
        // fresh login.
        await ensureCookieSession();
        setUser(session.user);
      } else {
        // Non-SIGNED_OUT event with no session — fall back to the cookie.
        await hydrateFromCookie();
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
      throw err;
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      setError(null);
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign up');
      throw err;
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign out');
      throw err;
    }
  };

  const value: AuthContextValue = {
    user,
    signIn,
    signUp,
    signOut,
    loading,
    error,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 