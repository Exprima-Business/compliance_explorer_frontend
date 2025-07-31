import React from 'react';
import { Box, Paper } from '@mui/material';
import { ClauseCard } from './ClauseCard';
import type { Clause } from '../types/clause';

interface FloatingPanelProps {
  clause: Clause | null;
  onClose: () => void;
  onBookmarkToggle?: () => void;
}

export const FloatingPanel = ({ 
  clause, 
  onClose, 
  onBookmarkToggle 
}: FloatingPanelProps) => {
  if (!clause) return null;

  return (
    <Paper
      elevation={3}
      sx={{
        position: 'fixed',
        right: 20,
        top: { xs: 84, sm: 92 }, // Account for AppBar height (64px + 20px margin on xs, 72px + 20px margin on sm)
        bottom: 20,
        width: 400,
        overflow: 'auto',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        borderRadius: 2,
      }}
    >
      <Box sx={{ p: 2, flex: 1 }}>
        <ClauseCard 
          clause={clause} 
          onBookmarkToggle={onBookmarkToggle}
          onClose={onClose}
        />
      </Box>
    </Paper>
  );
}; 