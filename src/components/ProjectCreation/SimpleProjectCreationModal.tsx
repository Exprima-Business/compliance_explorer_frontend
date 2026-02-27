import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  Button,
  CircularProgress,
  Typography,
  Box,
  Alert
} from '@mui/material';
import { useProject } from '../../contexts/ProjectContext';
import { clauseService } from '../../services/clauseService';
import { apiCall } from '../../services/api';
import { extractErrorMessage } from '../../utils/errorUtils';

interface SimpleProjectCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  scanResults: any[];
  scanId?: string;                                        // scan to link the new project to
  onProjectCreated: (project: any) => void;
}

export const SimpleProjectCreationModal: React.FC<SimpleProjectCreationModalProps> = ({
  isOpen,
  onClose,
  scanResults,
  scanId,
  onProjectCreated
}) => {
  const { createProject } = useProject();

  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'form' | 'creating' | 'bookmarking' | 'completed'>('form');
  const [progress, setProgress] = useState(0);

  const handleSubmit = async () => {
    if (!projectName.trim()) {
      setError('Project name is required');
      return;
    }

    try {
      setError(null);
      setSubmitting(true);
      setStep('creating');
      setProgress(20);

      if (scanId) {
        // ── Preferred path: single atomic call via dedicated endpoint ───────────
        // Creates project, links sourceScanId, and creates bookmarks server-side.
        setProgress(40);
        const resp = await apiCall<{ project: any; clausesCreated: number }>(
          '/api/projects/create-from-scan',
          {
            method: 'POST',
            body: JSON.stringify({
              scanId,
              projectName: projectName.trim(),
              description: description.trim() || undefined,
              options: { createBookmarks: true },
            }),
          }
        );

        if (resp.error) {
          throw new Error(extractErrorMessage(resp.error, 'Failed to create project'));
        }

        setProgress(100);
        setStep('completed');

        setTimeout(() => {
          onProjectCreated(resp.data!.project);
          onClose();
          setProjectName('');
          setDescription('');
          setStep('form');
          setProgress(0);
        }, 1500);

      } else {
        // ── Fallback: original two-step approach when scanId is unavailable ─────
        // Store original project context to preserve scan access
        const originalProjectId = localStorage.getItem('projectId');

        await createProject(projectName.trim(), description.trim() || undefined);
        setProgress(30);

        // Create bookmarks for each scan result
        setStep('bookmarking');
        setProgress(40);

        const bookmarkPromises = scanResults.map(async (result, index) => {
          try {
            const clauseId = result.clauseId || result.clause_id || result.id;
            if (clauseId) {
              await clauseService.bookmarkClause(clauseId);
              setProgress(40 + (index / scanResults.length) * 50);
            }
          } catch (bookmarkError) {
            console.warn(`Failed to bookmark clause ${index + 1}:`, bookmarkError);
          }
        });

        await Promise.all(bookmarkPromises);
        setProgress(100);
        setStep('completed');

        // Restore original project context to maintain scan access
        if (originalProjectId) {
          localStorage.setItem('projectId', originalProjectId);
        }

        onProjectCreated({ name: projectName, description });

        setTimeout(() => {
          onClose();
          setProjectName('');
          setDescription('');
          setStep('form');
          setProgress(0);
        }, 1500);
      }

    } catch (err) {
      console.error('Project creation failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to create project');
      setStep('form');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      onClose();
      setProjectName('');
      setDescription('');
      setError(null);
      setStep('form');
      setProgress(0);
    }
  };

  const renderContent = () => {
    switch (step) {
      case 'creating':
        return (
          <Box textAlign="center" py={4}>
            <CircularProgress size={60} />
            <Typography variant="h6" sx={{ mt: 2 }}>
              Creating Project...
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Setting up your new project
            </Typography>
            <Box sx={{ mt: 2, width: '100%', bgcolor: 'grey.200', borderRadius: 1 }}>
              <Box
                sx={{
                  width: `${progress}%`,
                  height: 8,
                  bgcolor: 'primary.main',
                  borderRadius: 1,
                  transition: 'width 0.3s ease'
                }}
              />
            </Box>
          </Box>
        );

      case 'bookmarking':
        return (
          <Box textAlign="center" py={4}>
            <CircularProgress size={60} />
            <Typography variant="h6" sx={{ mt: 2 }}>
              Creating Bookmarks...
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Adding {scanResults.length} clauses to your project
            </Typography>
            <Box sx={{ mt: 2, width: '100%', bgcolor: 'grey.200', borderRadius: 1 }}>
              <Box
                sx={{
                  width: `${progress}%`,
                  height: 8,
                  bgcolor: 'primary.main',
                  borderRadius: 1,
                  transition: 'width 0.3s ease'
                }}
              />
            </Box>
          </Box>
        );

      case 'completed':
        return (
          <Box textAlign="center" py={4}>
            <Typography variant="h6" color="success.main" sx={{ mb: 2 }}>
              ✅ Project Created Successfully!
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Your project "{projectName}" has been created with {scanResults.length} clauses.
            </Typography>
          </Box>
        );

      default:
        return (
          <>
            <TextField
              autoFocus
              margin="dense"
              id="project-name"
              label="Project Name"
              fullWidth
              variant="outlined"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              disabled={submitting}
              required
            />
            <TextField
              margin="dense"
              id="project-description"
              label="Description (optional)"
              fullWidth
              multiline
              rows={3}
              variant="outlined"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={submitting}
            />
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                This will create a new project with <strong>{scanResults.length} detected clauses</strong> from your scan results.
              </Typography>
            </Box>
          </>
        );
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      disableEscapeKeyDown={submitting}
    >
      <DialogTitle>
        {step === 'form'       ? 'Create Project from Scan Results' :
         step === 'creating'   ? 'Creating Project...' :
         step === 'bookmarking' ? 'Adding Clauses...' :
         'Project Created!'}
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {renderContent()}
      </DialogContent>

      {step === 'form' && (
        <DialogActions>
          <Button onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={submitting || !projectName.trim()}
            startIcon={submitting ? <CircularProgress size={20} /> : null}
          >
            {submitting ? 'Creating...' : 'Create Project'}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};
