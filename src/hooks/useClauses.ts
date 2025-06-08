import { useState, useCallback, useEffect } from 'react';
import type { Clause, ClauseFamily, ClauseFamilyGroup } from '../types/clause';
import { clauseService } from '../services/clauseService';

export function useClauses() {
  const [clauses, setClauses] = useState<Clause[]>([]);
  const [families, setFamilies] = useState<ClauseFamilyGroup[]>([]);
  const [selectedFamily, setSelectedFamily] = useState<ClauseFamily | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAllClauses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await clauseService.getAllClauses();
      setClauses(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch clauses');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchClausesByFamily = useCallback(async (family: ClauseFamily) => {
    try {
      setLoading(true);
      setError(null);
      const response = await clauseService.getClausesByFamily(family);
      setClauses(response);
      setSelectedFamily(family);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch clauses by family');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFamilies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await clauseService.getClauseFamilies();
      setFamilies(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch families');
    } finally {
      setLoading(false);
    }
  }, []);

  const selectFamily = useCallback((family: ClauseFamily | null) => {
    setSelectedFamily(family);
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
    if (!query.trim()) {
      setClauses([]);
      return [];
    }

    try {
      setLoading(true);
      setError(null);
      const response = await clauseService.searchClauses(query);
      setClauses(response);
      return response;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search clauses');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchAllClauses();
    fetchFamilies();
  }, [fetchAllClauses, fetchFamilies]);

  return {
    clauses,
    families,
    selectedFamily,
    loading,
    error,
    fetchAllClauses,
    fetchClausesByFamily,
    fetchFamilies,
    selectFamily,
    bookmarkClause,
    searchClauses
  };
} 