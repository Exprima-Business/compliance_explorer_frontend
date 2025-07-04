import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button, CircularProgress, Typography } from '@mui/material';
import { useProject } from '../contexts/ProjectContext';

const ProjectSetupDialog: React.FC = () => {
  const { projects, createProject, initialized } = useProject();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialized) return;
    setOpen(projects.length === 0);
  }, [projects.length, initialized]);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    try {
      setSubmitting(true);
      await createProject(name.trim(), description.trim());
      setOpen(false);
      setName('');
      setDescription('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} disableEscapeKeyDown>
      <DialogTitle>Create your first project</DialogTitle>
      <DialogContent>
        <Typography sx={{ mb: 2 }}>Enter a name for your project to get started.</Typography>
        <TextField
          fullWidth
          id="project-name"
          name="project-name"
          label="Project name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={submitting}
          autoFocus
        />
        <TextField
          fullWidth
          id="project-description"
          name="project-description"
          label="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={submitting}
          sx={{ mt: 2 }}
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

export default ProjectSetupDialog; 