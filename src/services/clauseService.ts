import type { Clause, ClauseFamily, ClauseFamilyGroup } from '../types/clause';
import type { ApiResponse } from '../types/api';
import { apiCall } from './api';
import { dlog } from '../utils/debugLog';

export const clauseService = {
  getAllClauses: async (): Promise<ApiResponse<Clause[]>> => {
    try {
      dlog('[API] getAllClauses - starting request');
      const response = await apiCall<Clause[]>('/api/clauses');
      dlog('[API] getAllClauses - response received', {
        hasError: !!response.error,
        errorMessage: response.error,
        hasData: !!response.data,
        dataType: typeof response.data,
        len: Array.isArray(response.data) ? response.data.length : 'n/a',
        missing: Array.isArray(response.data) ? response.data.filter(c=>!c.family).length : 'n/a',
        sampleData: Array.isArray(response.data) && response.data.length > 0 ? response.data[0] : 'no data'
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

  bookmarkClause: async (clauseId: string): Promise<ApiResponse<{ id: string; isBookmarked: boolean }>> => {
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

// ─────────────────────────────────────────────────────────────────────────────
// Clause detail (reciprocity-derived checklist)
// ─────────────────────────────────────────────────────────────────────────────

export interface ClauseDetailControl {
  id: string;
  identifier: string;
  title: string | null;
  requirement_text: string | null;
  status: string;
  is_completed: boolean;
  is_withdrawn: boolean;
}

export interface ClauseDetailActivatedFramework {
  framework: { id: string; name: string; version: string };
  mappingType: string;
  mappingDescription: string | null;
  controls: ClauseDetailControl[];
  completionPct: number;
  satisfied: number;
  total: number;
}

export interface ClauseDetailAlternativeFramework {
  framework: { id: string; name: string; version: string };
  mappingType: string;
}

export interface ClauseDetailResponse {
  clause: Clause;
  activatedFrameworks: ClauseDetailActivatedFramework[];
  alternativeFrameworks: ClauseDetailAlternativeFramework[];
  hasFrameworkCoverage: boolean;
}

export async function fetchClauseDetail(clauseCode: string): Promise<ApiResponse<ClauseDetailResponse>> {
  return apiCall<ClauseDetailResponse>(
    `/api/clauses/by-code/${encodeURIComponent(clauseCode)}/detail`,
    { requireAuth: true },
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Regulatory graph (Phase 1.5)
// ─────────────────────────────────────────────────────────────────────────────

export interface RegulatoryArtifactRef {
  id: string;
  artifact_type: string;
  identifier: string;
  title: string;
  source_authority: string;
}

export interface RegulatoryArtifact extends RegulatoryArtifactRef {
  citation: string | null;
  source_url: string | null;
  summary: string | null;
}

export interface RegulatoryEdge {
  relationship_type: string;
  description: string | null;
  source_authority_for_link: string | null;
  source_paragraph: string | null;
}

export interface ClauseGraphResponse {
  artifact: RegulatoryArtifact | null;
  outgoing: Array<RegulatoryEdge & { target: RegulatoryArtifactRef }>;
  incoming: Array<RegulatoryEdge & { source: RegulatoryArtifactRef }>;
}

/** Fetch the regulatory graph neighbourhood for a clause (1 hop in each direction). */
export async function fetchClauseGraph(clauseCode: string): Promise<ApiResponse<ClauseGraphResponse>> {
  return apiCall<ClauseGraphResponse>(
    `/api/clauses/by-code/${encodeURIComponent(clauseCode)}/graph`,
    { requireAuth: true },
  );
}
