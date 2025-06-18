import React, { useState, useEffect } from 'react';
import { Box, CssBaseline } from '@mui/material';
import { AppBar } from './AppBar';
import { Sidebar } from './Sidebar';
import { useNavigate, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

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
    else if (path === '/document-scanner') setActiveTab(2);
  }, [location]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    switch (newValue) {
      case 0:
        navigate('/');
        break;
      case 1:
        navigate('/matrix');
        break;
      case 2:
        navigate('/document-scanner');
        break;
    }
  };

  const handleSettingsClick = () => {
    setSettingsOpen(true);
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
    </Box>
  );
} 