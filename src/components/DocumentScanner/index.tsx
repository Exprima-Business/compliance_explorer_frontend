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
                label={status === 'processing' ? 'Analyzing' : status === 'complete' ? 'Complete' : 'Error'}
                color={status === 'processing' ? 'primary' : status === 'complete' ? 'success' : 'error'}
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
              </Box>
            )}

            {totalPages > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <DocumentIcon sx={{ fontSize: 16 }} />
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
      </Fade>
    );
  };

  const renderResults = () => {
    if (mainResults.length === 0 && inProgressResults.length === 0) return null;

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
          
          {isTestMode && (
            <Alert 
              severity="info" 
              sx={{ 
                mb: 3,
                borderRadius: 2,
                background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%)',
                border: '1px solid',
                borderColor: 'primary.light'
              }}
            >
              <Typography variant="body2">
                Document processed with GPT-3.5 (cost-optimized mode)
              </Typography>
            </Alert>
          )}

          {/* In-Progress Results */}
          {inProgressResults.length > 0 && uploadState.status === 'processing' && (
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

      {/* Test Mode Toggle */}
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
          <FormControlLabel
            control={
              <Switch
                checked={isTestMode}
                onChange={(e) => setIsTestMode(e.target.checked)}
                color="primary"
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': {
                    color: '#6366f1',
                  },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: '#6366f1',
                  },
                }}
              />
            }
            label={
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                Test Mode (GPT-3.5 - Cost Optimized)
              </Typography>
            }
          />
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
          {uploadState.status === 'idle' && (
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

          {/* Progress Display */}
          {(uploadState.status === 'uploading' || uploadState.status === 'processing') && (
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
                {renderProgress()}
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
                  <Button 
                    color="inherit" 
                    size="small" 
                    onClick={handleRetry}
                    startIcon={<RefreshIcon />}
                    sx={{ fontWeight: 600 }}
                  >
                    Retry
                  </Button>
                }
              >
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {error}
                </Typography>
              </Alert>
            </Slide>
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
                      // TODO: Implement project creation from scan
                      console.log('Create project from scan:', currentScan.id);
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
    </Box>
  );
}; 