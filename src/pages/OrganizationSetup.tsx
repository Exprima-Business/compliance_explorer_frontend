import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, TextField, Typography, Stepper, Step, StepLabel, StepContent, Alert, Paper, Divider } from '@mui/material';
import { supabase } from '../lib/supabase';
import environment from '../config/environment';
import { dlog } from '../utils/debugLog';
import { useAuth } from '../hooks/useAuth';
import { getCsrfToken, ensureCookieSession } from '../services/sessionBridge';

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

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
    } catch (err) {
      dlog('OrganizationSetup: sign out error', { err });
      // Hard-redirect as fallback
      window.location.href = (import.meta.env.PROD ? '/app' : '') + '/login';
    }
  };

  const handleSubmit = async () => {
    if (!authUser) {
      setError('No user session found');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Cookie auth (Phase 4b): authenticate via the HttpOnly session cookie
      // (credentials:include) + double-submit CSRF token; no Bearer, and no
      // supabase-session dependency (works after persistSession is disabled).
      dlog('OrganizationSetup: Submitting organization setup', {
        organizationName: formData.organizationName,
        projectName: formData.projectName,
      });

      const csrf = getCsrfToken();
      const response = await fetch(`${environment.api.url}/api/organizations/setup`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(csrf ? { 'x-csrf-token': csrf } : {})
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

        // errorData.error may be an object {code, message, details} — extract the string
        const errMsg =
          (typeof errorData.error === 'object' ? errorData.error?.message : errorData.error) ||
          errorData.message ||
          `Failed to setup organization: ${response.status} ${response.statusText}`;
        throw new Error(errMsg);
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
        } else {
          // Backend updated user metadata server-side — force a session refresh
          // so the JWT in the browser picks up the new custom_claims and setup_required=false
          try {
            const { error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError) {
              dlog('OrganizationSetup: Session refresh failed (non-fatal)', { error: refreshError });
            } else {
              dlog('OrganizationSetup: Session refreshed successfully — JWT now has org claims');
            }
          } catch (refreshError) {
            dlog('OrganizationSetup: Error refreshing session (non-fatal)', { error: refreshError });
          }
        }

        // Re-mint the BE cookie session (ca_session) so it carries the new org
        // claims. The supabase-js refresh above only updates the *client*
        // session; the API authenticates against the HttpOnly cookie, which must
        // be re-established here or org endpoints 401 (MISSING_CLAIMS) on the
        // first post-setup load (CS2 cold-start bug).
        try {
          await ensureCookieSession({ force: true });
          dlog('OrganizationSetup: cookie session re-minted with org claims');
        } catch (err) {
          dlog('OrganizationSetup: cookie session re-mint failed (non-fatal)', { err });
        }

        // Use a full page reload rather than client-side navigation so that
        // useUserState fires fresh with the newly-refreshed JWT (which now has
        // org claims and setup_required: false). This is a one-time setup flow
        // so the reload cost is negligible.
        //
        // V2-M-09 (security audit 2026-06 v2): validate `redirectTo` is a
        // same-origin path. The server returns this value today, but if a
        // future change ever lets it carry an absolute URL or starts with
        // `//`, we'd have an open-redirect vector. Reject anything that
        // doesn't start with a single `/` (relative path, same-origin).
        const proposed = data.redirectTo || '/';
        const isSameOriginPath =
          typeof proposed === 'string'
          && proposed.startsWith('/')
          && !proposed.startsWith('//');
        const relativePath = isSameOriginPath ? proposed : '/';
        window.location.href = relativePath;
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

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

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

        {/* Sign-out escape hatch */}
        <Divider sx={{ width: '100%', mt: 4 }} />
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Already have an account?{' '}
            <Button
              size="small"
              variant="text"
              onClick={handleSignOut}
              sx={{ textTransform: 'none', p: 0, minWidth: 0, verticalAlign: 'baseline' }}
            >
              Sign out
            </Button>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default OrganizationSetup; 