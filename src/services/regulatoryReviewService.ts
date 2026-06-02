import { apiCall } from './api';
import type { ApiResponse } from '../types/api';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type RelationshipType =
  | 'cites' | 'incorporates_by_reference' | 'derived_from' | 'flows_down_to'
  | 'mandates' | 'implements' | 'supersedes' | 'amends' | 'codified_in'
  | 'created_by' | 'extension_of';

export type CandidateStatus = 'pending' | 'accepted' | 'rejected' | 'needs_context';
export type ExtractionMethod = 'regex' | 'llm' | 'manual' | 'imported';

export const RELATIONSHIP_TYPES: RelationshipType[] = [
  'cites', 'incorporates_by_reference', 'derived_from', 'flows_down_to',
  'mandates', 'implements', 'supersedes', 'amends', 'codified_in',
  'created_by', 'extension_of',
];

export interface CandidateArtifactRef {
  id: string;
  artifact_type: string;
  identifier: string;
  title: string;
  source_authority: string;
}

export interface RelationshipCandidate {
  id: string;
  source_artifact_id: string;
  target_artifact_id: string;
  suggested_relationship_type: RelationshipType;
  source_paragraph: string;
  source_authority_for_link: string | null;
  description: string | null;
  extraction_method: ExtractionMethod;
  extraction_confidence: number;
  extractor_metadata: Record<string, any> | null;
  status: CandidateStatus;
  reviewer_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  resulting_relationship_id: string | null;
  created_at: string;
  source: CandidateArtifactRef;
  target: CandidateArtifactRef;
  auto_proposed_type?: string | null;
  auto_proposed_notes?: string | null;
  auto_proposed_confidence?: number | null;
  auto_proposed_at?: string | null;
  auto_proposed_by?: string | null;
}

export interface CandidatesListResponse {
  items: RelationshipCandidate[];
  total: number;
  statusCounts: Record<CandidateStatus, number>;
}

// ─────────────────────────────────────────────────────────────────────────────
// API
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchCandidates(params: {
  status?: CandidateStatus;
  method?: ExtractionMethod;
  limit?: number;
  offset?: number;
} = {}): Promise<ApiResponse<CandidatesListResponse>> {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.method) qs.set('method', params.method);
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.offset) qs.set('offset', String(params.offset));
  const suffix = qs.toString();
  return apiCall<CandidatesListResponse>(
    `/api/regulatory-review/candidates${suffix ? `?${suffix}` : ''}`,
    { requireAuth: true },
  );
}

export async function acceptCandidate(
  id: string,
  params: {
    relationship_type?: RelationshipType;
    source_authority_for_link?: string;
    description?: string;
    reviewer_notes?: string;
  } = {},
): Promise<ApiResponse<{ candidate: RelationshipCandidate; relationship_id: string }>> {
  return apiCall(`/api/regulatory-review/candidates/${id}/accept`, {
    method: 'POST',
    body: JSON.stringify(params),
    requireAuth: true,
  });
}

export async function rejectCandidate(
  id: string,
  reviewer_notes: string,
): Promise<ApiResponse<RelationshipCandidate>> {
  return apiCall(`/api/regulatory-review/candidates/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reviewer_notes }),
    requireAuth: true,
  });
}

export async function parkCandidate(
  id: string,
  reviewer_notes: string,
): Promise<ApiResponse<RelationshipCandidate>> {
  return apiCall(`/api/regulatory-review/candidates/${id}/park`, {
    method: 'POST',
    body: JSON.stringify({ reviewer_notes }),
    requireAuth: true,
  });
}

export async function bulkSetProposals(
  proposals: Array<{
    candidate_id: string;
    proposed_type: string;
    notes: string;
    confidence: number;
    proposed_by: string;
  }>,
): Promise<ApiResponse<{ updated: number; skipped: string[] }>> {
  return apiCall(`/api/regulatory-review/candidates/bulk-propose`, {
    method: 'POST',
    body: JSON.stringify({ proposals }),
    requireAuth: true,
  });
}

/**
 * Trigger the in-app AI proposer (server-side OpenAI call grounded in
 * RELATIONSHIP_TYPE_GLOSSARY.md). Processes up to `limit` oldest pending
 * candidates (or the explicit `candidateIds` if provided). Reviewer-gated.
 *
 * Cost note: ~$0.0003 per candidate at gpt-4o-mini, so a full 50-batch is
 * ~$0.015. The BE caps limit at 50 per call.
 */
export async function runAiProposals(
  body: { limit?: number; candidate_ids?: string[] } = {},
): Promise<ApiResponse<{
  fetched: number;
  proposed: number;
  failed: number;
  skipped: string[];
  errors: Array<{ candidateId: string; message: string }>;
}>> {
  return apiCall(`/api/regulatory-review/candidates/run-ai-proposals`, {
    method: 'POST',
    body: JSON.stringify(body),
    requireAuth: true,
  });
}
