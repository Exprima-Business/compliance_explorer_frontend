import { apiCall } from './api';
import type { ApiResponse } from '../types/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScanSession {
  id: string;
  scanId?: string;
  organizationId: string;
  projectId?: string;
  fileName: string;
  fileSize: number;
  status: 'processing' | 'complete' | 'error';
  createdAt: string;
  completedAt?: string;
  results: DetectedClause[];
  metadata: ProcessingMetadata;
  expiresAt: string;
}

export interface DetectedClause {
  id: string;
  clauseId: string;
  title: string;
  description: string;
  confidence: number;
  semanticSimilarity?: number;
  supportingContext?: string;
  family?: string;
  conditions?: string;
  implementationRequirements?: string;
  isSelected: boolean;
  userConfidence?: number;
  customNotes?: string;
  implementationStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  userModified: boolean;
  lastModified: string;
}

export interface ProcessingMetadata {
  totalTokens: number;
  estimatedCost: number;
  processingTime: number;
  totalPages: number;
  modelUsed: string;
  chunksProcessed: number;
  totalChunks: number;
}

export interface ScanProgress {
  scanId: string;
  current: number;
  total: number;
  status: 'processing' | 'complete' | 'error';
  message: string;
  estimatedTimeRemaining: number;
  pagesProcessed: number;
  totalPages: number;
}

export interface CreateProjectFromScanRequest {
  scanId: string;
  projectName: string;
  description?: string;
  organizationId: string;
  options?: {
    saveToExisting?: boolean;
    existingProjectId?: string;
    clauseFilter?: string[];
  };
}

// ---------------------------------------------------------------------------
// File validation
// ---------------------------------------------------------------------------

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
];

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

export const validateFile = (file: File): boolean => {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Invalid file type. Only PDF, Word, Excel, and text files are allowed.');
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File size exceeds 25 MB limit.');
  }
  return true;
};

// ---------------------------------------------------------------------------
// Scan API service
// ---------------------------------------------------------------------------

export const scanApi = {
  /** Upload a document and start an AI scan */
  uploadDocument: async (
    file: File,
    organizationId: string,
  ): Promise<ApiResponse<{ scanId: string; status: string; estimatedTime: number; sseUrl: string }>> => {
    validateFile(file);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('organizationId', organizationId);

    return apiCall<{ scanId: string; status: string; estimatedTime: number; sseUrl: string }>(
      '/api/scans',
      {
        method: 'POST',
        body: formData,
        requireAuth: true,
      },
    );
  },

  /** Fetch a single scan by ID */
  getScan: async (scanId: string): Promise<ApiResponse<ScanSession>> => {
    return apiCall<ScanSession>(`/api/scans/${scanId}`, { requireAuth: true });
  },

  /** List all scans for the current user / org */
  getScans: async (): Promise<ApiResponse<ScanSession[]>> => {
    return apiCall<ScanSession[]>('/api/scans', { requireAuth: true });
  },

  /** Retry a failed scan */
  retryScan: async (
    scanId: string,
  ): Promise<ApiResponse<{ scanId: string; status: string }>> => {
    return apiCall<{ scanId: string; status: string }>(`/api/scans/${scanId}/retry`, {
      method: 'POST',
      requireAuth: true,
    });
  },

  /** Delete a scan */
  deleteScan: async (scanId: string): Promise<ApiResponse<void>> => {
    return apiCall<void>(`/api/scans/${scanId}`, {
      method: 'DELETE',
      requireAuth: true,
    });
  },

  /**
   * Create a project from completed scan results.
   *
   * Hits `POST /api/projects/create-from-scan` — the backend handles
   * project creation, clause validation, and bookmark creation in one call.
   */
  createProjectFromScan: async (
    request: CreateProjectFromScanRequest,
  ): Promise<ApiResponse<any>> => {
    return apiCall<any>('/api/projects/create-from-scan', {
      method: 'POST',
      body: JSON.stringify(request),
      requireAuth: true,
    });
  },
};
