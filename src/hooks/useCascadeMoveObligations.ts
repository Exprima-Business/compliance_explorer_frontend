import { useQuery } from '@tanstack/react-query';
import { apiCall } from '../services/api';
import { keys } from '../queryClient';
import { useProject } from '../contexts/ProjectContext';

/** One obligation a move would clear (drill-in row). Mirrors the backend shape. */
export interface CascadeMoveObligation {
  artifactId: string;
  identifier: string;
  title: string;
  sourceAuthority: string;
  hop: number;
}

/**
 * The specific obligations a single move (satisfaction mechanism) would clear —
 * the drill-in behind a clickable Move. Lazy: only fetches when `enabled` (i.e.
 * the move is expanded). Backed by GET /api/cascade/move/:programId/:mechanismTypeId.
 */
export function useCascadeMoveObligations(mechanismTypeId: string | null, enabled: boolean) {
  const { currentProject } = useProject();
  const programId = currentProject?.id;

  return useQuery({
    queryKey: keys.cascadeMove(programId, mechanismTypeId ?? undefined),
    queryFn: async (): Promise<CascadeMoveObligation[]> => {
      const res = await apiCall<CascadeMoveObligation[]>(
        `/api/cascade/move/${encodeURIComponent(programId!)}/${encodeURIComponent(mechanismTypeId!)}`,
        { requireAuth: true },
      );
      if (!res.data) {
        const msg = typeof res.error === 'string' ? res.error : res.error?.message;
        throw new Error(msg || 'Failed to load move obligations');
      }
      return res.data;
    },
    enabled: enabled && !!programId && !!mechanismTypeId,
    staleTime: 30_000,
  });
}
