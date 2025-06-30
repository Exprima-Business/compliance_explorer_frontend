import React from 'react';
import { Box, Typography, Paper, Stack, IconButton } from '@mui/material';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import type { Clause } from '../types/clause';

interface BookmarkedClausesProps {
  bookmarkedClauses: Clause[];
  onClauseClick: (clause: Clause) => void;
  onBookmarkToggle: (clause: Clause) => void;
}

export const BookmarkedClauses = ({ 
  bookmarkedClauses, 
  onClauseClick,
  onBookmarkToggle 
}: BookmarkedClausesProps) => {
  if (bookmarkedClauses.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mt: 3 }}>
      <Typography 
        variant="subtitle1" 
        sx={{ 
          fontWeight: 600,
          mb: 2,
          color: 'text.primary',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}
      >
        <BookmarkIcon sx={{ fontSize: 20 }} />
        Bookmarked Clauses
      </Typography>
      <Stack spacing={2}>
        {bookmarkedClauses.map((clause) => (
          <Paper
            key={clause.id}
            elevation={0}
            sx={{
              p: 2,
              cursor: 'pointer',
              bgcolor: 'rgba(99, 102, 241, 0.03)',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                bgcolor: 'rgba(99, 102, 241, 0.05)',
                transform: 'translateY(-1px)',
              }
            }}
            onClick={() => onClauseClick(clause)}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography 
                  variant="subtitle2" 
                  sx={{ 
                    fontWeight: 600,
                    color: 'primary.main',
                    mb: 0.5
                  }}
                >
                  {clause.clauseCode || clause.clauseId}
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: 'text.primary',
                    mb: 1,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}
                >
                  {clause.title}
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Family:</strong> {clause.family?.name || 'No Family'}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: clause.riskClassification === 'HIGH'
                        ? 'error.main'
                        : clause.riskClassification === 'MEDIUM'
                        ? 'warning.main'
                        : 'success.main',
                      fontWeight: 500
                    }}
                  >
                    <strong>Risk:</strong> {clause.riskClassification}
                  </Typography>
                </Box>
              </Box>
              <IconButton 
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onBookmarkToggle(clause);
                }}
                sx={{ 
                  color: 'primary.main',
                  '&:hover': {
                    color: 'primary.dark',
                  }
                }}
              >
                <BookmarkIcon fontSize="small" />
              </IconButton>
            </Box>
          </Paper>
        ))}
      </Stack>
    </Box>
  );
}; 