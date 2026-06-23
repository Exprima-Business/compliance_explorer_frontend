import { useQuery } from '@tanstack/react-query';
import { apiCall } from '../services/api';
import { useOrg } from '../contexts/OrgContext';
import type { ProjectSummary } from './useProjectSummary';

/**
 * Org-baseline analog of useProjectSummary — hits `/api/controls/org/summary`,
 * which rolls up posture across the organization's activated frameworks +
 * control/objective status (the org tier), not a single program.
 *
 * Same response shape as the program summary (ProjectSummary), so consumers
 * (CommandCenter, CompliancePosture, ComplianceGaps) swap the hook with no
 * other change. Org comes from the request context on the BE; the cache key
 * carries orgId for correctness when switching orgs.
 */
export function useOrgSummary() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  return useQuery({
    queryKey: ['org-summary', orgId],
    queryFn: async (): Promise<ProjectSummary> => {
      const res = await apiCall<ProjectSummary>('/api/controls/org/summary', {
        requireAuth: true,
      });
      if (!res.data) {
        const msg = typeof res.error === 'string' ? res.error : res.error?.message;
        throw new Error(msg || 'Failed to load org summary');
      }
      return res.data;
    },
    enabled: !!orgId,
    staleTime: 30_000,
  });
}
