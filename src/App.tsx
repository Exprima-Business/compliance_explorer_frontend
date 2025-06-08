import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from './theme';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import DocumentScanner from './pages/DocumentScanner';
import { AuthProvider } from './contexts/AuthContext';
import { ClauseProvider } from './contexts/ClauseContext';
import { useAuth } from './hooks/useAuth';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AuthProvider>
          <ClauseProvider>
            <Layout>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route
                  path="/document-scanner"
                  element={
                    <PrivateRoute>
                      <DocumentScanner />
                    </PrivateRoute>
                  }
                />
              </Routes>
            </Layout>
          </ClauseProvider>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}
