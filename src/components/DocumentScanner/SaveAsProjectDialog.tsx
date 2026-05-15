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
  RadioGroup,
  Radio,
  FormControlLabel,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { scanApi } from '../../services/scanApi';
import { useProject } from '../../contexts/ProjectContext';
import { useOrg } from '../../contexts/OrgContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SaveMode = 'create' | 'existing';

interface DeselectedClause {
  clauseId: string;
  title: string;
  /** True when the clause isn't in our database — a higher-risk exclusion */
  isUnmatched: boolean;
}

interface SaveAsProjectDialogProps {
  open: boolean;
  onClose: () => void;
  scanId: string | null;
  selectedClauseIds: string[];
  /**
   * Detected clauses the user un-checked. When non-empty, the dialog shows a
   * confirmation step before saving so the user can't silently drop a
   * regulation — especially an unmatched one (a real clause not yet in our
   * database). Defaults to [] for callers that don't supply it.
   */
  deselectedClauses?: DeselectedClause[];
  /** Called after the project is successfully created / updated */
  onProjectCreated?: (projectId: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * SaveAsProjectDialog
 *
 * Allows the user to either **create a new project** or **add scan results
 * to an existing project** using ONE backend API call
 * (`POST /api/projects/create-from-scan`).
 *
 * The backend already supports the `options.saveToExisting` and
 * `options.existingProjectId` fields, so no backend changes are needed.
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
  deselectedClauses = [],
  onProjectCreated,
}) => {
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));

  const [mode, setMode] = useState<SaveMode>('create');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // When the user has excluded clauses, the dialog flips to a confirmation
  // step before the API call. `doSubmit` runs the actual save.
  const [confirmStep, setConfirmStep] = useState(false);

  const unmatchedDeselected = deselectedClauses.filter(c => c.isUnmatched);
  const matchedDeselected = deselectedClauses.filter(c => !c.isUnmatched);

  const { projects, refreshProjects } = useProject();
  const { currentOrg } = useOrg();

  const selectedProject = projects.find(p => p.id === selectedProjectId) ?? null;

  const canSubmit =
    mode === 'create'
      ? !!name.trim()
      : !!selectedProjectId;

  // Validate inputs, then either gate on the confirmation step (if the user
  // excluded clauses) or run the save directly.
  const handleSubmit = () => {
    if (!scanId) {
      setError('No scan ID available.');
      return;
    }
    if (!currentOrg) {
      setError('No organization selected.');
      return;
    }

    // Validate per mode
    if (mode === 'create' && !name.trim()) {
      setError('Project name is required.');
      return;
    }
    if (mode === 'existing' && !selectedProjectId) {
      setError('Please select a project.');
      return;
    }

    // Gate: excluding detected clauses is a deliberate action — make the
    // user confirm before the save proceeds. Skipped when nothing is excluded.
    if (deselectedClauses.length > 0 && !confirmStep) {
      setError(null);
      setConfirmStep(true);
      return;
    }

    void doSubmit();
  };

  const doSubmit = async () => {
    // Re-guard: handleSubmit validated these, but doSubmit is a separate
    // function so TypeScript's narrowing doesn't carry over.
    if (!scanId || !currentOrg) {
      setError('Missing scan or organization context.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const resp = await scanApi.createProjectFromScan({
        scanId,
        // Backend requires non-empty projectName even for existing projects.
        // Send the existing project's name as a workaround.
        projectName: mode === 'create' ? name.trim() : (selectedProject?.name ?? 'Existing Project'),
        description: mode === 'create' ? description.trim() || undefined : undefined,
        organizationId: currentOrg.id,
        options: {
          saveToExisting: mode === 'existing',
          existingProjectId: mode === 'existing' ? selectedProjectId : undefined,
          clauseFilter: selectedClauseIds,
        },
      });

      if (resp.error) {
        const msg = typeof resp.error === 'string' ? resp.error : resp.error.message;
        setError(msg);
        return;
      }

      // Determine the target project ID
      const targetProjectId =
        mode === 'existing'
          ? selectedProjectId
          : resp.data?.project?.id;

      // Point localStorage at the target project BEFORE refreshing.
      // refreshProjects() reads localStorage('projectId') to decide which
      // project becomes currentProject — so this ensures the target project
      // is automatically selected without a manual setCurrentProject() call.
      if (targetProjectId) {
        localStorage.setItem('projectId', targetProjectId);
      }

      // Refresh the project list — picks up the new/updated project and sets
      // it as currentProject via the localStorage key we just wrote.
      await refreshProjects();

      // Clean up form state and close
      resetForm();
      onClose();

      // Notify parent with the project ID so it can navigate
      if (targetProjectId) {
        onProjectCreated?.(targetProjectId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save project');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setSelectedProjectId('');
    setMode('create');
    setError(null);
    setConfirmStep(false);
  };

  const handleClose = () => {
    if (loading) return; // don't close while saving
    resetForm();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth fullScreen={isMobile}>
      <DialogTitle>
        {confirmStep ? 'Confirm Excluded Clauses' : 'Save Scan Results to Project'}
      </DialogTitle>

      {/* ----- Confirmation step: shown when the user excluded clauses ----- */}
      {confirmStep ? (
        <>
          <DialogContent>
            <Typography variant="body2" sx={{ mb: 2 }}>
              You&apos;re about to save with{' '}
              <strong>
                {deselectedClauses.length} detected clause
                {deselectedClauses.length !== 1 ? 's' : ''} excluded
              </strong>
              . Excluded clauses won&apos;t be tracked in this project&apos;s
              compliance matrix.
            </Typography>

            {unmatchedDeselected.length > 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {unmatchedDeselected.length}{' '}
                  {unmatchedDeselected.length === 1
                    ? 'is a regulation'
                    : 'are regulations'}{' '}
                  not in our database
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  These were detected in your solicitation but aren&apos;t in the
                  ClauseAtlas database yet. Excluding them means they won&apos;t be
                  tracked at all — we recommend keeping them so you have a record
                  of the requirement.
                </Typography>
                <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                  {unmatchedDeselected.map(c => (
                    <li key={c.clauseId}>
                      <Typography variant="body2" component="span" sx={{ fontWeight: 600 }}>
                        {c.clauseId}
                      </Typography>
                      {c.title && c.title !== c.clauseId ? ` — ${c.title}` : ''}
                    </li>
                  ))}
                </Box>
              </Alert>
            )}

            {matchedDeselected.length > 0 && (
              <Box sx={{ mb: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Also excluded:
                </Typography>
                <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                  {matchedDeselected.map(c => (
                    <li key={c.clauseId}>
                      <Typography variant="body2" component="span">
                        {c.clauseId}
                        {c.title && c.title !== c.clauseId ? ` — ${c.title}` : ''}
                      </Typography>
                    </li>
                  ))}
                </Box>
              </Box>
            )}

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </DialogContent>

          <DialogActions>
            <Button
              onClick={() => { setConfirmStep(false); setError(null); }}
              disabled={loading}
            >
              Go Back &amp; Review
            </Button>
            <Button
              variant="contained"
              color="warning"
              onClick={handleSubmit}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={18} /> : undefined}
            >
              {loading
                ? 'Saving...'
                : `Exclude ${deselectedClauses.length} & Save`}
            </Button>
          </DialogActions>
        </>
      ) : (
      <>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Save {selectedClauseIds.length} selected clause
          {selectedClauseIds.length !== 1 && 's'} as bookmarks.
        </Typography>

        {/* Mode toggle */}
        <FormControl component="fieldset" sx={{ mb: 2, width: '100%' }}>
          <RadioGroup
            row
            value={mode}
            onChange={(e) => {
              setMode(e.target.value as SaveMode);
              setError(null);
            }}
          >
            <FormControlLabel
              value="create"
              control={<Radio />}
              label="Create New Project"
              disabled={loading}
            />
            <FormControlLabel
              value="existing"
              control={<Radio />}
              label="Add to Existing Project"
              disabled={loading}
            />
          </RadioGroup>
        </FormControl>

        {/* Create New mode */}
        {mode === 'create' && (
          <Box>
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
          </Box>
        )}

        {/* Add to Existing mode */}
        {mode === 'existing' && (
          <Box>
            {projects.length === 0 ? (
              <Alert severity="info" sx={{ mb: 2 }}>
                No existing projects found. Switch to &ldquo;Create New Project&rdquo; to get started.
              </Alert>
            ) : (
              <FormControl fullWidth>
                <InputLabel id="existing-project-label">Select Project</InputLabel>
                <Select
                  labelId="existing-project-label"
                  value={selectedProjectId}
                  label="Select Project"
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  disabled={loading}
                >
                  {projects.map(p => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Box>
        )}

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
          disabled={loading || !canSubmit}
          startIcon={loading ? <CircularProgress size={18} /> : undefined}
        >
          {loading
            ? 'Saving...'
            : mode === 'create'
              ? 'Create Project'
              : 'Add to Project'
          }
        </Button>
      </DialogActions>
      </>
      )}
    </Dialog>
  );
};

export default SaveAsProjectDialog;
