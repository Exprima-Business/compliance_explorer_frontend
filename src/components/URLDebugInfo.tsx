import React from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { Box, Typography, Paper } from '@mui/material';
import { useURLBasedNavigation } from '../hooks/useURLBasedNavigation';

const ENABLE_URL_BASED_ROUTING = import.meta.env.VITE_ENABLE_URL_BASED_ROUTING === 'true';

export const URLDebugInfo: React.FC = () => {
  const { orgSlug, projectSlug } = useParams<{ orgSlug: string; projectSlug: string }>();
  const location = useLocation();
  const { getCurrentPath, isURLBasedRouting, isProduction } = useURLBasedNavigation();

  if (!ENABLE_URL_BASED_ROUTING) {
    return null; // Only show in URL-based routing mode
  }

  return (
    <Paper sx={{ p: 2, m: 2, backgroundColor: '#f5f5f5' }}>
      <Typography variant="h6" gutterBottom>
        URL Debug Information
      </Typography>
      <Box sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
        <div><strong>Full URL:</strong> {location.pathname}</div>
        <div><strong>URL Parameters:</strong></div>
        <div style={{ marginLeft: '1rem' }}>
          <div>orgSlug: {orgSlug || 'undefined'}</div>
          <div>projectSlug: {projectSlug || 'undefined'}</div>
        </div>
        <div><strong>Extracted Path:</strong> {getCurrentPath()}</div>
        <div><strong>URL-Based Routing:</strong> {isURLBasedRouting ? 'Enabled' : 'Disabled'}</div>
        <div><strong>Production Mode:</strong> {isProduction ? 'Yes' : 'No'}</div>
      </Box>
    </Paper>
  );
}; 