import React from 'react';
import {
  Drawer,
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { useClause } from '../contexts/ClauseContext';

const drawerWidth = 320;

export const Sidebar = () => {
  const { searchQuery, setSearchQuery, selectedFamily, setSelectedFamily, families } = useClause();

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
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
            value={selectedFamily}
            label="Filter by Family"
            onChange={(e) => setSelectedFamily(e.target.value)}
          >
            <MenuItem value="">All Families</MenuItem>
            {families.map((family) => (
              <MenuItem key={family.id} value={family.id}>
                {family.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    </Drawer>
  );
}; 