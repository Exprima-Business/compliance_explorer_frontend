import { apiCall } from './api';
import type { ApiResponse } from '../types/api';
import environment from '../config/environment';
import { supabase } from '../lib/supabase';

// Scan API Types
export interface ScanSession {
  id: string;
  scanId?: string; // Backend sometimes returns scanId instead of id
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
      
      // Guarded debug log for FormData entries (production safe)
      if (typeof (formData as any).entries === 'function') {
        for (let [key, value] of (formData as any).entries()) {
          console.log(`FormData - ${key}:`, value);
        }
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
  ) {
    // Comprehensive scanId validation in constructor
    console.log('[SSE CONNECTION DEBUG] ScanSSEConnection constructor called with scanId:', scanId);
    
    if (!scanId) {
      console.error('[SSE CONNECTION DEBUG] Invalid scanId in constructor: scanId is falsy');
      throw new Error('Invalid scan ID provided to SSE connection: scanId is falsy');
    }
    
    if (typeof scanId !== 'string') {
      console.error('[SSE CONNECTION DEBUG] Invalid scanId in constructor: scanId is not a string:', typeof scanId);
      throw new Error('Invalid scan ID provided to SSE connection: scanId is not a string');
    }
    
    if (scanId === 'undefined' || scanId === 'null' || scanId.trim() === '') {
      console.error('[SSE CONNECTION DEBUG] Invalid scanId in constructor: scanId is invalid string:', scanId);
      throw new Error('Invalid scan ID provided to SSE connection: scanId is invalid string');
    }
    
    // Validate UUID format (basic check)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(scanId)) {
      console.warn('[SSE CONNECTION DEBUG] scanId does not match UUID format, but continuing:', scanId);
    }
    
    console.log('[SSE CONNECTION DEBUG] ScanSSEConnection created successfully with scanId:', scanId);
  }

  async connect(): Promise<void> {
    try {
      // Additional validation before connection
      if (!this.scanId || this.scanId === 'undefined' || this.scanId === 'null') {
        console.error('[SSE CONNECTION DEBUG] Cannot connect: Invalid scanId:', this.scanId);
        throw new Error('Invalid scan ID for SSE connection');
      }
      
      console.log('[SSE CONNECTION DEBUG] Attempting to connect with scanId:', this.scanId);
      
      // Log the full session object before SSE connection (1)
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('[SSE CONNECTION DEBUG] Session before SSE connect:', session);
      } catch (e) {
        console.warn('[SSE CONNECTION DEBUG] Could not log session before SSE connect:', e);
      }
      // Get auth token for SSE connection
      let token: string | null = null;
      try {
        const { getAuthToken } = await import('./api');
        token = await getAuthToken();
        console.log('[SSE CONNECTION DEBUG] Token source: getAuthToken()', token ? 'SUCCESS' : 'NULL');
      } catch (e) {
        console.warn('[SSE CONNECTION DEBUG] getAuthToken() failed, falling back to localStorage:', e);
        token = localStorage.getItem('supabase.auth.token');
        console.log('[SSE CONNECTION DEBUG] Token source: localStorage', token ? 'SUCCESS' : 'NULL');
      }
      // Get orgId and projectId from localStorage
      const orgId = localStorage.getItem('orgId');
      const projectId = localStorage.getItem('projectId');
      
      console.log('[SSE CONNECTION DEBUG] Connection parameters:', {
        scanId: this.scanId,
        orgId: orgId,
        projectId: projectId,
        hasToken: !!token
      });
      
      // Create EventSource with token, orgId, and projectId as query parameters
      let url = `${environment.api.url}/api/scans/${this.scanId}/stream?token=${encodeURIComponent(token ?? '')}`;
      if (orgId) {
        url += `&orgId=${encodeURIComponent(orgId)}`;
      }
      if (projectId) {
        url += `&projectId=${encodeURIComponent(projectId)}`;
      }
      
      console.log('[SSE CONNECTION DEBUG] EventSource URL:', url);
      console.log('[SSE CONNECTION DEBUG] URL validation - contains scanId:', url.includes(this.scanId));
      console.log('[SSE CONNECTION DEBUG] URL validation - contains undefined:', url.includes('undefined'));
      
      this.eventSource = new EventSource(url);

      this.eventSource.onopen = () => {
        console.log('[SSE CONNECTION DEBUG] SSE connection opened successfully for scanId:', this.scanId);
        this.reconnectAttempts = 0;
      };

      this.eventSource.onmessage = (event) => {
        try {
          console.log('[SSE CONNECTION DEBUG] Raw SSE message received:', event.data);
          const data = JSON.parse(event.data);
          console.log('[SSE CONNECTION DEBUG] Parsed SSE message:', data);
          this.onMessage(data);
          
          // Check if scan is complete
          if (data.status === 'complete' || data.status === 'error') {
            console.log('[SSE CONNECTION DEBUG] Scan completed via SSE, status:', data.status);
            this.onComplete();
            this.disconnect();
          }
        } catch (error) {
          console.error('[SSE CONNECTION DEBUG] Error parsing SSE message:', error);
          console.error('[SSE CONNECTION DEBUG] Raw message that failed to parse:', event.data);
          this.onError('Failed to parse progress update');
        }
      };

      this.eventSource.onerror = (error) => {
        console.error('[SSE CONNECTION DEBUG] SSE connection error for scanId:', this.scanId, error);
        console.error('[SSE CONNECTION DEBUG] Error details:', {
          readyState: this.eventSource?.readyState,
          url: this.eventSource?.url,
          scanId: this.scanId
        });
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
          
          console.log(`[SSE CONNECTION DEBUG] Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms...`);
          setTimeout(() => {
            this.connect();
          }, delay);
        } else {
          console.error('[SSE CONNECTION DEBUG] Max reconnection attempts reached, giving up');
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