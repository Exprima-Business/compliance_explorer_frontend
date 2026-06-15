import { useQuery } from '@tanstack/react-query';
import { apiCall } from '../services/api';
import { keys } from '../queryClient';
import { useProject } from '../contexts/ProjectContext';

/** Coverage of one authority's slice of the applicable surface. */
export interface CascadeAuthorityPosture {
  authority: string;
  covered: number;
  total: number;
  pct: number;
}

/** Overall coverage posture across the full applicable obligation surface. */
export interface CascadePosture {
  covered: number;
  total: number;
  pct: number;
  byAuthority: CascadeAuthorityPosture[];
}

/** One applicable-but-uncovered obligation (a gap). */
export interface CascadeGap {
  artifactId: string;
  identifier: string;
  title: string;
  artifactType: string;
  sourceAuthority: string;
  hop: number;
  hasMethod: boolean;
}

/** Posture + Gaps for a program. Mirrors the backend CascadeSurface. */
export interface CascadeSurface {
  posture: CascadePosture;
  gaps: CascadeGap[];
}

/**
 * Posture (coverage %) + Gaps (applicable-but-uncovered obligations) for the
 * active program — the cascade dashboard's Posture and Gaps sections. Backed by
 * GET /api/cascade/surface/:programId. Disabled until a program is selected.
 */
export function useCascadeSurface() {
  const { currentProject } = useProject();
  const programId = currentProject?.id;

  return useQuery({
    queryKey: keys.cascadeSurface(programId),
    queryFn: async (): Promise<CascadeSurface> => {
      const res = await apiCall<CascadeSurface>(
        `/api/cascade/surface/${encodeURIComponent(programId!)}`,
        { requireAuth: true },
      );
      if (!res.data) {
        const msg = typeof res.error === 'string' ? res.error : res.error?.message;
        throw new Error(msg || 'Failed to load posture & gaps');
      }
      return res.data;
    },
    enabled: !!programId,
    staleTime: 30_000,
  });
}
