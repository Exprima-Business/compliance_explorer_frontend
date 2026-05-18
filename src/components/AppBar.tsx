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
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  TableChart as TableChartIcon,
  DocumentScanner as ScannerIcon,
  Shield as ShieldIcon,
  FactCheck as FactCheckIcon,
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
  isMobile?: boolean;
  onMenuClick?: () => void;
}

export const AppBar: React.FC<CustomAppBarProps> = ({ activeTab, onTabChange, onSettingsClick, enableScanner, isMobile = false, onMenuClick }) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const { connectionStatus } = useBookmarks();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

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
        <Toolbar sx={{ px: { xs: 1, sm: 3 }, minHeight: { xs: 56, sm: 72 } }}>
          {/* Mobile: Hamburger menu */}
          {isMobile && (
            <IconButton edge="start" color="inherit" onClick={onMenuClick} sx={{ mr: 0.5 }}>
              <MenuIcon />
            </IconButton>
          )}
          {/* Left: Logo and Tabs */}
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            {/* Logo — clickable, navigates to Dashboard */}
            <Box
              onClick={() => navigate('/dashboard')}
              sx={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                '&:hover': { opacity: 0.8 },
              }}
              role="link"
              aria-label="Go to Dashboard"
            >
              <Box component="img" src="/ClauseAtlasLogoSM.png" alt="ClauseAtlas Logo" sx={{
                height: 'auto',
                width: 'auto',
                maxHeight: isMobile ? 36 : 57,
                mr: isMobile ? 1 : 2.5,
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
                  fontSize: isMobile ? '0.75rem' : '1rem',
                  px: isMobile ? 1.5 : 3,
                  minHeight: 48,
                  minWidth: isMobile ? 'auto' : undefined,
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
              {/* Dashboard tab — icon-only on mobile, icon+label on desktop */}
              <Tab
                label={isMobile ? undefined : "Dashboard"}
                icon={isMobile ? <DashboardIcon /> : <DashboardIcon />}
                iconPosition="start"
              />
              {enableScanner && (
                <Tab
                  label={isMobile ? undefined : "Scanner"}
                  icon={isMobile ? <ScannerIcon /> : undefined}
                  iconPosition="start"
                />
              )}
              <Tab
                label={isMobile ? undefined : "Matrix"}
                icon={isMobile ? <TableChartIcon /> : undefined}
                iconPosition="start"
              />
              <Tab
                label={isMobile ? undefined : "Controls"}
                icon={isMobile ? <ShieldIcon /> : undefined}
                iconPosition="start"
              />
              <Tab
                label={isMobile ? undefined : "Solicitations"}
                icon={isMobile ? <FactCheckIcon /> : undefined}
                iconPosition="start"
              />
            </Tabs>
          </Box>
          {/* Right: Controls — hidden on mobile (moved to Sidebar) */}
          {!isMobile && (
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
          )}
          {/* Mobile: Avatar only */}
          {isMobile && user && (
            <IconButton onClick={handleProfileMenuOpen} size="small">
              <Avatar sx={{ width: 28, height: 28 }}>{user.email?.[0]?.toUpperCase() || 'U'}</Avatar>
            </IconButton>
          )}
        </Toolbar>
        {/* Profile/User Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          onClick={handleMenuClose}
        >
          <MenuItem disabled>{user?.email}</MenuItem>
          <MenuItem onClick={() => setProfileOpen(true)}>My Profile</MenuItem>
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
      {/* Profile Dialog */}
      <Dialog open={profileOpen} onClose={() => setProfileOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>My Profile</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, mt: 1 }}>
            <Avatar sx={{ width: 56, height: 56, fontSize: 24 }}>
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {user?.email}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2" color="text.secondary">Account ID</Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                {user?.id?.slice(0, 8)}...
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2" color="text.secondary">Provider</Typography>
              <Typography variant="body2">
                {user?.app_metadata?.provider || 'Email'}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2" color="text.secondary">Last Sign In</Typography>
              <Typography variant="body2">
                {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'N/A'}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
              <Typography variant="body2" color="text.secondary">Role</Typography>
              <Typography variant="body2">
                {user?.user_metadata?.custom_claims?.role || 'Member'}
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProfileOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}; 