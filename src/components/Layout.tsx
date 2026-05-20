import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  CssBaseline,
  useMediaQuery,
  useTheme,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  RestartAlt as ResetIcon,
  Speed as DemoIcon,
} from '@mui/icons-material';
import { AppBar } from './AppBar';
import { Settings } from './Settings';
import { URLDebugInfo } from './URLDebugInfo';
import { ApiTestComponent } from './ApiTestComponent';
import { useURLBasedNavigation } from '../hooks/useURLBasedNavigation';
import { useAuth } from '../contexts/AuthContext';
import ProjectSelector from './ProjectSelector';
import ConnectionStatus from './ConnectionStatus';
import { useBookmarks } from '../contexts/BookmarkContext';
import { warmUpBackend, resetDemo } from '../services/controlService';

interface LayoutProps {
  children: React.ReactNode;
}

const ENABLE_SCANNER = import.meta.env.VITE_ENABLE_SCANNER === 'true';
const ENABLE_URL_BASED_ROUTING = import.meta.env.VITE_ENABLE_URL_BASED_ROUTING === 'true';

export default function Layout({ children }: LayoutProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [activeTab, setActiveTab] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { navigateTo, getCurrentPath, isActiveTab } = useURLBasedNavigation();
  const { user, signOut } = useAuth();
  const { connectionStatus } = useBookmarks();

  // Demo mode toggle (persisted in localStorage)
  const [demoMode, setDemoMode] = useState(() =>
    typeof window !== 'undefined' && localStorage.getItem('clauseatlas_demo_mode') === 'true'
  );
  const handleDemoToggle = () => {
    const next = !demoMode;
    setDemoMode(next);
    localStorage.setItem('clauseatlas_demo_mode', next ? 'true' : 'false');
  };

  // Demo reset state
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });

  // ── Warm-up ping — wake Railway on first mount ────────────────────
  const warmedUp = useRef(false);
  useEffect(() => {
    if (!warmedUp.current) {
      warmedUp.current = true;
      warmUpBackend();
    }
  }, []);

  // ── Demo reset handler ────────────────────────────────────────────
  const handleDemoReset = async () => {
    setResetting(true);
    try {
      const result = await resetDemo();
      setResetConfirmOpen(false);
      setDrawerOpen(false);
      setSnackbar({ open: true, message: result.message || 'Demo reset complete — ready for next visitor', severity: 'success' });
      // Force page reload to clear all cached state
      setTimeout(() => window.location.reload(), 800);
    } catch (err: any) {
      setSnackbar({ open: true, message: err?.message || 'Reset failed', severity: 'error' });
    } finally {
      setResetting(false);
    }
  };

  // ── Tab-to-route mapping ──────────────────────────────────────────
  // Desktop tabs: 0=Dashboard  1=Scanner  2=Matrix  3=Controls
  // Mobile  tabs: 0=Scanner    1=Matrix   2=Controls
  // ─────────────────────────────────────────────────────────────────

  // Both mobile and desktop: Dashboard > Scanner > Matrix > Controls > Solicitations > POA&M
  const tabRoutes = ['/', '/document-scanner', '/matrix', '/controls', '/evaluations', '/poam'];

  // Update active tab based on current route
  useEffect(() => {
    const path = getCurrentPath();

    if (path === '/' || path === '/dashboard') {
      setActiveTab(0);
    } else if (path === '/document-scanner' || path.startsWith('/document-scanner/')) {
      setActiveTab(1);
    } else if (path === '/matrix' || path.startsWith('/matrix/')) {
      setActiveTab(2);
    } else if (path === '/controls') {
      setActiveTab(3);
    } else if (path === '/evaluations' || path.startsWith('/evaluations/')) {
      setActiveTab(4);
    } else if (path === '/poam' || path.startsWith('/poam/')) {
      setActiveTab(5);
    }
  }, [getCurrentPath, isMobile]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    const route = tabRoutes[newValue];
    if (!route) return;

    if (route === '/document-scanner') {
      // Resume an in-progress / last scan when re-entering the scanner tab.
      // Prefer a scanId already in the path; otherwise the one the scanner
      // remembered when the scan started (cleared on "Scan Another Document").
      const currentPath = getCurrentPath();
      const scanIdMatch = currentPath.match(/^\/document-scanner\/([^\/]+)$/);
      const resumeScanId = scanIdMatch?.[1] || localStorage.getItem('lastScanId');
      if (resumeScanId) {
        navigateTo(`/document-scanner/${resumeScanId}`);
        return;
      }
    }
    navigateTo(route);
  };

  const handleSettingsClick = () => {
    setSettingsOpen(true);
  };

  const handleSettingsClose = () => {
    setSettingsOpen(false);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
      <CssBaseline />
      <Box sx={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: (theme) => theme.zIndex.drawer + 1
      }}>
        <AppBar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onSettingsClick={handleSettingsClick}
          enableScanner={ENABLE_SCANNER}
          isMobile={isMobile}
          onMenuClick={() => setDrawerOpen(true)}
        />
      </Box>

      {/* Mobile drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: 280, pt: 1 } }}
      >
        {/* User info */}
        {user && (
          <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ width: 36, height: 36, fontSize: 16 }}>
              {user.email?.[0]?.toUpperCase() || 'U'}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }} noWrap>
                {user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>
                {user.email}
              </Typography>
            </Box>
          </Box>
        )}
        <Divider sx={{ mb: 1 }} />

        {/* Project selector */}
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.5 }}>
            Active Project
          </Typography>
          <ProjectSelector />
        </Box>
        <Divider sx={{ my: 1 }} />

        {/* Connection status */}
        <Box sx={{ px: 2, py: 1 }}>
          <ConnectionStatus status={connectionStatus} showLabel={true} size="small" />
        </Box>
        <Divider sx={{ my: 1 }} />

        {/* Demo mode toggle */}
        <Box sx={{ px: 2, py: 0.5 }}>
          <FormControlLabel
            control={
              <Switch
                checked={demoMode}
                onChange={handleDemoToggle}
                size="small"
                color="warning"
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <DemoIcon sx={{ fontSize: 18, color: demoMode ? 'warning.main' : 'text.disabled' }} />
                <Typography variant="body2" sx={{ fontWeight: demoMode ? 600 : 400, color: demoMode ? 'warning.main' : 'text.secondary' }}>
                  Demo Mode
                </Typography>
              </Box>
            }
          />
          {demoMode && (
            <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', pl: 4.5, mt: -0.5 }}>
              Scanner uses cached results (instant)
            </Typography>
          )}
        </Box>
        <Divider sx={{ my: 1 }} />

        <List disablePadding>
          <ListItem disablePadding>
            <ListItemButton onClick={() => { setDrawerOpen(false); setSettingsOpen(true); }}>
              <ListItemIcon><SettingsIcon /></ListItemIcon>
              <ListItemText primary="Settings" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => setResetConfirmOpen(true)}
              sx={{ color: 'warning.main' }}
            >
              <ListItemIcon><ResetIcon sx={{ color: 'warning.main' }} /></ListItemIcon>
              <ListItemText primary="Reset Demo" primaryTypographyProps={{ fontWeight: 600 }} />
            </ListItemButton>
          </ListItem>
          <Divider />
          <ListItem disablePadding>
            <ListItemButton onClick={async () => { setDrawerOpen(false); await signOut(); navigateTo('/login'); }}>
              <ListItemIcon><LogoutIcon /></ListItemIcon>
              <ListItemText primary="Logout" />
            </ListItemButton>
          </ListItem>
        </List>
      </Drawer>

      {/* Demo Reset Confirmation Dialog */}
      <Dialog open={resetConfirmOpen} onClose={() => !resetting && setResetConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Reset Demo?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1 }}>
            This will clear all progress for the current project:
          </Typography>
          <Box component="ul" sx={{ pl: 2, '& li': { mb: 0.5 } }}>
            <li><Typography variant="body2">All control statuses → Not Started</Typography></li>
            <li><Typography variant="body2">All objective assessments removed</Typography></li>
            <li><Typography variant="body2">Framework deactivated (ready for re-activation)</Typography></li>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Scanned documents and project clauses are preserved.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetConfirmOpen(false)} disabled={resetting}>Cancel</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleDemoReset}
            disabled={resetting}
            startIcon={resetting ? <CircularProgress size={16} /> : <ResetIcon />}
          >
            {resetting ? 'Resetting...' : 'Reset Demo'}
          </Button>
        </DialogActions>
      </Dialog>

      <Box
        component="main"
        sx={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: { xs: '56px', sm: '72px' },
          bottom: 0,
          width: 'auto',
          maxWidth: 'none',
          overflow: 'auto'
        }}
      >
        {ENABLE_URL_BASED_ROUTING && <URLDebugInfo />}
        {ENABLE_URL_BASED_ROUTING && <ApiTestComponent />}
        {children}
      </Box>
      <Settings
        open={settingsOpen}
        onClose={handleSettingsClose}
      />

      {/* Global snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar(s => ({ ...s, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
} 