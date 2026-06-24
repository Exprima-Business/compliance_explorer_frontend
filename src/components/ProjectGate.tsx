import React from 'react';
import { Box, CircularProgress } from '@mui/material';
import { useProject } from '../contexts/ProjectContext';
import { useOrg } from '../contexts/OrgContext';

/**
 * App-ready gate. Waits for the org (and, during the program-tier transition,
 * the project) contexts to initialise, then renders the app. Org is the scope
 * now, so we no longer force project creation — projects/bids come from scans.
 * Collapses to an org-only gate once ProjectProvider is retired (FULL-D step 5).
 */
const ProjectGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { initialized: projectInitialized } = useProject();
  const { initialized: orgInitialized } = useOrg();

  if (!orgInitialized || !projectInitialized) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return <>{children}</>;
};

export default ProjectGate;