import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import { JWTClaimsManager } from '../utils/jwtClaimsManager';

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
    const initializeAuth = async () => {
      try {
        // Check active sessions and sets the user
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Validate and restore claims if needed
          const claimsResult = await JWTClaimsManager.validateCurrentClaims();
          
          if (!claimsResult.isValid) {
            // Try to restore claims from localStorage
            const restoreResult = await JWTClaimsManager.restoreClaims();
            if (!restoreResult.success) {
              console.warn('JWT claims validation failed:', claimsResult.error);
              // Don't fail auth, but mark as needing organization selection
            }
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Auth initialization error:', error);
        setError('Authentication initialization failed');
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for changes on auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      
      if (session?.user && event === 'SIGNED_IN') {
        // Handle claims validation on sign-in
        const claimsResult = await JWTClaimsManager.validateCurrentClaims();
        if (!claimsResult.isValid) {
          const restoreResult = await JWTClaimsManager.restoreClaims();
          if (!restoreResult.success) {
            console.warn('Failed to restore claims after sign-in');
          }
        }
      } else if (event === 'SIGNED_OUT') {
        JWTClaimsManager.clearStoredClaims();
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