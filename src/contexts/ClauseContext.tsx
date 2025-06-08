import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Clause, ClauseFamily, ClauseFamilyGroup } from '../types/clause';
import * as api from '../services/api';
import { supabase } from '../lib/supabase';

interface UseClausesState {
  clauses: Clause[];
  families: ClauseFamilyGroup[];
  selectedFamily: ClauseFamily | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

interface UseClausesActions {
  fetchAllClauses: () => Promise<void>;
  fetchClausesByFamily: (family: ClauseFamily) => Promise<void>;
  fetchFamilies: () => Promise<void>;
  selectFamily: (family: ClauseFamily | null) => void;
  bookmarkClause: (clauseId: string) => Promise<void>;
  searchClauses: (query: string) => Promise<void>;
}

interface ClauseContextType extends UseClausesState, UseClausesActions {}

const ClauseContext = createContext<ClauseContextType | undefined>(undefined);

export function ClauseProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<UseClausesState>({
    clauses: [],
    families: [],
    selectedFamily: null,
    loading: false,
    error: null,
    isAuthenticated: false
  });

  const checkAuth = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setState(prev => ({ ...prev, isAuthenticated: !!session }));
  }, []);

  useEffect(() => {
    checkAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkAuth();
    });
    return () => subscription.unsubscribe();
  }, [checkAuth]);

  const fetchAllClauses = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const response = await api.fetchClauses();
      setState(prev => ({ ...prev, clauses: response.data, loading: false }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch clauses' 
      }));
    }
  }, []);

  const fetchClausesByFamily = useCallback(async (family: ClauseFamily) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const response = await api.getClausesByFamily(family);
      setState(prev => ({ ...prev, clauses: response.data, loading: false }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch clauses' 
      }));
    }
  }, []);

  const fetchFamilies = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const response = await api.getClauseFamilies();
      setState(prev => ({ ...prev, families: response.data, loading: false }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch families' 
      }));
    }
  }, []);

  const selectFamily = useCallback((family: ClauseFamily | null) => {
    setState(prev => ({ ...prev, selectedFamily: family }));
  }, []);

  const bookmarkClause = useCallback(async (clauseId: string) => {
    if (!state.isAuthenticated) {
      setState(prev => ({ 
        ...prev, 
        error: 'Please log in to bookmark clauses' 
      }));
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      await api.bookmarkClause(clauseId);
      setState(prev => ({ 
        ...prev, 
        loading: false,
        clauses: prev.clauses.map(clause => 
          clause.id === clauseId 
            ? { ...clause, isBookmarked: !clause.isBookmarked }
            : clause
        )
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to bookmark clause' 
      }));
    }
  }, [state.isAuthenticated]);

  const searchClauses = useCallback(async (query: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const response = await api.searchClauses(query);
      setState(prev => ({ ...prev, clauses: response.data, loading: false }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to search clauses' 
      }));
    }
  }, []);

  useEffect(() => {
    fetchAllClauses();
    fetchFamilies();
  }, [fetchAllClauses, fetchFamilies]);

  const value = {
    ...state,
    fetchAllClauses,
    fetchClausesByFamily,
    fetchFamilies,
    selectFamily,
    bookmarkClause,
    searchClauses
  };

  return (
    <ClauseContext.Provider value={value}>
      {children}
    </ClauseContext.Provider>
  );
}

export function useClauseContext() {
  const context = useContext(ClauseContext);
  if (context === undefined) {
    throw new Error('useClauseContext must be used within a ClauseProvider');
  }
  return context;
} 