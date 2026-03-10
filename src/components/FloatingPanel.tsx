import React from 'react';
import { Box, Paper, Drawer, useMediaQuery, useTheme } from '@mui/material';
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  if (!clause) return null;

  // Mobile: bottom sheet drawer
  if (isMobile) {
    return (
      <Drawer
        anchor="bottom"
        open={!!clause}
        onClose={onClose}
        sx={{
          zIndex: 1200,
          '& .MuiDrawer-paper': {
            maxHeight: '85vh',
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            overflow: 'auto',
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <ClauseCard
            clause={clause}
            onBookmarkToggle={onBookmarkToggle}
            onClose={onClose}
          />
        </Box>
      </Drawer>
    );
  }

  // Desktop: fixed side panel (unchanged)
  return (
    <Paper
      elevation={3}
      sx={{
        position: 'fixed',
        right: 20,
        top: { xs: 84, sm: 92 },
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