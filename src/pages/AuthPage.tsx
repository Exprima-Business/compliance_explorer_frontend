import React, { useState } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  TextField, 
  Button, 
  Alert, 
  Tabs, 
  Tab,
  Divider,
  Link,
  CircularProgress
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`auth-tabpanel-${index}`}
      aria-labelledby={`auth-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const AuthPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    setError(null);
    setPassword('');
    setConfirmPassword('');
  };

  const validateForm = () => {
    if (activeTab === 1) { // Registration mode
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return false;
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters long');
        return false;
      }
    }
    return true;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      // Use Supabase's built-in signup with email verification
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${import.meta.env.PROD ? 'https://staging.clauseatlas.com' : window.location.origin}/auth/callback`,
          data: {
            setup_required: true,
            registration_date: new Date().toISOString()
          }
        }
      });
      
      if (error) throw error;
      
      if (data.user && !data.session) {
        // Email confirmation required
        setEmailSent(true);
        setError(null);
      } else if (data.session) {
        // User is automatically signed in (email confirmation disabled)
        navigate('/setup-organization');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      await signIn(email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    if (!validateForm()) {
      return;
    }
    
    if (activeTab === 0) {
      await handleSignIn(e);
    } else {
      await handleSignUp(e);
    }
  };

  const isLoginMode = activeTab === 0;

  // Show email confirmation message
  if (emailSent) {
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
            maxWidth: 480,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <Box sx={{ mb: 3 }}>
            <img 
              src="/ClauseAtlasLogoSM.png" 
              alt="ClauseAtlas logo" 
              style={{ width: 240, height: 'auto' }} 
            />
          </Box>
          
          <Typography variant="h5" component="h1" gutterBottom>
            Check Your Email
          </Typography>
          
          <Typography variant="body1" sx={{ mb: 3 }}>
            We've sent a confirmation link to <strong>{email}</strong>
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Click the link in your email to verify your account and complete registration.
          </Typography>
          
          <Button 
            variant="outlined" 
            onClick={() => {
              setEmailSent(false);
              setActiveTab(0);
            }}
            sx={{ mt: 2 }}
          >
            Back to Sign In
          </Button>
        </Paper>
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
          maxWidth: 480,
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
          Welcome to ClauseAtlas
        </Typography>
        
        <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 3 }}>
          {isLoginMode 
            ? 'Sign in to your account to continue'
            : 'Create your account to get started'
          }
        </Typography>

        {/* Tabs */}
        <Box sx={{ width: '100%', mb: 2 }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{
              '& .MuiTab-root': {
                fontWeight: 600,
                fontSize: '1rem',
                py: 2,
              },
              '& .MuiTabs-indicator': {
                height: 3,
                borderRadius: 2,
                background: 'linear-gradient(90deg, #6366f1 0%, #0ea5e9 100%)',
              },
            }}
          >
            <Tab label="Sign In" />
            <Tab label="Create Account" />
          </Tabs>
        </Box>

        {/* Error Display */}
        {error && (
          <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Form */}
        <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
          <TextField
            fullWidth
            id="email"
            name="email"
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            margin="normal"
            autoComplete="email"
            autoFocus
          />
          
          <TextField
            fullWidth
            id="password"
            name="password"
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            margin="normal"
            autoComplete={isLoginMode ? "current-password" : "new-password"}
          />

          {/* Confirm Password (Registration only) */}
          {!isLoginMode && (
            <TextField
              fullWidth
              id="confirmPassword"
              name="confirmPassword"
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              margin="normal"
              autoComplete="new-password"
            />
          )}

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading}
            sx={{ 
              mt: 3, 
              mb: 2,
              py: 1.5,
              fontSize: '1.1rem',
              fontWeight: 600,
              background: 'linear-gradient(90deg, #6366f1 0%, #0ea5e9 100%)',
              '&:hover': {
                background: 'linear-gradient(90deg, #5855eb 0%, #0d9488 100%)',
              }
            }}
          >
            {loading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={20} color="inherit" />
                {isLoginMode ? 'Signing In...' : 'Creating Account...'}
              </Box>
            ) : (
              isLoginMode ? 'Sign In' : 'Create Account'
            )}
          </Button>
        </Box>

        {/* Help Text */}
        <Divider sx={{ width: '100%', my: 2 }} />
        <Typography variant="body2" color="text.secondary" align="center">
          {isLoginMode ? (
            <>
              Don't have an account?{' '}
              <Link 
                component="button"
                variant="body2"
                onClick={() => setActiveTab(1)}
                sx={{ fontWeight: 600 }}
              >
                Create one here
              </Link>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <Link 
                component="button"
                variant="body2"
                onClick={() => setActiveTab(0)}
                sx={{ fontWeight: 600 }}
              >
                Sign in here
              </Link>
            </>
          )}
        </Typography>
      </Paper>
    </Box>
  );
};

export default AuthPage; 