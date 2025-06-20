import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from './theme';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import DocumentScanner from './pages/DocumentScanner';
import Matrix from './pages/Matrix';
import { AuthProvider } from './contexts/AuthContext';
import { PreferencesProvider } from './contexts/PreferencesContext';
import { ClauseProvider } from './contexts/ClauseContext';
import { useAuth } from './hooks/useAuth';
import { BookmarkProvider } from './contexts/BookmarkContext';

const ENABLE_SCANNER = import.meta.env.VITE_ENABLE_SCANNER === 'true';

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <PreferencesProvider>
            <ClauseProvider>
              <BookmarkProvider>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/matrix" element={<Matrix />} />
                    <Route path="/login" element={<Login />} />
                    {ENABLE_SCANNER && (
                      <Route path="/document-scanner" element={<DocumentScanner />} />
                    )}
                  </Routes>
                </Layout>
              </BookmarkProvider>
            </ClauseProvider>
          </PreferencesProvider>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
