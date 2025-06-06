import React from 'react';
import { Box, IconButton, Paper } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { ClauseCard } from './ClauseCard';
import type { Clause } from '../types/clause';

interface FloatingPanelProps {
  clause: Clause | null;
  onClose: () => void;
  isBookmarked?: boolean;
  onBookmarkToggle?: () => void;
}

export const FloatingPanel = ({ 
  clause, 
  onClose, 
  isBookmarked = false,
  onBookmarkToggle 
}: FloatingPanelProps) => {
  if (!clause) return null;

  return (
    <Paper
      elevation={3}
      sx={{
        position: 'fixed',
        right: 20,
        top: 20,
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
      <Box sx={{ 
        position: 'sticky', 
        top: 0, 
        p: 1, 
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        justifyContent: 'flex-end',
        zIndex: 1
      }}>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>
      <Box sx={{ p: 2, flex: 1 }}>
        <ClauseCard 
          clause={clause} 
          isBookmarked={isBookmarked}
          onBookmarkToggle={onBookmarkToggle}
        />
      </Box>
    </Paper>
  );
}; 