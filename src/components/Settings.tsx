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

interface SettingsProps {
  open: boolean;
  onClose: () => void;
  preferences: {
    removeParentWithChild: boolean | null;
  };
  onPreferenceChange: (key: string, value: boolean | null) => void;
}

export const Settings = ({
  open,
  onClose,
  preferences,
  onPreferenceChange,
}: SettingsProps) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Settings</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Bookmark Preferences
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={preferences.removeParentWithChild === true}
                  onChange={(e) => onPreferenceChange('removeParentWithChild', e.target.checked ? true : null)}
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
            onClick={() => onPreferenceChange('removeParentWithChild', null)}
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