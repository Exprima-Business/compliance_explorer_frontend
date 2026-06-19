import { useQuery } from '@tanstack/react-query';
import { apiCall } from '../services/api';
import { keys } from '../queryClient';
import { useOrg } from '../contexts/OrgContext';
import type { CascadeObligation } from './useCascadeSurface';
import type { CascadeMove } from './useCascadeLeverage';
import type { CascadeMoveObligation } from './useCascadeMoveObligations';

/**
 * Org-wide cascade hooks — the org BASELINE surface + moves (org_frameworks +
 * org_scoped_clauses), not a single program. Backed by the org-scoped cascade
 * routes (GET /api/cascade/org/*). Org comes from the request context server-
 * side; the current org id is only used here for cache-key correctness.
 *
 * Shapes are identical to the program-scoped hooks (CascadeObligation /
 * CascadeMove / CascadeMoveObligation), so the existing dashboard components
 * render org data unchanged. Caveat: getOrgLeverage stubs affectsSolicitations
 * (0) and leadUserId (null) for now — see cascadeService.
 */

/** Org-wide Posture + Gaps (the obligation surface across the org baseline). */
export function useCascadeOrgSurface() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;
  return useQuery({
    queryKey: keys.cascadeOrgSurface(orgId),
    queryFn: async (): Promise<CascadeObligation[]> => {
      const res = await apiCall<CascadeObligation[]>('/api/cascade/org/surface', { requireAuth: true });
      if (!res.data) {
        const msg = typeof res.error === 'string' ? res.error : res.error?.message;
        throw new Error(msg || 'Failed to load org obligation surface');
      }
      return res.data;
    },
    enabled: !!orgId,
    staleTime: 30_000,
  });
}

/** Org-wide ranked Moves. */
export function useCascadeOrgLeverage() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;
  return useQuery({
    queryKey: keys.cascadeOrgLeverage(orgId),
    queryFn: async (): Promise<CascadeMove[]> => {
      const res = await apiCall<CascadeMove[]>('/api/cascade/org/leverage', { requireAuth: true });
      if (!res.data) {
        const msg = typeof res.error === 'string' ? res.error : res.error?.message;
        throw new Error(msg || 'Failed to load org cascade leverage');
      }
      return res.data;
    },
    enabled: !!orgId,
    staleTime: 30_000,
  });
}

/** The obligations a single org-wide move would clear (drill-in). Lazy. */
export function useCascadeOrgMoveObligations(mechanismTypeId: string | null, enabled: boolean) {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;
  return useQuery({
    queryKey: keys.cascadeOrgMove(orgId, mechanismTypeId ?? undefined),
    queryFn: async (): Promise<CascadeMoveObligation[]> => {
      const res = await apiCall<CascadeMoveObligation[]>(
        `/api/cascade/org/move/${encodeURIComponent(mechanismTypeId!)}`,
        { requireAuth: true },
      );
      if (!res.data) {
        const msg = typeof res.error === 'string' ? res.error : res.error?.message;
        throw new Error(msg || 'Failed to load org move obligations');
      }
      return res.data;
    },
    enabled: enabled && !!orgId && !!mechanismTypeId,
    staleTime: 30_000,
  });
}
