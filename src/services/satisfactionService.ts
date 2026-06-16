import { apiCall } from './api';
import type { ApiResponse } from '../types/api';

// ---------------------------------------------------------------------------
// Types — mirror the BE shape (satisfactionMethodService)
// ---------------------------------------------------------------------------

export type SatisfactionStatus =
  | 'not_started'
  | 'in_progress'
  | 'satisfied'
  | 'not_applicable';

export type PatternType =
  | 'binary_action'
  | 'ongoing_obligation'
  | 'conditional_on_event'
  | 'informational';

export interface MechanismTypeSummary {
  id: string;
  typeName: string;
  displayLabel: string;
  patternType: PatternType;
  isAuthoritativeForm: boolean;
  isNegativeSpace: boolean;
}

export interface SatisfactionMethodStatus {
  id: string;
  status: SatisfactionStatus;
  evidenceUrl: string | null;
  evidenceNotes: string | null;
  evidenceUploadedAt: string | null;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  acknowledgmentText: string | null;
  satisfiedAt: string | null;
  validUntil: string | null;
  nextDueAt: string | null;
  notes: string | null;
  /** D-1.4 — per-mechanism JSONB payload (e.g. {name, email, phone}). */
  structuredEvidence?: Record<string, string | number | boolean | null> | null;
  /** Phase B-1 — requirement owner (org member user id), or null if unassigned. */
  ownerUserId: string | null;
  updatedAt: string;
  updatedBy: string | null;
}

export interface SatisfactionMethod {
  id: string;
  clauseId: string;
  mechanismType: MechanismTypeSummary;
  description: string;
  frameworkId: string | null;
  frameworkName: string | null;
  controlId: string | null;
  controlIdentifier: string | null;
  /** Postgres INTERVAL serialized as ISO-8601 duration or "N units" text. */
  recurrenceInterval: string | null;
  responseWindow: string | null;
  /** Per-mechanism config (system_url, form_url, etc.). */
  config: Record<string, unknown> | null;
  /** Methods sharing this group are "pick one of." */
  alternativesGroup: string | null;
  isRequired: boolean;
  /** TRUE = catalog-curated; FALSE = per-org addition. */
  isAuthoritative: boolean;
  sourceAuthorityForLink: string | null;
  organizationId: string | null;
  sortOrder: number;
  /** Per-program status when queried with programId; null otherwise. */
  status: SatisfactionMethodStatus | null;
  /**
   * D-1.2 — TRUE when the method's status is computed by the BE from the
   * linked framework control's status (i.e. user must update the framework
   * control directly, not the method). FE disables status + evidence inputs
   * for these rows.
   */
  computed?: boolean;
}

/**
 * Free-form structured evidence payload. The BE stores this as JSONB; the
 * FE shape varies per mechanism_type (see SatisfactionMethodsPanel for the
 * per-mechanism input forms).
 */
export type StructuredEvidence = Record<string, string | number | boolean | null>;

export interface UpsertStatusRequest {
  programId: string;
  status: SatisfactionStatus;
  evidenceUrl?: string | null;
  evidenceNotes?: string | null;
  acknowledgmentText?: string | null;
  notes?: string | null;
  /** D-1.4 — per-mechanism structured evidence (JSONB on the BE). */
  structuredEvidence?: StructuredEvidence | null;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * Phase C-1 — satisfaction methods wrapper.
 *
 * The BE returns catalog methods + this org's per-org methods + (if
 * programId provided) per-program status as a single flat list. The FE
 * groups them visually by mechanism_type.pattern_type and
 * alternatives_group.
 */
export const satisfactionService = {
  /**
   * List satisfaction methods for a clause, with optional per-program
   * status overlay. The clauseCode is URL-encoded by the apiCall layer.
   */
  listForClause: async (
    clauseCode: string,
    programId?: string | null,
  ): Promise<ApiResponse<SatisfactionMethod[]>> => {
    const qs = programId ? `?programId=${encodeURIComponent(programId)}` : '';
    return apiCall<SatisfactionMethod[]>(
      `/api/satisfaction-methods/by-clause/${encodeURIComponent(clauseCode)}${qs}`,
      { requireAuth: true },
    );
  },

  /**
   * Upsert per-program status for one satisfaction method.
   * Insert if no row exists for (program, method); update otherwise.
   */
  upsertStatus: async (
    methodId: string,
    request: UpsertStatusRequest,
  ): Promise<ApiResponse<SatisfactionMethodStatus>> => {
    return apiCall<SatisfactionMethodStatus>(
      `/api/satisfaction-methods/${methodId}/status`,
      {
        method: 'PUT',
        body: JSON.stringify(request),
        requireAuth: true,
      },
    );
  },

  /**
   * Assign (or clear, with ownerUserId = null) the requirement owner for a
   * method + program. Separate from status — never touches status/evidence.
   */
  setOwner: async (
    methodId: string,
    programId: string,
    ownerUserId: string | null,
  ): Promise<ApiResponse<SatisfactionMethodStatus>> => {
    return apiCall<SatisfactionMethodStatus>(
      `/api/satisfaction-methods/${methodId}/owner`,
      {
        method: 'PUT',
        body: JSON.stringify({ programId, ownerUserId }),
        requireAuth: true,
      },
    );
  },
};
