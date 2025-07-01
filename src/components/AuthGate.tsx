import React from 'react';
import { Navigate } from 'react-router-dom';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import { useAuth } from '../hooks/useAuth';

/**
 * AuthGate blocks access to protected parts of the app until the
 * Supabase session has been resolved and a user is authenticated.
 *
 * Usage:
 *   <AuthGate>
 *     {/* providers + routes that require auth *\/}
 *   </AuthGate>
 */
const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  // While Supabase is still restoring or verifying a session, show a spinner
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // If no user, kick them to the login page
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Authenticated – render the protected app
  return <>{children}</>;
};

export default AuthGate; 