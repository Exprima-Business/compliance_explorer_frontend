import React, { useState } from 'react';
import { Box, Typography, Button, Paper, CircularProgress, Alert } from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import type { AuthContextType } from '../contexts/AuthContext';
import * as api from '../services/api';

const DocumentScanner: React.FC = () => {
  const auth = useAuth() as AuthContextType;
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      setUploading(true);
      setError(null);
      const response = await api.uploadDocument(file);
      console.log('Upload response:', response);
      // Handle successful upload
    } catch (error) {
      console.error('Upload error:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Document Scanner
      </Typography>
      <Paper sx={{ p: 3, mb: 3 }}>
        {!auth.isAuthenticated ? (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              Please sign in to use the document scanner.
            </Alert>
            <Typography variant="body1" sx={{ mb: 2 }}>
              The document scanner allows you to:
            </Typography>
            <ul>
              <li>Upload and analyze legal documents</li>
              <li>Extract relevant clauses and requirements</li>
              <li>Compare documents against compliance standards</li>
            </ul>
            <Button
              variant="contained"
              color="primary"
              onClick={() => window.location.href = '/login'}
              sx={{ mt: 2 }}
            >
              Sign In to Continue
            </Button>
          </Box>
        ) : (
          <>
            <input
              accept=".pdf,.doc,.docx"
              style={{ display: 'none' }}
              id="document-upload"
              type="file"
              onChange={handleFileChange}
            />
            <label htmlFor="document-upload">
              <Button
                variant="contained"
                component="span"
                disabled={uploading || analyzing}
              >
                Select Document
              </Button>
            </label>
            {file && (
              <Typography sx={{ mt: 2 }}>
                Selected file: {file.name}
              </Typography>
            )}
            {error && (
              <Typography color="error" sx={{ mt: 2 }}>
                {error}
              </Typography>
            )}
            <Box sx={{ mt: 2 }}>
              <Button
                variant="contained"
                onClick={handleUpload}
                disabled={!file || uploading || analyzing}
              >
                {uploading ? (
                  <>
                    <CircularProgress size={24} sx={{ mr: 1 }} />
                    Uploading...
                  </>
                ) : (
                  'Upload and Analyze'
                )}
              </Button>
            </Box>
          </>
        )}
      </Paper>
    </Box>
  );
};

export default DocumentScanner; 