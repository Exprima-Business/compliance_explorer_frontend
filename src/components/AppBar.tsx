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
  Tabs,
  Tab,
} from '@mui/material';
import {
  Help as HelpIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import ProjectSelector from './ProjectSelector';
import { useBookmarks } from '../contexts/BookmarkContext';
import ConnectionStatus from './ConnectionStatus';

interface CustomAppBarProps {
  activeTab: number;
  onTabChange: (event: React.SyntheticEvent, newValue: number) => void;
  onSettingsClick: () => void;
  enableScanner: boolean;
}

export const AppBar: React.FC<CustomAppBarProps> = ({ activeTab, onTabChange, onSettingsClick, enableScanner }) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const { connectionStatus } = useBookmarks();
  const [logoutOpen, setLogoutOpen] = useState(false);

  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    await signOut();
    handleMenuClose();
    setLogoutOpen(false);
    navigate('/login');
  };



  return (
    <>
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
            {/* Logo */}
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
              {enableScanner && <Tab label="Document Scanner" />}
            </Tabs>
          </Box>
          {/* Right: Org selector, Connection Status, Settings and Auth/User Menu */}
          <Box sx={{ display: 'flex', alignItems: 'center', ml: 2, gap: 1 }}>
            <ProjectSelector />
            <ConnectionStatus status={connectionStatus} showLabel={false} size="small" />
            <Tooltip title="Settings">
              <IconButton color="inherit" onClick={onSettingsClick}>
                <SettingsIcon />
              </IconButton>
            </Tooltip>
            {user ? (
              <>
                <Tooltip title={user.email || 'Account settings'}>
                  <IconButton
                    onClick={handleProfileMenuOpen}
                    size="small"
                    sx={{ ml: 2 }}
                  >
                    <Avatar sx={{ width: 32, height: 32 }}>{user.email?.[0]?.toUpperCase() || 'U'}</Avatar>
                  </IconButton>
                </Tooltip>
                <Button color="inherit" onClick={() => setLogoutOpen(true)}>
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button color="inherit" onClick={() => navigate('/login')} sx={{ ml: 2 }}>
                  Login
                </Button>
                <Button color="secondary" variant="contained" onClick={() => navigate('/login')} sx={{ ml: 1 }}>
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
          <MenuItem onClick={() => setLogoutOpen(true)}>Logout</MenuItem>
        </Menu>
        {/* Logout Dialog */}
        <Dialog open={logoutOpen} onClose={() => setLogoutOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Confirm Logout</DialogTitle>
          <DialogContent>
            <Typography>Are you sure you want to log out?</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setLogoutOpen(false)}>Cancel</Button>
            <Button onClick={handleLogout} color="primary" variant="contained">
              Logout
            </Button>
          </DialogActions>
        </Dialog>
      </MuiAppBar>
    </>
  );
}; 