import type { Clause, ClauseFamily, ClauseFamilyGroup, ApiResponse } from '../types/clause';
import { apiCall } from './api';

export const clauseService = {
  getAllClauses: async (): Promise<ApiResponse<Clause[]>> => {
    try {
      const response = await apiCall<Clause[]>('/clauses');
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
      const response = await apiCall<Clause[]>(`/clauses/family/${family}`);
      console.log('API Response - getClausesByFamily:', {
        requestedFamily: family,
        totalClauses: response.length,
        sampleClause: response[0],
        relationships: response[0]?.relationships,
        familyInfo: response[0]?.family
      });
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
      const response = await apiCall<ClauseFamilyGroup[]>('/clauses/families');
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

  bookmarkClause: async (clauseId: string): Promise<ApiResponse<void>> => {
    try {
      const response = await apiCall<void>(`/clauses/${clauseId}/bookmark`, {
        method: 'POST'
      });
      console.log('API Response:', response);
      return response;
    } catch (error) {
      console.error('Error bookmarking clause:', error);
      return {
        data: undefined,
        error: error instanceof Error ? error.message : 'Failed to bookmark clause'
      };
    }
  },

  getClauseById: async (clauseId: string): Promise<ApiResponse<Clause>> => {
    try {
      const response = await apiCall<Clause>(`/clauses/${clauseId}`);
      return response;
    } catch (error) {
      console.error('Error fetching clause by ID:', error);
      return {
        data: undefined,
        error: error instanceof Error ? error.message : 'Failed to fetch clause by ID'
      };
    }
  },

  searchClauses: async (query: string): Promise<ApiResponse<Clause[]>> => {
    try {
      const response = await apiCall<Clause[]>(`/clauses/search?q=${encodeURIComponent(query)}`);
      return response;
    } catch (error) {
      console.error('Error searching clauses:', error);
      return {
        data: [],
        error: error instanceof Error ? error.message : 'Failed to search clauses'
      };
    }
  }
}; 