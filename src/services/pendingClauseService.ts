import { apiCall } from './api';
import type { ApiResponse } from '../types/api';

// ---------------------------------------------------------------------------
// Pending-clause curation — wraps /api/pending-clauses (BE migration 145).
// Submit: any authenticated user. List/curate/promote/reject: platform reviewer.
// ---------------------------------------------------------------------------

export interface ProposedMethod {
  mechanism_type_id: string;
  description: string;
  is_required?: boolean;
  source_authority_for_link?: string | null;
}

export interface PendingClause {
  id: string;
  clause_code: string;
  title: string;
  description: string | null;
  confidence: number | null;
  supporting_context: string | null;
  source_evaluation_id: string | null;
  source_organization_id: string | null;
  family: string | null;
  clause_category: string | null;
  risk_classification: string | null;
  implementation_guidance: string | null;
  assessment_method: string | null;
  reference_url: string | null;
  source_authority_for_link: string | null;
  proposed_methods: ProposedMethod[];
  status: 'pending' | 'promoted' | 'rejected';
  promoted_clause_id: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MechanismType {
  id: string;
  display_label: string;
  pattern_type: string;
}

/** Curator-editable draft fields (camelCase → BE maps to columns). */
export interface CurateDraft {
  title?: string;
  description?: string | null;
  family?: string | null;
  clauseCategory?: string | null;
  riskClassification?: string | null;
  implementationGuidance?: string | null;
  assessmentMethod?: string | null;
  referenceUrl?: string | null;
  sourceAuthorityForLink?: string | null;
  proposedMethods?: ProposedMethod[];
}

export interface SubmitForReviewInput {
  clauseCode: string;
  title?: string;
  description?: string | null;
  confidence?: number | null;
  supportingContext?: string | null;
  sourceEvaluationId?: string | null;
}

export const pendingClauseService = {
  /** Submit a not-in-catalog scan find for catalog review (any user). */
  submit: (input: SubmitForReviewInput): Promise<ApiResponse<unknown>> =>
    apiCall('/api/pending-clauses', {
      method: 'POST',
      body: JSON.stringify(input),
      requireAuth: true,
    }),

  /** List the curation queue (platform reviewer). */
  list: (status?: 'pending' | 'promoted' | 'rejected'): Promise<ApiResponse<PendingClause[]>> =>
    apiCall<PendingClause[]>(
      `/api/pending-clauses${status ? `?status=${status}` : ''}`,
      { requireAuth: true },
    ),

  get: (id: string): Promise<ApiResponse<PendingClause>> =>
    apiCall<PendingClause>(`/api/pending-clauses/${id}`, { requireAuth: true }),

  mechanismTypes: (): Promise<ApiResponse<MechanismType[]>> =>
    apiCall<MechanismType[]>('/api/pending-clauses/mechanism-types', { requireAuth: true }),

  saveDraft: (id: string, draft: CurateDraft): Promise<ApiResponse<PendingClause>> =>
    apiCall<PendingClause>(`/api/pending-clauses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(draft),
      requireAuth: true,
    }),

  /** Promote a curated candidate into the authoritative catalog. */
  promote: (id: string, edits?: CurateDraft): Promise<ApiResponse<{ clause: any; methodsCreated: number }>> =>
    apiCall(`/api/pending-clauses/${id}/promote`, {
      method: 'POST',
      body: JSON.stringify({ edits }),
      requireAuth: true,
    }),

  reject: (id: string, notes?: string): Promise<ApiResponse<{ ok: boolean }>> =>
    apiCall(`/api/pending-clauses/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
      requireAuth: true,
    }),
};
