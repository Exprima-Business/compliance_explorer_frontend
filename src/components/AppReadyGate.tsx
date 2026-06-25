import React from 'react';
import { Box, CircularProgress } from '@mui/material';
import { useOrg } from '../contexts/OrgContext';

/**
 * App-ready gate. Waits for the org context to initialise, then renders the
 * app. Org is the only scope — there is no project to wait on or create.
 */
const AppReadyGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { initialized: orgInitialized } = useOrg();

  if (!orgInitialized) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return <>{children}</>;
};

export default AppReadyGate;
