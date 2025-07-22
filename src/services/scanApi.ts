import { apiCall } from './api';
import type { ApiResponse } from '../types/api';
import environment from '../config/environment';

// Scan API Types
export interface ScanSession {
  id: string;
  organizationId: string;
  projectId?: string;
  fileName: string;
  fileSize: number;
  status: 'processing' | 'complete' | 'error';
  createdAt: string;
  completedAt?: string;
  results: DetectedClause[];
  metadata: ProcessingMetadata;
  userModifications?: UserModifications;
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
  
  // Frontend interaction fields
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

export interface UserModifications {
  notes: string;
  selectedClauses: string[];
  customTags: string[];
  lastModified: string;
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

export interface ProgressiveResults {
  scanId: string;
  partialResults: DetectedClause[];
  isComplete: boolean;
  estimatedTimeRemaining: number;
  pagesProcessed: number;
  totalPages: number;
}

export interface CreateProjectFromScanRequest {
  scanId: string;
  projectName: string;
  selectedClauses: string[];
  organizationId: string;
}

export interface ImportClausesRequest {
  scanId: string;
  projectId: string;
  selectedClauses: string[];
}

// File validation
export const validateFile = (file: File): boolean => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ];
  
  const maxSize = 25 * 1024 * 1024; // 25MB
  
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type. Only PDF, Word, Excel, and text files are allowed.');
  }
  
  if (file.size > maxSize) {
    throw new Error('File size exceeds 25MB limit.');
  }
  
  return true;
};

// Error handling
export const handleScanError = (error: any): string => {
  if (error.code === 'SCAN_PROCESSING_FAILED') {
    return 'Document processing failed. Please try again.';
  }
  if (error.code === 'FILE_TOO_LARGE') {
    return 'File size exceeds 25MB limit.';
  }
  if (error.code === 'UNSUPPORTED_FORMAT') {
    return 'File format not supported. Please use PDF, Word, or text files.';
  }
  if (error.code === 'API_QUOTA_EXCEEDED') {
    return 'API quota exceeded. Please try again later.';
  }
  if (error.code === 'NETWORK_ERROR') {
    return 'Network error. Please check your connection and try again.';
  }
  if (error.code === 'AUTHENTICATION_ERROR') {
    return 'Authentication required. Please sign in and try again.';
  }
  return 'An unexpected error occurred. Please try again.';
};

// Scan API Service
export const scanApi = {
  // Upload document and start scan
  uploadDocument: async (file: File, organizationId: string): Promise<ApiResponse<{ scanId: string; status: string; estimatedTime: number; sseUrl: string }>> => {
    try {
      // Validate file first
      validateFile(file);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('organizationId', organizationId);
      
      // Debug logging
      console.log('Uploading document:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        organizationId,
        endpoint: '/api/scans'
      });
      
      // Log FormData contents for debugging
      for (let [key, value] of formData.entries()) {
        console.log(`FormData - ${key}:`, value);
      }
      
      return await apiCall<{ scanId: string; status: string; estimatedTime: number; sseUrl: string }>('/api/scans', {
        method: 'POST',
        body: formData,
        requireAuth: true
      });
    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
    }
  },

  // Get scan details
  getScan: async (scanId: string): Promise<ApiResponse<ScanSession>> => {
    try {
      return await apiCall<ScanSession>(`/api/scans/${scanId}`, {
        requireAuth: true
      });
    } catch (error) {
      console.error(`Error fetching scan ${scanId}:`, error);
      throw error;
    }
  },

  // List user's scans
  getScans: async (): Promise<ApiResponse<ScanSession[]>> => {
    try {
      return await apiCall<ScanSession[]>('/api/scans', {
        requireAuth: true
      });
    } catch (error) {
      console.error('Error fetching scans:', error);
      throw error;
    }
  },

  // Retry failed scan
  retryScan: async (scanId: string): Promise<ApiResponse<{ scanId: string; status: string }>> => {
    try {
      return await apiCall<{ scanId: string; status: string }>(`/api/scans/${scanId}/retry`, {
        method: 'POST',
        requireAuth: true
      });
    } catch (error) {
      console.error(`Error retrying scan ${scanId}:`, error);
      throw error;
    }
  },

  // Delete scan
  deleteScan: async (scanId: string): Promise<ApiResponse<void>> => {
    try {
      return await apiCall<void>(`/api/scans/${scanId}`, {
        method: 'DELETE',
        requireAuth: true
      });
    } catch (error) {
      console.error(`Error deleting scan ${scanId}:`, error);
      throw error;
    }
  },

  // Create project from scan
  createProjectFromScan: async (request: CreateProjectFromScanRequest): Promise<ApiResponse<any>> => {
    try {
      return await apiCall<any>('/api/projects/from-scan', {
        method: 'POST',
        body: JSON.stringify(request),
        requireAuth: true
      });
    } catch (error) {
      console.error('Error creating project from scan:', error);
      throw error;
    }
  },

  // Import clauses to existing project
  importClauses: async (request: ImportClausesRequest): Promise<ApiResponse<any>> => {
    try {
      return await apiCall<any>('/api/scans/import-clauses', {
        method: 'POST',
        body: JSON.stringify(request),
        requireAuth: true
      });
    } catch (error) {
      console.error('Error importing clauses:', error);
      throw error;
    }
  },

  // Update scan results (for user modifications)
  updateScanResults: async (scanId: string, modifications: Partial<UserModifications>): Promise<ApiResponse<void>> => {
    try {
      return await apiCall<void>(`/api/scans/${scanId}/modifications`, {
        method: 'PATCH',
        body: JSON.stringify(modifications),
        requireAuth: true
      });
    } catch (error) {
      console.error(`Error updating scan ${scanId}:`, error);
      throw error;
    }
  }
};

// SSE Connection Helper
export class ScanSSEConnection {
  private eventSource: EventSource | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(
    private scanId: string,
    private onMessage: (data: any) => void,
    private onError: (error: string) => void,
    private onComplete: () => void
  ) {}

  async connect(): Promise<void> {
    try {
      // Get auth token for SSE connection
      let token: string | null = null;
      try {
        // Dynamically import getAuthToken to avoid circular dependency
        const { getAuthToken } = await import('./api');
        token = await getAuthToken();
      } catch (e) {
        // fallback to localStorage if needed
        token = localStorage.getItem('supabase.auth.token');
      }
      
      // Add organization ID (not used in SSE URL, but kept for reference)
      // const orgId = localStorage.getItem('orgId');

      // Create EventSource with token as query parameter
      let url = `${environment.api.url}/api/scans/${this.scanId}/stream`;
      if (token) {
        url += `?token=${encodeURIComponent(token)}`;
      }
      this.eventSource = new EventSource(url);

      this.eventSource.onopen = () => {
        console.log('SSE connection opened for scan:', this.scanId);
        this.reconnectAttempts = 0;
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.onMessage(data);
          
          // Check if scan is complete
          if (data.status === 'complete' || data.status === 'error') {
            this.onComplete();
            this.disconnect();
          }
        } catch (error) {
          console.error('Error parsing SSE message:', error);
          this.onError('Failed to parse progress update');
        }
      };

      this.eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
          
          setTimeout(() => {
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            this.connect();
          }, delay);
        } else {
          this.onError('Connection lost. Please refresh the page to try again.');
          this.disconnect();
        }
      };

    } catch (error) {
      console.error('Error creating SSE connection:', error);
      this.onError('Failed to establish connection');
    }
  }

  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }
} 