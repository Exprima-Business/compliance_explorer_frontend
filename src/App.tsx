import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from './theme';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import DocumentScanner from './pages/DocumentScanner';
import Matrix from './pages/Matrix';
import { PreferencesProvider } from './contexts/PreferencesContext';
import { ClauseProvider } from './contexts/ClauseContext';
import { BookmarkProvider } from './contexts/BookmarkContext';
import { OrgProvider } from './contexts/OrgContext';
import AuthGate from './components/AuthGate';
import OrgSetupDialog from './components/OrgSetupDialog';

const ENABLE_SCANNER = import.meta.env.VITE_ENABLE_SCANNER === 'true';

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router basename={import.meta.env.PROD ? '/app' : undefined}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <AuthGate>
                <OrgProvider>
                  <PreferencesProvider>
                    <ClauseProvider>
                      <BookmarkProvider>
                        <OrgSetupDialog />
                        <Layout>
                          <Routes>
                            <Route path="/" element={<Home />} />
                            <Route path="/matrix" element={<Matrix />} />
                            {ENABLE_SCANNER && (
                              <Route path="/document-scanner" element={<DocumentScanner />} />
                            )}
                          </Routes>
                        </Layout>
                      </BookmarkProvider>
                    </ClauseProvider>
                  </PreferencesProvider>
                </OrgProvider>
              </AuthGate>
            }
          />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}
