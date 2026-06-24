/**
 * One ranked "move" on the cascade dashboard: a shared satisfaction mechanism
 * (e.g. "Implement Framework Controls") and the applicable-but-unsatisfied
 * obligations it would clear.
 *
 * The org moves come from useCascadeOrgLeverage (GET /api/cascade/org/leverage);
 * the legacy program-scoped useCascadeLeverage hook was removed in org-baseline
 * FULL-D, but the shared CascadeMove shape lives here.
 */
export interface CascadeMove {
  mechanismTypeId: string;
  mechanismLabel: string;
  patternType: string;
  obligationsCleared: number;
  authoritiesCount: number;
  /** Highest clause-risk among the obligations this move clears: High | Medium | Low. */
  riskLevel: string;
  /** How many of the org's scanned solicitations need this action. */
  affectsSolicitations: number;
  /** Task-tracking state rolled up from requirement statuses: Not started | In progress. */
  status: string;
  /** Action-level oversight lead (PM) user id for this move, or null. */
  leadUserId: string | null;
  clearedArtifactIds: string[];
}
