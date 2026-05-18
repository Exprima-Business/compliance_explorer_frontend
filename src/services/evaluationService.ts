import { apiCall } from './api';
import type { ApiResponse } from '../types/api';

// ---------------------------------------------------------------------------
// Types — mirror the backend solicitationEvaluationService domain objects
// ---------------------------------------------------------------------------

export type CoverageStatus = 'covered' | 'gap' | 'unknown';
export type EvaluationStatus = 'evaluated' | 'go' | 'no_go' | 'archived';

export interface CoverageSummary {
  detected: number;
  covered: number;
  gaps: number;
  unknown: number;
}

export interface EvaluationClause {
  id: string;
  evaluationId: string;
  /** UUID FK to clauses; null for scanner-detected clauses not in our DB */
  clauseId: string | null;
  clauseCode: string | null;
  title: string | null;
  confidence: number | null;
  coverageStatus: CoverageStatus;
  /**
   * Live completion (0-100) of the framework this clause resolves to, or
   * null when it maps to no tracked framework / is not in our catalog.
   */
  completionPct: number | null;
}

/**
 * A framework the evaluation's detected clauses imply, with the program's
 * live completion against it. A non-activated framework still appears (0%) —
 * it remains a requirement the solicitation introduces.
 */
export interface RequiredFramework {
  id: string;
  name: string;
  version: string;
  activated: boolean;
  totalControls: number;
  /** Controls explicitly marked IMPLEMENTED */
  implementedControls: number;
  /** Additional controls satisfied only via a cross-framework crosswalk */
  crosswalkCredited: number;
  completionPct: number;
}

export interface SolicitationEvaluation {
  id: string;
  organizationId: string;
  programId: string | null;
  scanId: string | null;
  title: string;
  solicitationNumber: string | null;
  agency: string | null;
  responseDueDate: string | null;
  status: EvaluationStatus;
  coverageSummary: CoverageSummary;
  createdAt: string;
  updatedAt: string;
}

export interface EvaluationDetail {
  evaluation: SolicitationEvaluation;
  clauses: EvaluationClause[];
  /** Frameworks the detected clauses imply, with live completion. */
  frameworks: RequiredFramework[];
}

export interface CreateEvaluationRequest {
  scanId: string;
  /** Optional — when set, coverage is computed against this program */
  programId?: string;
  title?: string;
  solicitationNumber?: string;
  agency?: string;
  /** ISO date string */
  responseDueDate?: string;
}

export interface ApplyResult {
  appliedMatched: number;
  appliedScanDetected: number;
  bookmarksCreated: number;
}

// ---------------------------------------------------------------------------
// Service — wraps the /api/solicitation-evaluations endpoints (036e)
// ---------------------------------------------------------------------------

export const evaluationService = {
  /** Create a saved solicitation evaluation from a completed scan. */
  create: async (
    request: CreateEvaluationRequest,
  ): Promise<ApiResponse<EvaluationDetail>> => {
    return apiCall<EvaluationDetail>('/api/solicitation-evaluations', {
      method: 'POST',
      body: JSON.stringify(request),
      requireAuth: true,
    });
  },

  /** List the org's solicitation evaluations (newest first). */
  list: async (): Promise<ApiResponse<SolicitationEvaluation[]>> => {
    return apiCall<SolicitationEvaluation[]>('/api/solicitation-evaluations', {
      requireAuth: true,
    });
  },

  /** Fetch one evaluation with its clause rows. */
  get: async (id: string): Promise<ApiResponse<EvaluationDetail>> => {
    return apiCall<EvaluationDetail>(`/api/solicitation-evaluations/${id}`, {
      requireAuth: true,
    });
  },

  /**
   * Apply selected evaluation clauses into a compliance program — the
   * additive bridge. Writes the clauses into the program's matrix +
   * bookmarks; the evaluation record itself is unchanged.
   */
  apply: async (
    evaluationId: string,
    programId: string,
    evaluationClauseIds: string[],
  ): Promise<ApiResponse<ApplyResult>> => {
    return apiCall<ApplyResult>(`/api/solicitation-evaluations/${evaluationId}/apply`, {
      method: 'POST',
      body: JSON.stringify({ programId, evaluationClauseIds }),
      requireAuth: true,
    });
  },
};
