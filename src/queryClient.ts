import { QueryClient } from '@tanstack/react-query';

/**
 * Shared React Query client.
 *
 * Defaults are tuned for ClauseAtlas's read-heavy compliance-data shape:
 *
 *   staleTime    — 30s. Compliance data is slowly-changing reference state;
 *                  brief staleness is preferable to refetch-on-every-mount.
 *                  Mutations explicitly invalidate the relevant query keys,
 *                  so users still see fresh state right after they change it.
 *
 *   gcTime       — 5 minutes. Keep recently-used query data in memory for
 *                  fast back-navigation between routes (Controls → Matrix →
 *                  Controls feels instant).
 *
 *   retry        — 1 on network/5xx, 0 on 4xx. The apiCall layer already
 *                  surfaces 401 / 403 / 404 as actionable errors; we don't
 *                  want React Query to mask them with an extra retry.
 *
 *   refetchOnWindowFocus — disabled. The auto-refetch behavior is too
 *                          aggressive for a compliance dashboard with
 *                          dozens of queries on one page — produces a
 *                          noisy thundering herd on every tab switch.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, error: any) => {
        const status = error?.status ?? error?.statusCode ?? error?.response?.status;
        if (typeof status === 'number' && status >= 400 && status < 500) return false;
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

/**
 * Centralized query-key factory. Centralization makes invalidation
 * unambiguous: a mutation that affects "the dashboard for org X project Y"
 * can call queryClient.invalidateQueries({ queryKey: keys.dashboard(orgId,
 * projectId) }) and never wonder which string was used at fetch time.
 *
 * Add new key roots here as more services adopt React Query.
 */
export const keys = {
  // Dashboard
  dashboard: (orgId?: string, projectId?: string) =>
    ['dashboard', orgId, projectId] as const,
  // Matrix
  matrix: (orgId?: string, projectId?: string) =>
    ['matrix', orgId, projectId] as const,
  // Controls / objective statuses
  controls: (orgId?: string, projectId?: string) =>
    ['controls', orgId, projectId] as const,
  frameworkWithStatus: (frameworkId: string, projectId?: string) =>
    ['framework', frameworkId, 'with-status', projectId] as const,
  // Regulatory graph review
  candidates: (status?: string) =>
    ['regulatory-review', 'candidates', status] as const,
};
