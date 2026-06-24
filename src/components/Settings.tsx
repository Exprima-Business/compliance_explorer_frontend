import React, { useState, useEffect } from 'react';
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
  IconButton,
  Divider,
  Alert,
  TextField,
  Stack,
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import { useQueryClient } from '@tanstack/react-query';
import { usePreferences } from '../contexts/PreferencesContext';
import { profileService } from '../services/profileService';
import { accountService, downloadJson } from '../services/accountService';

interface SettingsProps {
  open: boolean;
  onClose: () => void;
}

export const Settings = ({
  open,
  onClose,
}: SettingsProps) => {
  const { preferences, updatePreference } = usePreferences();
  const queryClient = useQueryClient();

  // Profile (display name) — stored on auth user_metadata; the owner picker
  // shows this instead of the email once set.
  const [displayName, setDisplayName] = useState('');
  const [profileEmail, setProfileEmail] = useState<string | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [nameMsg, setNameMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setProfileLoaded(false);
    setNameMsg(null);
    (async () => {
      const resp = await profileService.get();
      if (cancelled) return;
      setDisplayName(resp.data?.fullName ?? '');
      setProfileEmail(resp.data?.email ?? null);
      setProfileLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [open]);

  const handleSaveName = async () => {
    setSavingName(true);
    setNameMsg(null);
    const resp = await profileService.update(displayName.trim());
    setSavingName(false);
    if (resp.error) {
      setNameMsg(typeof resp.error === 'string' ? resp.error : resp.error.message ?? 'Failed to save');
      return;
    }
    setDisplayName(resp.data?.fullName ?? '');
    // Refresh the owner picker so it shows the new name immediately.
    queryClient.invalidateQueries({ queryKey: ['orgMembers'] });
    setNameMsg('Saved');
    setTimeout(() => setNameMsg(null), 2400);
  };

  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState<string | null>(null);
  const handleExport = async () => {
    setExporting(true);
    setExportMsg(null);
    const resp = await accountService.exportOrgData();
    setExporting(false);
    if (resp.error) {
      setExportMsg(typeof resp.error === 'string' ? resp.error : resp.error.message ?? 'Export failed');
      return;
    }
    const stamp = new Date().toISOString().slice(0, 10);
    downloadJson(resp.data, `clauseatlas-export-${stamp}.json`);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Settings</DialogTitle>
      <DialogContent>
        {/* ── Profile ─────────────────────────────────────── */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Profile
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Your display name is how teammates see you when assigning requirement
            owners. Without one, you appear as your email{profileEmail ? ` (${profileEmail})` : ''}.
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              size="small"
              label="Display name"
              placeholder="e.g. Elliott Mattice"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={!profileLoaded || savingName}
              inputProps={{ maxLength: 120 }}
              sx={{ flex: 1 }}
            />
            <Button
              variant="outlined"
              onClick={handleSaveName}
              disabled={!profileLoaded || savingName}
            >
              {savingName ? 'Saving…' : 'Save'}
            </Button>
            {nameMsg && (
              <Typography variant="caption" color={nameMsg === 'Saved' ? 'success.main' : 'error'}>
                {nameMsg}
              </Typography>
            )}
          </Stack>
        </Box>

        <Divider sx={{ mb: 3 }} />


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

        <Divider sx={{ mb: 3 }} />

        {/* ── Your data ───────────────────────────────────── */}
        <Box sx={{ mb: 1 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>Your data</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Download a JSON copy of your organization's data (evaluations, scans, POA&amp;M, and
            baseline). To request deletion of specific documents, use the delete actions in the
            Scanner and Evaluations, or email support.
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Button variant="outlined" onClick={handleExport} disabled={exporting}>
              {exporting ? 'Preparing…' : 'Export my data'}
            </Button>
            {exportMsg && <Typography variant="caption" color="error">{exportMsg}</Typography>}
          </Stack>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}; 