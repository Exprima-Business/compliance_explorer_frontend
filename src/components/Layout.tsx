import React, { useState, useEffect } from 'react';
import { Box, CssBaseline } from '@mui/material';
import { AppBar } from './AppBar';
import { Sidebar } from './Sidebar';
import { Settings } from './Settings';
import { useNavigate, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const ENABLE_SCANNER = import.meta.env.VITE_ENABLE_SCANNER === 'true';

export default function Layout({ children }: LayoutProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Update active tab based on current route
  useEffect(() => {
    const path = location.pathname;
    if (path === '/') setActiveTab(0);
    else if (path === '/matrix') setActiveTab(1);
    else if (ENABLE_SCANNER && path === '/document-scanner') setActiveTab(2);
  }, [location]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    if (newValue === 0) navigate('/');
    else if (newValue === 1) navigate('/matrix');
    else if (ENABLE_SCANNER && newValue === 2) navigate('/document-scanner');
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
        {children}
      </Box>
      <Settings 
        open={settingsOpen}
        onClose={handleSettingsClose}
      />
    </Box>
  );
} 