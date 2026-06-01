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

  // retryScan + deleteScan wrappers removed (BE security audit V2-L-06):
  // the BE stub endpoints they targeted returned "success" without
  // performing the action, AND no UI component called these wrappers.
  // When real retry / delete features are implemented on the BE,
  // re-add explicit service methods that match the new endpoint shape.
};
