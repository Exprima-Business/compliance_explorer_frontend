import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Box, CircularProgress, Typography, Button, Paper, Alert } from '@mui/material';

const AuthCallback: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the current session after email verification
        const { data, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        if (data.session?.user) {
          // Check if user needs organization setup
          const user = data.session.user;
          const setupRequired = user.user_metadata?.setup_required;
          
          if (setupRequired) {
            // User needs to complete organization setup
            navigate('/setup-organization');
          } else {
            // User is already set up, go to main app
            navigate('/');
          }
        } else {
          setError('No session found after email verification');
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
      } finally {
        setLoading(false);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  if (loading) {
    return (
      <Box
        sx={{
          width: '100vw',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'grey.100',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            maxWidth: 400,
          }}
        >
          <Box sx={{ mb: 3 }}>
            <img 
              src="/ClauseAtlasLogoSM.png" 
              alt="ClauseAtlas logo" 
              style={{ width: 200, height: 'auto' }} 
            />
          </Box>
          
          <CircularProgress size={60} sx={{ mb: 3 }} />
          
          <Typography variant="h6" gutterBottom>
            Verifying your account...
          </Typography>
          
          <Typography variant="body2" color="text.secondary">
            Please wait while we complete your email verification.
          </Typography>
        </Paper>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          width: '100vw',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'grey.100',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            maxWidth: 400,
          }}
        >
          <Box sx={{ mb: 3 }}>
            <img 
              src="/ClauseAtlasLogoSM.png" 
              alt="ClauseAtlas logo" 
              style={{ width: 200, height: 'auto' }} 
            />
          </Box>
          
          <Alert severity="error" sx={{ width: '100%', mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Verification Failed
            </Typography>
            <Typography variant="body2">
              {error}
            </Typography>
          </Alert>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            There was an issue verifying your email address. Please try again or contact support.
          </Typography>
          
          <Button 
            variant="contained" 
            onClick={() => navigate('/login')}
            sx={{ mt: 2 }}
          >
            Back to Sign In
          </Button>
        </Paper>
      </Box>
    );
  }

  return null;
};

export default AuthCallback; 