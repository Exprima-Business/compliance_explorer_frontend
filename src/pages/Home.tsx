import React from 'react';
import { Box, Typography } from '@mui/material';
import { ClauseGraph } from '../components/ClauseGraph';
import { useClauseContext } from '../contexts/ClauseContext';

export default function Home() {
  const { clauses, loading, error } = useClauseContext();

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading clause map...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">Error: {error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      height: '100%', 
      width: '100%',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <ClauseGraph 
        clauses={clauses}
        onNodeClick={(clause) => {
          console.log('Selected clause:', clause);
          // Handle clause selection
        }}
      />
    </Box>
  );
} 