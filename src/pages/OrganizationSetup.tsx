import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, TextField, Typography, Stepper, Step, StepLabel, Alert, Paper } from '@mui/material';
import { supabase } from '../lib/supabase';
import environment from '../config/environment';
import { dlog } from '../utils/debugLog';
import { useAuth } from '../hooks/useAuth';

interface OrganizationSetupData {
  organizationName: string;
  projectName: string;
}

interface ApiResponse {
  success: boolean;
  organization?: {
    id: string;
    name: string;
    slug: string;
  };
  project?: {
    id: string;
    name: string;
    slug: string;
  };
  redirectTo?: string;
  token?: string;
  refreshToken?: string;
  error?: {
    message: string;
  };
}

const OrganizationSetup: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState<OrganizationSetupData>({
    organizationName: '',
    projectName: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { user: authUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!authUser) {
      setError('No user session found');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get current session using the same pattern as UserStateService
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No valid session found');
      }

      dlog('OrganizationSetup: Submitting organization setup', {
        organizationName: formData.organizationName,
        projectName: formData.projectName,
        userId: session.user.id,
        hasToken: !!session.access_token
      });

      const response = await fetch(`${environment.api.url}/api/organizations/setup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          organizationName: formData.organizationName,
          projectName: formData.projectName || undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        dlog('OrganizationSetup: API error', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        
        throw new Error(errorData.error || `Failed to setup organization: ${response.status} ${response.statusText}`);
      }

      const data: ApiResponse = await response.json();

      if (data.success) {
        dlog('OrganizationSetup: Setup successful', {
          organization: data.organization,
          project: data.project,
          redirectTo: data.redirectTo
        });

        // Handle JWT refresh if backend returns updated token
        if (data.token) {
          try {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: data.token,
              refresh_token: data.refreshToken || ''
            });
            
            if (sessionError) {
              dlog('OrganizationSetup: Failed to update session with new token', { error: sessionError });
            } else {
              dlog('OrganizationSetup: Successfully updated session with new token');
            }
          } catch (sessionError) {
            dlog('OrganizationSetup: Error updating session', { error: sessionError });
          }
        }

        // Clear the setup_required flag from user metadata
        try {
          const { error: updateError } = await supabase.auth.updateUser({
            data: { setup_required: false }
          });
          
          if (updateError) {
            dlog('OrganizationSetup: Failed to clear setup_required flag', { error: updateError });
          } else {
            dlog('OrganizationSetup: Successfully cleared setup_required flag');
          }
        } catch (updateError) {
          dlog('OrganizationSetup: Error clearing setup_required flag', { error: updateError });
        }

        // Navigate to the specified redirect URL
        navigate(data.redirectTo || '/');
      } else {
        setError(data.error?.message || 'Setup failed');
        dlog('OrganizationSetup: Setup failed', { error: data.error });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to setup organization';
      setError(errorMessage);
      dlog('OrganizationSetup: Setup error', { error: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const validateOrganizationName = (name: string): string | null => {
    if (!name.trim()) {
      return 'Organization name is required';
    }
    if (name.length < 2) {
      return 'Organization name must be at least 2 characters long';
    }
    if (name.length > 50) {
      return 'Organization name must be no more than 50 characters';
    }
    if (!/^[a-zA-Z0-9\s\-_]+$/.test(name)) {
      return 'Organization name can only contain letters, numbers, spaces, hyphens, and underscores';
    }
    return null;
  };

  const handleOrganizationNameChange = (value: string) => {
    setFormData(prev => ({ ...prev, organizationName: value }));
    setError(null); // Clear error when user types
  };

  const handleProjectNameChange = (value: string) => {
    setFormData(prev => ({ ...prev, projectName: value }));
  };

  const handleNext = () => {
    const validationError = validateOrganizationName(formData.organizationName);
    if (validationError) {
      setError(validationError);
      return;
    }
    setActiveStep(1);
  };

  const handleBack = () => {
    setActiveStep(0);
  };

  const steps = [
    {
      label: 'Organization Details',
      description: 'Set up your organization',
      content: (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Create your organization to get started with ClauseAtlas. This will be your workspace for managing compliance clauses and projects.
          </Typography>
          
          <TextField
            fullWidth
            label="Organization Name"
            value={formData.organizationName}
            onChange={(e) => handleOrganizationNameChange(e.target.value)}
            placeholder="Enter your organization name"
            helperText="2-50 characters, letters, numbers, spaces, hyphens, and underscores only"
            error={!!error}
            disabled={loading}
            sx={{ mb: 2 }}
          />
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={!formData.organizationName.trim() || loading}
            >
              Next
            </Button>
          </Box>
        </Box>
      )
    },
    {
      label: 'Project Setup',
      description: 'Create your first project',
      content: (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Create your first project within the organization. You can always add more projects later.
          </Typography>
          
          <TextField
            fullWidth
            label="Project Name (Optional)"
            value={formData.projectName}
            onChange={(e) => handleProjectNameChange(e.target.value)}
            placeholder="Enter project name or leave blank for default"
            helperText="Leave blank to create 'Default Project'"
            disabled={loading}
            sx={{ mb: 2 }}
          />
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={handleBack}
              disabled={loading}
            >
              Back
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  Setting up...
                </Box>
              ) : (
                'Complete Setup'
              )}
            </Button>
          </Box>
        </Box>
      )
    }
  ];

  if (!authUser) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Typography variant="h6">Redirecting to login...</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: '100vw',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'grey.100',
        p: 2,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          width: '100%',
          maxWidth: 600,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Logo */}
        <Box sx={{ mb: 3 }}>
          <img 
            src="/ClauseAtlasLogoSM.png" 
            alt="ClauseAtlas logo" 
            style={{ width: 240, height: 'auto' }} 
          />
        </Box>

        {/* Title */}
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Complete Your Setup
        </Typography>
        
        <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
          Welcome to ClauseAtlas! Let's set up your organization and first project.
        </Typography>

        {/* Stepper */}
        <Box sx={{ width: '100%' }}>
          <Stepper activeStep={activeStep} orientation="vertical">
            {steps.map((step, index) => (
              <Step key={step.label}>
                <StepLabel>{step.label}</StepLabel>
                <StepContent>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {step.description}
                  </Typography>
                  {step.content}
                </StepContent>
              </Step>
            ))}
          </Stepper>
        </Box>
      </Paper>
    </Box>
  );
};

export default OrganizationSetup; 