import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { QueryClientProvider } from '@tanstack/react-query';
import { theme } from './theme';
import { queryClient } from './queryClient';
import Layout from './components/Layout';
import AuthPage from './pages/AuthPage';
import AuthCallback from './pages/AuthCallback';
import OrganizationSetup from './pages/OrganizationSetup';
import { DocumentScanner } from './components/DocumentScanner';
import Matrix from './pages/Matrix';
import { PreferencesProvider } from './contexts/PreferencesContext';
import { ClauseProvider } from './contexts/ClauseContext';
import { BookmarkProvider } from './contexts/BookmarkContext';
import { OrgProvider } from './contexts/OrgContext';
import AuthGate from './components/AuthGate';
import OrgSetupDialog from './components/OrgSetupDialog';
import ProjectGate from './components/ProjectGate';
import { useUserState } from './hooks/useUserState';
import MainApp from './components/MainApp';

const ENABLE_SCANNER = import.meta.env.VITE_ENABLE_SCANNER === 'true';

// Simplified App component that handles routing based on user state
const AppContent: React.FC = () => {
  const { userState, loading, error, refresh } = useUserState();

  // Show loading while getting user state (also shown while waiting for a 429 retry)
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        width: '100vw',
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  // Show error with retry button if user state failed to load
  if (error) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        gap: '16px'
      }}>
        <div style={{ color: '#6b7280' }}>Unable to load — {error}</div>
        <button
          onClick={refresh}
          style={{
            padding: '8px 20px',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            background: '#fff',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  // needsSetup is authoritative from the backend (DB-driven: no orgs = needs setup)
  const needsSetup = userState?.needsSetup ?? false;

  // Show organization setup if user needs setup
  if (needsSetup) {
    return <OrganizationSetup />;
  }

  // Show main app if user is set up
  return <MainApp enableScanner={ENABLE_SCANNER} />;
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/setup-organization" element={<OrganizationSetup />} />
          <Route
            path="/*"
            element={
              <AuthGate>
                <AppContent />
              </AuthGate>
            }
          />
        </Routes>
      </Router>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
