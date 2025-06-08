import { useState, useCallback, useEffect } from 'react';
import type { Clause, ClauseFamily, ClauseFamilyGroup } from '../types/clause';
import * as api from '../services/api';

interface UseClausesState {
  clauses: Clause[];
  families: ClauseFamilyGroup[];
  selectedFamily: ClauseFamily | null;
  loading: boolean;
  error: string | null;
}

interface UseClausesActions {
  fetchAllClauses: () => Promise<void>;
  fetchClausesByFamily: (family: ClauseFamily) => Promise<void>;
  fetchFamilies: () => Promise<void>;
  selectFamily: (family: ClauseFamily | null) => void;
  bookmarkClause: (clauseId: string) => Promise<void>;
  searchClauses: (query: string) => Promise<Clause[]>;
}

export function useClauses(): [UseClausesState, UseClausesActions] {
  const [state, setState] = useState<UseClausesState>({
    clauses: [],
    families: [],
    selectedFamily: null,
    loading: false,
    error: null
  });

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, loading, error: null }));
  }, []);

  const setError = useCallback((error: string) => {
    setState(prev => ({ ...prev, error, loading: false }));
  }, []);

  const fetchAllClauses = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.fetchClauses();
      setState(prev => ({ ...prev, clauses: response.data, loading: false }));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch clauses');
    }
  }, [setLoading, setError]);

  const fetchClausesByFamily = useCallback(async (family: ClauseFamily) => {
    try {
      setLoading(true);
      const response = await api.getClausesByFamily(family);
      setState(prev => ({ ...prev, clauses: response.data, loading: false }));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch clauses by family');
    }
  }, [setLoading, setError]);

  const fetchFamilies = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.getClauseFamilies();
      setState(prev => ({ ...prev, families: response.data, loading: false }));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch families');
    }
  }, [setLoading, setError]);

  const selectFamily = useCallback((family: ClauseFamily | null) => {
    setState(prev => ({ ...prev, selectedFamily: family }));
    if (family) {
      fetchClausesByFamily(family);
    } else {
      fetchAllClauses();
    }
  }, [fetchClausesByFamily, fetchAllClauses]);

  const bookmarkClause = useCallback(async (clauseId: string) => {
    try {
      setLoading(true);
      const response = await api.bookmarkClause(clauseId);
      setState(prev => ({
        ...prev,
        clauses: prev.clauses.map(clause =>
          clause.id === clauseId
            ? { ...clause, isBookmarked: !clause.isBookmarked }
            : clause
        ),
        loading: false
      }));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to bookmark clause');
    }
  }, [setLoading, setError]);

  const searchClauses = useCallback(async (query: string) => {
    try {
      setLoading(true);
      const response = await api.searchClauses(query);
      setState(prev => ({ ...prev, clauses: response.data.data, loading: false }));
      return response.data.data;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to search clauses');
      return [];
    }
  }, [setLoading, setError]);

  // Initial data fetch
  useEffect(() => {
    fetchAllClauses();
    fetchFamilies();
  }, [fetchAllClauses, fetchFamilies]);

  const actions: UseClausesActions = {
    fetchAllClauses,
    fetchClausesByFamily,
    fetchFamilies,
    selectFamily,
    bookmarkClause,
    searchClauses
  };

  return [state, actions];
} 