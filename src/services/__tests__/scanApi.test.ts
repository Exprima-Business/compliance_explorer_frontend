import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scanApi, validateFile, handleScanError, ScanSSEConnection } from '../scanApi';

// Mock the apiCall function
vi.mock('../api', () => ({
  apiCall: vi.fn(),
}));

describe('scanApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset localStorage mock
    vi.mocked(localStorage.getItem).mockReturnValue('test-org-id');
  });

  describe('validateFile', () => {
    it('should validate PDF files', () => {
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      expect(() => validateFile(file)).not.toThrow();
    });

    it('should validate DOCX files', () => {
      const file = new File(['test'], 'test.docx', { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      expect(() => validateFile(file)).not.toThrow();
    });

    it('should validate Excel files', () => {
      const file = new File(['test'], 'test.xlsx', { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      expect(() => validateFile(file)).not.toThrow();
    });

    it('should validate text files', () => {
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      expect(() => validateFile(file)).not.toThrow();
    });

    it('should reject unsupported file types', () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      expect(() => validateFile(file)).toThrow('Invalid file type');
    });

    it('should reject files larger than 25MB', () => {
      const file = new File(['x'.repeat(26 * 1024 * 1024)], 'large.txt', { type: 'text/plain' });
      expect(() => validateFile(file)).toThrow('File size exceeds 25MB limit');
    });
  });

  describe('handleScanError', () => {
    it('should handle SCAN_PROCESSING_FAILED error', () => {
      const error = { code: 'SCAN_PROCESSING_FAILED' };
      const message = handleScanError(error);
      expect(message).toBe('Document processing failed. Please try again.');
    });

    it('should handle FILE_TOO_LARGE error', () => {
      const error = { code: 'FILE_TOO_LARGE' };
      const message = handleScanError(error);
      expect(message).toBe('File size exceeds 25MB limit.');
    });

    it('should handle UNSUPPORTED_FORMAT error', () => {
      const error = { code: 'UNSUPPORTED_FORMAT' };
      const message = handleScanError(error);
      expect(message).toBe('File format not supported. Please use PDF, Word, or text files.');
    });

    it('should handle API_QUOTA_EXCEEDED error', () => {
      const error = { code: 'API_QUOTA_EXCEEDED' };
      const message = handleScanError(error);
      expect(message).toBe('API quota exceeded. Please try again later.');
    });

    it('should handle NETWORK_ERROR error', () => {
      const error = { code: 'NETWORK_ERROR' };
      const message = handleScanError(error);
      expect(message).toBe('Network error. Please check your connection and try again.');
    });

    it('should handle AUTHENTICATION_ERROR error', () => {
      const error = { code: 'AUTHENTICATION_ERROR' };
      const message = handleScanError(error);
      expect(message).toBe('Authentication required. Please sign in and try again.');
    });

    it('should handle unknown errors', () => {
      const error = { code: 'UNKNOWN_ERROR' };
      const message = handleScanError(error);
      expect(message).toBe('An unexpected error occurred. Please try again.');
    });
  });

  describe('uploadDocument', () => {
    it('should upload document successfully', async () => {
      const { apiCall } = await import('../api');
      const mockResponse = {
        data: {
          scanId: 'test-scan-id',
          status: 'processing',
          estimatedTime: 300,
          sseUrl: '/api/scans/test-scan-id/stream'
        },
        error: null
      };
      vi.mocked(apiCall).mockResolvedValue(mockResponse);

      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const result = await scanApi.uploadDocument(file, 'test-org-id');

      expect(result).toEqual(mockResponse);
      expect(apiCall).toHaveBeenCalledWith('/api/scans', {
        method: 'POST',
        body: expect.any(FormData),
        requireAuth: true,
        headers: {
          'Content-Type': undefined
        }
      });
    });

    it('should throw error for invalid file', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      await expect(scanApi.uploadDocument(file, 'test-org-id')).rejects.toThrow('Invalid file type');
    });
  });

  describe('getScan', () => {
    it('should fetch scan details successfully', async () => {
      const { apiCall } = await import('../api');
      const mockResponse = {
        data: {
          id: 'test-scan-id',
          status: 'complete',
          results: []
        },
        error: null
      };
      vi.mocked(apiCall).mockResolvedValue(mockResponse);

      const result = await scanApi.getScan('test-scan-id');

      expect(result).toEqual(mockResponse);
      expect(apiCall).toHaveBeenCalledWith('/api/scans/test-scan-id', {
        requireAuth: true
      });
    });
  });

  describe('retryScan', () => {
    it('should retry scan successfully', async () => {
      const { apiCall } = await import('../api');
      const mockResponse = {
        data: {
          scanId: 'test-scan-id',
          status: 'processing'
        },
        error: null
      };
      vi.mocked(apiCall).mockResolvedValue(mockResponse);

      const result = await scanApi.retryScan('test-scan-id');

      expect(result).toEqual(mockResponse);
      expect(apiCall).toHaveBeenCalledWith('/api/scans/test-scan-id/retry', {
        method: 'POST',
        requireAuth: true
      });
    });
  });

  describe('deleteScan', () => {
    it('should delete scan successfully', async () => {
      const { apiCall } = await import('../api');
      const mockResponse = {
        data: null,
        error: null
      };
      vi.mocked(apiCall).mockResolvedValue(mockResponse);

      const result = await scanApi.deleteScan('test-scan-id');

      expect(result).toEqual(mockResponse);
      expect(apiCall).toHaveBeenCalledWith('/api/scans/test-scan-id', {
        method: 'DELETE',
        requireAuth: true
      });
    });
  });

  describe('createProjectFromScan', () => {
    it('should create project from scan successfully', async () => {
      const { apiCall } = await import('../api');
      const mockResponse = {
        data: { projectId: 'test-project-id' },
        error: null
      };
      vi.mocked(apiCall).mockResolvedValue(mockResponse);

      const request = {
        scanId: 'test-scan-id',
        projectName: 'Test Project',
        selectedClauses: ['clause1', 'clause2'],
        organizationId: 'test-org-id'
      };

      const result = await scanApi.createProjectFromScan(request);

      expect(result).toEqual(mockResponse);
      expect(apiCall).toHaveBeenCalledWith('/api/projects/from-scan', {
        method: 'POST',
        body: JSON.stringify(request),
        requireAuth: true
      });
    });
  });

  describe('importClauses', () => {
    it('should import clauses successfully', async () => {
      const { apiCall } = await import('../api');
      const mockResponse = {
        data: { success: true },
        error: null
      };
      vi.mocked(apiCall).mockResolvedValue(mockResponse);

      const request = {
        scanId: 'test-scan-id',
        projectId: 'test-project-id',
        selectedClauses: ['clause1', 'clause2']
      };

      const result = await scanApi.importClauses(request);

      expect(result).toEqual(mockResponse);
      expect(apiCall).toHaveBeenCalledWith('/api/scans/import-clauses', {
        method: 'POST',
        body: JSON.stringify(request),
        requireAuth: true
      });
    });
  });

  describe('updateScanResults', () => {
    it('should update scan results successfully', async () => {
      const { apiCall } = await import('../api');
      const mockResponse = {
        data: null,
        error: null
      };
      vi.mocked(apiCall).mockResolvedValue(mockResponse);

      const modifications = {
        notes: 'Test notes',
        selectedClauses: ['clause1'],
        customTags: ['tag1']
      };

      const result = await scanApi.updateScanResults('test-scan-id', modifications);

      expect(result).toEqual(mockResponse);
      expect(apiCall).toHaveBeenCalledWith('/api/scans/test-scan-id/modifications', {
        method: 'PATCH',
        body: JSON.stringify(modifications),
        requireAuth: true
      });
    });
  });
});

describe('ScanSSEConnection', () => {
  let sseConnection: ScanSSEConnection;
  const mockOnMessage = vi.fn();
  const mockOnError = vi.fn();
  const mockOnComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    sseConnection = new ScanSSEConnection('test-scan-id', mockOnMessage, mockOnError, mockOnComplete);
  });

  it('should create EventSource with correct URL', () => {
    sseConnection.connect();
    
    expect(global.EventSource).toHaveBeenCalledWith(
      expect.stringContaining('/api/scans/test-scan-id/stream')
    );
  });

  it('should handle connection open', () => {
    const mockEventSource = vi.mocked(global.EventSource).mock.results[0].value;
    sseConnection.connect();
    
    // Simulate connection open
    mockEventSource.onopen?.();
    
    expect(mockEventSource.onopen).toBeDefined();
  });

  it('should handle messages', () => {
    const mockEventSource = vi.mocked(global.EventSource).mock.results[0].value;
    sseConnection.connect();
    
    // Simulate message
    const testData = { type: 'progress', data: { status: 'processing' } };
    mockEventSource.onmessage?.({ data: JSON.stringify(testData) } as MessageEvent);
    
    expect(mockOnMessage).toHaveBeenCalledWith(testData);
  });

  it('should handle errors', () => {
    const mockEventSource = vi.mocked(global.EventSource).mock.results[0].value;
    sseConnection.connect();
    
    // Simulate error
    mockEventSource.onerror?.(new Event('error'));
    
    expect(mockOnError).toHaveBeenCalled();
  });

  it('should disconnect properly', () => {
    const mockEventSource = vi.mocked(global.EventSource).mock.results[0].value;
    sseConnection.connect();
    sseConnection.disconnect();
    
    expect(mockEventSource.close).toHaveBeenCalled();
  });
}); 