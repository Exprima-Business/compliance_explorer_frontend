import type { Clause, ClauseFamily, ClauseFamilyGroup } from '../types/clause';
import type { ApiResponse } from '../types/api';
import { apiCall } from './api';
import { urlBasedApiCall } from './urlBasedApi';
import { dlog } from '../utils/debugLog';

const ENABLE_URL_BASED_ROUTING = import.meta.env.VITE_ENABLE_URL_BASED_ROUTING === 'true';

// Helper function to get context from localStorage (simplified approach)
const getContextFromStorage = () => {
  if (typeof window === 'undefined') return null;
  
  const orgId = localStorage.getItem('orgId');
  const projectId = localStorage.getItem('projectId');
  
  // For now, return null to use header-based fallback
  // This would need to be enhanced to get slugs from context
  return null;
};

export const hybridClauseService = {
  getAllClauses: async (): Promise<ApiResponse<Clause[]>> => {
    try {
      const context = getContextFromStorage();
      const response = ENABLE_URL_BASED_ROUTING && context
        ? await urlBasedApiCall<Clause[]>('/clauses', {}, context)
        : await apiCall<Clause[]>('/api/clauses');
        
      dlog('[API] getAllClauses', {
        len: Array.isArray(response.data) ? response.data.length : 'n/a',
        missing: Array.isArray(response.data) ? response.data.filter(c=>!c.family).length : 'n/a',
        urlBased: ENABLE_URL_BASED_ROUTING && context
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

  getClausesByFamily: async (family: ClauseFamily): Promise<ApiResponse<Clause[]>> => {
    try {
      const context = getContextFromStorage();
      const response = ENABLE_URL_BASED_ROUTING && context
        ? await urlBasedApiCall<Clause[]>(`/clauses/family/${family.id}`, {}, context)
        : await apiCall<Clause[]>(`/api/clauses/family/${family.id}`);
        
      dlog('[API] getClausesByFamily', {
        familyId: family.id,
        len: Array.isArray(response.data) ? response.data.length : 'n/a',
        missing: Array.isArray(response.data) ? response.data.filter(c=>!c.family).length : 'n/a',
        urlBased: ENABLE_URL_BASED_ROUTING && context
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
      const context = getContextFromStorage();
      const response = ENABLE_URL_BASED_ROUTING && context
        ? await urlBasedApiCall<ClauseFamilyGroup[]>('/clauses/families', {}, context)
        : await apiCall<ClauseFamilyGroup[]>('/api/clauses/families');
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
      const context = getContextFromStorage();
      const response = ENABLE_URL_BASED_ROUTING && context
        ? await urlBasedApiCall<Clause>(`/clauses/${id}`, {}, context)
        : await apiCall<Clause>(`/api/clauses/${id}`);
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
      const context = getContextFromStorage();
      const response = ENABLE_URL_BASED_ROUTING && context
        ? await urlBasedApiCall<Clause[]>(`/clauses/search?q=${encodeURIComponent(query)}`, {}, context)
        : await apiCall<Clause[]>(`/api/clauses/search?q=${encodeURIComponent(query)}`);
      return response;
    } catch (error) {
      console.error('Error searching clauses:', error);
      return {
        data: [],
        error: error instanceof Error ? error.message : 'Failed to search clauses'
      };
    }
  },

  bookmarkClause: async (clauseId: string): Promise<ApiResponse<{ id: string; isBookmarked: boolean }>> => {
    try {
      const context = getContextFromStorage();
      const response = ENABLE_URL_BASED_ROUTING && context
        ? await urlBasedApiCall<any>(`/clauses/${clauseId}/bookmark`, { method: 'POST' }, context)
        : await apiCall<any>(`/api/clauses/${clauseId}/bookmark`, { method: 'POST' });

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

      return response as ApiResponse<{ id: string; isBookmarked: boolean }>;
    } catch (error) {
      console.error('Error bookmarking clause:', error);
      return {
        data: null as unknown as { id: string; isBookmarked: boolean },
        error: error instanceof Error ? error.message : 'Failed to bookmark clause'
      };
    }
  }
}; 