import { apiCall } from './api';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Per-framework status value. The legacy NIST union is preserved as the
 * default vocabulary, but Section 508 (SUPPORTS/...), CMMC (adds MET), and
 * HIPAA (adds ALTERNATIVE_IMPLEMENTED) all introduce additional values via
 * framework_status_config. Use the framework's `status_config` array to
 * render the picker rather than assuming this union.
 */
export type ControlStatus =
  | 'NOT_STARTED' | 'IN_PROGRESS' | 'IMPLEMENTED' | 'WITHDRAWN'
  | 'SUPPORTS' | 'PARTIALLY_SUPPORTS' | 'DOES_NOT_SUPPORT' | 'NOT_APPLICABLE'
  | 'NOT_IMPLEMENTED' | 'PARTIALLY_IMPLEMENTED' | 'MET'
  | 'ALTERNATIVE_IMPLEMENTED'
  | string; // open-ended for future frameworks; validation lives in framework_status_config

/** A single allowed status value for a framework, sourced from framework_status_config. */
export interface FrameworkStatusOption {
  status_value: string;
  display_label: string;
  display_color: string | null;
  is_completed: boolean;
  ordinal: number;
}

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
  /**
   * Mig 105. Verbatim "Examine [SELECT FROM: ...]" assessment-object list
   * from the control's official assessment publication (SP 800-171A r3,
   * CMMC Assessment Guides). Semicolon-separated evidence items. NULL when
   * no authoritative Examine list is loaded for this control.
   */
  assessment_examine?: string | null;
  requirement_type: 'basic' | 'derived' | 'active' | 'withdrawn';
  is_withdrawn: boolean;
  sort_order: number;
  status: ControlStatus;
  evidence_notes: string | null;
  objectives?: ControlObjective[];
  /** True when not directly IMPLEMENTED but credited via a strict cross-framework derivation (e.g. 800-171 ← 800-53). */
  crosswalk_satisfied?: boolean;
  /**
   * True when not directly IMPLEMENTED and not crosswalk_satisfied, but at
   * least one informative-reference target (NIST-published mapping like
   * SSDF→800-53) IS implemented. Renders as a "supported by X" chip — does
   * NOT count as fully complete. Audit-safe: we never claim satisfaction
   * for informative references.
   */
  crosswalk_supported?: boolean;
  /** DoD baseline ODPs for this control (currently 800-171 Rev 3 only). */
  odps?: ControlOdp[];
}

/**
 * An Organization-Defined Parameter and its authoritative DoD baseline.
 * Used to render guidance on each control ("DoD baseline — meet or exceed").
 */
export interface ControlOdp {
  id: string;
  control_id: string;
  odp_identifier: string;
  assignment_text: string | null;
  odp_type: 'value' | 'selection' | 'guidance';
  dod_baseline_value: string | null;
  source_authority: string | null;
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
  /**
   * Per-framework status vocabulary used by the picker and completion-% logic.
   * Defaults to legacy NIST 3-state set if the framework has no config rows.
   */
  status_config: FrameworkStatusOption[];
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

/**
 * Updates a control's status. The BE (control.ts updateControlStatus) rejects
 * status='IMPLEMENTED' without evidence_notes OR structured_evidence with a
 * 400 EVIDENCE_REQUIRED error, and requires justification (evidence_notes)
 * for NOT_APPLICABLE. The FE wraps these flows in the EvidenceModal in
 * Controls.tsx so the user never sees a raw 400.
 *
 * `evidenceUrl` is an optional URL pointing to supporting evidence (doc,
 * screenshot, etc.) — the BE persists it alongside the notes.
 *
 * Throws on any BE error so callers can render the message inline.
 */
export async function updateControlStatus(
  controlId: string,
  status: ControlStatus,
  evidenceNotes?: string | null,
  evidenceUrl?: string | null,
): Promise<void> {
  const res = await apiCall(`/api/controls/${controlId}/status`, {
    method: 'PUT',
    body: JSON.stringify({
      status,
      evidenceNotes: evidenceNotes ?? null,
      evidenceUrl: evidenceUrl ?? null,
    }),
    requireAuth: true,
  });
  if (res.error) {
    // ApiResponse.error is `ApiError | string | null` — coerce both shapes
    // into a clean message string for callers (mainly the EvidenceModal).
    const message = typeof res.error === 'string'
      ? res.error
      : res.error.message || 'Failed to update control status';
    throw new Error(message);
  }
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
// Applicability scoping (Section 508 wizard)
// ─────────────────────────────────────────────────────────────────────────────

/** Wizard answers — condition key (hardware, software_ui, etc.) → boolean. */
export type ScopingAnswers = Record<string, boolean>;

export interface ProgramScoping {
  programId: string;
  frameworkId: string;
  answers: ScopingAnswers;
  updatedAt: string;
  updatedBy: string | null;
}

export interface ControlApplicability {
  controlId: string;
  applicable: boolean;
  source: string | null;
}

export interface ScopingResponse {
  scoping: ProgramScoping | null;
  applicability: ControlApplicability[];
}

export interface ScopingApplyResult {
  totalControls: number;
  nowApplicable: number;
  nowNotApplicable: number;
  statusPreserved: number;
}

/** Read saved wizard answers + the computed per-control applicability set. */
export async function fetchScoping(frameworkId: string): Promise<ScopingResponse | null> {
  const res = await apiCall<ScopingResponse>(
    `/api/controls/frameworks/${frameworkId}/scoping`,
    { requireAuth: true },
  );
  return res.data ?? null;
}

/** Save wizard answers (no status side-effects — call applyScoping next). */
export async function saveScoping(
  frameworkId: string,
  answers: ScopingAnswers,
): Promise<ProgramScoping | null> {
  const res = await apiCall<ProgramScoping>(
    `/api/controls/frameworks/${frameworkId}/scoping`,
    {
      method: 'PUT',
      body: JSON.stringify({ answers }),
      requireAuth: true,
    },
  );
  return res.data ?? null;
}

/** Recompute applicability and materialise status changes (non-destructive). */
export async function applyScoping(frameworkId: string): Promise<ScopingApplyResult | null> {
  const res = await apiCall<ScopingApplyResult>(
    `/api/controls/frameworks/${frameworkId}/scoping/apply`,
    {
      method: 'POST',
      requireAuth: true,
    },
  );
  return res.data ?? null;
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

// ── Org-tier framework activation (org-baseline). Org comes from session
// context; these hit the /api/controls/org/* routes. ─────────────────────────

export async function fetchActivatedFrameworksOrg(): Promise<ControlFramework[]> {
  const res = await apiCall<ControlFramework[]>('/api/controls/org/activated-frameworks', {
    requireAuth: true,
  });
  return res.data ?? [];
}

export async function activateFrameworkOrg(frameworkId: string): Promise<void> {
  await apiCall(`/api/controls/org/frameworks/${frameworkId}/activate`, {
    method: 'POST',
    requireAuth: true,
  });
}

export async function deactivateFrameworkOrg(frameworkId: string): Promise<void> {
  await apiCall(`/api/controls/org/frameworks/${frameworkId}/activate`, {
    method: 'DELETE',
    requireAuth: true,
  });
}

// ── Org-tier control reads/writes (org-baseline). Org from session context;
// these hit /api/controls/org/*. The Controls page imports them aliased to the
// program names so its body is unchanged. ────────────────────────────────────

export async function fetchFrameworkWithStatusOrg(frameworkId: string): Promise<FrameworkWithFamilies | null> {
  const res = await apiCall<FrameworkWithFamilies>(`/api/controls/org/frameworks/${frameworkId}`, { requireAuth: true });
  return res.data ?? null;
}

export async function fetchReciprocityOrg(frameworkId: string): Promise<ReciprocityResult[]> {
  const res = await apiCall<ReciprocityResult[]>(`/api/controls/org/frameworks/${frameworkId}/reciprocity`, { requireAuth: true });
  return res.data ?? [];
}

export async function updateControlStatusOrg(
  controlId: string,
  status: ControlStatus,
  evidenceNotes?: string | null,
  _evidenceUrl?: string | null,
): Promise<void> {
  const res = await apiCall(`/api/controls/org/${controlId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status, evidenceNotes: evidenceNotes ?? null }),
    requireAuth: true,
  });
  if (res.error) {
    const message = typeof res.error === 'string'
      ? res.error
      : res.error.message || 'Failed to update control status';
    throw new Error(message);
  }
}

export async function fetchObjectiveStatusesOrg(controlIds: string[]): Promise<ObjectiveStatusMap> {
  if (controlIds.length === 0) return {};
  const res = await apiCall<ObjectiveStatusMap>(
    `/api/controls/org/objective-statuses?controlIds=${controlIds.join(',')}`,
    { requireAuth: true },
  );
  return res.data ?? {};
}

export async function updateObjectiveStatusOrg(
  objectiveId: string,
  status: ControlStatus,
  fields?: {
    gap_type?: string | null;
    justification?: string | null;
    evidence_notes?: string | null;
    remaining_gaps?: string | null;
  },
): Promise<void> {
  await apiCall(`/api/controls/org/objectives/${objectiveId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status, ...fields }),
    requireAuth: true,
  });
}

// ── Org scope: secondary panels deferred. SPRS/FAR computation, Section 508
// applicability, and the SSP/xlsx parsers are still program-scoped. These
// stubs return empty so the org Controls page renders cleanly; tracked
// follow-up to give each an org variant. ─────────────────────────────────────

export async function fetchSPRSScoreOrg(): Promise<SPRSScore | null> { return null; }
export async function fetchFARDetailOrg(): Promise<FARDetail | null> { return null; }
export async function fetchRecommendedFrameworksOrg(): Promise<FrameworkRecommendation[]> { return []; }
export async function fetchScopingOrg(_frameworkId: string): Promise<ScopingResponse | null> { return null; }
export async function parseSSPDocumentOrg(_file: File, _autoApply = true): Promise<SSPParseResult | null> { return null; }
export async function importAssessmentOrg(file: File, frameworkId: string): Promise<AssessmentImportResult | null> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('frameworkId', frameworkId);

  const res = await apiCall<AssessmentImportResult>('/api/controls/org/import-assessment', {
    method: 'POST',
    body: formData,
    requireAuth: true,
    timeout: 120_000, // 2 min for large xlsx
  });

  return res.data ?? null;
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
