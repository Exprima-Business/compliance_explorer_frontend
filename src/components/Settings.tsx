import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Switch,
  FormControlLabel,
  Tooltip,
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import { usePreferences } from '../contexts/PreferencesContext';

interface SettingsProps {
  open: boolean;
  onClose: () => void;
}

export const Settings = ({
  open,
  onClose,
}: SettingsProps) => {
  const { preferences, updatePreference } = usePreferences();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Settings</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Bookmark Preferences
          </Typography>
          
          {/* Auto Bookmark Parents Setting */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={preferences.autoBookmarkParents}
                  onChange={(e) => updatePreference('autoBookmarkParents', e.target.checked)}
                />
              }
              label="Automatically bookmark parent clauses when bookmarking child clauses"
            />
            <Tooltip title="When enabled, parent clause bookmarks will be automatically added when their child clauses are bookmarked to ensure no mandatory clauses are missed">
              <InfoIcon fontSize="small" sx={{ ml: 1, color: 'text.secondary' }} />
            </Tooltip>
          </Box>

          {/* Remove Parent with Child Setting */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={preferences.removeParentWithChild === true}
                  onChange={(e) => updatePreference('removeParentWithChild', e.target.checked ? true : null)}
                />
              }
              label="Always remove parent clause when removing child clause"
            />
            <Tooltip title="When enabled, parent clause bookmarks will be automatically removed when their child clauses are unbookmarked">
              <InfoIcon fontSize="small" sx={{ ml: 1, color: 'text.secondary' }} />
            </Tooltip>
          </Box>
          
          <Button
            variant="outlined"
            color="primary"
            onClick={() => updatePreference('removeParentWithChild', null)}
            sx={{ mt: 1 }}
          >
            Reset to Ask Each Time
          </Button>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}; 