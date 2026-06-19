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
  family_id: string | null;
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

export interface Family {
  id: string;
  name: string;
}

/** Curator-editable draft fields (camelCase → BE maps to columns). */
export interface CurateDraft {
  clauseCode?: string;
  title?: string;
  description?: string | null;
  familyId?: string | null;
  family?: string | null;
  clauseCategory?: string | null;
  riskClassification?: string | null;
  implementationGuidance?: string | null;
  assessmentMethod?: string | null;
  referenceUrl?: string | null;
  sourceAuthorityForLink?: string | null;
  proposedMethods?: ProposedMethod[];
}

/** Draft catalog fields produced by AI from a source document (not persisted). */
export interface EnrichedDraft {
  suggestedClauseCode: string;
  title: string;
  description: string;
  family: string;
  clauseCategory: string;
  riskClassification: '' | 'LOW' | 'MEDIUM' | 'HIGH';
  implementationGuidance: string;
  assessmentMethod: string;
  referenceUrl: string;
  proposedMethods: ProposedMethod[];
}

// ── Related Regulations (Phase 2 graph wiring) ──────────────────────────────
export const RELATIONSHIP_TYPES = [
  'cites', 'incorporates_by_reference', 'derived_from', 'flows_down_to', 'mandates',
  'implements', 'supersedes', 'amends', 'codified_in', 'created_by', 'extension_of',
] as const;
export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

export const ARTIFACT_TYPES = [
  'nist_publication', 'cfr_part', 'cfr_section', 'far_clause', 'dfars_clause',
  'hsar_clause', 'agency_supplement_clause', 'executive_order', 'federal_register_rule',
  'omb_memo', 'statute', 'guidance_doc',
] as const;
export type ArtifactType = (typeof ARTIFACT_TYPES)[number];

export interface ArtifactRef {
  id: string;
  identifier: string;
  title: string;
  artifact_type: string;
  source_authority?: string | null;
}

export interface ClauseGraph {
  promoted?: boolean;
  artifactId: string | null;
  artifact: (ArtifactRef & { source_authority?: string | null }) | null;
  relationships: Array<{
    id: string;
    relationship_type: string;
    direction: 'outgoing' | 'incoming';
    description: string | null;
    source_authority_for_link: string | null;
    other: ArtifactRef;
  }>;
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

  /** Catalog families for the Family dropdown (platform reviewer). */
  families: (): Promise<ApiResponse<Family[]>> =>
    apiCall<Family[]>('/api/pending-clauses/families', { requireAuth: true }),

  saveDraft: (id: string, draft: CurateDraft): Promise<ApiResponse<PendingClause>> =>
    apiCall<PendingClause>(`/api/pending-clauses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(draft),
      requireAuth: true,
    }),

  /** Edit a clause that has already been promoted — writes through to the catalog. */
  updateCatalog: (id: string, draft: CurateDraft): Promise<ApiResponse<PendingClause>> =>
    apiCall<PendingClause>(`/api/pending-clauses/${id}/catalog`, {
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

  /** Draft catalog fields from an uploaded source document (platform reviewer). */
  enrich: (id: string, file: File): Promise<ApiResponse<EnrichedDraft>> => {
    const fd = new FormData();
    fd.append('file', file);
    return apiCall<EnrichedDraft>(`/api/pending-clauses/${id}/enrich`, {
      method: 'POST',
      body: fd,
      requireAuth: true,
      timeout: 120_000, // PDF parse + Haiku call
    });
  },

  // ── Related Regulations (graph wiring) ────────────────────────────────────
  graph: (id: string): Promise<ApiResponse<ClauseGraph>> =>
    apiCall<ClauseGraph>(`/api/pending-clauses/${id}/graph`, { requireAuth: true }),

  searchArtifacts: (q: string): Promise<ApiResponse<{ items: ArtifactRef[] }>> =>
    apiCall<{ items: ArtifactRef[] }>(`/api/regulatory-artifacts?q=${encodeURIComponent(q)}&limit=20`, { requireAuth: true }),

  linkArtifact: (id: string, artifactId: string): Promise<ApiResponse<ClauseGraph>> =>
    apiCall<ClauseGraph>(`/api/pending-clauses/${id}/graph/link`, {
      method: 'POST', body: JSON.stringify({ artifactId }), requireAuth: true,
    }),

  createArtifact: (id: string, input: {
    artifactType: string; identifier: string; title: string;
    sourceAuthority: string; sourceUrl?: string | null; summary?: string | null;
  }): Promise<ApiResponse<ClauseGraph>> =>
    apiCall<ClauseGraph>(`/api/pending-clauses/${id}/graph/artifact`, {
      method: 'POST', body: JSON.stringify(input), requireAuth: true,
    }),

  addRelationship: (id: string, input: {
    otherArtifactId: string; relationshipType: string;
    direction: 'outgoing' | 'incoming'; citation: string; description?: string | null;
  }): Promise<ApiResponse<ClauseGraph>> =>
    apiCall<ClauseGraph>(`/api/pending-clauses/${id}/graph/relationships`, {
      method: 'POST', body: JSON.stringify(input), requireAuth: true,
    }),

  removeRelationship: (id: string, relId: string): Promise<ApiResponse<ClauseGraph>> =>
    apiCall<ClauseGraph>(`/api/pending-clauses/${id}/graph/relationships/${relId}`, {
      method: 'DELETE', requireAuth: true,
    }),

  reject: (id: string, notes?: string): Promise<ApiResponse<{ ok: boolean }>> =>
    apiCall(`/api/pending-clauses/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
      requireAuth: true,
    }),
};
