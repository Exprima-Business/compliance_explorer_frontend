import { apiCall } from './api';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ControlStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'IMPLEMENTED' | 'WITHDRAWN';

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
// Framework Activation
// ─────────────────────────────────────────────────────────────────────────────

export interface FrameworkRecommendation {
  framework: ControlFramework;
  triggeringClauses: { clauseId: string; clauseCode: string; clauseTitle: string }[];
  activated: boolean;
}

export async function fetchRecommendedFrameworks(): Promise<FrameworkRecommendation[]> {
  const res = await apiCall<FrameworkRecommendation[]>(
    '/api/controls/recommended-frameworks',
    { requireAuth: true }
  );
  return res.data ?? [];
}

export async function fetchActivatedFrameworks(): Promise<ControlFramework[]> {
  const res = await apiCall<ControlFramework[]>(
    '/api/controls/activated-frameworks',
    { requireAuth: true }
  );
  return res.data ?? [];
}

export async function activateFramework(frameworkId: string): Promise<void> {
  await apiCall(`/api/controls/frameworks/${frameworkId}/activate`, {
    method: 'POST',
    requireAuth: true,
  });
}

export async function deactivateFramework(frameworkId: string): Promise<void> {
  await apiCall(`/api/controls/frameworks/${frameworkId}/activate`, {
    method: 'DELETE',
    requireAuth: true,
  });
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

// ─────────────────────────────────────────────────────────────────────────────
// Assessment Importer (xlsx)
// ─────────────────────────────────────────────────────────────────────────────

export interface AssessmentImportResult {
  objectivesImported: number;
  controlsUpdated: number;
  unmatchedObjectives: string[];
  summary: {
    fullyMet: number;
    partiallyMet: number;
    notMet: number;
  };
  familyBreakdown: Record<string, { total: number; met: number; partial: number; notMet: number }>;
}

export async function importAssessment(file: File, frameworkId: string): Promise<AssessmentImportResult | null> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('frameworkId', frameworkId);

  const res = await apiCall<AssessmentImportResult>('/api/controls/import-assessment', {
    method: 'POST',
    body: formData,
    requireAuth: true,
    timeout: 120_000, // 2 min for large xlsx
  });

  return res.data ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Objective-Level Status
// ─────────────────────────────────────────────────────────────────────────────

export interface ObjectiveStatusEntry {
  objective_id: string;
  identifier: string;
  status: ControlStatus;
  gap_type: string | null;
  justification: string | null;
  remaining_gaps: string | null;
}

/** Keyed by control_id → array of objective statuses */
export type ObjectiveStatusMap = Record<string, ObjectiveStatusEntry[]>;

export async function fetchObjectiveStatuses(controlIds: string[]): Promise<ObjectiveStatusMap> {
  if (controlIds.length === 0) return {};
  const res = await apiCall<ObjectiveStatusMap>(
    `/api/controls/objective-statuses?controlIds=${controlIds.join(',')}`,
    { requireAuth: true }
  );
  return res.data ?? {};
}

export async function updateObjectiveStatus(
  objectiveId: string,
  status: ControlStatus,
  fields?: {
    gap_type?: string | null;
    justification?: string | null;
    evidence_notes?: string | null;
    remaining_gaps?: string | null;
  }
): Promise<void> {
  await apiCall(`/api/controls/objectives/${objectiveId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status, ...fields }),
    requireAuth: true,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SPRS Score & FAR 52.204-21
// ─────────────────────────────────────────────────────────────────────────────

export interface SPRSScore {
  score: number;
  maxScore: number;
  implemented: number;
  notMet: number;
  weight5Met: number;
  weight5Total: number;
  weight3Met: number;
  weight3Total: number;
  weight1Met: number;
  weight1Total: number;
  conditionalCertEligible: boolean;
  details: Array<{ identifier: string; weight: number; met: boolean }>;
}

export interface FARRequirement {
  farSubsection: string;
  farRequirement: string;
  controlIdentifier: string;
  controlTitle: string | null;
  controlId: string | null;
  status: string;
  sprsWeight: number;
}

export interface FARDetail {
  requirements: FARRequirement[];
  summary: { total: number; met: number; notMet: number };
}

export async function fetchSPRSScore(): Promise<SPRSScore | null> {
  const res = await apiCall<SPRSScore>('/api/controls/sprs-score', { requireAuth: true });
  return res.data ?? null;
}

export async function fetchFARDetail(): Promise<FARDetail | null> {
  const res = await apiCall<FARDetail>('/api/controls/far-52-204-21', { requireAuth: true });
  return res.data ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Demo Reset
// ─────────────────────────────────────────────────────────────────────────────

export async function resetDemo(): Promise<{ success: boolean; message: string }> {
  const res = await apiCall<{ success: boolean; message: string }>('/api/demo/reset', {
    method: 'POST',
    requireAuth: true,
  });
  return res.data ?? { success: false, message: 'No response' };
}

// ─────────────────────────────────────────────────────────────────────────────
// Warm-up Ping (fires against public health endpoint to wake Railway)
// ─────────────────────────────────────────────────────────────────────────────

export async function warmUpBackend(): Promise<void> {
  try {
    await apiCall('/api/health', { timeout: 15_000 });
  } catch {
    // Silent — best-effort warm-up
  }
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
