import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import { OrganizationValidationService } from '../services/organizationValidationService';

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
          // Check if user has valid organization context
          const hasValidContext = await OrganizationValidationService.hasValidOrganizationContext();
          
          if (!hasValidContext) {
            console.warn('User does not have valid organization context');
            // Don't fail auth, but mark as needing organization validation
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
        // Check organization context on sign-in
        const hasValidContext = await OrganizationValidationService.hasValidOrganizationContext();
        if (!hasValidContext) {
          console.warn('User signed in but lacks organization context');
        }
      } else if (event === 'SIGNED_OUT') {
        // Clear any stored organization context
        localStorage.removeItem('orgId');
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