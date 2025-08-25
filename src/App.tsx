import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from './theme';
import Layout from './components/Layout';
import Home from './pages/Home';
import AuthPage from './pages/AuthPage';
import AuthCallback from './pages/AuthCallback';
import OrganizationSetup from './pages/OrganizationSetup';
import { DocumentScanner } from './components/DocumentScanner';
import Matrix from './pages/Matrix';
import { PreferencesProvider } from './contexts/PreferencesContext';
import { ClauseProvider } from './contexts/ClauseContext';
import { BookmarkProvider } from './contexts/BookmarkContext';
import { OrgProvider } from './contexts/OrgContext';
import { ProjectProvider } from './contexts/ProjectContext';
import AuthGate from './components/AuthGate';
import OrgSetupDialog from './components/OrgSetupDialog';
import ProjectGate from './components/ProjectGate';
import { URLValidation } from './components/URLValidation';
import { useUserState } from './hooks/useUserState';
import MainApp from './components/MainApp';
import { useAuth } from './hooks/useAuth';

const ENABLE_SCANNER = import.meta.env.VITE_ENABLE_SCANNER === 'true';
const ENABLE_URL_BASED_ROUTING = import.meta.env.VITE_ENABLE_URL_BASED_ROUTING === 'true';

// Simplified App component that handles routing based on user state
const AppContent: React.FC = () => {
  const { userState, loading, error } = useUserState();
  const { user } = useAuth();

  // Show loading while getting user state
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  // Show error if user state failed to load
  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <div>Error: {error}</div>
      </div>
    );
  }

  // Check if user needs setup - use backend response or fallback to user metadata
  const needsSetup = userState?.needsSetup ?? user?.user_metadata?.setup_required ?? false;

  // Show organization setup if user needs setup
  if (needsSetup) {
    return <OrganizationSetup />;
  }

  // Show main app if user is set up
  return <MainApp enableScanner={ENABLE_SCANNER} />;
};

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router basename={import.meta.env.PROD ? '/app' : undefined}>
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/setup-organization" element={<OrganizationSetup />} />
          {ENABLE_URL_BASED_ROUTING ? (
            // URL-based routing with organization and project slugs
            <Route
              path="/:orgSlug/:projectSlug/*"
              element={
                <AuthGate>
                  <URLValidation>
                    <AppContent />
                  </URLValidation>
                </AuthGate>
              }
            />
          ) : (
            // Header-based routing (current approach)
            <Route
              path="/*"
              element={
                <AuthGate>
                  <AppContent />
                </AuthGate>
              }
            />
          )}
        </Routes>
      </Router>
    </ThemeProvider>
  );
}
