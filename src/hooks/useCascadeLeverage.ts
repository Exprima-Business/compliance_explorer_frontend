import { useQuery } from '@tanstack/react-query';
import { apiCall } from '../services/api';
import { keys } from '../queryClient';
import { useProject } from '../contexts/ProjectContext';

/**
 * One ranked "move" on the cascade dashboard: a shared satisfaction mechanism
 * (e.g. "Implement Framework Controls") and the applicable-but-unsatisfied
 * obligations it would clear. Shape mirrors the backend CascadeMove
 * (GET /api/cascade/leverage/:programId, fn get_cascade_leverage / mig 131).
 */
export interface CascadeMove {
  mechanismTypeId: string;
  mechanismLabel: string;
  patternType: string;
  obligationsCleared: number;
  authoritiesCount: number;
  clearedArtifactIds: string[];
}

/**
 * Ranked cascade-leverage "moves" for the active compliance program — the
 * dashboard's Moves list. Disabled until a program is selected.
 */
export function useCascadeLeverage() {
  const { currentProject } = useProject();
  const programId = currentProject?.id;

  return useQuery({
    queryKey: keys.cascadeLeverage(programId),
    queryFn: async (): Promise<CascadeMove[]> => {
      const res = await apiCall<CascadeMove[]>(
        `/api/cascade/leverage/${encodeURIComponent(programId!)}`,
        { requireAuth: true },
      );
      if (!res.data) {
        const msg = typeof res.error === 'string' ? res.error : res.error?.message;
        throw new Error(msg || 'Failed to load cascade leverage');
      }
      return res.data;
    },
    enabled: !!programId,
    staleTime: 30_000,
  });
}
