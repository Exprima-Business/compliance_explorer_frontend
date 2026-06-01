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
  // Shared compliance roll-up — `/api/controls/project-summary`. Used by
  // BOTH Dashboard and Matrix; one fetch, shared cache. Invalidate this
  // key after any status flip (control or objective) — it's the only
  // read that feeds the high-level posture views.
  projectSummary: (orgId?: string, projectId?: string) =>
    ['project-summary', orgId, projectId] as const,
  // Dashboard-only reads (anything beyond the shared summary)
  dashboard: (orgId?: string, projectId?: string) =>
    ['dashboard', orgId, projectId] as const,
  // Matrix-only reads (heatmap clause-detection overlay)
  matrix: (orgId?: string, projectId?: string) =>
    ['matrix', orgId, projectId] as const,
  matrixData: (projectId?: string) =>
    ['matrix-data', projectId] as const,
  // Controls / objective statuses
  controls: (orgId?: string, projectId?: string) =>
    ['controls', orgId, projectId] as const,
  frameworkWithStatus: (frameworkId: string, projectId?: string) =>
    ['framework', frameworkId, 'with-status', projectId] as const,
  // Regulatory graph review
  candidates: (status?: string) =>
    ['regulatory-review', 'candidates', status] as const,
  // Compliance obligations
  obligations: (type?: string, owner_role?: string) =>
    ['obligations', 'catalog', type, owner_role] as const,
  obligation: (id: string) =>
    ['obligations', 'detail', id] as const,
  obligationInstances: (filters?: Record<string, any>) =>
    ['obligations', 'instances', filters] as const,
  obligationInstance: (id: string) =>
    ['obligations', 'instance', id] as const,
  obligationInstancesDueSoon: (days: number) =>
    ['obligations', 'instances', 'due-soon', days] as const,
  // W2 — cross-framework control credit
  crossFwCredit: (controlId: string) =>
    ['cross-fw-credit', controlId] as const,
};
