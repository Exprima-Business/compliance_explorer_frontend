import { apiCall } from './api';
import type { ApiResponse } from '../types/api';

// ─────────────────────────────────────────────────────────────────────────────
// Types — mirror BE/src/services/crossFrameworkCreditService.ts
// ─────────────────────────────────────────────────────────────────────────────

export interface CrossFrameworkControlSummary {
  id: string;
  identifier: string;
  title: string;
  framework_id: string;
  framework_name: string;
  framework_short_name: string | null;
}

export interface CrossFrameworkEdge {
  control: CrossFrameworkControlSummary;
  relationship: string;
  source_authority: string | null;
}

export interface CrossFrameworkCredit {
  control: CrossFrameworkControlSummary;
  satisfies: CrossFrameworkEdge[];      // OTHER controls this one credits
  satisfied_by: CrossFrameworkEdge[];   // OTHER controls that would credit this one
}

// ─────────────────────────────────────────────────────────────────────────────
// API
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchCrossFrameworkCredit(
  controlId: string,
): Promise<ApiResponse<CrossFrameworkCredit>> {
  return apiCall<CrossFrameworkCredit>(
    `/api/controls/${encodeURIComponent(controlId)}/cross-framework-credit`,
    { requireAuth: true },
  );
}

export async function fetchCrossFrameworkCounts(
  controlIds: string[],
): Promise<ApiResponse<Record<string, { satisfies: number; satisfied_by: number }>>> {
  return apiCall<Record<string, { satisfies: number; satisfied_by: number }>>(
    '/api/controls/cross-framework-credit/counts',
    {
      method: 'POST',
      body: JSON.stringify({ control_ids: controlIds }),
      requireAuth: true,
    },
  );
}
