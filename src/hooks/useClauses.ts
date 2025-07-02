import { useState, useEffect } from 'react';
import { clauseService } from '../services/clauseService';
import type { Clause, ClauseFamily, ClauseFamilyGroup } from '../types/clause';
import type { ApiError } from '../types/api';

export function useClauses() {
  const [clauses, setClauses] = useState<Clause[]>([]);
  const [families, setFamilies] = useState<ClauseFamilyGroup[]>([]);
  const [selectedFamily, setSelectedFamily] = useState<ClauseFamily | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [clausesResponse, familiesResponse] = await Promise.all([
          clauseService.getAllClauses(),
          clauseService.getClauseFamilies()
        ]);

        if (clausesResponse.error) {
          throw new Error(typeof clausesResponse.error === 'string' ? clausesResponse.error : (clausesResponse.error as ApiError).message);
        }
        if (familiesResponse.error) {
          throw new Error(typeof familiesResponse.error === 'string' ? familiesResponse.error : (familiesResponse.error as ApiError).message);
        }

        if (clausesResponse.data) setClauses(clausesResponse.data);
        if (familiesResponse.data) setFamilies(familiesResponse.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const fetchClausesByFamily = async (family: ClauseFamily) => {
    try {
      setLoading(true);
      const response = await clauseService.getClausesByFamily(family);
      if (response.error) {
        throw new Error(typeof response.error === 'string' ? response.error : response.error.message);
      }
      if (response.data) setClauses(response.data);
      setSelectedFamily(family);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch clauses by family');
    } finally {
      setLoading(false);
    }
  };

  const searchClauses = async (query: string) => {
    try {
      setLoading(true);
      const response = await clauseService.searchClauses(query);
      if (response.error) {
        throw new Error(typeof response.error === 'string' ? response.error : response.error.message);
      }
      if (response.data) setClauses(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search clauses');
    } finally {
      setLoading(false);
    }
  };

  const selectFamily = (family: ClauseFamily | null) => {
    setSelectedFamily(family);
    if (family) {
      fetchClausesByFamily(family);
    } else if (families.length > 0) {
      fetchClausesByFamily(families[0].family);
    }
  };

  const bookmarkClause = async (clauseId: string) => {
    try {
      setError(null);
      await clauseService.bookmarkClause(clauseId);
      if (selectedFamily) {
        await fetchClausesByFamily(selectedFamily);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to bookmark clause');
    }
  };

  return {
    clauses,
    families,
    loading,
    error,
    fetchClausesByFamily,
    searchClauses,
    selectFamily,
    bookmarkClause
  };
} 