import { apiCall } from './api';
import type { ApiResponse } from '../types/api';

/**
 * Account-level data controls — the deletion + export promises on the
 * /security and data-boundary pages.
 */
export const accountService = {
  /** Delete an uploaded scan (document + results). Ownership-checked on the BE. */
  deleteScan: (scanId: string): Promise<ApiResponse<{ deleted: boolean; scanId: string }>> =>
    apiCall(`/api/scans/${encodeURIComponent(scanId)}`, { method: 'DELETE', requireAuth: true }),

  /** Export the organization's data as a JSON bundle. */
  exportOrgData: (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiCall('/api/organizations/export', { requireAuth: true, timeout: 60_000 }),
};

/** Trigger a client-side download of a JSON object. */
export function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
