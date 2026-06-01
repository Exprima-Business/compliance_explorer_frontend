import { useQuery } from '@tanstack/react-query';
import { apiCall } from '../services/api';
import { keys } from '../queryClient';
import { useProject } from '../contexts/ProjectContext';

/**
 * Shared React Query hook for `/api/controls/project-summary`.
 *
 * The summary feeds the Dashboard's Compliance Progress card AND the
 * Matrix page's framework heatmap — historically each page fetched it
 * independently on mount, doubling the network cost when a user moved
 * between the two screens.
 *
 * Sharing a single query key here means the second visit is a cache hit
 * (instant render) and a single invalidation after a status flip refreshes
 * BOTH consumers without per-page plumbing.
 *
 * Disabled when the project isn't loaded yet — useQuery's `enabled` guard
 * skips the fetch entirely, no spinner flash, no 401 on partial auth.
 *
 * Errors are non-fatal here: callers either degrade gracefully (Dashboard
 * hides the section) or surface a banner. Don't throw.
 */
export interface FamilySummary {
  identifier: string;
  name: string;
  total: number;
  /** Applicable count (total minus N/A). Optional for backward compat with older BE responses. */
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
  /** Per-family breakdown — used by the Matrix heatmap; absent from older BE responses. */
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

export function useProjectSummary() {
  const { currentProject } = useProject();
  const projectId = currentProject?.id;
  const orgId = (currentProject as any)?.organization_id
    ?? (currentProject as any)?.organizationId
    ?? undefined;

  return useQuery({
    queryKey: keys.projectSummary(orgId, projectId),
    queryFn: async (): Promise<ProjectSummary> => {
      const res = await apiCall<ProjectSummary>('/api/controls/project-summary', {
        requireAuth: true,
      });
      if (!res.data) {
        const msg = typeof res.error === 'string' ? res.error : res.error?.message;
        throw new Error(msg || 'Failed to load project summary');
      }
      return res.data;
    },
    enabled: !!projectId,
    // The project summary is the most-rolled-up read in the app — every
    // status flip changes it. 30s stale window matches the default; explicit
    // invalidation after writes carries the freshness guarantee.
    staleTime: 30_000,
  });
}
