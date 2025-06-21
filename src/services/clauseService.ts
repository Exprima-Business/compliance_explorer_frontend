import type { Clause, ClauseFamily, ClauseFamilyGroup, ApiResponse, GraphData } from '../types/clause';
import { apiCall } from './api';
import { dlog } from '../utils/debugLog';

export const clauseService = {
  getAllClauses: async (): Promise<ApiResponse<Clause[]>> => {
    try {
      const response = await apiCall<Clause[]>('/api/clauses');
      dlog('[API] getAllClauses', {
        len: Array.isArray(response.data) ? response.data.length : 'n/a',
        missing: Array.isArray(response.data) ? response.data.filter(c=>!c.family).length : 'n/a'
      });
      return response;
    } catch (error) {
      console.error('Error fetching clauses:', error);
      return {
        data: [],
        error: error instanceof Error ? error.message : 'Failed to fetch clauses'
      };
    }
  },

  getGraphData: async (): Promise<ApiResponse<GraphData>> => {
    try {
      const response = await apiCall<GraphData>('/api/clauses/graph');
      return response;
    } catch (error) {
      console.error('Error fetching graph data:', error);
      return {
        data: { nodes: [], links: [] },
        error: error instanceof Error ? error.message : 'Failed to fetch graph data'
      };
    }
  },

  getClausesByFamily: async (family: ClauseFamily): Promise<ApiResponse<Clause[]>> => {
    try {
      const response = await apiCall<Clause[]>(`/api/clauses/family/${family.id}`);
      dlog('[API] getClausesByFamily', {
        familyId: family.id,
        len: Array.isArray(response.data) ? response.data.length : 'n/a',
        missing: Array.isArray(response.data) ? response.data.filter(c=>!c.family).length : 'n/a'
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
      const response = await apiCall<ClauseFamilyGroup[]>('/api/clauses/families');
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
      return response;
    } catch (error) {
      console.error('Error searching clauses:', error);
      return {
        data: [],
        error: error instanceof Error ? error.message : 'Failed to search clauses'
      };
    }
  },

  bookmarkClause: async (clauseId: string): Promise<ApiResponse<{id: string, isBookmarked: boolean}>> => {
    try {
      const response = await apiCall<any>(`/api/clauses/${clauseId}/bookmark`, {
        method: 'POST'
      });

      if (response.error) {
        return response;
      }

      // Backend may wrap the useful payload inside its own `data` key.
      const payload = response.data;

      if (payload && typeof payload === 'object' && 'data' in payload && payload.data) {
        return {
          data: payload.data as { id: string; isBookmarked: boolean },
          error: null
        };
      }

      return response as ApiResponse<{id: string, isBookmarked: boolean}>;
    } catch (error) {
      console.error('Error bookmarking clause:', error);
      return {
        data: null as unknown as {id: string, isBookmarked: boolean},
        error: error instanceof Error ? error.message : 'Failed to bookmark clause'
      };
    }
  }
}; 