/**
 * One applicable obligation with the raw inputs for FE-derived fractional
 * coverage (see obligationCoverage). Shared by the org cascade hooks
 * (useCascadeOrg) and the Posture/Gaps/CommandCenter views.
 *
 * The legacy program-scoped `useCascadeSurface` hook was removed in
 * org-baseline FULL-D — the obligation surface now comes from the org cascade
 * (useCascadeOrgSurface, GET /api/cascade/org/surface).
 */
export interface CascadeObligation {
  artifactId: string;
  identifier: string;
  title: string;
  artifactType: string;
  sourceAuthority: string;
  hop: number;
  explicitSatisfied: boolean;
  frameworkIds: string[];
}

/**
 * Fractional coverage (0–100) for one obligation, given a map of
 * framework id → completion %. Explicitly-satisfied obligations are 100%;
 * otherwise the obligation inherits the highest completion % among the
 * activated frameworks that satisfy it (control implementation → coverage).
 */
export function obligationCoverage(
  o: CascadeObligation,
  fwPct: Record<string, number>,
): number {
  if (o.explicitSatisfied) return 100;
  let best = 0;
  for (const id of o.frameworkIds) best = Math.max(best, fwPct[id] ?? 0);
  return best;
}
