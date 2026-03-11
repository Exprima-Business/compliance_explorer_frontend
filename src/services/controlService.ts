import { apiCall } from './api';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ControlStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'IMPLEMENTED';

export interface ControlFramework {
  id: string;
  name: string;
  version: string;
  description: string | null;
  source_url: string | null;
  clause_id: string | null;
  total_controls: number;
  created_at: string;
  updated_at: string;
}

export interface ControlWithStatus {
  id: string;
  framework_id: string;
  family_id: string;
  identifier: string;
  requirement_text: string;
  discussion_text: string | null;
  requirement_type: 'basic' | 'derived';
  sort_order: number;
  status: ControlStatus;
  evidence_notes: string | null;
}

export interface FamilyWithControls {
  id: string;
  framework_id: string;
  identifier: string;
  name: string;
  sort_order: number;
  control_count: number;
  controls: ControlWithStatus[];
  implemented_count: number;
  in_progress_count: number;
  not_started_count: number;
}

export interface FrameworkWithFamilies extends ControlFramework {
  families: FamilyWithControls[];
}

export interface ReciprocityResult {
  clause_id: string;
  clause_code: string;
  clause_title: string;
  mapping_type: 'all' | 'basic';
  mapping_description: string | null;
  total_required: number;
  implemented: number;
  in_progress: number;
  not_started: number;
  compliance_pct: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// API calls
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchFrameworks(): Promise<ControlFramework[]> {
  const res = await apiCall<ControlFramework[]>('/api/controls/frameworks', {
    requireAuth: true,
  });
  return res.data ?? [];
}

export async function fetchFrameworkWithStatus(
  frameworkId: string
): Promise<FrameworkWithFamilies | null> {
  const res = await apiCall<FrameworkWithFamilies>(
    `/api/controls/frameworks/${frameworkId}`,
    { requireAuth: true }
  );
  return res.data ?? null;
}

export async function updateControlStatus(
  controlId: string,
  status: ControlStatus,
  evidenceNotes?: string | null
): Promise<void> {
  await apiCall(`/api/controls/${controlId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status, evidenceNotes: evidenceNotes ?? null }),
    requireAuth: true,
  });
}

export async function fetchReciprocity(
  frameworkId: string
): Promise<ReciprocityResult[]> {
  const res = await apiCall<ReciprocityResult[]>(
    `/api/controls/frameworks/${frameworkId}/reciprocity`,
    { requireAuth: true }
  );
  return res.data ?? [];
}
