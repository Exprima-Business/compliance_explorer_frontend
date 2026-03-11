import React, { useState, useEffect } from 'react';
import { Box, CssBaseline, useMediaQuery, useTheme } from '@mui/material';
import { AppBar } from './AppBar';
import { Sidebar } from './Sidebar';
import { Settings } from './Settings';
import { URLDebugInfo } from './URLDebugInfo';
import { ApiTestComponent } from './ApiTestComponent';
import { useURLBasedNavigation } from '../hooks/useURLBasedNavigation';

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { navigateTo, getCurrentPath, isActiveTab } = useURLBasedNavigation();

  // ── Tab-to-route mapping ──────────────────────────────────────────
  // Desktop tabs: 0=Dashboard  1=Scanner  2=Matrix  3=Controls
  // Mobile  tabs: 0=Scanner    1=Matrix   2=Controls
  // Graph is accessible via /graph but has no tab.
  // ─────────────────────────────────────────────────────────────────

  const tabRoutes = isMobile
    ? ['/document-scanner', '/matrix', '/controls']                   // mobile: 3 tabs
    : ['/', '/document-scanner', '/matrix', '/controls'];             // desktop: 4 tabs

  // Update active tab based on current route
  useEffect(() => {
    const path = getCurrentPath();

    if (path === '/' || path === '/dashboard') {
      setActiveTab(isMobile ? -1 : 0); // Dashboard not a tab on mobile
    } else if (path === '/matrix' || path.startsWith('/matrix/')) {
      setActiveTab(isMobile ? 1 : 2);
    } else if (path === '/document-scanner' || path.startsWith('/document-scanner/')) {
      setActiveTab(isMobile ? 0 : 1);
    } else if (path === '/controls') {
      setActiveTab(isMobile ? 2 : 3);
    } else if (path === '/graph') {
      setActiveTab(-1); // Graph has no tab
    }
  }, [getCurrentPath, isMobile]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    const route = tabRoutes[newValue];
    if (!route) return;

    if (route === '/document-scanner') {
      // Preserve the current scanId when re-selecting scanner tab
      const currentPath = getCurrentPath();
      const scanIdMatch = currentPath.match(/^\/document-scanner\/([^\/]+)$/);
      if (scanIdMatch) {
        navigateTo(`/document-scanner/${scanIdMatch[1]}`);
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
          onMenuClick={() => setSidebarOpen(true)}
        />
      </Box>
      <Sidebar
        isMobile={isMobile}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSettingsClick={handleSettingsClick}
      />
      <Box
        component="main"
        sx={{
          position: 'absolute',
          left: isMobile ? 0 : '320px',
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
    </Box>
  );
} 