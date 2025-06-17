import type { Clause, ClauseFamily, ClauseFamilyGroup, ApiResponse, GraphData } from '../types/clause';
import { apiCall } from './api';
import { dlog } from '../utils/debugLog';

export const clauseService = {
  getAllClauses: async (): Promise<ApiResponse<Clause[]>> => {
    try {
      const response = await apiCall<Clause[]>('/api/clauses');

      // TEMP DEBUG: log first clause object to verify family presence
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log('🕵️‍♂️ raw clause[0]', response.data?.[0]);
      }

      dlog('[API] getAllClauses', {
        len: Array.isArray(response.data) ? response.data.length : 'n/a',
        missing: Array.isArray(response.data) ? response.data.filter(c=>!c.family).length : 'n/a'
      });
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

  getGraphData: async (): Promise<ApiResponse<GraphData>> => {
    try {
      const response = await apiCall<GraphData>('/api/clauses/graph');
      console.log('API Response:', {
        data: response.data,
        nodes: response.data?.nodes,
        edges: response.data?.edges,
        firstNode: response.data?.nodes?.[0],
        firstEdge: response.data?.edges?.[0]
      });
      return response;
    } catch (error) {
      console.error('Error fetching graph data:', error);
      return {
        data: { nodes: [], edges: [] },
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