import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Box,
  TextField,
  InputAdornment,
  Typography,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { useClause } from '../contexts/ClauseContext';
import { useBookmarks } from '../contexts/BookmarkContext';
import { BookmarkedClauses } from './BookmarkedClauses';
import type { ClauseFamily, ClauseFamilyGroup, Clause } from '../types/clause';

const drawerWidth = 320;

export const Sidebar: React.FC = () => {
  const { searchQuery, setSearchQuery, selectedFamily, setSelectedFamily, families, clauses } = useClause();
  const { bookmarks, toggleBookmark } = useBookmarks();

  const handleFamilyClick = (family: ClauseFamily | null) => {
    setSelectedFamily(family);
  };

  const validFamilies = Array.isArray(families)
    ? families.filter((fg): fg is ClauseFamilyGroup =>
        Boolean(fg && fg.family && fg.family.id && fg.family.name)
      )
    : []

  // Get bookmarked clauses
  const bookmarkedClauses = bookmarks
    .map(b => clauses.find(c => c.id === b.clauseId))
    .filter((c): c is Clause => Boolean(c));

  const handleClauseClick = (clause: Clause) => {
    // This could trigger opening the clause in the main view
    // For now, we'll just log it
    console.log('Clause clicked:', clause.clauseId);
  };

  const handleBookmarkToggle = async (clause: Clause) => {
    await toggleBookmark(clause.id);
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          marginTop: '64px', // Height of AppBar
          backgroundColor: 'background.paper',
          borderRight: '1px solid rgba(148, 163, 184, 0.1)',
          padding: 2,
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
        <TextField
          fullWidth
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
            onClauseClick={handleClauseClick}
            onBookmarkToggle={handleBookmarkToggle}
          />
        </Box>
      </Box>
    </Drawer>
  );
}; 