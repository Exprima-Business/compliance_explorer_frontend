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
import { useBookmarks } from '../../contexts/BookmarkContext';
import { clauseService } from '../../services/clauseService';

interface SimpleProjectCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  scanResults: any[];
  onProjectCreated: (project: any) => void;
}

export const SimpleProjectCreationModal: React.FC<SimpleProjectCreationModalProps> = ({
  isOpen,
  onClose,
  scanResults,
  onProjectCreated
}) => {
  const { createProject } = useProject();
  const { toggleBookmark } = useBookmarks();
  
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

    if (!scanResults || scanResults.length === 0) {
      setError('No scan results available to create project from');
      return;
    }

    // Store original project context to preserve scan access
    const originalProjectId = localStorage.getItem('projectId');
    console.log('Storing original project context:', originalProjectId);

    try {
      setError(null);
      setSubmitting(true);
      setStep('creating');
      setProgress(10);

      // Step 1: Create the project using existing API
      console.log('Creating project:', { name: projectName, description });
      await createProject(projectName.trim(), description.trim() || undefined);
      setProgress(30);

      // Step 2: Create bookmarks for each scan result
      setStep('bookmarking');
      setProgress(40);

      const bookmarkPromises = scanResults.map(async (result, index) => {
        try {
          // Extract clause ID from scan result - prioritize clauseId over id
          const clauseId = result.clauseId || result.clause_id || result.id;
          if (clauseId) {
            console.log(`Creating bookmark for clause ${index + 1}/${scanResults.length}:`, clauseId);
            console.log(`  - Using clauseId: ${result.clauseId || 'undefined'}`);
            console.log(`  - Scan result id: ${result.id || 'undefined'}`);
            await clauseService.bookmarkClause(clauseId);
            setProgress(40 + (index / scanResults.length) * 50); // 40-90% progress
          } else {
            console.warn(`No valid clause ID found for result ${index + 1}:`, result);
          }
        } catch (bookmarkError) {
          console.warn(`Failed to bookmark clause ${index + 1}:`, bookmarkError);
          // Continue with other bookmarks even if one fails
        }
      });

      await Promise.all(bookmarkPromises);
      setProgress(100);
      setStep('completed');

      // Step 3: Restore original project context to maintain scan access
      if (originalProjectId) {
        console.log('Restoring original project context:', originalProjectId);
        localStorage.setItem('projectId', originalProjectId);
        // Note: We don't update the ProjectContext state here to avoid UI confusion
        // The user will see the new project in the dropdown but scan access is preserved
      }

      // Step 4: Notify parent component
      onProjectCreated({ name: projectName, description });
      
      // Close modal after a brief success display
      setTimeout(() => {
        onClose();
        // Reset form for next time
        setProjectName('');
        setDescription('');
        setStep('form');
        setProgress(0);
      }, 1500);

    } catch (err) {
      console.error('Project creation failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to create project');
      setStep('form');
      
      // Restore original project context on error
      if (originalProjectId) {
        console.log('Restoring original project context after error:', originalProjectId);
        localStorage.setItem('projectId', originalProjectId);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      onClose();
      // Reset form
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
              Your project "{projectName}" has been created with {scanResults.length} bookmarked clauses.
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
                This will create a new project with <strong>{scanResults.length} bookmarked clauses</strong> from your scan results.
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
        {step === 'form' ? 'Create Project from Scan Results' : 
         step === 'creating' ? 'Creating Project...' :
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
