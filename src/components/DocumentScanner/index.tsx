import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  CircularProgress, 
  Alert,
  Button,
  Chip,
  LinearProgress,
  Card,
  CardContent,
  Divider,
  Paper,
  Fade,
  Slide,
  Grow,
  alpha
} from '@mui/material';
import { 
  CloudUpload as UploadIcon,
  Description as DocumentIcon,
  Security as SecurityIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { ScanResults } from '../ScanResults';
import { useAuth } from '../../contexts/AuthContext';
import { SimpleProjectCreationModal } from '../ProjectCreation/SimpleProjectCreationModal';
import { 
  scanApi, 
  ScanSSEConnection, 
  validateFile, 
  handleScanError,
  type ScanProgress,
  type DetectedClause,
  type ScanSession,
  type ProgressiveResults
} from '../../services/scanApi';
import { useNavigate, useParams } from 'react-router-dom';

interface UploadState {
  status: 'idle' | 'uploading' | 'processing' | 'loading-from-be' | 'complete' | 'error';
  message?: string;
  progress?: ScanProgress;
}

/**
 * DocumentScanner Component
 * 
 * SINGLE PROGRESS REFACTOR (Latest Update):
 * 
 * 1. Consolidated State Management:
 *    - Added 'loading-from-be' status to distinguish from 'processing'
 *    - Single renderProgressState() function handles all progress states
 *    - Eliminates overlapping UI elements (multiple spinning circles)
 * 
 * 2. Unified Progress Display:
 *    - Single progress indicator for all states
 *    - Mutually exclusive rendering conditions
 *    - Clear state transitions and messaging
 * 
 * 3. Removed Redundant Elements:
 *    - Eliminated duplicate CircularProgress components
 *    - Removed overlapping renderResults() calls during progress states
 *    - Consolidated manual refresh logic into main progress display
 * 
 * 4. Enhanced User Experience:
 *    - Single, consistent progress feedback
 *    - Clear state messaging for each phase
 *    - Integrated refresh functionality within progress display
 * 
 * This refactor addresses the "too many UI elements" issue by ensuring only one
 * progress indicator is shown at any time, with clear state transitions.
 */
export const DocumentScanner: React.FC = () => {
  console.log('[COMPONENT MOUNT] DocumentScanner component is mounting');
  const { user } = useAuth();
  const organization = { id: localStorage.getItem('orgId') || '00000000-0000-0000-0000-000000000000' };
  const navigate = useNavigate();
  const { scanId: urlScanId } = useParams<{ scanId?: string }>();
  const [uploadState, setUploadState] = useState<UploadState>({ status: 'idle' });
  const [currentScan, setCurrentScan] = useState<ScanSession | null>(null);
  const [mainResults, setMainResults] = useState<DetectedClause[]>([]);
  const [inProgressResults, setInProgressResults] = useState<DetectedClause[]>([]);
  const [error, setError] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Project Creation Modal state
  const [showProjectCreationModal, setShowProjectCreationModal] = useState(false);
  
  // Production-ready error reporting utility
  const reportError = (context: string, error: any, additionalData?: any) => {
    const errorReport = {
      timestamp: new Date().toISOString(),
      context,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error,
      additionalData,
          userAgent: navigator.userAgent,
    url: window.location.href,
    scanId: currentScan?.scanId || currentScan?.id || 'unknown'
    };
    
    console.error(`[ERROR REPORT] ${context}:`, errorReport);
    
    // In production, you might want to send this to an error reporting service
    // Example: Sentry.captureException(error, { extra: errorReport });
    
    return errorReport;
  };

  // Safe error setter that ensures we always set a string
  const setErrorSafe = (errorValue: any) => {
    if (errorValue === null || errorValue === undefined) {
      setError(null);
    } else if (typeof errorValue === 'string') {
      setError(errorValue);
    } else if (errorValue instanceof Error) {
      setError(errorValue.message);
    } else {
      setError(JSON.stringify(errorValue));
    }
  };

  const sseConnectionRef = useRef<ScanSSEConnection | null>(null);

  // Navigation debugging (suppressed - no longer needed after persistence fixes)
  // useEffect(() => {
  //   console.log('[NAVIGATION DEBUG] Component mounted/updated with urlScanId:', urlScanId);
  //   console.log('[NAVIGATION DEBUG] Current state:', {
  //     currentScan: !!currentScan,
  //     mainResults: mainResults.length,
  //     error: error,
  //     uploadState: uploadState.status
  //   });
  //   
  //   // Log when we have a scanId but no results (potential navigation issue)
  //   if (urlScanId && urlScanId !== 'undefined' && mainResults.length === 0 && inProgressResults.length === 0 && uploadState.status === 'loading-from-be') {
  //     console.log('[NAVIGATION DEBUG] POTENTIAL ISSUE: Have scanId but no results - this might be the navigation scenario');
  //   }
  // }, [urlScanId, currentScan, mainResults, inProgressResults, error, uploadState.status]);

  // URL tracking debugging (suppressed - no longer needed after persistence fixes)
  // useEffect(() => {
  //   console.log('[URL DEBUG] URL changed to:', window.location.pathname);
  //   console.log('[URL DEBUG] urlScanId from params:', urlScanId);
  // }, [urlScanId]);

  // Load existing scan data on mount (no polling during processing)
  useEffect(() => {
    console.log('[USEEFFECT] loadExistingScan useEffect is running');
    const loadExistingScan = async () => {
      // Check if we have a scanId from URL or localStorage
      let scanIdToFetch: string | undefined = urlScanId;
      
      // If no scanId in URL but we have one in localStorage, redirect to it
      if ((!urlScanId || urlScanId === 'undefined') && typeof window !== 'undefined') {
        const storedScanId = localStorage.getItem('currentScanId');
        if (storedScanId) {
          console.log('[PERSISTENCE DEBUG] No scanId in URL, but found in localStorage:', storedScanId);
          console.log('[PERSISTENCE DEBUG] Redirecting to preserve scan state');
          navigate(`/document-scanner/${storedScanId}`, { replace: true });
          return;
        }
      }
      
      if (scanIdToFetch && scanIdToFetch !== 'undefined') {
        console.log('[DEBUG] Loading existing scan for scanId:', scanIdToFetch);
        try {
          setUploadState({ 
            status: 'processing', 
            message: 'Loading scan results...',
            progress: {
              scanId: scanIdToFetch,
              current: 0,
              total: 1,
              status: 'processing',
              message: 'Loading scan results...',
              estimatedTimeRemaining: 0,
              pagesProcessed: 0,
              totalPages: 0
            }
          });
          setErrorSafe(null);
          
          const response = await scanApi.getScan(scanIdToFetch);
          
          if (response.error || !response.data) {
            console.error('[DEBUG] Error loading scan:', response.error);
            setErrorSafe('Failed to load scan results. Please try again or contact support.');
            setUploadState({ status: 'error', message: 'Failed to load scan results' });
            return;
          }
          
          const scanSession = response.data;
          console.log('[DEBUG] Loaded scan session:', scanSession);
          
          // Set the scan data
          setCurrentScan(scanSession);
          setMainResults(scanSession.results || []);
          setInProgressResults([]);
          setErrorSafe(null);
          
          if (scanSession.status === 'complete') {
            // Scan is complete, show results
            console.log('[DEBUG] Scan is complete, showing results');
            setUploadState({
              status: 'complete',
              message: scanSession.results && scanSession.results.length > 0 
                ? 'Analysis completed successfully' 
                : 'Analysis completed. No relevant clauses found in this document.',
              progress: {
                scanId: scanSession.id,
                current: scanSession.metadata?.chunksProcessed ?? 0,
                total: scanSession.metadata?.totalChunks ?? 0,
                status: 'complete',
                message: 'Analysis completed',
                estimatedTimeRemaining: 0,
                pagesProcessed: scanSession.metadata?.totalPages ?? 0,
                totalPages: scanSession.metadata?.totalPages ?? 0
              }
            });
          } else if (scanSession.status === 'processing') {
            // Scan is still processing, establish SSE connection for real-time updates
            console.log('[DEBUG] Scan is processing, establishing SSE connection');
            
            // Extract scanId from the correct field (backend returns scanId, not id)
            const scanId = scanSession.scanId || scanSession.id;
            
            console.log('[DEBUG] Scan session fields:', {
              scanId: scanSession.scanId,
              id: scanSession.id,
              extractedScanId: scanId
            });
            
            setUploadState({
              status: 'processing',
              message: 'Analysis in progress...',
              progress: {
                scanId: scanId,
                current: scanSession.metadata?.chunksProcessed ?? 0,
                total: scanSession.metadata?.totalChunks ?? 0,
                status: 'processing',
                message: 'Processing...',
                estimatedTimeRemaining: 0,
                pagesProcessed: scanSession.metadata?.totalPages ?? 0,
                totalPages: scanSession.metadata?.totalPages ?? 0
              }
            });
            
            // Validate scanId before establishing SSE connection (skip if one is already active)
            if (scanId && scanId !== 'undefined' && scanId !== 'null' && !sseConnectionRef.current) {
              console.log('[DEBUG] Establishing SSE connection for existing scan:', scanId);
              establishSSEConnection(scanId);
            } else if (!scanId || scanId === 'undefined' || scanId === 'null') {
              console.error('[DEBUG] Cannot establish SSE connection: Invalid scanId:', scanId);
              console.error('[DEBUG] Full scan session for debugging:', scanSession);
              setErrorSafe('Invalid scan ID. Cannot establish connection to server.');
              setUploadState({ status: 'error', message: 'Invalid scan ID.' });
            }
          } else {
            // Unknown status
            console.error('[DEBUG] Unknown scan status:', scanSession.status);
            setErrorSafe('Unknown scan status. Please try again or contact support.');
            setUploadState({ status: 'error', message: 'Unknown scan status' });
          }
        } catch (err) {
          console.error('[DEBUG] Error loading scan:', err);
          setErrorSafe(err instanceof Error ? err.message : 'Failed to load scan results');
          setUploadState({ status: 'error', message: 'Failed to load scan results' });
        }
      } else if (urlScanId === 'undefined') {
        // Invalid scanId
        console.error('[DEBUG] Invalid scanId in URL:', urlScanId);
        setErrorSafe('Invalid scan ID. Please try again or contact support.');
        setUploadState({ status: 'error', message: 'Invalid scan ID.' });
      }
    };
    
    loadExistingScan();
  }, [urlScanId, navigate]);

  const handleFileUpload = useCallback(async (file: File) => {
    if (!user || !organization) {
      setErrorSafe('Authentication required. Please sign in and try again.');
      return;
    }

    try {
      // Validate file
      validateFile(file);
      
      setUploadState({ status: 'uploading', message: 'Uploading document...' });
      setErrorSafe(null);
      setMainResults([]);
      setInProgressResults([]);

      // Debug: Log upload initiation
      console.log('[UPLOAD DEBUG] Starting upload for file:', {
        name: file.name,
        size: file.size,
        type: file.type,
        organizationId: organization.id
      });

      // Upload document
      const response = await scanApi.uploadDocument(file, organization.id);
      
      // Debug: Log full response for analysis
      console.log('[UPLOAD DEBUG] Full upload response:', response);
      console.log('[UPLOAD DEBUG] Response status:', response.error ? 'ERROR' : 'SUCCESS');
      
      if (response.error) {
        console.error('[UPLOAD DEBUG] Upload failed with error:', response.error);
        throw new Error(typeof response.error === 'string' ? response.error : response.error.message);
      }

      // Validate response structure
      if (!response.data) {
        console.error('[UPLOAD DEBUG] No response data received');
        throw new Error('No response data received from server');
      }

      // Debug: Log response data structure
      console.log('[UPLOAD DEBUG] Response data:', response.data);
      console.log('[UPLOAD DEBUG] Response data type:', typeof response.data);
      console.log('[UPLOAD DEBUG] Response data keys:', Object.keys(response.data));
      
      // Extract and validate scanId with comprehensive checks
      const scanId = response.data.scanId;
      
      // Debug: Log scanId extraction
      console.log('[UPLOAD DEBUG] Raw scanId from response:', scanId);
      console.log('[UPLOAD DEBUG] scanId type:', typeof scanId);
      console.log('[UPLOAD DEBUG] scanId length:', scanId ? scanId.length : 'N/A');
      
      // Comprehensive scanId validation
      if (!scanId) {
        console.error('[UPLOAD DEBUG] scanId is falsy:', scanId);
        console.error('[UPLOAD DEBUG] Full response data for debugging:', response.data);
        throw new Error('Scan ID is missing from server response');
      }
      
      if (typeof scanId !== 'string') {
        console.error('[UPLOAD DEBUG] scanId is not a string:', typeof scanId, scanId);
        throw new Error('Invalid scan ID format received from server');
      }
      
      if (scanId === 'undefined' || scanId === 'null' || scanId.trim() === '') {
        console.error('[UPLOAD DEBUG] scanId is invalid string:', scanId);
        throw new Error('Invalid scan ID received from server');
      }
      
      // Validate UUID format (basic check)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(scanId)) {
        console.error('[UPLOAD DEBUG] scanId does not match UUID format:', scanId);
        // Don't throw error here as backend might use different format
        console.warn('[UPLOAD DEBUG] scanId format warning, but continuing:', scanId);
      }
      
      console.log('[UPLOAD DEBUG] Valid scanId confirmed:', scanId);
      
      // Store scanId in localStorage for persistence
      if (typeof window !== 'undefined') {
        localStorage.setItem('currentScanId', scanId);
        console.log('[PERSISTENCE DEBUG] Stored scanId in localStorage:', scanId);
      }
      
      // Create scan session object
      const scanSession = {
        id: scanId,
        status: 'processing' as const,
        organizationId: organization.id,
        fileName: file.name,
        fileSize: file.size,
        createdAt: new Date().toISOString(),
        results: [],
        metadata: {
          totalTokens: 0,
          estimatedCost: 0,
          processingTime: 0,
          totalPages: 0,
          modelUsed: 'gpt-4',
          chunksProcessed: 0,
          totalChunks: 0
        },
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };
      
      setCurrentScan(scanSession);

      setUploadState({ 
        status: 'processing', 
        message: 'Processing document...',
        progress: {
          scanId,
          current: 0,
          total: 0,
          status: 'processing',
          message: 'Starting document analysis...',
          estimatedTimeRemaining: 0,
          pagesProcessed: 0,
          totalPages: 0
        }
      });
      
      // Update URL for persistence
      navigate(`/document-scanner/${scanId}`, { replace: false });
      
      // Establish SSE connection with validated scanId
      console.log('[UPLOAD DEBUG] Establishing SSE connection with validated scanId:', scanId);
      establishSSEConnection(scanId);

    } catch (err) {
      console.error('[UPLOAD DEBUG] Upload error:', err);
      
      // Report error with context
      reportError('File Upload', err, {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        organizationId: organization.id
      });
      
      const errorMessage = handleScanError(err);
      setErrorSafe(errorMessage);
      setUploadState({ status: 'error', message: errorMessage });
    }
  }, [user, organization, navigate]);

  const establishSSEConnection = (scanId: string) => {
    // Comprehensive scanId validation before establishing connection
    console.log('[SSE DEBUG] Attempting to establish SSE connection for scanId:', scanId);
    
    if (!scanId) {
      console.error('[SSE DEBUG] Cannot establish SSE connection: scanId is falsy');
      setErrorSafe('Invalid scan ID. Cannot establish connection to server.');
      setUploadState({ status: 'error', message: 'Invalid scan ID.' });
      return;
    }
    
    if (typeof scanId !== 'string') {
      console.error('[SSE DEBUG] Cannot establish SSE connection: scanId is not a string:', typeof scanId);
      setErrorSafe('Invalid scan ID format. Cannot establish connection to server.');
      setUploadState({ status: 'error', message: 'Invalid scan ID format.' });
      return;
    }
    
    if (scanId === 'undefined' || scanId === 'null' || scanId.trim() === '') {
      console.error('[SSE DEBUG] Cannot establish SSE connection: scanId is invalid string:', scanId);
      setErrorSafe('Invalid scan ID. Cannot establish connection to server.');
      setUploadState({ status: 'error', message: 'Invalid scan ID.' });
      return;
    }
    
    // Validate UUID format (basic check)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(scanId)) {
      console.warn('[SSE DEBUG] scanId does not match UUID format, but continuing:', scanId);
    }
    
    console.log('[SSE DEBUG] scanId validation passed, proceeding with SSE connection');
    
    try {
      // Clean up existing connection
      if (sseConnectionRef.current) {
        console.log('[SSE DEBUG] Cleaning up existing SSE connection');
        sseConnectionRef.current.disconnect();
      }

      // Create new SSE connection with validated scanId
      console.log('[SSE DEBUG] Creating new ScanSSEConnection with scanId:', scanId);
      sseConnectionRef.current = new ScanSSEConnection(
        scanId,
        (data) => handleSSEMessage(data),
        (error) => handleSSEError(error),
        () => handleSSEComplete()
      );

      console.log('[SSE DEBUG] Initiating SSE connection...');
      sseConnectionRef.current.connect();
      
    } catch (error) {
      console.error('[SSE DEBUG] Error creating SSE connection:', error);
      setErrorSafe('Failed to establish connection to server. Please try refreshing the page.');
      setUploadState({ status: 'error', message: 'Failed to establish connection.' });
      
      // Start fallback polling if SSE fails
      console.log('[SSE DEBUG] Starting fallback polling due to SSE creation error');
      startPolling(scanId);
    }
  };

  const handleSSEMessage = async (data: any) => {
    console.log('[DEBUG] SSE message received:', data);

    // Handle completion messages FIRST (before progress updates)
    if (data.status === 'complete') {
      console.log('[DEBUG] SSE completion message received:', data);
      
      // Set upload state to complete
      setUploadState({ 
        status: 'complete', 
        message: 'Analysis completed successfully',
        progress: {
          scanId: data.scanId,
          current: 100,
          total: 100,
          status: 'complete',
          message: 'Analysis completed',
          estimatedTimeRemaining: 0,
          pagesProcessed: 0,
          totalPages: 0
        }
      });
      
      // Keep scanId in localStorage for persistence instead of clearing it
      if (typeof window !== 'undefined') {
        localStorage.setItem('currentScanId', data.scanId);
        console.log('[PERSISTENCE DEBUG] Kept scanId in localStorage for persistence:', data.scanId);
      }
      
      // URL is already set to /document-scanner/:scanId during upload (line 446).
      // Do NOT navigate again here — it triggers the loadExistingScan useEffect
      // and creates a duplicate SSE connection / race condition.
      setErrorSafe(null);

      // Fetch final results from API (authoritative source)
      try {
        console.log('[DEBUG] Fetching final results from API after SSE completion');
        const response = await scanApi.getScan(data.scanId);
        if (response.error) {
          console.error('[DEBUG] Error fetching final results:', response.error);
          setErrorSafe('Failed to load scan results. Please try refreshing the page.');
          return;
        }
        
        const finalScanSession = response.data;
        if (finalScanSession) {
          console.log('[DEBUG] Final results from API:', finalScanSession.results);
          console.log('[DEBUG] Results count:', finalScanSession.results?.length || 0);
          setMainResults(finalScanSession.results || []);
          setCurrentScan(finalScanSession);
        } else {
          console.error('[DEBUG] No scan session data returned from API');
          setErrorSafe('No scan data found. Please try again or contact support.');
        }
      } catch (err) {
        console.error('[DEBUG] Error fetching final results after SSE completion:', err);
        setErrorSafe('Failed to load scan results. Please try refreshing the page.');
      }
      return; // Exit early to prevent further processing
    }

    // Handle error messages
    if (data.status === 'error') {
      console.error('[DEBUG] SSE error message received:', data);
      setErrorSafe(data.message || 'An error occurred during processing');
      setUploadState({ status: 'error', message: data.message || 'Processing error' });
      return; // Exit early to prevent further processing
    }

    // Handle direct progress messages (current backend format)
    if (data.progress !== undefined && data.status) {
      setUploadState(prev => {
        const newState = {
          ...prev,
          progress: {
            scanId: data.scanId,
            current: data.currentChunk || 0,
            total: data.totalChunks || 1,
            status: 'processing' as const, // Always 'processing' during analysis, not 'error'
            message: data.status === 'analyzing' ? 'Analyzing document...' : data.message || 'Processing...',
            estimatedTimeRemaining: data.estimatedTimeRemaining || 0,
            pagesProcessed: data.pagesProcessed || 0,
            totalPages: data.totalPages || 0
          },
          message: data.status === 'analyzing' ? 'Analyzing document...' : data.message || 'Processing...'
        };
        console.log('[DEBUG] SSE progress update, new uploadState:', newState);
        return newState;
      });
    } else if (data.type === 'progress') {
      setUploadState(prev => {
        const newState = {
          ...prev,
          progress: data.data,
          message: data.data.message
        };
        console.log('[DEBUG] SSE progress update, new uploadState:', newState);
        return newState;
      });
    } else if (data.type === 'progressive_update') {
      const progressiveData: ProgressiveResults = data.data;
      console.log('[DEBUG] SSE progressive_update:', progressiveData);
      setInProgressResults(progressiveData.partialResults);
      setUploadState(prev => {
        const newState = {
          ...prev,
          progress: {
            ...prev.progress!,
            status: 'processing' as const, // Ensure status is 'processing' during analysis
            pagesProcessed: progressiveData.pagesProcessed,
            totalPages: progressiveData.totalPages,
            estimatedTimeRemaining: progressiveData.estimatedTimeRemaining
          }
        };
        console.log('[DEBUG] SSE progressive_update, new uploadState:', newState);
        return newState;
      });
    } else if (data.type === 'complete') {
      // Legacy completion event format - just signals that processing is done
      // We'll fetch the actual results from the API
      const scanId = data.data?.scanId || data.data?.id;
      console.log('[DEBUG] SSE complete event received for scanId:', scanId);
      
      if (!scanId || scanId === 'undefined') {
        console.error('[DEBUG] SSE complete event missing valid scanId:', data);
        setError('Invalid scan ID received from server. Please try again or contact support.');
        setUploadState({ status: 'error', message: 'Invalid scan ID.' });
        return;
      }
      
      // Set upload state to complete
      setUploadState({ 
        status: 'complete', 
        message: 'Analysis completed successfully',
        progress: {
          scanId: scanId,
          current: 100,
          total: 100,
          status: 'complete',
          message: 'Analysis completed',
          estimatedTimeRemaining: 0,
          pagesProcessed: 0,
          totalPages: 0
        }
      });
      
      // Keep scanId in localStorage for persistence instead of clearing it
      if (typeof window !== 'undefined') {
        localStorage.setItem('currentScanId', data.scanId);
        console.log('[PERSISTENCE DEBUG] Kept scanId in localStorage for persistence:', data.scanId);
      }

      // URL is already set to /document-scanner/:scanId during upload.
      // Do NOT navigate again — it triggers the loadExistingScan useEffect
      // and can cause component remount / hook count mismatch (React Error #300).
      setErrorSafe(null);

      // Fetch final results from API (authoritative source)
      try {
        console.log('[DEBUG] Fetching final results from API after SSE completion');
        const response = await scanApi.getScan(scanId);
        if (response.error) {
          console.error('[DEBUG] Error fetching final results:', response.error);
          setErrorSafe('Failed to load scan results. Please try refreshing the page.');
          return;
        }

        const finalScanSession = response.data;
        if (finalScanSession) {
          console.log('[DEBUG] Final results from API:', finalScanSession.results);
          console.log('[DEBUG] Results count:', finalScanSession.results?.length || 0);
          setMainResults(finalScanSession.results || []);
          setCurrentScan(finalScanSession);
        } else {
          console.error('[DEBUG] No scan session data returned from API');
          setErrorSafe('No scan data found. Please try again or contact support.');
        }
      } catch (err) {
        console.error('[DEBUG] Error fetching final results after SSE completion:', err);
        setErrorSafe('Failed to load scan results. Please try refreshing the page.');
      }
    }
  };

  const handleSSEError = (error: string) => {
    console.error('SSE error:', error);
    setErrorSafe(error);
    setUploadState({ status: 'error', message: error });
    
    // Start polling as fallback if SSE fails
    const scanId = currentScan?.scanId || currentScan?.id;
    if (scanId) {
      console.log('[DEBUG] Starting fallback polling due to SSE error');
      startPolling(scanId);
    }
  };

  // Fallback polling mechanism
  const startPolling = (scanId: string) => {
    // Clear any existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    console.log('[DEBUG] Starting fallback polling for scanId:', scanId);

    const interval = setInterval(async () => {
      try {
        const response = await scanApi.getScan(scanId);
        if (response.error || !response.data) {
          console.error('[DEBUG] Polling error:', response.error);
          return;
        }

        const scanSession = response.data;
        console.log('[DEBUG] Polling update:', scanSession.status);

        if (scanSession.status === 'complete') {
          console.log('[DEBUG] Scan completed via polling');
          setErrorSafe(null); // Clear any SSE error since we got results
          setCurrentScan(scanSession);
          setMainResults(scanSession.results || []);
          setUploadState({
            status: 'complete',
            message: 'Analysis completed successfully',
            progress: {
              scanId: scanSession.id,
              current: scanSession.metadata?.chunksProcessed ?? 0,
              total: scanSession.metadata?.totalChunks ?? 0,
              status: 'complete',
              message: 'Analysis completed',
              estimatedTimeRemaining: 0,
              pagesProcessed: scanSession.metadata?.totalPages ?? 0,
              totalPages: scanSession.metadata?.totalPages ?? 0
            }
          });
          stopPolling();
        } else if (scanSession.status === 'error') {
          console.error('[DEBUG] Scan failed via polling');
          setErrorSafe('Document processing failed. Please try again.');
          setUploadState({ status: 'error', message: 'Processing failed' });
          stopPolling();
        }
        // If still processing, continue polling
      } catch (err) {
        console.error('[DEBUG] Polling error:', err);
      }
    }, 5000); // Poll every 5 seconds

    pollingIntervalRef.current = interval;
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      console.log('[DEBUG] Stopped fallback polling');
    }
  };

  const handleSSEComplete = () => {
    console.log('SSE connection completed');
    if (sseConnectionRef.current) {
      sseConnectionRef.current.disconnect();
      sseConnectionRef.current = null;
    }
    // Stop polling if SSE completes successfully
    stopPolling();
  };

  const handleRetry = async () => {
    if (!currentScan) return;

    try {
      setErrorSafe(null);
      setUploadState({ status: 'processing', message: 'Retrying scan...' });
      
      const response = await scanApi.retryScan(currentScan.id);
      
      if (response.error) {
        throw new Error(typeof response.error === 'string' ? response.error : response.error.message);
      }

      // Re-establish SSE connection with validation
      const scanId = currentScan.scanId || currentScan.id;
      if (scanId && scanId !== 'undefined' && scanId !== 'null') {
        console.log('[DEBUG] Re-establishing SSE connection for retry:', scanId);
        establishSSEConnection(scanId);
      } else {
        console.error('[DEBUG] Cannot re-establish SSE connection: Invalid scanId:', scanId);
        setErrorSafe('Invalid scan ID. Cannot establish connection to server.');
        setUploadState({ status: 'error', message: 'Invalid scan ID.' });
      }
      
    } catch (err) {
      console.error('Retry error:', err);
      const errorMessage = handleScanError(err);
      setErrorSafe(errorMessage);
      setUploadState({ status: 'error', message: errorMessage });
    }
  };

  const handleManualRefresh = async () => {
    if (!urlScanId || urlScanId === 'undefined') return;

    console.log('[MANUAL REFRESH] User triggered manual refresh for scanId:', urlScanId);
    
    try {
      setErrorSafe(null);
      setUploadState({ 
        status: 'processing', 
        message: 'Refreshing scan results...',
        progress: {
          scanId: urlScanId,
          current: 0,
          total: 1,
          status: 'processing',
          message: 'Refreshing scan results...',
          estimatedTimeRemaining: 0,
          pagesProcessed: 0,
          totalPages: 0
        }
      });
      
      // Clear existing results to show loading state
      setMainResults([]);
      setInProgressResults([]);
      
      // Fetch fresh data from backend
      const response = await scanApi.getScan(urlScanId);
      
      if (response.error || !response.data) {
        throw new Error(response.error ? String(response.error) : 'Failed to fetch scan results');
      }
      
      const scanSession = response.data;
      console.log('[MANUAL REFRESH] Fresh data from BE:', scanSession);
      
      // Extract scanId from the correct field
      const scanId = scanSession.scanId || scanSession.id;
      
      setCurrentScan(scanSession);
      setMainResults(scanSession.results || []);
      setInProgressResults([]);
      
      // If scan is still processing, re-establish SSE connection
      if (scanSession.status === 'processing') {
        console.log('[MANUAL REFRESH] Scan is processing, re-establishing SSE connection');
        if (scanId && scanId !== 'undefined' && scanId !== 'null') {
          establishSSEConnection(scanId);
        } else {
          console.error('[MANUAL REFRESH] Cannot re-establish SSE connection: Invalid scanId:', scanId);
          setErrorSafe('Invalid scan ID. Cannot establish connection to server.');
          setUploadState({ status: 'error', message: 'Invalid scan ID.' });
        }
      }
      
      setUploadState({
        status: scanSession.status === 'complete' ? 'complete' : 'processing',
        message: scanSession.status === 'complete' ? 'Analysis completed successfully' : 'Processing document...',
        progress: {
          scanId: scanId,
          current: scanSession.metadata?.chunksProcessed ?? 0,
          total: scanSession.metadata?.totalChunks ?? 0,
          status: scanSession.status === 'complete' ? 'complete' : 'processing',
          message: scanSession.status === 'complete' ? 'Analysis completed' : 'Processing...',
          estimatedTimeRemaining: 0,
          pagesProcessed: scanSession.metadata?.totalPages ?? 0,
          totalPages: scanSession.metadata?.totalPages ?? 0
        }
      });
      
    } catch (err) {
      console.error('[MANUAL REFRESH] Error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh results';
      setErrorSafe(errorMessage);
      setUploadState({ status: 'error', message: errorMessage });
    } finally {
      // setIsLoadingFromBE(false); // This state is removed, so this line is removed
    }
  };

  const handleReset = () => {
    setUploadState({ status: 'idle' });
    setCurrentScan(null);
    setMainResults([]);
    setInProgressResults([]);
    setErrorSafe(null);
    
    // Clear localStorage when resetting
    if (typeof window !== 'undefined') {
      localStorage.removeItem('currentScanId');
      console.log('[PERSISTENCE DEBUG] Cleared scanId from localStorage');
    }
    
    if (sseConnectionRef.current) {
      sseConnectionRef.current.disconnect();
      sseConnectionRef.current = null;
    }
    
    // Stop polling when resetting
    stopPolling();
    
    // Navigate to the base document scanner URL to show the upload interface
    navigate('/document-scanner');
  };

  // Function to clear all scan results and return to initial state
  const clearAllResults = () => {
    console.log('[DEBUG] Clearing all scan results and returning to initial state');
    handleReset();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sseConnectionRef.current) {
        sseConnectionRef.current.disconnect();
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Escape key to clear results and return to upload state
      if (event.key === 'Escape' && (error || currentScan || mainResults.length > 0)) {
        event.preventDefault();
        console.log('[DEBUG] Escape key pressed - clearing results');
        clearAllResults();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [error, currentScan, mainResults.length]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        handleFileUpload(acceptedFiles[0]);
      }
    },
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
    disabled: uploadState.status === 'uploading' || uploadState.status === 'processing',
  });

  const renderProgressState = () => {
    if (!uploadState.progress) return null;
    
    const { current, total, status, message, estimatedTimeRemaining, pagesProcessed, totalPages } = uploadState.progress;
    const progress = total > 0 ? (current / total) * 100 : 0;

    return (
      <Fade in={true} timeout={500}>
        <Card 
          sx={{ 
            mt: 3, 
            mb: 3,
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(14, 165, 233, 0.05) 100%)',
            border: '1px solid',
            borderColor: 'primary.main',
            borderRadius: 3,
            overflow: 'hidden',
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '3px',
              background: 'linear-gradient(90deg, #6366f1 0%, #0ea5e9 100%)',
            }
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SecurityIcon sx={{ color: 'primary.main', fontSize: 24 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  AI Analysis in Progress
                </Typography>
              </Box>
              <Chip 
                label={
                  status === 'processing' ? 'Analyzing' : 
                  status === 'complete' ? 'Complete' : 
                  status === 'error' ? 'Error' : 
                  'Processing'
                }
                color={
                  status === 'processing' ? 'primary' : 
                  status === 'complete' ? 'success' : 
                  status === 'error' ? 'error' : 
                  'default'
                }
                size="small"
                sx={{ 
                  fontWeight: 600,
                  '& .MuiChip-label': { px: 2 }
                }}
              />
            </Box>
            
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3, lineHeight: 1.6 }}>
              {message}
            </Typography>

            {total > 0 && (
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Processing Progress
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                    {Math.round(progress)}%
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={progress}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: alpha('#6366f1', 0.1),
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 4,
                      background: 'linear-gradient(90deg, #6366f1 0%, #0ea5e9 100%)',
                    }
                  }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Chunk {current} of {total}
                  </Typography>
                  {estimatedTimeRemaining && estimatedTimeRemaining > 0 && (
                    <Typography variant="body2" color="text.secondary">
                      ~{Math.ceil(estimatedTimeRemaining / 60)} min remaining
                    </Typography>
                  )}
                </Box>
              </Box>
            )}

            {totalPages && totalPages > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <DocumentIcon sx={{ fontSize: 16 }} />
                  Pages processed: {pagesProcessed || 0} of {totalPages}
                </Typography>
              </Box>
            )}

            {estimatedTimeRemaining && estimatedTimeRemaining > 0 && (
              <Typography variant="body2" color="text.secondary">
                Estimated time remaining: {Math.ceil(estimatedTimeRemaining / 60)} minutes
              </Typography>
            )}
          </CardContent>
        </Card>
      </Fade>
    );
  };

  const renderResults = () => {
    // Only render results when we actually have them and are not in a progress state
    if (mainResults.length === 0 && inProgressResults.length === 0) return null;
    
    // Don't render results during progress states - let the unified progress display handle those
    if (uploadState.status === 'uploading' || uploadState.status === 'loading-from-be') {
      return null;
    }

    // Helper to map ScanProgress status for ScanResults
    const mapProgressForScanResults = (progress: ScanProgress | undefined): any => {
      if (!progress) return null;
      // Map 'complete' to 'completed' for ScanResults compatibility
      return {
        ...progress,
        status: progress.status === 'complete' ? 'completed' : progress.status
      };
    };

    return (
      <Grow in={true} timeout={600}>
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>
            Analysis Results
          </Typography>
          


          {/* In-Progress Results */}
          {inProgressResults.length > 0 && (
            <Card 
              sx={{ 
                mb: 3, 
                border: '2px dashed', 
                borderColor: 'primary.main',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.02) 0%, rgba(14, 165, 233, 0.02) 100%)',
                borderRadius: 3
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" color="primary" gutterBottom sx={{ fontWeight: 600 }}>
                  Processing Results ({inProgressResults.length} clauses detected so far)
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  These are partial results. More clauses may be detected as processing continues.
                </Typography>
                <ScanResults results={inProgressResults} progress={mapProgressForScanResults(uploadState.progress)} />
              </CardContent>
            </Card>
          )}

          {/* Complete Results */}
          {mainResults.length > 0 && (
            <Card sx={{ borderRadius: 3, overflow: 'hidden' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Final Results ({mainResults.length} clauses detected)
                </Typography>
                <ScanResults results={mainResults} progress={mapProgressForScanResults(uploadState.progress)} />
              </CardContent>
            </Card>
          )}
        </Box>
      </Grow>
    );
  };

  // console.log('[DEBUG] Render: uploadState', uploadState, 'mainResults', mainResults, 'currentScan', currentScan, 'error', error);
  return (
    <Box sx={{ 
      width: '100%', 
      maxWidth: 900, 
      mx: 'auto', 
      p: 4,
      minHeight: '100vh',
      background: 'linear-gradient(135deg, rgba(241, 245, 249, 0.5) 0%, rgba(255, 255, 255, 0.8) 100%)'
    }}>
      {/* Header Section */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography 
          variant="h3" 
          gutterBottom 
          sx={{ 
            fontWeight: 800,
            background: 'linear-gradient(135deg, #0f172a 0%, #6366f1 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 2
          }}
        >
          AI Document Scanner
        </Typography>
        <Typography 
          variant="h6" 
          color="text.secondary" 
          sx={{ 
            maxWidth: 600, 
            mx: 'auto',
            lineHeight: 1.6,
            fontWeight: 400
          }}
        >
          Upload compliance documents to automatically detect IT security clauses using advanced AI analysis
      </Typography>
      </Box>

      
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'center' }}>
        <Paper 
          sx={{ 
            p: 2, 
            borderRadius: 3,
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(8px)',
            border: '1px solid',
            borderColor: 'divider'
          }}
        >
      
        </Paper>
      </Box>

      {!user ? (
        <Fade in={true} timeout={500}>
          <Box sx={{ 
            textAlign: 'center', 
            py: 8,
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(241, 245, 249, 0.6) 100%)',
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider'
          }}>
            <SecurityIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 600 }}>
              Authentication Required
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
            Please sign in to upload and analyze documents
          </Typography>
        </Box>
        </Fade>
      ) : (
        <>
          {/* File Upload Zone */}
          {uploadState.status === 'idle' && !urlScanId && (
            <Slide direction="up" in={true} timeout={600}>
              <Box
                {...getRootProps()}
                sx={{
                  border: '3px dashed',
                  borderColor: isDragActive ? 'primary.main' : 'grey.300',
                  borderRadius: 4,
                  p: 6,
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: isDragActive 
                    ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(14, 165, 233, 0.1) 100%)'
                    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(241, 245, 249, 0.6) 100%)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  backdropFilter: 'blur(8px)',
                  '&:hover': {
                    borderColor: 'primary.main',
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(14, 165, 233, 0.15) 100%)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 32px rgba(99, 102, 241, 0.15)',
                  },
                }}
              >
                <input {...getInputProps()} />
                <UploadIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
                <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
                  {isDragActive ? 'Drop your document here' : 'Upload Document for AI Analysis'}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  {isDragActive
                    ? 'Release to upload and analyze'
                    : 'Drag and drop your document here, or click to browse files'}
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
                  <Chip label="PDF" size="small" sx={{ fontWeight: 500 }} />
                  <Chip label="Word" size="small" sx={{ fontWeight: 500 }} />
                  <Chip label="Excel" size="small" sx={{ fontWeight: 500 }} />
                  <Chip label="Text" size="small" sx={{ fontWeight: 500 }} />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Maximum file size: 50MB
                </Typography>
              </Box>
            </Slide>
          )}

                    {/* Unified Progress Display */}
          {(uploadState.status === 'uploading' || uploadState.status === 'processing' || uploadState.status === 'loading-from-be') && (
            <Fade in={true} timeout={500}>
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Box sx={{ 
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(14, 165, 233, 0.1) 100%)',
                  mb: 3
                }}>
                  <CircularProgress 
                    size={60} 
                    sx={{ 
                      color: 'primary.main',
                      '& .MuiCircularProgress-circle': {
                        strokeLinecap: 'round',
                      }
                    }} 
                  />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                  {uploadState.message || 'Processing document...'}
                </Typography>
                {uploadState.progress && renderProgressState()}
                
                {/* Integrated refresh button for loading-from-be state */}
                {uploadState.status === 'loading-from-be' && currentScan && (
                  <Button
                    variant="outlined"
                    onClick={handleManualRefresh}
                    sx={{ mt: 3 }}
                    startIcon={<RefreshIcon />}
                  >
                    Refresh Results
                  </Button>
                )}
              </Box>
            </Fade>
          )}

          {/* Error Display */}
          {error && (
            <Slide direction="up" in={true} timeout={400}>
              <Alert 
                severity="error" 
                sx={{ 
                  mt: 3,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%)',
                  border: '1px solid',
                  borderColor: 'error.main'
                }}
                action={
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button 
                      color="inherit" 
                      size="small" 
                      onClick={handleRetry}
                      startIcon={<RefreshIcon />}
                      sx={{ fontWeight: 600 }}
                    >
                      Retry
                    </Button>
                    <Button 
                      color="inherit" 
                      size="small" 
                      onClick={clearAllResults}
                      startIcon={<AddIcon />}
                      sx={{ fontWeight: 600 }}
                    >
                      Start Fresh
                    </Button>
                  </Box>
                }
              >
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
              {typeof error === 'string' ? error : JSON.stringify(error)}
            </Typography>
              </Alert>
            </Slide>
          )}

          {/* Manual Refresh Button - Show when we have a scanId but no results and not currently loading */}
          {urlScanId && urlScanId !== 'undefined' && mainResults.length === 0 && inProgressResults.length === 0 && uploadState.status !== 'uploading' && uploadState.status !== 'processing' && uploadState.status !== 'loading-from-be' && (
            <Fade in={true} timeout={500}>
              <Box sx={{ mt: 4, textAlign: 'center' }}>
                <Alert 
                  severity="info" 
                  sx={{ 
                    mb: 3,
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%)',
                    border: '1px solid',
                    borderColor: 'primary.light'
                  }}
                  action={
                    <Button 
                      color="inherit" 
                      size="small" 
                      onClick={handleManualRefresh}
                      startIcon={<RefreshIcon />}
                      sx={{ fontWeight: 600 }}
                    >
                      Refresh
                    </Button>
                  }
                >
                  <Typography variant="body2">
                    No results found for this scan. The analysis may still be processing or the results may not be available yet.
                  </Typography>
                </Alert>
              </Box>
            </Fade>
          )}

          {/* Results Display */}
          {renderResults()}

          {/* Action Buttons */}
          {uploadState.status === 'complete' && (
            <Grow in={true} timeout={800}>
              <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button 
                  variant="contained" 
                  onClick={handleReset}
                  startIcon={<AddIcon />}
                  sx={{
                    background: 'linear-gradient(135deg, #6366f1 0%, #0ea5e9 100%)',
                    borderRadius: 2,
                    px: 4,
                    py: 1.5,
                    fontWeight: 600,
                    textTransform: 'none',
                    fontSize: '1rem',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #4f46e5 0%, #0284c7 100%)',
                      transform: 'translateY(-1px)',
                      boxShadow: '0 8px 25px rgba(99, 102, 241, 0.3)',
                    }
                  }}
                >
                  Scan Another Document
                </Button>
                {currentScan && (
                  <Button 
                    variant="outlined" 
                    onClick={() => {
                      const scanId = currentScan?.id || currentScan?.scanId;
                      console.log('[DEBUG] Opening project creation modal for scan:', {
                        currentScan,
                        scanId,
                        id: currentScan?.id,
                        scanIdField: currentScan?.scanId
                      });
                      setShowProjectCreationModal(true);
                    }}
                    sx={{
                      borderRadius: 2,
                      px: 4,
                      py: 1.5,
                      fontWeight: 600,
                      textTransform: 'none',
                      fontSize: '1rem',
                      borderColor: 'primary.main',
                      color: 'primary.main',
                      '&:hover': {
                        background: 'rgba(99, 102, 241, 0.08)',
                        borderColor: 'primary.dark',
                        transform: 'translateY(-1px)',
                      }
                    }}
                  >
                    Create Project from Results
                  </Button>
                )}
            </Box>
            </Grow>
          )}
        </>
      )}

      {/* Project Creation Modal */}
      <SimpleProjectCreationModal
        isOpen={showProjectCreationModal}
        onClose={() => setShowProjectCreationModal(false)}
        scanResults={mainResults}
        onProjectCreated={(project) => {
          console.log('[DEBUG] Project created successfully:', project);
          setShowProjectCreationModal(false);
          // Navigate to the Matrix tab to show the bookmarked clauses
          // The project will be automatically selected in the context
        }}
      />
    </Box>
  );
}; 