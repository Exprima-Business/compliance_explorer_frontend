import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './Layout';
import Home from '../pages/Home';
import Matrix from '../pages/Matrix';
import { DocumentScanner } from './DocumentScanner';
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
                    <Route path="/" element={<Home />} />
                    <Route path="/matrix" element={<Matrix />} />
                    <Route path="/matrix/:projectId" element={<Matrix />} />
                    {enableScanner && (
                      <>
                        <Route path="/document-scanner" element={<DocumentScanner />} />
                        <Route path="/document-scanner/:scanId" element={<DocumentScanner />} />
                      </>
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