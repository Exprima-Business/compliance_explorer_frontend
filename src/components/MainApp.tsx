import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './Layout';
import Dashboard from '../pages/Dashboard';
import Home from '../pages/Home';
import Matrix from '../pages/Matrix';
import Controls from '../pages/Controls';
import { DocumentScanner } from './DocumentScanner';
import { ErrorBoundary } from './ErrorBoundary';
import { PreferencesProvider } from '../contexts/PreferencesContext';
import { ClauseProvider } from '../contexts/ClauseContext';
import { BookmarkProvider } from '../contexts/BookmarkContext';
import { OrgProvider } from '../contexts/OrgContext';
import { ProjectProvider } from '../contexts/ProjectContext';
import ProjectGate from './ProjectGate';
import OrgSetupDialog from './OrgSetupDialog';

interface MainAppProps {
  enableScanner: boolean;
}

const MainApp: React.FC<MainAppProps> = ({ enableScanner }) => {
  return (
    <OrgProvider>
      <ProjectProvider>
        <ProjectGate>
          <PreferencesProvider>
            <ClauseProvider>
              <BookmarkProvider>
                <OrgSetupDialog />
                <Layout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/graph" element={<Home />} />
                    <Route path="/matrix" element={<Matrix />} />
                    <Route path="/matrix/:projectId" element={<Matrix />} />
                    <Route path="/controls" element={<Controls />} />
                    {enableScanner && (
                      <Route path="/document-scanner/:scanId?" element={
                        <ErrorBoundary fallbackMessage="The document scanner encountered an error. Click below to try again.">
                          <DocumentScanner />
                        </ErrorBoundary>
                      } />
                    )}
                  </Routes>
                </Layout>
              </BookmarkProvider>
            </ClauseProvider>
          </PreferencesProvider>
        </ProjectGate>
      </ProjectProvider>
    </OrgProvider>
  );
};

export default MainApp; 