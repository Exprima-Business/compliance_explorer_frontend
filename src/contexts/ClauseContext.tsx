import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Clause, ClauseFamily } from '../types/clause';
import { clauseService } from '../services/clauseService';

interface ClauseContextType {
  clauses: Clause[];
  loading: boolean;
  error: string | null;
  selectedFamily: ClauseFamily | null;
  fetchAllClauses: () => Promise<void>;
  fetchClausesByFamily: (family: ClauseFamily) => Promise<void>;
  selectFamily: (family: ClauseFamily | null) => void;
  bookmarkClause: (clauseId: string) => Promise<void>;
  searchClauses: (query: string) => Promise<Clause[]>;
}

const ClauseContext = createContext<ClauseContextType | undefined>(undefined);

export function useClauseContext() {
  const context = useContext(ClauseContext);
  if (context === undefined) {
    throw new Error('useClauseContext must be used within a ClauseProvider');
  }
  return context;
}

export function ClauseProvider({ children }: { children: React.ReactNode }) {
  const [clauses, setClauses] = useState<Clause[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFamily, setSelectedFamily] = useState<ClauseFamily | null>(null);

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
  }, [fetchAllClauses]);

  const value = {
    clauses,
    loading,
    error,
    selectedFamily,
    fetchAllClauses,
    fetchClausesByFamily,
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