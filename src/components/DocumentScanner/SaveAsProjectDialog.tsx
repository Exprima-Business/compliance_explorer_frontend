import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Box,
} from '@mui/material';
import { scanApi } from '../../services/scanApi';
import { useProject } from '../../contexts/ProjectContext';
import { useOrg } from '../../contexts/OrgContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SaveAsProjectDialogProps {
  open: boolean;
  onClose: () => void;
  scanId: string | null;
  selectedClauseIds: string[];
  /** Called after the project is successfully created */
  onProjectCreated?: (projectId: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * SaveAsProjectDialog
 *
 * Creates a new project from scan results using ONE backend API call
 * (`POST /api/projects/create-from-scan`). The backend handles:
 *   - project creation
 *   - clause validation against the DB
 *   - bookmark creation
 *
 * **Why this fixes React #300:**
 * We do NOT call `ProjectContext.createProject()`, so `currentProject` is
 * never switched mid-render, BookmarkProvider never cascades, and hook
 * execution order stays stable. After the backend finishes, we simply
 * call `refreshProjects()` to pick up the new project in the list.
 */
const SaveAsProjectDialog: React.FC<SaveAsProjectDialogProps> = ({
  open,
  onClose,
  scanId,
  selectedClauseIds,
  onProjectCreated,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { refreshProjects } = useProject();
  const { currentOrg } = useOrg();

  const handleSubmit = async () => {
    if (!scanId) {
      setError('No scan ID available.');
      return;
    }
    if (!name.trim()) {
      setError('Project name is required.');
      return;
    }
    if (!currentOrg) {
      setError('No organization selected.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const resp = await scanApi.createProjectFromScan({
        scanId,
        projectName: name.trim(),
        selectedClauses: selectedClauseIds,
        organizationId: currentOrg.id,
      });

      if (resp.error) {
        const msg = typeof resp.error === 'string' ? resp.error : resp.error.message;
        setError(msg);
        return;
      }

      // Refresh the project list so the new project appears in the selector
      // without triggering a currentProject switch cascade
      await refreshProjects();

      // Notify parent
      if (resp.data?.project?.id) {
        onProjectCreated?.(resp.data.project.id);
      }

      // Clean up form state and close
      setName('');
      setDescription('');
      setError(null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return; // don't close while saving
    setName('');
    setDescription('');
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Save Scan Results as Project</DialogTitle>

      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Create a new project with {selectedClauseIds.length} selected clause
          {selectedClauseIds.length !== 1 && 's'} as bookmarks.
        </Typography>

        <TextField
          autoFocus
          fullWidth
          label="Project Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={loading}
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          label="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          multiline
          rows={2}
          disabled={loading}
        />

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || !name.trim()}
          startIcon={loading ? <CircularProgress size={18} /> : undefined}
        >
          {loading ? 'Creating...' : 'Create Project'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SaveAsProjectDialog;
