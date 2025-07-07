import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, Alert, Paper } from '@mui/material';
import { useHybridApi } from '../hooks/useHybridApi';
import { useURLBasedNavigation } from '../hooks/useURLBasedNavigation';

const ENABLE_URL_BASED_ROUTING = import.meta.env.VITE_ENABLE_URL_BASED_ROUTING === 'true';

export const ApiTestComponent: React.FC = () => {
  const { apiCall, currentOrg, currentProject, isURLBasedRouting } = useHybridApi();
  const { getCurrentPath } = useURLBasedNavigation();
  const [testResults, setTestResults] = useState<{
    clauses?: any;
    projects?: any;
    error?: string;
  }>({});
  const [isLoading, setIsLoading] = useState(false);

  const runApiTests = async () => {
    setIsLoading(true);
    setTestResults({});

    try {
      // Test clauses endpoint
      const clausesResult = await apiCall('/clauses');
      setTestResults(prev => ({ ...prev, clauses: clausesResult }));

      // Test projects endpoint
      const projectsResult = await apiCall('/projects');
      setTestResults(prev => ({ ...prev, projects: projectsResult }));

    } catch (error) {
      setTestResults(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }));
    } finally {
      setIsLoading(false);
    }
  };

  if (!ENABLE_URL_BASED_ROUTING) {
    return null; // Only show in URL-based routing mode
  }

  return (
    <Paper sx={{ p: 2, m: 2, backgroundColor: '#f8f9fa' }}>
      <Typography variant="h6" gutterBottom>
        API Integration Test
      </Typography>
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" gutterBottom>
          <strong>Current Context:</strong>
        </Typography>
        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
          Organization: {currentOrg?.name} ({currentOrg?.slug})
        </Typography>
        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
          Project: {currentProject?.name} ({currentProject?.slug})
        </Typography>
        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
          Current Path: {getCurrentPath()}
        </Typography>
        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
          URL-Based Routing: {isURLBasedRouting ? 'Enabled' : 'Disabled'}
        </Typography>
      </Box>

      <Button 
        variant="contained" 
        onClick={runApiTests}
        disabled={isLoading}
        sx={{ mb: 2 }}
      >
        {isLoading ? 'Testing...' : 'Test API Calls'}
      </Button>

      {testResults.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Error: {testResults.error}
        </Alert>
      )}

      {testResults.clauses && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Clauses API Result:
          </Typography>
          <Paper sx={{ p: 1, backgroundColor: '#fff' }}>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
              {JSON.stringify(testResults.clauses, null, 2)}
            </Typography>
          </Paper>
        </Box>
      )}

      {testResults.projects && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Projects API Result:
          </Typography>
          <Paper sx={{ p: 1, backgroundColor: '#fff' }}>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
              {JSON.stringify(testResults.projects, null, 2)}
            </Typography>
          </Paper>
        </Box>
      )}
    </Paper>
  );
}; 