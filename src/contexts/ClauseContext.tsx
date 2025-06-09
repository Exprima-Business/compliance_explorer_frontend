import React, { createContext, useContext, useState, useEffect } from 'react';
import { clauseService } from '../services/clauseService';
import type { Clause, ClauseFamilyGroup, ApiResponse } from '../types/clause';

interface ClauseContextType {
  clauses: Clause[];
  families: ClauseFamilyGroup[];
  loading: boolean;
  error: string | null;
  bookmarkClause: (clauseId: string) => Promise<void>;
}

const ClauseContext = createContext<ClauseContextType | undefined>(undefined);

export const ClauseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [clauses, setClauses] = useState<Clause[]>([]);
  const [families, setFamilies] = useState<ClauseFamilyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [clausesData, familiesData] = await Promise.all([
          clauseService.getAllClauses(),
          clauseService.getClauseFamilies()
        ]);

        setClauses(clausesData);
        setFamilies(familiesData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleBookmarkClause = async (clauseId: string) => {
    try {
      await clauseService.bookmarkClause(clauseId);
      setClauses(prevClauses =>
        prevClauses.map(clause =>
          clause.id === clauseId
            ? { ...clause, isBookmarked: !clause.isBookmarked }
            : clause
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to bookmark clause');
    }
  };

  const value = {
    clauses,
    families,
    loading,
    error,
    bookmarkClause: handleBookmarkClause
  };

  return <ClauseContext.Provider value={value}>{children}</ClauseContext.Provider>;
};

export const useClauseContext = () => {
  const context = useContext(ClauseContext);
  if (context === undefined) {
    throw new Error('useClauseContext must be used within a ClauseProvider');
  }
  return context;
}; 