import { useState, useCallback, useEffect } from 'react';
import type { Clause, ClauseFamily, ClauseFamilyGroup } from '../types/clause';
import * as api from '../services/api';
import { clauseService } from '../services/clauseService';

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
      setError(null);
      const response = await clauseService.getAllClauses();
      setState(prev => ({ ...prev, clauses: response, loading: false }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch clauses');
    }
  }, []);

  const fetchClausesByFamily = useCallback(async (family: ClauseFamily) => {
    try {
      setLoading(true);
      setError(null);
      const response = await clauseService.getClausesByFamily(family);
      setState(prev => ({ ...prev, clauses: response, selectedFamily: family, loading: false }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch clauses by family');
    }
  }, []);

  const fetchFamilies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await clauseService.getClauseFamilies();
      setState(prev => ({ ...prev, families: response, loading: false }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch families');
    }
  }, []);

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
      setError(null);
      await clauseService.bookmarkClause(clauseId);
      await fetchAllClauses();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to bookmark clause');
    }
  }, [fetchAllClauses]);

  const searchClauses = useCallback(async (query: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await clauseService.searchClauses(query);
      setState(prev => ({ ...prev, clauses: response, loading: false }));
      return response;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search clauses');
      return [];
    }
  }, []);

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