import type { Clause, ClauseFamily, ClauseFamilyGroup, ApiResponse } from '../types/clause';
import { apiCall } from './api';

export const clauseService = {
  getAllClauses: async (): Promise<ApiResponse<Clause[]>> => {
    try {
      const response = await apiCall<Clause[]>('/api/clauses');
      console.log('API Response:', response);
      return response;
    } catch (error) {
      console.error('Error fetching clauses:', error);
      return {
        data: [],
        error: error instanceof Error ? error.message : 'Failed to fetch clauses'
      };
    }
  },

  getClausesByFamily: async (family: ClauseFamily): Promise<ApiResponse<Clause[]>> => {
    try {
      const response = await apiCall<Clause[]>(`/api/clauses/family/${family.id}`);
      console.log('API Response:', response);
      return response;
    } catch (error) {
      console.error('Error fetching clauses by family:', error);
      return {
        data: [],
        error: error instanceof Error ? error.message : 'Failed to fetch clauses by family'
      };
    }
  },

  getClauseFamilies: async (): Promise<ApiResponse<ClauseFamilyGroup[]>> => {
    try {
      const response = await apiCall<ClauseFamilyGroup[]>('/api/clauses/families');
      console.log('API Response:', response);
      return response;
    } catch (error) {
      console.error('Error fetching families:', error);
      return {
        data: [],
        error: error instanceof Error ? error.message : 'Failed to fetch families'
      };
    }
  },

  getClauseById: async (id: string): Promise<ApiResponse<Clause>> => {
    try {
      const response = await apiCall<Clause>(`/api/clauses/${id}`);
      console.log('API Response:', response);
      return response;
    } catch (error) {
      console.error('Error fetching clause:', error);
      return {
        data: null as unknown as Clause,
        error: error instanceof Error ? error.message : 'Failed to fetch clause'
      };
    }
  },

  searchClauses: async (query: string): Promise<ApiResponse<Clause[]>> => {
    try {
      const response = await apiCall<Clause[]>(`/api/clauses/search?q=${encodeURIComponent(query)}`);
      console.log('API Response:', response);
      return response;
    } catch (error) {
      console.error('Error searching clauses:', error);
      return {
        data: [],
        error: error instanceof Error ? error.message : 'Failed to search clauses'
      };
    }
  },

  bookmarkClause: async (clauseId: string): Promise<ApiResponse<void>> => {
    try {
      const response = await apiCall<void>(`/api/clauses/${clauseId}/bookmark`, {
        method: 'POST'
      });
      console.log('API Response:', response);
      return response;
    } catch (error) {
      console.error('Error bookmarking clause:', error);
      return {
        data: null as unknown as void,
        error: error instanceof Error ? error.message : 'Failed to bookmark clause'
      };
    }
  }
}; 