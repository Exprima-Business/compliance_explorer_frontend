import { apiCall } from './api';
import type { ApiResponse } from '../types/api';

// ─────────────────────────────────────────────────────────────────────────────
// Types — mirror the backend regulatoryArtifacts response shape
// ─────────────────────────────────────────────────────────────────────────────

export interface RegulatoryArtifactListItem {
  id: string;
  artifact_type: string;
  identifier: string;
  citation: string | null;
  title: string;
  version: string | null;
  source_authority: string;
  source_url: string | null;
  summary: string | null;
}

export interface RegulatoryArtifactsResponse {
  items: RegulatoryArtifactListItem[];
  total: number;
  types: Array<{ artifact_type: string; count: number }>;
}

export interface ListArtifactsParams {
  type?: string;
  q?: string;
  limit?: number;
  offset?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchRegulatoryArtifacts(
  params: ListArtifactsParams = {},
): Promise<ApiResponse<RegulatoryArtifactsResponse>> {
  const search = new URLSearchParams();
  if (params.type) search.set('type', params.type);
  if (params.q) search.set('q', params.q);
  if (params.limit) search.set('limit', String(params.limit));
  if (params.offset) search.set('offset', String(params.offset));
  const qs = search.toString();
  return apiCall<RegulatoryArtifactsResponse>(
    `/api/regulatory-artifacts${qs ? `?${qs}` : ''}`,
    { requireAuth: true },
  );
}
