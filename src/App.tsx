import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from './theme';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
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
import { OrgSelectionWrapper } from './components/OrgSelectionWrapper';

const ENABLE_SCANNER = import.meta.env.VITE_ENABLE_SCANNER === 'true';
const ENABLE_URL_BASED_ROUTING = import.meta.env.VITE_ENABLE_URL_BASED_ROUTING === 'true';

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router basename={import.meta.env.PROD ? '/app' : undefined}>
        <Routes>
          <Route path="/login" element={<Login />} />
          {ENABLE_URL_BASED_ROUTING ? (
            // URL-based routing with organization and project slugs
            <Route
              path="/:orgSlug/:projectSlug/*"
              element={
                <AuthGate>
                  <OrgProvider>
                    <ProjectProvider>
                      <URLValidation>
                        <ProjectGate>
                          <PreferencesProvider>
                            <ClauseProvider>
                              <BookmarkProvider>
                                <OrgSetupDialog />
                                <OrgSelectionWrapper>
                                  <Layout>
                                    <Routes>
                                      <Route path="/" element={<Home />} />
                                      <Route path="/matrix" element={<Matrix />} />
                                      {ENABLE_SCANNER && (
                                        <>
                                          <Route path="/document-scanner" element={<DocumentScanner />} />
                                          <Route path="/document-scanner/:scanId" element={<DocumentScanner />} />
                                        </>
                                      )}
                                    </Routes>
                                  </Layout>
                                </OrgSelectionWrapper>
                              </BookmarkProvider>
                            </ClauseProvider>
                          </PreferencesProvider>
                        </ProjectGate>
                      </URLValidation>
                    </ProjectProvider>
                  </OrgProvider>
                </AuthGate>
              }
            />
          ) : (
            // Header-based routing (current approach)
            <Route
              path="/*"
              element={
                <AuthGate>
                  <OrgProvider>
                    <ProjectProvider>
                      <ProjectGate>
                        <PreferencesProvider>
                          <ClauseProvider>
                            <BookmarkProvider>
                              <OrgSetupDialog />
                              <OrgSelectionWrapper>
                                <Layout>
                                  <Routes>
                                    <Route path="/" element={<Home />} />
                                    <Route path="/matrix" element={<Matrix />} />
                                    {ENABLE_SCANNER && (
                                      <>
                                        <Route path="/document-scanner" element={<DocumentScanner />} />
                                        <Route path="/document-scanner/:scanId" element={<DocumentScanner />} />
                                      </>
                                    )}
                                  </Routes>
                                </Layout>
                              </OrgSelectionWrapper>
                            </BookmarkProvider>
                          </ClauseProvider>
                        </PreferencesProvider>
                      </ProjectGate>
                    </ProjectProvider>
                  </OrgProvider>
                </AuthGate>
              }
            />
          )}
        </Routes>
      </Router>
    </ThemeProvider>
  );
}
