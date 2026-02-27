import React from 'react';
import { Box, CircularProgress } from '@mui/material';
import ProjectSetupDialog from './ProjectSetupDialog';
import { useProject } from '../contexts/ProjectContext';
import { useOrg } from '../contexts/OrgContext';

const ProjectGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { initialized: projectInitialized, currentProject } = useProject();
  const { initialized: orgInitialized } = useOrg();

  // Show a spinner while contexts are initialising (was returning null → blank screen)
  if (!orgInitialized || !projectInitialized) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!currentProject) return <ProjectSetupDialog />;

  return <>{children}</>;
};

export default ProjectGate; 