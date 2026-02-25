import React, { createContext, useContext, useState, useEffect } from 'react';
import { clauseService } from '../services/clauseService';
import { usePreferences } from './PreferencesContext';
import type { Clause, ClauseFamily, ClauseFamilyGroup } from '../types/clause';
import type { ApiError } from '../types/api';
import { dlog } from '../utils/debugLog';

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
  
  const { preferences } = usePreferences();

  // Load families on mount
  useEffect(() => {
    const loadFamilies = async () => {
      try {
        const resp = await clauseService.getClauseFamilies();
        if (resp.error) {
          const msg = typeof resp.error === 'string' ? resp.error : (resp.error as ApiError).message;
          throw new Error(msg);
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
          const msg = typeof resp.error === 'string' ? resp.error : (resp.error as ApiError).message;
          throw new Error(msg);
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

  // Helper function to find parent clauses
  const findParentClauses = (clause: Clause): Clause[] => {
    const parentClauses: Clause[] = [];

    clause.relationships.forEach(rel => {
      const relAny = rel as any;
      const rType: string = (relAny.type ?? relAny.relationshipType ?? '').toUpperCase();

      if (rType === 'PARENT') {
        // For a PARENT relationship stored as
        //   clauseId           = child
        //   relatedClauseId    = parent
        // the parent is in the *relatedClauseId* (or targetClauseId) column.
        const parentId = relAny.relatedClauseId || relAny.targetClauseId;
        if (parentId) {
          const parent = clauses.find(c => c.clauseId === parentId);
          if (parent) parentClauses.push(parent);
        }
      } else if (rType === 'CHILD') {
        // For a CHILD relationship stored as
        //   clauseId           = parent
        //   relatedClauseId    = child
        // the parent is in the *clauseId* (or sourceClauseId) column.
        const parentId = relAny.clauseId || relAny.sourceClauseId;
        if (parentId) {
          const parent = clauses.find(c => c.clauseId === parentId);
          if (parent) parentClauses.push(parent);
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



  const value: ClauseContextValue = {
    clauses,
    families,
    loading,
    error,
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