import React from 'react';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import CommandCenter from '../components/CommandCenter';

/**
 * Dashboard route — the GovCon Compliance Command Center.
 *
 * The dashboard body lives in <CommandCenter/>, which wires the KPI row,
 * Next Best Action, Priority Remediation, Solicitation Readiness, and the
 * by-source analytics to live data (with clearly-marked placeholders where
 * the supporting data isn't built yet). This page is a thin auth guard.
 */
const Dashboard: React.FC = () => {
  const { loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return <CommandCenter />;
};

export default Dashboard;
