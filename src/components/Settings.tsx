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
  List,
  ListItem,
  ListItemText,
  IconButton,
  Chip,
  Divider,
  Alert,
  TextField,
  Stack,
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import DeleteIcon from '@mui/icons-material/Delete';
import { useQueryClient } from '@tanstack/react-query';
import { usePreferences } from '../contexts/PreferencesContext';
import { useProject } from '../contexts/ProjectContext';
import { profileService } from '../services/profileService';

interface SettingsProps {
  open: boolean;
  onClose: () => void;
}

export const Settings = ({
  open,
  onClose,
}: SettingsProps) => {
  const { preferences, updatePreference } = usePreferences();
  const { projects, currentProject, deleteProject } = useProject();
  const queryClient = useQueryClient();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const handleDelete = async (id: string) => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteProject(id);
      setConfirmDeleteId(null);
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete project');
    } finally {
      setDeleting(false);
    }
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

        {/* ── Project Management ──────────────────────────── */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Project Management
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {projects.length} project{projects.length !== 1 ? 's' : ''} in your organization
          </Typography>
          {deleteError && <Alert severity="error" sx={{ mb: 1 }}>{deleteError}</Alert>}
          <List dense disablePadding>
            {projects.map(p => (
              <ListItem
                key={p.id}
                secondaryAction={
                  confirmDeleteId === p.id ? (
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Button
                        size="small"
                        color="error"
                        variant="contained"
                        disabled={deleting}
                        onClick={() => handleDelete(p.id)}
                      >
                        {deleting ? 'Deleting…' : 'Confirm'}
                      </Button>
                      <Button size="small" onClick={() => setConfirmDeleteId(null)}>
                        Cancel
                      </Button>
                    </Box>
                  ) : (
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={() => setConfirmDeleteId(p.id)}
                      title="Delete project"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )
                }
                sx={{ borderRadius: 1, mb: 0.5, bgcolor: p.id === currentProject?.id ? 'action.selected' : undefined }}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {p.name}
                      {p.id === currentProject?.id && (
                        <Chip label="Active" size="small" color="primary" sx={{ height: 20, fontSize: '0.65rem' }} />
                      )}
                    </Box>
                  }
                  secondary={p.description || `Created ${new Date(p.createdAt).toLocaleDateString()}`}
                />
              </ListItem>
            ))}
          </List>
          {confirmDeleteId && (
            <Alert severity="warning" sx={{ mt: 1 }}>
              This permanently deletes all project data including controls, assessments, bookmarks, and scan results.
            </Alert>
          )}
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
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}; 