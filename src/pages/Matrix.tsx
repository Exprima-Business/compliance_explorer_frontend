import React from 'react';
import { Box, Typography, Paper, List, ListItem, ListItemText, Divider } from '@mui/material';
import { useClauseContext } from '../contexts/ClauseContext';

export default function Matrix() {
  const { clauses, loading, error } = useClauseContext();

  // Filter bookmarked clauses
  const bookmarkedClauses = clauses.filter(clause => clause.isBookmarked);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading bookmarked clauses...</Typography>
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
      p: 3
    }}>
      <Typography variant="h4" gutterBottom>
        Bookmarked Clauses
      </Typography>
      {bookmarkedClauses.length === 0 ? (
        <Paper sx={{ p: 3, mt: 2 }}>
          <Typography>
            No clauses have been bookmarked yet. Select clauses in the Clauses view to bookmark them.
          </Typography>
        </Paper>
      ) : (
        <Paper sx={{ mt: 2 }}>
          <List>
            {bookmarkedClauses.map((clause, index) => (
              <React.Fragment key={clause.id}>
                <ListItem>
                  <ListItemText
                    primary={clause.title}
                    secondary={clause.description}
                  />
                </ListItem>
                {index < bookmarkedClauses.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );
} 