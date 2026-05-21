import { apiCall } from './api';
import type { ApiResponse } from '../types/api';

// ─────────────────────────────────────────────────────────────────────────────
// Types — mirror the backend CuratedBundle + ApplyBundleResult shapes
// ─────────────────────────────────────────────────────────────────────────────

export interface CuratedBundleFramework {
  name: string;
  version: string;
  shortLabel: string;
  /** Resolved UUID in the current environment, null if framework not loaded yet. */
  frameworkId: string | null;
}

export interface CuratedBundle {
  id: string;
  title: string;
  persona: string;
  description: string;
  signals: string[];
  resolvedFrameworks: CuratedBundleFramework[];
}

export interface ApplyBundleResult {
  bundleId: string;
  bundleTitle: string;
  activated: Array<{ frameworkId: string; name: string }>;
  skipped: Array<{ name: string; reason: string }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

export const onboardingService = {
  /** List all curated bundles with resolved framework UUIDs for this env. */
  listBundles: async (): Promise<ApiResponse<CuratedBundle[]>> => {
    return apiCall<CuratedBundle[]>('/api/onboarding/bundles', { requireAuth: true });
  },

  /** Activate every framework in the bundle for the current program. */
  applyBundle: async (bundleId: string): Promise<ApiResponse<ApplyBundleResult>> => {
    return apiCall<ApplyBundleResult>(
      `/api/onboarding/bundles/${encodeURIComponent(bundleId)}/apply`,
      { method: 'POST', requireAuth: true },
    );
  },
};
