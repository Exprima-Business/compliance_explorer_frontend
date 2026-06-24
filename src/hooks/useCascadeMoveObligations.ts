/**
 * One obligation a move would clear (drill-in row). The org drill-in comes from
 * useCascadeOrgMoveObligations (GET /api/cascade/org/move/:mechanismTypeId); the
 * legacy program-scoped useCascadeMoveObligations hook was removed in
 * org-baseline FULL-D, but the shared shape lives here.
 */
export interface CascadeMoveObligation {
  artifactId: string;
  identifier: string;
  title: string;
  sourceAuthority: string;
  hop: number;
}
