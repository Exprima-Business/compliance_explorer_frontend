import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrg } from '../contexts/OrgContext';
import { useProject } from '../contexts/ProjectContext';
import { Alert, Box, Button, Typography } from '@mui/material';

interface URLValidationProps {
  children: React.ReactNode;
}

export const URLValidation: React.FC<URLValidationProps> = ({ children }) => {
  const { orgSlug, projectSlug } = useParams<{ orgSlug: string; projectSlug: string }>();
  const { currentOrg, orgs, initialized: orgInitialized } = useOrg();
  const { currentProject, projects, initialized: projectInitialized } = useProject();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // Wait for contexts to be initialized
    if (!orgInitialized || !projectInitialized) {
      return;
    }

    // Clear any previous errors
    setError(null);

    // Validate organization slug
    if (orgSlug && currentOrg?.slug !== orgSlug) {
      console.warn(`URL organization slug (${orgSlug}) doesn't match current organization (${currentOrg?.slug})`);
      
      // Find the organization by slug
      const targetOrg = orgs.find(org => org.slug === orgSlug);
      
      if (targetOrg) {
        // Organization exists, show message and redirect
        setError(`Switching to organization: ${targetOrg.name}`);
        setIsRedirecting(true);
        setTimeout(() => {
          if (currentOrg && currentProject) {
            navigate(`/${currentOrg.slug}/${currentProject.slug}/matrix`);
          }
        }, 2000);
      } else {
        // Organization doesn't exist, show error and redirect
        setError(`Organization "${orgSlug}" not found. Redirecting to current organization.`);
        setIsRedirecting(true);
        setTimeout(() => {
          if (currentOrg && currentProject) {
            navigate(`/${currentOrg.slug}/${currentProject.slug}/matrix`);
          }
        }, 3000);
      }
      return;
    }

    // Validate project slug
    if (projectSlug && currentProject?.slug !== projectSlug) {
      console.warn(`URL project slug (${projectSlug}) doesn't match current project (${currentProject?.slug})`);
      
      // Find the project by slug
      const targetProject = projects.find(project => project.slug === projectSlug);
      
      if (targetProject) {
        // Project exists, show message and redirect
        setError(`Switching to project: ${targetProject.name}`);
        setIsRedirecting(true);
        setTimeout(() => {
          if (currentOrg && currentProject) {
            navigate(`/${currentOrg.slug}/${currentProject.slug}/matrix`);
          }
        }, 2000);
      } else {
        // Project doesn't exist, show error and redirect
        setError(`Project "${projectSlug}" not found. Redirecting to current project.`);
        setIsRedirecting(true);
        setTimeout(() => {
          if (currentOrg && currentProject) {
            navigate(`/${currentOrg.slug}/${currentProject.slug}/matrix`);
          }
        }, 3000);
      }
      return;
    }
  }, [orgSlug, projectSlug, currentOrg, currentProject, orgs, projects, orgInitialized, projectInitialized, navigate]);

  // Show loading state while validating
  if (!orgInitialized || !projectInitialized) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  // Show error message if there's an error
  if (error) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        p: 3
      }}>
        <Alert severity="warning" sx={{ mb: 2, maxWidth: 600 }}>
          {error}
        </Alert>
        {isRedirecting && (
          <Typography variant="body2" color="text.secondary">
            Redirecting in a few seconds...
          </Typography>
        )}
        <Button 
          variant="outlined" 
          onClick={() => {
            setError(null);
            setIsRedirecting(false);
            if (currentOrg && currentProject) {
              navigate(`/${currentOrg.slug}/${currentProject.slug}/matrix`);
            }
          }}
          sx={{ mt: 2 }}
        >
          Go Now
        </Button>
      </Box>
    );
  }

  // If validation passes, render children
  return <>{children}</>;
}; 