import React from 'react';
import { Box, Typography } from '@mui/material';
import { ClauseGraph } from '../components/ClauseGraph';
import { SearchBar } from '../components/SearchBar';
import { useClauseContext } from '../contexts/ClauseContext';

export default function Home() {
  const { clauses, loading, error, searchClauses } = useClauseContext();

  const handleSearch = async (query: string) => {
    if (query.trim()) {
      await searchClauses(query);
    }
  };

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
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ mb: 2 }}>
        <SearchBar onSearch={handleSearch} />
      </Box>
      <Box sx={{ flexGrow: 1, position: 'relative' }}>
        <ClauseGraph 
          clauses={clauses}
          onNodeClick={(clause) => {
            console.log('Selected clause:', clause);
            // Handle clause selection
          }}
        />
      </Box>
    </Box>
  );
} 