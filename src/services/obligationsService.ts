import { apiCall } from './api';
import type { ApiResponse } from '../types/api';

// ─────────────────────────────────────────────────────────────────────────────
// Types — mirror the BE shape from
// Compliance_Explorer_Backend/src/services/obligationsService.ts
// ─────────────────────────────────────────────────────────────────────────────

export type ObligationType =
  | 'attestation'
  | 'action'
  | 'recurring'
  | 'checklist'
  | 'notification';

export type CadenceUnit =
  | 'one_time'
  | 'event_triggered'
  | 'days'
  | 'months'
  | 'years';

export type InstanceStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'overdue'
  | 'waived';

export const OBLIGATION_TYPES: ObligationType[] = [
  'attestation', 'action', 'recurring', 'checklist', 'notification',
];

export const INSTANCE_STATUSES: InstanceStatus[] = [
  'not_started', 'in_progress', 'completed', 'overdue', 'waived',
];

export interface ObligationSourceRef {
  id: string;
  identifier: string;
  title: string;
  artifact_type: string;
}

export interface Obligation {
  id: string;
  obligation_type: ObligationType;
  title: string;
  short_title: string | null;
  description: string | null;
  citation: string | null;
  obligor: string | null;
  obligee: string | null;
  owner_role: string | null;
  source_artifact_id: string | null;
  source: ObligationSourceRef | null;
  cadence_unit: CadenceUnit | null;
  cadence_interval: number | null;
  deadline_offset_hours: number | null;
  initial_due_after_days: number | null;
  checklist_items: Array<{ label: string; description?: string; control_ref?: string }> | null;
  metadata: Record<string, any> | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ObligationInstance {
  id: string;
  obligation_id: string;
  organization_id: string;
  project_id: string | null;
  status: InstanceStatus;
  due_date: string | null;
  triggered_at: string | null;
  completed_at: string | null;
  next_due_date: string | null;
  last_completed_period: string | null;
  evidence_uri: string | null;
  evidence_metadata: Record<string, any> | null;
  completed_by: string | null;
  checklist_state: Record<string, any> | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  obligation?: Obligation;
}

// ─────────────────────────────────────────────────────────────────────────────
// Catalog — /api/obligations
// ─────────────────────────────────────────────────────────────────────────────

export async function listObligations(params: {
  type?: ObligationType;
  owner_role?: string;
  active?: boolean;
} = {}): Promise<ApiResponse<{ items: Obligation[]; total: number }>> {
  const qs = new URLSearchParams();
  if (params.type) qs.set('type', params.type);
  if (params.owner_role) qs.set('owner_role', params.owner_role);
  if (params.active === false) qs.set('active', 'false');
  const suffix = qs.toString();
  return apiCall<{ items: Obligation[]; total: number }>(
    `/api/obligations${suffix ? `?${suffix}` : ''}`,
    { requireAuth: true },
  );
}

export async function getObligation(id: string): Promise<ApiResponse<Obligation>> {
  return apiCall<Obligation>(`/api/obligations/${id}`, { requireAuth: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// Instances — /api/obligations/instances/*
//
// project_id semantics:
//   pass 'null' (the string) to filter to org-wide instances only
//   pass a uuid to filter to that program's instances
//   omit to get all instances for the org
// ─────────────────────────────────────────────────────────────────────────────

export async function listInstances(params: {
  project_id?: string | 'null';
  status?: InstanceStatus;
  due_within_days?: number;
  overdue_only?: boolean;
  limit?: number;
  offset?: number;
} = {}): Promise<ApiResponse<{ items: ObligationInstance[]; total: number }>> {
  const qs = new URLSearchParams();
  if (params.project_id !== undefined) qs.set('project_id', params.project_id);
  if (params.status) qs.set('status', params.status);
  if (params.due_within_days != null) qs.set('due_within_days', String(params.due_within_days));
  if (params.overdue_only) qs.set('overdue_only', 'true');
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.offset) qs.set('offset', String(params.offset));
  const suffix = qs.toString();
  return apiCall<{ items: ObligationInstance[]; total: number }>(
    `/api/obligations/instances/list${suffix ? `?${suffix}` : ''}`,
    { requireAuth: true },
  );
}

export async function getInstance(id: string): Promise<ApiResponse<ObligationInstance>> {
  return apiCall<ObligationInstance>(`/api/obligations/instances/${id}`, { requireAuth: true });
}

export async function createInstance(input: {
  obligation_id: string;
  project_id?: string | null;
  due_date?: string;
  triggered_at?: string;
  notes?: string;
}): Promise<ApiResponse<ObligationInstance>> {
  return apiCall<ObligationInstance>('/api/obligations/instances', {
    method: 'POST',
    body: JSON.stringify(input),
    requireAuth: true,
  });
}

export async function updateInstanceStatus(
  id: string,
  status: InstanceStatus,
  notes?: string,
): Promise<ApiResponse<ObligationInstance>> {
  return apiCall<ObligationInstance>(`/api/obligations/instances/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, notes }),
    requireAuth: true,
  });
}

export async function completeInstance(
  id: string,
  input: {
    evidence_uri?: string;
    evidence_metadata?: Record<string, any>;
    notes?: string;
  } = {},
): Promise<ApiResponse<{ completed: ObligationInstance; next: ObligationInstance | null }>> {
  return apiCall<{ completed: ObligationInstance; next: ObligationInstance | null }>(
    `/api/obligations/instances/${id}/complete`,
    { method: 'POST', body: JSON.stringify(input), requireAuth: true },
  );
}

export async function waiveInstance(
  id: string,
  reason: string,
): Promise<ApiResponse<ObligationInstance>> {
  return apiCall<ObligationInstance>(`/api/obligations/instances/${id}/waive`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
    requireAuth: true,
  });
}
