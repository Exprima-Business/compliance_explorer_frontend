import { useQuery } from '@tanstack/react-query';
import { apiCall } from '../services/api';
import { keys } from '../queryClient';
import { useProject } from '../contexts/ProjectContext';

/**
 * One applicable obligation with the raw inputs for FE-derived fractional
 * coverage. Coverage is computed on the client (see obligationCoverage) by
 * combining `explicitSatisfied` + `frameworkIds` with the per-framework
 * completion % from useProjectSummary — so Posture matches Program Readiness.
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

/**
 * The applicable obligation surface for the active program — raw obligations
 * for the cascade dashboard's Posture and Gaps cards (which derive coverage).
 * Backed by GET /api/cascade/surface/:programId.
 */
export function useCascadeSurface() {
  const { currentProject } = useProject();
  const programId = currentProject?.id;

  return useQuery({
    queryKey: keys.cascadeSurface(programId),
    queryFn: async (): Promise<CascadeObligation[]> => {
      const res = await apiCall<CascadeObligation[]>(
        `/api/cascade/surface/${encodeURIComponent(programId!)}`,
        { requireAuth: true },
      );
      if (!res.data) {
        const msg = typeof res.error === 'string' ? res.error : res.error?.message;
        throw new Error(msg || 'Failed to load obligation surface');
      }
      return res.data;
    },
    enabled: !!programId,
    staleTime: 30_000,
  });
}
