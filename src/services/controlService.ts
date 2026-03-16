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

export interface ControlObjective {
  id: string;
  control_id: string;
  identifier: string;
  description: string;
  sort_order: number;
}

export interface ControlWithStatus {
  id: string;
  framework_id: string;
  family_id: string;
  identifier: string;
  title: string | null;
  requirement_text: string | null;
  discussion_text: string | null;
  requirement_type: 'basic' | 'derived' | 'active' | 'withdrawn';
  is_withdrawn: boolean;
  sort_order: number;
  status: ControlStatus;
  evidence_notes: string | null;
  objectives?: ControlObjective[];
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

// ─────────────────────────────────────────────────────────────────────────────
// SSP Parser
// ─────────────────────────────────────────────────────────────────────────────

export interface SSPAssessmentResult {
  controlIdentifier: string;
  status: ControlStatus;
  evidenceNotes: string;
  confidence: number;
  matched: boolean;
}

export interface SSPParseResult {
  fileName: string;
  totalAssessments: number;
  matchedControls: number;
  unmatchedControls: number;
  appliedToProject: number;
  assessments: SSPAssessmentResult[];
  summary: {
    implemented: number;
    inProgress: number;
    notStarted: number;
  };
}

export async function parseSSPDocument(file: File, autoApply = true): Promise<SSPParseResult | null> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('autoApply', autoApply ? 'true' : 'false');

  const res = await apiCall<SSPParseResult>('/api/controls/parse-ssp', {
    method: 'POST',
    body: formData,
    requireAuth: true,
    timeout: 180_000, // 3 min — SSP parsing involves AI enrichment
  });

  return res.data ?? null;
}
