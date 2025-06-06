import React, { useState, useCallback } from 'react';
import { Box, Typography, CircularProgress, FormControlLabel, Switch } from '@mui/material';
import { useDropzone } from 'react-dropzone';
import { ScanResults } from '../ScanResults';
import { useAuth } from '../../contexts/AuthContext';

interface ScanProgress {
  current: number;
  total: number;
  status: 'processing' | 'completed' | 'error';
  message?: string;
}

export interface ScanResult {
  id: string;
  text: string;
  matches: Array<{
    clauseId: string;
    confidence: number;
    explanation: string;
  }>;
}

interface ClauseResult {
  clauseId: string;
  title: string;
  description: string;
  confidence: number;
  semanticSimilarity?: number;
  supportingContext?: string;
  family?: string;
  conditions?: string;
  implementationRequirements?: string;
}

export const DocumentScanner: React.FC = () => {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isTestMode, setIsTestMode] = useState(true);

  const transformResults = (scanResults: ScanResult[]): ClauseResult[] => {
    return scanResults.flatMap(result => 
      result.matches.map(match => ({
        clauseId: match.clauseId,
        title: `Match in ${result.id}`,
        description: match.explanation,
        confidence: match.confidence,
        supportingContext: result.text
      }))
    );
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setIsUploading(true);
    setError(null);
    setResults([]);
    setProgress(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Use test endpoint if in test mode
      const endpoint = isTestMode ? '/api/scan/document/test' : '/api/scan/document';
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      setResults(data.results);
      setIsUploading(false);

      if (isTestMode) {
        console.log(`Test mode: Processed ${data.processedChunks} of ${data.totalChunks} chunks`);
      }

      // Start polling for progress updates
      const progressInterval = setInterval(async () => {
        try {
          const progressResponse = await fetch(`/api/scan/progress?scanId=${data.scanId}`);
          if (!progressResponse.ok) {
            throw new Error('Failed to fetch progress');
          }

          const progressData = await progressResponse.json();
          setProgress(progressData);

          if (progressData.status === 'completed' || progressData.status === 'error') {
            clearInterval(progressInterval);
            setIsUploading(false);
          }
        } catch (error) {
          console.error('Error fetching progress:', error);
          clearInterval(progressInterval);
          setIsUploading(false);
        }
      }, 1000);

    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
      setIsUploading(false);
    }
  }, [isTestMode]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
    disabled: isUploading,
  });

  return (
    <Box sx={{ width: '100%', maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Document Scanner
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
          <Box
            {...getRootProps()}
            sx={{
              border: '2px dashed',
              borderColor: isDragActive ? 'primary.main' : 'grey.300',
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              cursor: isUploading ? 'not-allowed' : 'pointer',
              bgcolor: isDragActive ? 'action.hover' : 'background.paper',
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: 'action.hover',
              },
            }}
          >
            <input {...getInputProps()} />
            {isUploading ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <CircularProgress size={40} />
                <Typography>
                  {progress?.message || 'Processing document...'}
                </Typography>
                {progress && (
                  <Typography variant="body2" color="text.secondary">
                    Processing chunk {progress.current} of {progress.total}
                  </Typography>
                )}
              </Box>
            ) : (
              <Typography>
                {isDragActive
                  ? 'Drop the document here'
                  : 'Drag and drop a document here, or click to select'}
              </Typography>
            )}
          </Box>

          {error && (
            <Typography color="error" sx={{ mt: 2 }}>
              {error}
            </Typography>
          )}

          {results.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {isTestMode 
                  ? 'Document processed with GPT-3.5 (cost-optimized mode)'
                  : 'Document processed with GPT-4 (full analysis mode)'}
              </Typography>
              <ScanResults results={transformResults(results)} progress={progress} />
            </Box>
          )}
        </>
      )}
    </Box>
  );
}; 