import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  CircularProgress, 
  FormControlLabel, 
  Switch,
  Alert,
  Button,
  Chip,
  LinearProgress,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import { useDropzone } from 'react-dropzone';
import { ScanResults } from '../ScanResults';
import { useAuth } from '../../contexts/AuthContext';
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

interface UploadState {
  status: 'idle' | 'uploading' | 'processing' | 'complete' | 'error';
  message?: string;
  progress?: ScanProgress;
}

export const DocumentScanner: React.FC = () => {
  const { user } = useAuth();
  const organization = { id: localStorage.getItem('orgId') || '00000000-0000-0000-0000-000000000000' };
  const [uploadState, setUploadState] = useState<UploadState>({ status: 'idle' });
  const [currentScan, setCurrentScan] = useState<ScanSession | null>(null);
  const [mainResults, setMainResults] = useState<DetectedClause[]>([]);
  const [inProgressResults, setInProgressResults] = useState<DetectedClause[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isTestMode, setIsTestMode] = useState(true);
  const sseConnectionRef = useRef<ScanSSEConnection | null>(null);

  // Auto-save hook for user modifications
  const useAutoSave = (scanId: string, data: any) => {
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    
    const debouncedSave = useCallback(
      async (data: any) => {
        setIsSaving(true);
        try {
          await scanApi.updateScanResults(scanId, data);
          setLastSaved(new Date());
        } catch (error) {
          console.error('Auto-save failed:', error);
        } finally {
          setIsSaving(false);
        }
      },
      [scanId]
    );
    
    useEffect(() => {
      const timeoutId = setTimeout(() => {
        debouncedSave(data);
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }, [data, debouncedSave]);
    
    return { isSaving, lastSaved };
  };

  const handleFileUpload = useCallback(async (file: File) => {
    if (!user || !organization) {
      setError('Authentication required. Please sign in and try again.');
      return;
    }

    try {
      // Validate file
      validateFile(file);
      
      setUploadState({ status: 'uploading', message: 'Uploading document...' });
      setError(null);
      setMainResults([]);
      setInProgressResults([]);

      // Upload document
      const response = await scanApi.uploadDocument(file, organization.id);
      
      if (response.error) {
        throw new Error(typeof response.error === 'string' ? response.error : response.error.message);
      }

      const { scanId } = response.data!;
      setCurrentScan({ 
        id: scanId, 
        status: 'processing',
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
          modelUsed: isTestMode ? 'gpt-3.5-turbo' : 'gpt-4',
          chunksProcessed: 0,
          totalChunks: 0
        },
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });

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

      // Establish SSE connection
      establishSSEConnection(scanId);

    } catch (err) {
      console.error('Upload error:', err);
      const errorMessage = handleScanError(err);
      setError(errorMessage);
      setUploadState({ status: 'error', message: errorMessage });
    }
  }, [user, organization, isTestMode]);

  const establishSSEConnection = (scanId: string) => {
    // Clean up existing connection
    if (sseConnectionRef.current) {
      sseConnectionRef.current.disconnect();
    }

    // Create new SSE connection
    sseConnectionRef.current = new ScanSSEConnection(
      scanId,
      (data) => handleSSEMessage(data),
      (error) => handleSSEError(error),
      () => handleSSEComplete()
    );

    sseConnectionRef.current.connect();
  };

  const handleSSEMessage = (data: any) => {
    console.log('SSE message received:', data);

    if (data.type === 'progress') {
      setUploadState(prev => ({
        ...prev,
        progress: data.data,
        message: data.data.message
      }));
    } else if (data.type === 'progressive_update') {
      const progressiveData: ProgressiveResults = data.data;
      setInProgressResults(progressiveData.partialResults);
      
      // Update progress with page information
      setUploadState(prev => ({
        ...prev,
        progress: {
          ...prev.progress!,
          pagesProcessed: progressiveData.pagesProcessed,
          totalPages: progressiveData.totalPages,
          estimatedTimeRemaining: progressiveData.estimatedTimeRemaining
        }
      }));
    } else if (data.type === 'complete') {
      const scanSession: ScanSession = data.data;
      setCurrentScan(scanSession);
      setMainResults(scanSession.results);
      setInProgressResults([]);
      setUploadState({ 
        status: 'complete', 
        message: 'Analysis completed successfully',
        progress: {
          scanId: scanSession.id,
          current: scanSession.metadata.chunksProcessed,
          total: scanSession.metadata.totalChunks,
          status: 'complete',
          message: 'Analysis completed',
          estimatedTimeRemaining: 0,
          pagesProcessed: scanSession.metadata.totalPages,
          totalPages: scanSession.metadata.totalPages
        }
      });
    }
  };

  const handleSSEError = (error: string) => {
    console.error('SSE error:', error);
    setError(error);
    setUploadState({ status: 'error', message: error });
  };

  const handleSSEComplete = () => {
    console.log('SSE connection completed');
    if (sseConnectionRef.current) {
      sseConnectionRef.current.disconnect();
      sseConnectionRef.current = null;
    }
  };

  const handleRetry = async () => {
    if (!currentScan) return;

    try {
      setError(null);
      setUploadState({ status: 'processing', message: 'Retrying scan...' });
      
      const response = await scanApi.retryScan(currentScan.id);
      
      if (response.error) {
        throw new Error(typeof response.error === 'string' ? response.error : response.error.message);
      }

      // Re-establish SSE connection
      establishSSEConnection(currentScan.id);
      
    } catch (err) {
      console.error('Retry error:', err);
      const errorMessage = handleScanError(err);
      setError(errorMessage);
      setUploadState({ status: 'error', message: errorMessage });
    }
  };

  const handleReset = () => {
    setUploadState({ status: 'idle' });
    setCurrentScan(null);
    setMainResults([]);
    setInProgressResults([]);
    setError(null);
    
    if (sseConnectionRef.current) {
      sseConnectionRef.current.disconnect();
      sseConnectionRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sseConnectionRef.current) {
        sseConnectionRef.current.disconnect();
      }
    };
  }, []);

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

  const renderProgress = () => {
    if (!uploadState.progress) return null;

    const { current, total, status, message, estimatedTimeRemaining, pagesProcessed, totalPages } = uploadState.progress;
    const progress = total > 0 ? (current / total) * 100 : 0;

    return (
      <Card sx={{ mt: 2, mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6">Processing Document</Typography>
            <Chip 
              label={status === 'processing' ? 'In Progress' : status === 'complete' ? 'Complete' : 'Error'}
              color={status === 'processing' ? 'primary' : status === 'complete' ? 'success' : 'error'}
              size="small"
            />
          </Box>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {message}
          </Typography>

          {total > 0 && (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Progress</Typography>
                <Typography variant="body2">{Math.round(progress)}%</Typography>
              </Box>
              <LinearProgress variant="determinate" value={progress} />
            </Box>
          )}

          {totalPages > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Pages processed: {pagesProcessed} of {totalPages}
              </Typography>
            </Box>
          )}

          {estimatedTimeRemaining > 0 && (
            <Typography variant="body2" color="text.secondary">
              Estimated time remaining: {Math.ceil(estimatedTimeRemaining / 60)} minutes
            </Typography>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderResults = () => {
    if (mainResults.length === 0 && inProgressResults.length === 0) return null;

    // Helper to map ScanProgress status for ScanResults
    const mapProgressForScanResults = (progress: ScanProgress | undefined): ScanProgress | null => {
      if (!progress) return null;
      // Map 'complete' to 'completed' for ScanResults compatibility
      return {
        ...progress,
        status: progress.status === 'complete' ? 'completed' : progress.status
      };
    };

    return (
      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Analysis Results
        </Typography>
        
        {isTestMode && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Document processed with GPT-3.5 (cost-optimized mode)
          </Alert>
        )}

        {/* In-Progress Results */}
        {inProgressResults.length > 0 && uploadState.status === 'processing' && (
          <Card sx={{ mb: 2, border: '1px dashed', borderColor: 'primary.main' }}>
            <CardContent>
              <Typography variant="subtitle1" color="primary" gutterBottom>
                Processing Results ({inProgressResults.length} clauses detected so far)
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                These are partial results. More clauses may be detected as processing continues.
              </Typography>
              <ScanResults results={inProgressResults} progress={mapProgressForScanResults(uploadState.progress)} />
            </CardContent>
          </Card>
        )}

        {/* Complete Results */}
        {mainResults.length > 0 && (
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Final Results ({mainResults.length} clauses detected)
              </Typography>
              <ScanResults results={mainResults} progress={mapProgressForScanResults(uploadState.progress)} />
            </CardContent>
          </Card>
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h5" gutterBottom>
        AI Document Scanner
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Upload compliance documents to automatically detect IT security clauses using AI.
      </Typography>

      <FormControlLabel
        control={
          <Switch
            checked={isTestMode}
            onChange={(e) => setIsTestMode(e.target.checked)}
            color="primary"
          />
        }
        label="Test Mode (Uses GPT-3.5 with optimized settings for cost efficiency)"
        sx={{ mb: 2 }}
      />

      {!user ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography color="text.secondary">
            Please sign in to upload and analyze documents
          </Typography>
        </Box>
      ) : (
        <>
          {/* File Upload Zone */}
          {uploadState.status === 'idle' && (
            <Box
              {...getRootProps()}
              sx={{
                border: '2px dashed',
                borderColor: isDragActive ? 'primary.main' : 'grey.300',
                borderRadius: 2,
                p: 4,
                textAlign: 'center',
                cursor: 'pointer',
                bgcolor: isDragActive ? 'action.hover' : 'background.paper',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: 'action.hover',
                },
              }}
            >
              <input {...getInputProps()} />
              <Typography>
                {isDragActive
                  ? 'Drop the document here'
                  : 'Drag and drop a document here, or click to select'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Supported formats: PDF, Word, Excel, Text (max 25MB)
              </Typography>
            </Box>
          )}

          {/* Progress Display */}
          {(uploadState.status === 'uploading' || uploadState.status === 'processing') && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CircularProgress size={40} sx={{ mb: 2 }} />
              <Typography>
                {uploadState.message || 'Processing document...'}
              </Typography>
              {renderProgress()}
            </Box>
          )}

          {/* Error Display */}
          {error && (
            <Alert 
              severity="error" 
              sx={{ mt: 2 }}
              action={
                <Button color="inherit" size="small" onClick={handleRetry}>
                  Retry
                </Button>
              }
            >
              {error}
            </Alert>
          )}

          {/* Results Display */}
          {renderResults()}

          {/* Action Buttons */}
          {uploadState.status === 'complete' && (
            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button 
                variant="contained" 
                onClick={handleReset}
                color="primary"
              >
                Scan Another Document
              </Button>
              {currentScan && (
                <Button 
                  variant="outlined" 
                  onClick={() => {
                    // TODO: Implement project creation from scan
                    console.log('Create project from scan:', currentScan.id);
                  }}
                >
                  Create Project from Results
                </Button>
              )}
            </Box>
          )}
        </>
      )}
    </Box>
  );
}; 