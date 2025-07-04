import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button, CircularProgress, Typography } from '@mui/material';
import { useOrg } from '../contexts/OrgContext';

const OrgSetupDialog: React.FC = () => {
  const { orgs, createOrg, initialized } = useOrg();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Show dialog when orgs have been fetched (initialized) and user has none
    if (!initialized) return;
    setOpen(orgs.length === 0);
  }, [orgs.length, initialized]);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    try {
      setSubmitting(true);
      await createOrg(name.trim());
      setOpen(false);
      setName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create organisation');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} disableEscapeKeyDown>
      <DialogTitle>Create your first organisation</DialogTitle>
      <DialogContent>
        <Typography sx={{ mb: 2 }}>Enter a name for your organisation to get started.</Typography>
        <TextField
          fullWidth
          id="org-name"
          name="org-name"
          label="Organisation name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={submitting}
          autoFocus
        />
        {error && (
          <Typography color="error" variant="body2" sx={{ mt: 1 }}>
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleSubmit} variant="contained" disabled={submitting || !name.trim()}>
          {submitting ? <CircularProgress size={20} /> : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default OrgSetupDialog; 