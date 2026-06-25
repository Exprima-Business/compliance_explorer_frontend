import { apiCall } from './api';
import type { ApiResponse } from '../types/api';

// ---------------------------------------------------------------------------
// Types — mirror the backend solicitationEvaluationService domain objects
// ---------------------------------------------------------------------------

export type CoverageStatus = 'covered' | 'gap' | 'unknown';
export type EvaluationStatus = 'evaluated' | 'go' | 'no_go' | 'archived';

/**
 * Phase B-1.5: intent classification of a detected clause. AI-assigned then
 * deterministically overridden by clauseCategoryOverride on the BE for
 * known-compliance families/patterns. NULL on pre-B-1.5 rows; the FE
 * treats NULL as 'compliance' so legacy data is never silently hidden
 * from the default sort.
 */
export type ClauseCategory = 'compliance' | 'procurement' | 'informational';

export interface CoverageSummary {
  detected: number;
  covered: number;
  gaps: number;
  unknown: number;
}

export interface EvaluationClause {
  id: string;
  evaluationId: string;
  /** UUID FK to clauses; null for scanner-detected clauses not in our DB */
  clauseId: string | null;
  clauseCode: string | null;
  title: string | null;
  confidence: number | null;
  coverageStatus: CoverageStatus;
  /**
   * Live completion (0-100) of the framework this clause resolves to, or
   * null when it maps to no tracked framework / is not in our catalog.
   */
  completionPct: number | null;
  /** Phase B-1.5 — see ClauseCategory. NULL = treat as 'compliance' on display. */
  category: ClauseCategory | null;
  /** Phase B-1.5 — verbatim 50-300 char excerpt from the source document. */
  supportingContext: string | null;
}

/**
 * A framework the evaluation's detected clauses imply, with the program's
 * live completion against it. A non-activated framework still appears (0%) —
 * it remains a requirement the solicitation introduces.
 *
 * Phase B-2 added doc-scoped fields. The user wants to see BOTH:
 *   - "100% Section 508 (3 of 3 implicated controls implemented)" → doc-scoped
 *   - "Overall: 100% (3 of 3)" → framework-wide context
 */
export interface RequiredFramework {
  id: string;
  name: string;
  version: string;
  activated: boolean;
  // Framework-wide stats
  totalControls: number;
  /** Controls explicitly marked IMPLEMENTED */
  implementedControls: number;
  /** Additional controls satisfied only via a cross-framework crosswalk */
  crosswalkCredited: number;
  completionPct: number;
  // Doc-scoped stats (controls implicated by THIS evaluation's clauses)
  controlsImplicatedByDoc: number;
  controlsImplementedFromImplicated: number;
  docScopedCompletionPct: number;
}

/**
 * One control implicated by an evaluation clause, with its current
 * implementation state in the program.
 */
export interface ImplicatedControl {
  id: string;
  identifier: string;
  name: string | null;
  frameworkId: string;
  frameworkName: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'IMPLEMENTED' | 'NOT_APPLICABLE' | null;
  satisfiedViaCrosswalk: boolean;
}

/**
 * One obligation the solicitation TRIGGERS through the regulatory graph but
 * does not literally name — e.g. naming DFARS 252.204-7012 also pulls in NIST
 * SP 800-171, which mandates FIPS 140 / SP 800-63 / SP 800-88. The "you didn't
 * know you owed this" surface. Backed by the get_evaluation_triggered_obligations
 * SQL function (BE migration 126).
 */
export interface TriggeredObligation {
  artifactId: string;
  artifactType: string;
  identifier: string;
  title: string | null;
  sourceAuthority: string;
  /** Edge type that surfaced it: incorporates_by_reference | mandates | flows_down_to */
  via: string;
  /** Identifier of the in-document clause this derives from — the citation that
   *  keeps the document authoritative (null only for named rows). */
  viaNamedClause: string | null;
  /** Hops from a named clause (>= 1). */
  hop: number;
}

export interface SolicitationEvaluation {
  id: string;
  organizationId: string;
  programId: string | null;
  scanId: string | null;
  title: string;
  solicitationNumber: string | null;
  agency: string | null;
  responseDueDate: string | null;
  status: EvaluationStatus;
  coverageSummary: CoverageSummary;
  createdAt: string;
  updatedAt: string;
}

export interface EvaluationDetail {
  evaluation: SolicitationEvaluation;
  clauses: EvaluationClause[];
  /** Frameworks the detected clauses imply, with live completion. */
  frameworks: RequiredFramework[];
  /**
   * Per-clause control roster: keyed by EvaluationClause.clauseId (the
   * matched-clause UUID). Unmatched clauses (clauseId === null) have no
   * entry. May be {} when the eval has no program scope.
   */
  controlsByClauseId: Record<string, ImplicatedControl[]>;
  /**
   * Per-opportunity cascade: obligations triggered via the regulatory graph
   * beyond the literally-detected clauses. Empty when nothing cascades.
   */
  triggeredObligations: TriggeredObligation[];
}

export interface CreateEvaluationRequest {
  scanId: string;
  /** Optional — when set, coverage is computed against this program */
  programId?: string;
  title?: string;
  solicitationNumber?: string;
  agency?: string;
  /** ISO date string */
  responseDueDate?: string;
}

export interface ApplyResult {
  appliedMatched: number;
  appliedScanDetected: number;
  bookmarksCreated: number;
}

/** Result of adding user-selected matched clauses to the org baseline. */
export interface ApplyToOrgBaselineResult {
  added: number;
  skippedUnmatched: number;
}

/**
 * Phase B-3 — result of the bulk POA&M creation workflow.
 *   created          — POA&Ms inserted this call
 *   skipped_duplicate— gaps whose source_evaluation_clause_id already had a
 *                      POA&M (re-running is a no-op)
 *   failed           — individual rows that errored on insert (rest of batch
 *                      continued)
 *   total_gaps       — gap clauses considered (created + skipped + failed)
 *   poam_ids         — UUIDs of the newly created rows for UI navigation
 */
export interface CreatePoamsFromGapsResult {
  created: number;
  skipped_duplicate: number;
  failed: number;
  total_gaps: number;
  poam_ids: string[];
}

// ---------------------------------------------------------------------------
// Service — wraps the /api/solicitation-evaluations endpoints (036e)
// ---------------------------------------------------------------------------

export const evaluationService = {
  /**
   * Create a saved solicitation evaluation from a completed scan.
   *
   * Phase B-1.5 timeout bump: this endpoint runs clause-by-clause
   * normalized matching against the catalog for every detected clause —
   * the Autoimmune RFP smoke test measured 30-50 s wall-clock for 147
   * clauses, well over the apiCall default 30 s. Bump matches the
   * AI-proposer (which has the same long-tail BE work) and is well
   * under the Vercel edge function ceiling. If a future test consistently
   * exceeds 120 s, batch the validation in `scanValidationService` rather
   * than bump further — UX-wise 120s is already the upper bound for a
   * "saving…" spinner.
   */
  create: async (
    request: CreateEvaluationRequest,
  ): Promise<ApiResponse<EvaluationDetail>> => {
    return apiCall<EvaluationDetail>('/api/solicitation-evaluations', {
      method: 'POST',
      body: JSON.stringify(request),
      requireAuth: true,
      timeout: 120_000,
    });
  },

  /** List the org's solicitation evaluations (newest first). */
  list: async (): Promise<ApiResponse<SolicitationEvaluation[]>> => {
    return apiCall<SolicitationEvaluation[]>('/api/solicitation-evaluations', {
      requireAuth: true,
    });
  },

  /** Fetch one evaluation with its clause rows. */
  get: async (id: string): Promise<ApiResponse<EvaluationDetail>> => {
    return apiCall<EvaluationDetail>(`/api/solicitation-evaluations/${id}`, {
      requireAuth: true,
    });
  },

  /** Delete an evaluation and its clauses (the data-deletion promise). */
  remove: async (id: string): Promise<ApiResponse<{ deleted: boolean }>> => {
    return apiCall<{ deleted: boolean }>(`/api/solicitation-evaluations/${id}`, {
      method: 'DELETE',
      requireAuth: true,
    });
  },

  /**
   * Apply selected evaluation clauses into a compliance program — the
   * additive bridge. Writes the clauses into the program's matrix +
   * bookmarks; the evaluation record itself is unchanged.
   */
  apply: async (
    evaluationId: string,
    programId: string,
    evaluationClauseIds: string[],
  ): Promise<ApiResponse<ApplyResult>> => {
    return apiCall<ApplyResult>(`/api/solicitation-evaluations/${evaluationId}/apply`, {
      method: 'POST',
      body: JSON.stringify({ programId, evaluationClauseIds }),
      requireAuth: true,
    });
  },

  /**
   * Org-baseline (human-in-the-loop): add the user-SELECTED matched clauses to
   * the organization's standing baseline (org_scoped_clauses). Only clauses with
   * a real catalog id are added; selected not-in-catalog rows are skipped here
   * (submit those for curation via pendingClauseService instead).
   */
  applyToOrgBaseline: async (
    evaluationId: string,
    evaluationClauseIds: string[],
  ): Promise<ApiResponse<ApplyToOrgBaselineResult>> => {
    return apiCall<ApplyToOrgBaselineResult>(
      `/api/solicitation-evaluations/${evaluationId}/apply-to-org-baseline`,
      {
        method: 'POST',
        body: JSON.stringify({ evaluationClauseIds }),
        requireAuth: true,
      },
    );
  },

  /**
   * Phase B-3 — bulk-create POA&M items for every gap clause in this
   * evaluation. Idempotent: re-running for the same evaluation creates
   * nothing new (each row deduped via source_evaluation_clause_id).
   *
   * Timeout matches `create` — bulk insert + per-row audit log can be slow
   * on evals with many gaps (Autoimmune RFP had 126 unknowns; a similarly-
   * sized gap set would be on the same order). 120 s is the same upper
   * bound rationale as the eval-create endpoint.
   */
  createPoamsFromGaps: async (
    evaluationId: string,
    frameworkId?: string | null,
  ): Promise<ApiResponse<CreatePoamsFromGapsResult>> => {
    return apiCall<CreatePoamsFromGapsResult>(
      `/api/solicitation-evaluations/${evaluationId}/create-poams-from-gaps`,
      {
        method: 'POST',
        body: JSON.stringify({ frameworkId: frameworkId ?? null }),
        requireAuth: true,
        timeout: 120_000,
      },
    );
  },
};
