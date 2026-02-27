import React, { createContext, useContext, useState, useEffect } from 'react';
import { clauseService } from '../services/clauseService';
import type { Clause, ClauseFamily, ClauseFamilyGroup } from '../types/clause';
import type { ApiError } from '../types/api';
import { extractErrorMessage } from '../utils/errorUtils';

export interface ClauseContextValue {
  clauses: Clause[];
  families: ClauseFamilyGroup[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedFamily: ClauseFamily | null;
  setSelectedFamily: (family: ClauseFamily | null) => void;
}

const ClauseContext = createContext<ClauseContextValue | undefined>(undefined);

export const ClauseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [clauses, setClauses] = useState<Clause[]>([]);
  const [families, setFamilies] = useState<ClauseFamilyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFamily, setSelectedFamily] = useState<ClauseFamily | null>(null);

  // Load families on mount
  useEffect(() => {
    const loadFamilies = async () => {
      try {
        const resp = await clauseService.getClauseFamilies();
        if (resp.error) {
          throw new Error(extractErrorMessage(resp.error, 'Failed to fetch families'));
        }
        if (resp.data) setFamilies(resp.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch families');
      }
    };

    loadFamilies();
  }, []);

  // Unified: load all clauses on mount AND whenever the family filter changes
  useEffect(() => {
    const loadClauses = async () => {
      try {
        setLoading(true);
        const resp = selectedFamily
          ? await clauseService.getClausesByFamily(selectedFamily)
          : await clauseService.getAllClauses();
        if (resp.error) {
          throw new Error(extractErrorMessage(resp.error, 'Failed to fetch clauses'));
        }
        if (resp.data) setClauses(resp.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch clauses');
      } finally {
        setLoading(false);
      }
    };

    loadClauses();
  }, [selectedFamily]);

  // Memoize the context value so consumers only re-render when something they
  // actually use has changed — not on every ClauseProvider render.
  const value = React.useMemo<ClauseContextValue>(() => ({
    clauses,
    families,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    selectedFamily,
    setSelectedFamily,
  }), [clauses, families, loading, error, searchQuery, selectedFamily]);

  return (
    <ClauseContext.Provider value={value}>
      {children}
    </ClauseContext.Provider>
  );
};

export const useClause = (): ClauseContextValue => {
  const context = useContext(ClauseContext);
  if (context === undefined) {
    throw new Error('useClause must be used within a ClauseProvider');
  }
  return context;
};
