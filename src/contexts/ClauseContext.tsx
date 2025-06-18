import React, { createContext, useContext, useState, useEffect } from 'react';
import { clauseService } from '../services/clauseService';
import type { Clause, ClauseFamily, ClauseFamilyGroup, ApiResponse } from '../types/clause';
import { dlog } from '../utils/debugLog';

export interface ClauseContextValue {
  clauses: Clause[];
  families: ClauseFamilyGroup[];
  loading: boolean;
  error: string | null;
  bookmarkClause: (clauseId: string) => Promise<void>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedFamily: ClauseFamily | null;
  setSelectedFamily: (family: ClauseFamily | null) => void;
}

export const ClauseContext = createContext<ClauseContextValue | undefined>(undefined);

export const ClauseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [clauses, setClauses] = useState<Clause[]>([]);
  const [families, setFamilies] = useState<ClauseFamilyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFamily, setSelectedFamily] = useState<ClauseFamily | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [clausesResponse, familiesResponse] = await Promise.all([
          clauseService.getAllClauses(),
          clauseService.getClauseFamilies()
        ]);
        console.log('Raw clauses response:', clausesResponse);

        if (clausesResponse.error) {
          throw new Error(clausesResponse.error);
        }
        if (familiesResponse.error) {
          throw new Error(familiesResponse.error);
        }

        setClauses(clausesResponse.data);
        dlog('[CLAUSES] set initial', {
          src: 'all',
          len: clausesResponse.data.length,
          missing: clausesResponse.data.filter(c => !c.family).length
        });
        setFamilies(familiesResponse.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // When the user selects / clears a family, (re)load the appropriate clause set
  useEffect(() => {
    const loadByFamily = async () => {
      try {
        setLoading(true);
        let resp;
        if (selectedFamily) {
          resp = await clauseService.getClausesByFamily(selectedFamily);
        } else {
          // fetch the full list again
          resp = await clauseService.getAllClauses();
        }
        if (resp.error) throw new Error(resp.error);
        setClauses(resp.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch clauses');
      } finally {
        setLoading(false);
      }
    };

    loadByFamily();
  }, [selectedFamily]);

  const bookmarkClause = async (clauseId: string) => {
    try {
      const response = await clauseService.bookmarkClause(clauseId);
      if (response.error) {
        throw new Error(response.error);
      }
      setClauses(prevClauses => 
        prevClauses.map(clause => 
          clause.id === clauseId 
            ? { ...clause, is_bookmarked: !clause.is_bookmarked }
            : clause
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to bookmark clause');
      throw err;
    }
  };

  const value: ClauseContextValue = {
    clauses,
    families,
    loading,
    error,
    bookmarkClause,
    searchQuery,
    setSearchQuery,
    selectedFamily,
    setSelectedFamily
  };

  return (
    <ClauseContext.Provider value={value}>
      {children}
    </ClauseContext.Provider>
  );
};

export function useClause(): ClauseContextValue {
  const context = useContext(ClauseContext);
  if (context === undefined) {
    throw new Error('useClause must be used within a ClauseProvider');
  }
  return context;
} 