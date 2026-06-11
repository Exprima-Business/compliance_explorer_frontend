import { apiCall } from './api';
import { getCsrfToken } from './sessionBridge';
import type { ApiResponse } from '../types/api';
import environment from '../config/environment';

/**
 * Evidence service — FE wrapper for `/api/evidence` endpoints.
 *
 * Backed by the BE routes in `src/routes/evidence.ts`. Shapes mirror the
 * BE `EvidenceArtifact` and `EvidenceMapping` types verbatim (camelCase
 * names match the BE response). See PHASE D Batch 4 recon for the
 * locked field contract.
 */

// ---------------------------------------------------------------------------
// Types — mirror BE `src/types/evidence.ts`
// ---------------------------------------------------------------------------

export type EvidenceArtifactType =
  | 'document'
  | 'config_export'
  | 'screenshot'
  | 'answer'
  | 'generated'
  | 'other';

export interface EvidenceArtifact {
  id: string;
  organizationId: string;
  projectId: string | null;
  uploadedBy: string;
  artifactType: EvidenceArtifactType;
  source: string | null;
  filename: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  contentHash: string | null;
  parsedSummary: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type EvidenceMappingSource = 'manual' | 'ai_suggested' | 'imported';
export type EvidenceMappingStatus = 'PROPOSED' | 'ACCEPTED' | 'REJECTED';

export interface EvidenceMapping {
  id: string;
  evidenceId: string;
  controlId: string | null;
  objectiveId: string | null;
  source: EvidenceMappingSource;
  confidence: number | null;
  rationale: string | null;
  status: EvidenceMappingStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Shape returned by GET /api/evidence/:id (artifact + signed URL + mappings). */
export interface EvidenceArtifactDetail {
  artifact: EvidenceArtifact;
  signedUrl: string | null;
  mappings: EvidenceMapping[];
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

/**
 * Upload a file to /api/evidence as multipart/form-data. Returns the created
 * artifact row (id, filename, artifactType, etc.).
 *
 * NOTE: apiCall already detects FormData bodies and skips the JSON
 * Content-Type header, letting the browser set the multipart boundary.
 */
export async function uploadFile(
  file: File,
  artifactType: EvidenceArtifactType,
  source?: string,
  metadata?: Record<string, unknown>,
): Promise<ApiResponse<EvidenceArtifact>> {
  const form = new FormData();
  form.append('file', file);
  form.append('artifactType', artifactType);
  if (source) form.append('source', source);
  if (metadata) form.append('metadata', JSON.stringify(metadata));

  return apiCall<EvidenceArtifact>('/api/evidence', {
    method: 'POST',
    body: form,
    requireAuth: true,
    // Multipart uploads of larger files may need longer than the default 30 s.
    timeout: 120_000,
  });
}

/** Fetch artifact metadata + a short-lived signed download URL. */
export async function getArtifact(
  artifactId: string,
): Promise<ApiResponse<EvidenceArtifactDetail>> {
  return apiCall<EvidenceArtifactDetail>(`/api/evidence/${artifactId}`, {
    requireAuth: true,
  });
}

/**
 * Attach an existing artifact to a control. BE accepts `controlId`
 * (camelCase) per `src/routes/evidence.ts` validator.
 */
export async function attachToControl(
  artifactId: string,
  controlId: string,
  rationale?: string,
): Promise<ApiResponse<EvidenceMapping>> {
  return apiCall<EvidenceMapping>(`/api/evidence/${artifactId}/mappings`, {
    method: 'POST',
    body: JSON.stringify({ controlId, rationale }),
    requireAuth: true,
  });
}

/** Attach an existing artifact to an objective (same endpoint, different field). */
export async function attachToObjective(
  artifactId: string,
  objectiveId: string,
  rationale?: string,
): Promise<ApiResponse<EvidenceMapping>> {
  return apiCall<EvidenceMapping>(`/api/evidence/${artifactId}/mappings`, {
    method: 'POST',
    body: JSON.stringify({ objectiveId, rationale }),
    requireAuth: true,
  });
}

/** Delete an artifact (cascades mappings + Storage object best-effort). */
export async function deleteArtifact(
  artifactId: string,
): Promise<ApiResponse<{ deleted: boolean }>> {
  return apiCall<{ deleted: boolean }>(`/api/evidence/${artifactId}`, {
    method: 'DELETE',
    requireAuth: true,
  });
}

// ---------------------------------------------------------------------------
// Progress-aware upload (XHR-based, for components that need a percentage)
// ---------------------------------------------------------------------------

/**
 * Upload with progress callback. Uses XMLHttpRequest because `fetch` does not
 * natively expose upload progress in browsers. Returns the parsed BE
 * `{ data, error }` envelope to stay compatible with the rest of the
 * service surface.
 *
 * `apiCall` cannot stream progress, so this is a small parallel path. We
 * still resolve the auth token + org/project headers through the same
 * helpers to stay consistent with apiCall's behaviour.
 */
export async function uploadFileWithProgress(
  file: File,
  artifactType: EvidenceArtifactType,
  onProgress: (percent: number) => void,
  source?: string,
  metadata?: Record<string, unknown>,
): Promise<ApiResponse<EvidenceArtifact>> {
  const form = new FormData();
  form.append('file', file);
  form.append('artifactType', artifactType);
  if (source) form.append('source', source);
  if (metadata) form.append('metadata', JSON.stringify(metadata));

  const orgId =
    (typeof window !== 'undefined' && localStorage.getItem('orgId')) ||
    '00000000-0000-0000-0000-000000000000';
  const projectId =
    typeof window !== 'undefined' ? localStorage.getItem('projectId') : null;

  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${environment.api.url}/api/evidence`);
    // Cookie auth (Phase 4b): the HttpOnly session cookie rides via
    // withCredentials; auth no longer uses a Bearer token. POST is a
    // state-changing request, so echo the double-submit CSRF token.
    xhr.withCredentials = true;
    const csrf = getCsrfToken();
    if (csrf) xhr.setRequestHeader('x-csrf-token', csrf);
    xhr.setRequestHeader('x-org-id', orgId);
    if (projectId) xhr.setRequestHeader('x-project-id', projectId);
    // Do NOT set Content-Type — the browser writes the multipart boundary.

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText || '{}');
        // BE always returns the { data, error } envelope (sendSuccess/sendError).
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(body as ApiResponse<EvidenceArtifact>);
        } else {
          resolve({
            data: null,
            error: {
              code: body?.error?.code || 'UPLOAD_FAILED',
              message: body?.error?.message || `Upload failed: HTTP ${xhr.status}`,
            },
          });
        }
      } catch {
        resolve({
          data: null,
          error: { code: 'UPLOAD_FAILED', message: `Upload failed: HTTP ${xhr.status}` },
        });
      }
    };

    xhr.onerror = () => {
      resolve({
        data: null,
        error: { code: 'NETWORK_ERROR', message: 'Network error during upload' },
      });
    };

    xhr.send(form);
  });
}

export const evidenceService = {
  uploadFile,
  uploadFileWithProgress,
  getArtifact,
  attachToControl,
  attachToObjective,
  deleteArtifact,
};
