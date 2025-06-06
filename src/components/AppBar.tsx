import React, { useState } from 'react';
import {
  AppBar as MuiAppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Box,
  Menu,
  MenuItem,
  Avatar,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Help as HelpIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { SignIn } from './SignIn';

interface CustomAppBarProps {
  activeTab: number;
  onTabChange: (event: React.SyntheticEvent, newValue: number) => void;
  onSettingsClick: () => void;
}

export const AppBar: React.FC<CustomAppBarProps> = ({ activeTab, onTabChange, onSettingsClick }) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [signUpOpen, setSignUpOpen] = useState(false);
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpError, setSignUpError] = useState<string | null>(null);
  const [signUpLoading, setSignUpLoading] = useState(false);

  const { user, signOut, signUp } = useAuth();

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  const handleLogout = async () => {
    await signOut();
    handleMenuClose();
  };
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignUpError(null);
    setSignUpLoading(true);
    try {
      await signUp(signUpEmail, signUpPassword);
      setSignUpOpen(false);
    } catch (err) {
      setSignUpError(err instanceof Error ? err.message : 'Sign up failed');
    } finally {
      setSignUpLoading(false);
    }
  };

  return (
    <MuiAppBar 
      position="fixed" 
      color="default" 
      elevation={0}
      sx={{
        width: '100%',
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid rgba(148, 163, 184, 0.1)'
      }}
    >
      <Toolbar sx={{ px: { xs: 2, sm: 3 }, minHeight: { xs: 64, sm: 72 } }}>
        {/* Left: Logo and Tabs */}
        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
          {/* Logo (replace with your logo if needed) */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box component="img" src="/ClauseAtlasLogoSM.png" alt="ClauseAtlas Logo" sx={{
              height: 'auto',
              width: 'auto',
              maxHeight: 57,
              mr: 2.5,
              display: 'block',
            }} />
          </Box>
          {/* Navigation Tabs */}
          <Tabs
            value={activeTab}
            onChange={onTabChange}
            aria-label="main navigation tabs"
            sx={{
              minHeight: 48,
              height: 48,
              '.MuiTab-root': {
                fontWeight: 600,
                fontSize: '1rem',
                px: 3,
                minHeight: 48,
              },
              '.MuiTabs-indicator': {
                height: 3,
                borderRadius: 2,
                background: 'linear-gradient(90deg, #6366f1 0%, #0ea5e9 100%)',
              },
            }}
            indicatorColor="secondary"
            textColor="primary"
          >
            <Tab label="Clauses" />
            <Tab label="Matrix" />
            <Tab label="Document Scanner" />
          </Tabs>
        </Box>
        {/* Right: Settings and Auth/User Menu */}
        <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
          <Tooltip title="Settings">
            <IconButton color="inherit" onClick={onSettingsClick}>
              <SettingsIcon />
            </IconButton>
          </Tooltip>
          {user ? (
            <Tooltip title={user.email || 'Account settings'}>
              <IconButton
                onClick={handleProfileMenuOpen}
                size="small"
                sx={{ ml: 2 }}
              >
                <Avatar sx={{ width: 32, height: 32 }}>{user.email?.[0]?.toUpperCase() || 'U'}</Avatar>
              </IconButton>
            </Tooltip>
          ) : (
            <>
              <Button color="inherit" onClick={() => setLoginOpen(true)} sx={{ ml: 2 }}>
                Login
              </Button>
              <Button color="secondary" variant="contained" onClick={() => setSignUpOpen(true)} sx={{ ml: 1 }}>
                Sign Up
              </Button>
            </>
          )}
        </Box>
      </Toolbar>
      {/* Profile/User Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        onClick={handleMenuClose}
      >
        <MenuItem disabled>{user?.email}</MenuItem>
        <MenuItem>Profile</MenuItem>
        <MenuItem>My Account</MenuItem>
        <MenuItem onClick={handleLogout}>Logout</MenuItem>
      </Menu>
      {/* Login Dialog */}
      <Dialog open={loginOpen} onClose={() => setLoginOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Sign In</DialogTitle>
        <DialogContent>
          <SignIn />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLoginOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
      {/* Sign Up Dialog */}
      <Dialog open={signUpOpen} onClose={() => setSignUpOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Sign Up</DialogTitle>
        <DialogContent>
          <form onSubmit={handleSignUp}>
            <TextField
              label="Email"
              type="email"
              value={signUpEmail}
              onChange={e => setSignUpEmail(e.target.value)}
              fullWidth
              margin="normal"
              required
            />
            <TextField
              label="Password"
              type="password"
              value={signUpPassword}
              onChange={e => setSignUpPassword(e.target.value)}
              fullWidth
              margin="normal"
              required
            />
            {signUpError && <Alert severity="error">{signUpError}</Alert>}
            <DialogActions>
              <Button onClick={() => setSignUpOpen(false)}>Cancel</Button>
              <Button type="submit" variant="contained" color="primary" disabled={signUpLoading}>
                {signUpLoading ? 'Signing Up...' : 'Sign Up'}
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>
    </MuiAppBar>
  );
}; 