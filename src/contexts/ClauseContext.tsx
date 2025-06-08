import React, { createContext, useContext } from 'react';
import { useClauses } from '../hooks/useClauses';
import type { Clause, ClauseFamily, ClauseFamilyGroup } from '../types/clause';

interface ClauseContextType {
  clauses: Clause[];
  families: ClauseFamilyGroup[];
  selectedFamily: ClauseFamily | null;
  loading: boolean;
  error: string | null;
  fetchAllClauses: () => Promise<void>;
  fetchClausesByFamily: (family: ClauseFamily) => Promise<void>;
  fetchFamilies: () => Promise<void>;
  selectFamily: (family: ClauseFamily | null) => void;
  bookmarkClause: (clauseId: string) => Promise<void>;
  searchClauses: (query: string) => Promise<Clause[]>;
}

const ClauseContext = createContext<ClauseContextType | undefined>(undefined);

export function ClauseProvider({ children }: { children: React.ReactNode }) {
  const [state, actions] = useClauses();

  const value = {
    ...state,
    ...actions
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