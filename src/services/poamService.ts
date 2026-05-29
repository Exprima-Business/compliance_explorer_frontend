import { apiCall } from './api';
import type { ApiResponse } from '../types/api';

// ─────────────────────────────────────────────────────────────────────────────
// Types — mirror the backend PoamService domain objects (camelCase)
// ─────────────────────────────────────────────────────────────────────────────

// 'critical' added on the BE in migration 066 so auto-created rows
// triggered by a critical finding have a real default-timeline lookup.
export type PoamRiskLevel = 'low' | 'moderate' | 'high' | 'critical';
export type PoamItemStatus = 'open' | 'in_progress' | 'completed' | 'risk_accepted';
export type PoamMilestoneStatus = 'pending' | 'in_progress' | 'complete';

export const RISK_LEVELS: PoamRiskLevel[] = ['low', 'moderate', 'high', 'critical'];
export const ITEM_STATUSES: PoamItemStatus[] = ['open', 'in_progress', 'completed', 'risk_accepted'];
export const MILESTONE_STATUSES: PoamMilestoneStatus[] = ['pending', 'in_progress', 'complete'];

export interface PoamMilestone {
  id: string;
  poamItemId: string;
  description: string;
  targetDate: string | null;
  status: PoamMilestoneStatus;
  completedAt: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PoamItem {
  id: string;
  programId: string;
  controlId: string | null;
  /** Human-readable identifier of the linked control (e.g. "03.01.05"). Null when controlId is null. */
  controlIdentifier: string | null;
  /** Optional link to a specific assessment objective (atomic task grain). */
  objectiveId: string | null;
  /** Human-readable objective identifier (e.g. "DS-AC-02a.01[01]"). Null when objectiveId is null. */
  objectiveIdentifier: string | null;
  weakness: string;
  description: string | null;
  riskLevel: PoamRiskLevel;
  status: PoamItemStatus;
  remediationPlan: string | null;
  responsibleParty: string | null;
  identifiedAt: string | null;
  scheduledCompletion: string | null;
  completedAt: string | null;
  /** True when the platform's auto-POA&M workflow created this row. */
  autoCreated: boolean;
  /** True when the underlying control/objective is now closed; needs reviewer confirmation. */
  readyForClosure: boolean;
  readyForClosureAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  milestones: PoamMilestone[];
}

export interface CreatePoamItemRequest {
  programId: string;
  controlId?: string | null;
  objectiveId?: string | null;
  weakness: string;
  description?: string | null;
  riskLevel?: PoamRiskLevel;
  status?: PoamItemStatus;
  remediationPlan?: string | null;
  responsibleParty?: string | null;
  identifiedAt?: string | null;
  scheduledCompletion?: string | null;
  completedAt?: string | null;
}

export interface UpdatePoamItemRequest {
  controlId?: string | null;
  objectiveId?: string | null;
  weakness?: string;
  description?: string | null;
  riskLevel?: PoamRiskLevel;
  status?: PoamItemStatus;
  remediationPlan?: string | null;
  responsibleParty?: string | null;
  identifiedAt?: string | null;
  scheduledCompletion?: string | null;
  completedAt?: string | null;
}

export interface CreatePoamMilestoneRequest {
  description: string;
  targetDate?: string | null;
  status?: PoamMilestoneStatus;
  completedAt?: string | null;
  sortOrder?: number;
}

export interface UpdatePoamMilestoneRequest {
  description?: string;
  targetDate?: string | null;
  status?: PoamMilestoneStatus;
  completedAt?: string | null;
  sortOrder?: number;
}

/**
 * A control eligible to be linked to a POA&M item — the union of controls
 * belonging to any framework activated for the program.
 */
export interface ControlOption {
  id: string;
  identifier: string;
  title: string | null;
  frameworkId: string;
  frameworkName: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Service — wraps /api/poam (items + milestones)
// ─────────────────────────────────────────────────────────────────────────────

export const poamService = {
  /** List a compliance program's POA&M items (each with its milestones). */
  list: async (programId: string): Promise<ApiResponse<PoamItem[]>> => {
    return apiCall<PoamItem[]>(`/api/poam?programId=${encodeURIComponent(programId)}`, {
      requireAuth: true,
    });
  },

  /** List controls available for linking — the union of activated frameworks. */
  listControlOptions: async (programId: string): Promise<ApiResponse<ControlOption[]>> => {
    return apiCall<ControlOption[]>(
      `/api/poam/control-options?programId=${encodeURIComponent(programId)}`,
      { requireAuth: true },
    );
  },

  /** Fetch a single POA&M item with its milestones. */
  get: async (id: string): Promise<ApiResponse<PoamItem>> => {
    return apiCall<PoamItem>(`/api/poam/${id}`, { requireAuth: true });
  },

  /** Create a POA&M item. */
  create: async (req: CreatePoamItemRequest): Promise<ApiResponse<PoamItem>> => {
    return apiCall<PoamItem>('/api/poam', {
      method: 'POST',
      body: JSON.stringify(req),
      requireAuth: true,
    });
  },

  /** Update a POA&M item (partial). */
  update: async (id: string, req: UpdatePoamItemRequest): Promise<ApiResponse<PoamItem>> => {
    return apiCall<PoamItem>(`/api/poam/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(req),
      requireAuth: true,
    });
  },

  /** Delete a POA&M item (cascades milestones). */
  remove: async (id: string): Promise<ApiResponse<{ deleted: string }>> => {
    return apiCall<{ deleted: string }>(`/api/poam/${id}`, {
      method: 'DELETE',
      requireAuth: true,
    });
  },

  /** Add a milestone to a POA&M item. */
  addMilestone: async (
    itemId: string,
    req: CreatePoamMilestoneRequest,
  ): Promise<ApiResponse<PoamMilestone>> => {
    return apiCall<PoamMilestone>(`/api/poam/${itemId}/milestones`, {
      method: 'POST',
      body: JSON.stringify(req),
      requireAuth: true,
    });
  },

  /** Update a milestone (partial). */
  updateMilestone: async (
    milestoneId: string,
    req: UpdatePoamMilestoneRequest,
  ): Promise<ApiResponse<PoamMilestone>> => {
    return apiCall<PoamMilestone>(`/api/poam/milestones/${milestoneId}`, {
      method: 'PATCH',
      body: JSON.stringify(req),
      requireAuth: true,
    });
  },

  /** Delete a milestone. */
  removeMilestone: async (milestoneId: string): Promise<ApiResponse<{ deleted: string }>> => {
    return apiCall<{ deleted: string }>(`/api/poam/milestones/${milestoneId}`, {
      method: 'DELETE',
      requireAuth: true,
    });
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Display helpers
// ─────────────────────────────────────────────────────────────────────────────

export function riskLabel(r: PoamRiskLevel): string {
  return r === 'low' ? 'Low'
    : r === 'moderate' ? 'Moderate'
    : r === 'high' ? 'High'
    : 'Critical';
}

export function riskColor(r: PoamRiskLevel): 'success' | 'warning' | 'error' {
  return r === 'low' ? 'success'
    : r === 'moderate' ? 'warning'
    : 'error'; // high + critical both render red
}

export function itemStatusLabel(s: PoamItemStatus): string {
  return s === 'open' ? 'Open'
    : s === 'in_progress' ? 'In progress'
    : s === 'completed' ? 'Completed'
    : 'Risk accepted';
}

export function itemStatusColor(s: PoamItemStatus): 'default' | 'info' | 'success' | 'warning' {
  return s === 'open' ? 'warning'
    : s === 'in_progress' ? 'info'
    : s === 'completed' ? 'success'
    : 'default';
}

export function milestoneStatusLabel(s: PoamMilestoneStatus): string {
  return s === 'pending' ? 'Pending'
    : s === 'in_progress' ? 'In progress'
    : 'Complete';
}

export function milestoneStatusColor(s: PoamMilestoneStatus): 'default' | 'info' | 'success' {
  return s === 'pending' ? 'default' : s === 'in_progress' ? 'info' : 'success';
}
