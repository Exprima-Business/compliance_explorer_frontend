import React, { useCallback, useMemo } from 'react';
import {
  Drawer,
  Box,
  TextField,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Search as SearchIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useClause } from '../contexts/ClauseContext';
import { useBookmarks } from '../contexts/BookmarkContext';
import { BookmarkedClauses } from './BookmarkedClauses';
import ProjectSelector from './ProjectSelector';
import ConnectionStatus from './ConnectionStatus';
import type { ClauseFamily, ClauseFamilyGroup, Clause } from '../types/clause';

const drawerWidth = 320;

interface SidebarProps {
  isMobile?: boolean;
  open?: boolean;
  onClose?: () => void;
  onSettingsClick?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobile = false, open = true, onClose, onSettingsClick }) => {
  const { searchQuery, setSearchQuery, selectedFamily, setSelectedFamily, families, clauses } = useClause();
  const { bookmarks, toggleBookmark, bookmarkError, clearBookmarkError, connectionStatus } = useBookmarks();

  const handleFamilyClick = useCallback((family: ClauseFamily | null) => {
    setSelectedFamily(family);
  }, [setSelectedFamily]);

  const validFamilies = useMemo(() =>
    Array.isArray(families)
      ? families.filter((fg): fg is ClauseFamilyGroup =>
          Boolean(fg && fg.family && fg.family.id && fg.family.name)
        )
      : [],
  [families]);

  // Get bookmarked clauses using BookmarkContext as authority
  const bookmarkedClauses = useMemo(() =>
    clauses.filter(clause => bookmarks.some(bookmark => bookmark.clauseId === clause.id)),
  [clauses, bookmarks]);

  const handleBookmarkToggle = useCallback(async (clause: Clause) => {
    await toggleBookmark(clause.id);
  }, [toggleBookmark]);

  return (
    <Drawer
      variant={isMobile ? 'temporary' : 'permanent'}
      open={isMobile ? open : true}
      onClose={onClose}
      sx={{
        width: isMobile ? 0 : drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: isMobile ? 'min(280px, 80vw)' : drawerWidth,
          boxSizing: 'border-box',
          marginTop: isMobile ? 0 : '64px',
          backgroundColor: 'background.paper',
          borderRight: '1px solid rgba(148, 163, 184, 0.1)',
          padding: 2,
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
        {/* Mobile-only: project selector, connection status, settings */}
        {isMobile && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <ProjectSelector />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <ConnectionStatus status={connectionStatus} showLabel={false} size="small" />
                {onSettingsClick && (
                  <Tooltip title="Settings">
                    <IconButton color="inherit" onClick={onSettingsClick} size="small">
                      <SettingsIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </Box>
            <Divider />
          </Box>
        )}
        <TextField
          fullWidth
          id="clause-search"
          name="clause-search"
          variant="outlined"
          placeholder="Search clauses..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />,
          }}
        />
        <FormControl fullWidth>
          <InputLabel>Filter by Family</InputLabel>
          <Select
            value={selectedFamily?.id || ''}
            label="Filter by Family"
            onChange={(e) => {
              const familyId = e.target.value;
              if (!familyId) {
                handleFamilyClick(null);
                return;
              }
              const familyGroup = validFamilies.find(fg => fg.family.id === familyId);
              handleFamilyClick(familyGroup?.family || null);
            }}
          >
            <MenuItem value="">All Families</MenuItem>
            {validFamilies.map((familyGroup) => (
              <MenuItem key={familyGroup.family.id} value={familyGroup.family.id}>
                {familyGroup.family.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Divider />

        {/* Bookmarked Clauses Section */}
        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          <BookmarkedClauses
            bookmarkedClauses={bookmarkedClauses}
            onBookmarkToggle={handleBookmarkToggle}
          />
        </Box>
      </Box>

      {/* Bookmark error feedback — surfaces failures from Sidebar toggle actions */}
      <Snackbar
        open={!!bookmarkError}
        autoHideDuration={4000}
        onClose={clearBookmarkError}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={clearBookmarkError} severity="error" sx={{ width: '100%' }}>
          {bookmarkError}
        </Alert>
      </Snackbar>
    </Drawer>
  );
};
