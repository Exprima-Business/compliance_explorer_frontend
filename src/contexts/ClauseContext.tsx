import React, { createContext, useContext, useState, useEffect } from 'react';
import { clauseService } from '../services/clauseService';
import { usePreferences } from './PreferencesContext';
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

const ClauseContext = createContext<ClauseContextValue | undefined>(undefined);

export const ClauseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [clauses, setClauses] = useState<Clause[]>([]);
  const [families, setFamilies] = useState<ClauseFamilyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFamily, setSelectedFamily] = useState<ClauseFamily | null>(null);
  
  const { preferences } = usePreferences();

  // Load families on mount
  useEffect(() => {
    const loadFamilies = async () => {
      try {
        const resp = await clauseService.getClauseFamilies();
        if (resp.error) throw new Error(resp.error);
        setFamilies(resp.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch families');
      }
    };

    loadFamilies();
  }, []);

  // Load all clauses on mount
  useEffect(() => {
    const loadAllClauses = async () => {
      try {
        setLoading(true);
        const resp = await clauseService.getAllClauses();
        if (resp.error) throw new Error(resp.error);
        setClauses(resp.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch clauses');
      } finally {
        setLoading(false);
      }
    };

    loadAllClauses();
  }, []);

  // When the user selects / clears a family, (re)load the appropriate clause set
  useEffect(() => {
    if (selectedFamily === null) return; // Don't reload if no family is selected (keep all clauses)
    
    const loadByFamily = async () => {
      try {
        setLoading(true);
        const resp = await clauseService.getClausesByFamily(selectedFamily);
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

  // Helper function to find parent clauses
  const findParentClauses = (clause: Clause): Clause[] => {
    const parentClauses: Clause[] = [];
    
    // Check relationships for PARENT type
    clause.relationships.forEach(relationship => {
      if (relationship.type === 'PARENT') {
        // Handle both possible property names
        const targetId = (relationship as any).targetClauseId || (relationship as any).clauseId;
        const parentClause = clauses.find(c => c.clauseId === targetId);
        if (parentClause) {
          parentClauses.push(parentClause);
        }
      }
    });

    return parentClauses;
  };

  // Helper function to find child clauses
  const findChildClauses = (clause: Clause): Clause[] => {
    const childClauses: Clause[] = [];
    
    clauses.forEach(otherClause => {
      otherClause.relationships.forEach(relationship => {
        // Handle both possible property names
        const targetId = (relationship as any).targetClauseId || (relationship as any).clauseId;
        if (relationship.type === 'PARENT' && targetId === clause.clauseId) {
          childClauses.push(otherClause);
        }
      });
    });

    return childClauses;
  };

  const bookmarkClause = async (clauseId: string) => {
    try {
      const clause = clauses.find(c => c.id === clauseId);
      if (!clause) {
        throw new Error('Clause not found');
      }

      const response = await clauseService.bookmarkClause(clauseId);
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Use the backend response to update the state
      if (response.data) {
        setClauses(prevClauses => {
          const idx = prevClauses.findIndex(c => c.id === clauseId);
          let updated: Clause[];
          if (idx === -1) {
            // Clause not currently in local state (e.g., filtered out earlier) – add it
            updated = [
              ...prevClauses,
              { ...clause, isBookmarked: response.data!.isBookmarked }
            ];
          } else {
            // Clause exists – replace with updated bookmark flag
            updated = prevClauses.map(c =>
              c.id === clauseId ? { ...c, isBookmarked: response.data!.isBookmarked } : c
            );
          }
          return updated;
        });

        // If bookmarking and autoBookmarkParents is enabled, also bookmark parent clauses
        if (response.data.isBookmarked && preferences.autoBookmarkParents) {
          const parentClauses = findParentClauses(clause);
          for (const parentClause of parentClauses) {
            if (!parentClause.isBookmarked) {
              try {
                const parentResponse = await clauseService.bookmarkClause(parentClause.id);
                if (parentResponse.data) {
                  setClauses(prevClauses => 
                    prevClauses.map(c => 
                      c.id === parentClause.id 
                        ? { ...c, isBookmarked: parentResponse.data!.isBookmarked }
                        : c
                    )
                  );
                }
              } catch (err) {
                console.error(`Failed to bookmark parent clause ${parentClause.clauseId}:`, err);
              }
            }
          }
        }
      }
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

export const useClause = (): ClauseContextValue => {
  const context = useContext(ClauseContext);
  if (context === undefined) {
    throw new Error('useClause must be used within a ClauseProvider');
  }
  return context;
}; 