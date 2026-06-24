/**
 * Shared posture-summary shapes. The org summary (useOrgSummary,
 * GET /api/controls/org/summary) returns this same shape; the legacy
 * program-scoped useProjectSummary hook was removed in org-baseline FULL-D,
 * but the shapes live here.
 */
export interface FamilySummary {
  identifier: string;
  name: string;
  total: number;
  /** Applicable count (total minus N/A). Optional for backward compat. */
  applicable?: number;
  notApplicable?: number;
  implemented: number;
  inProgress: number;
  notStarted: number;
  completionPct: number;
}

export interface FrameworkSummary {
  id: string;
  name: string;
  version: string;
  totalControls: number;
  /** Framework-level applicable/N/A counts. Optional for backward compat. */
  applicableControls?: number;
  notApplicable?: number;
  implemented: number;
  inProgress: number;
  notStarted: number;
  completionPct: number;
  objectives?: { fullyMet: number; partiallyMet: number; notMet: number; total: number };
  /** Per-family breakdown — used by the Matrix heatmap. */
  families?: FamilySummary[];
}

export interface ReciprocitySummary {
  clauseCode: string;
  clauseTitle: string;
  implementedPct: number;
  total: number;
  implemented: number;
}

export interface ProjectSummary {
  frameworks: FrameworkSummary[];
  reciprocity: ReciprocitySummary[];
}
