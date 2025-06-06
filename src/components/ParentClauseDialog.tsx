import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  FormControlLabel,
  Checkbox,
  Tooltip,
  Box,
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import type { Clause } from '../types/clause';

interface ParentClauseDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (removeParent: boolean, rememberChoice: boolean) => void;
  childClause: Clause;
  parentClause: Clause;
}

export const ParentClauseDialog = ({
  open,
  onClose,
  onConfirm,
  childClause,
  parentClause,
}: ParentClauseDialogProps) => {
  const [rememberChoice, setRememberChoice] = useState(false);

  const handleConfirm = (removeParent: boolean) => {
    onConfirm(removeParent, rememberChoice);
    setRememberChoice(false); // Reset for next time
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Remove Parent Clause?</DialogTitle>
      <DialogContent>
        <Typography variant="body1" sx={{ mb: 2 }}>
          You are removing the bookmark for clause "{childClause.title}" (ID: {childClause.id}).
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          This clause has a parent clause "{parentClause.title}" (ID: {parentClause.id}) that is also bookmarked.
        </Typography>
        <Typography variant="body1" sx={{ mb: 2, color: 'text.secondary' }}>
          Would you like to remove the parent clause bookmark as well? This choice will affect how parent-child clause relationships are handled in the future.
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={rememberChoice}
                onChange={(e) => setRememberChoice(e.target.checked)}
              />
            }
            label="Remember my choice"
          />
          <Tooltip title="Your preference will be saved and applied automatically in the future. You can change this setting later.">
            <InfoIcon fontSize="small" sx={{ ml: 1, color: 'text.secondary' }} />
          </Tooltip>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={() => handleConfirm(false)}>No</Button>
        <Button onClick={() => handleConfirm(true)} variant="contained">
          Yes
        </Button>
      </DialogActions>
    </Dialog>
  );
}; 