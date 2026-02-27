import React, { useState, useEffect } from 'react';
import { Box, CssBaseline } from '@mui/material';
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
  const [activeTab, setActiveTab] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { navigateTo, getCurrentPath, isActiveTab } = useURLBasedNavigation();

  // Update active tab based on current route
  useEffect(() => {
    const path = getCurrentPath();
    if (path === '/') setActiveTab(0);
    else if (path === '/matrix') setActiveTab(1);
    else if (ENABLE_SCANNER && (path === '/document-scanner' || path.startsWith('/document-scanner/'))) {
      setActiveTab(2);
    }
  }, [getCurrentPath]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    if (newValue === 0) navigateTo('/');
    else if (newValue === 1) navigateTo('/matrix');
    else if (ENABLE_SCANNER && newValue === 2) {
      // Check if we're currently on a document scanner page with a scanId
      const currentPath = getCurrentPath();
      const scanIdMatch = currentPath.match(/^\/document-scanner\/([^\/]+)$/);
      if (scanIdMatch) {
        // Preserve the current scanId when navigating to document scanner
        navigateTo(`/document-scanner/${scanIdMatch[1]}`);
      } else {
        // Navigate to new document scanner
        navigateTo('/document-scanner');
      }
    }
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
        />
      </Box>
      <Sidebar />
      <Box
        component="main"
        sx={{
          position: 'absolute',
          left: '320px',
          right: 0,
          top: '64px',
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