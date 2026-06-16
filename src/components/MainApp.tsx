import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import Layout from './Layout';
import { ErrorBoundary } from './ErrorBoundary';
import { lazyWithReload } from '../utils/lazyWithReload';
import { PreferencesProvider } from '../contexts/PreferencesContext';
import { ClauseProvider } from '../contexts/ClauseContext';
import { BookmarkProvider } from '../contexts/BookmarkContext';
import { OrgProvider } from '../contexts/OrgContext';
import { ProjectProvider } from '../contexts/ProjectContext';
import ProjectGate from './ProjectGate';
import OrgSetupDialog from './OrgSetupDialog';

/**
 * Lazy-loaded pages — per bundle-size optimization (Vercel warning that
 * the main JS chunk was 2.1 MB / 626 KB gz, well past the 1 MB threshold).
 *
 * Each page becomes its own chunk. The user pays the page's cost only when
 * they navigate to it. The Suspense fallback below renders a centered
 * spinner during the (typically <100ms) lazy-load.
 *
 * ExecutiveReport in particular brings html2canvas (~200 KB) for PDF
 * export. Matrix brings the ComplianceMatrix grid. DocumentScanner brings
 * the upload + processing stack. None of these belong in the initial
 * landing-page payload.
 */
const Dashboard = lazyWithReload(() => import('../pages/Dashboard'));
const Matrix = lazyWithReload(() => import('../pages/Matrix'));
const Controls = lazyWithReload(() => import('../pages/Controls'));
const ExecutiveReport = lazyWithReload(() => import('../pages/ExecutiveReport'));
const Evaluations = lazyWithReload(() => import('../pages/Evaluations'));
const EvaluationDetail = lazyWithReload(() => import('../pages/EvaluationDetail'));
const POAM = lazyWithReload(() => import('../pages/POAM'));
const Obligations = lazyWithReload(() => import('../pages/Obligations'));
const ClauseDetail = lazyWithReload(() => import('../pages/ClauseDetail'));
const Regulations = lazyWithReload(() => import('../pages/Regulations'));
const RegulatoryGraphReview = lazyWithReload(() => import('../pages/RegulatoryGraphReview'));
const SecuritySettings = lazyWithReload(() => import('../pages/SecuritySettings'));
const Notifications = lazyWithReload(() => import('../pages/Notifications'));
// DocumentScanner is a named export, not default — wrap it.
const DocumentScanner = lazyWithReload(() =>
  import('./DocumentScanner').then(m => ({ default: m.DocumentScanner })),
);

interface MainAppProps {
  enableScanner: boolean;
}

const PageLoadingFallback: React.FC = () => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: 400,
      width: '100%',
    }}
  >
    <CircularProgress />
  </Box>
);

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
                  <Suspense fallback={<PageLoadingFallback />}>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/matrix" element={<Matrix />} />
                      <Route path="/matrix/:projectId" element={<Matrix />} />
                      <Route path="/controls" element={<Controls />} />
                      <Route path="/report" element={<ExecutiveReport />} />
                      <Route path="/evaluations" element={<Evaluations />} />
                      <Route path="/evaluations/:id" element={<EvaluationDetail />} />
                      <Route path="/poam" element={<POAM />} />
                      <Route path="/obligations" element={<Obligations />} />
                      <Route path="/clauses/:clauseCode" element={<ClauseDetail />} />
                      <Route path="/regulations" element={<Regulations />} />
                      <Route path="/admin/regulatory-graph-review" element={<RegulatoryGraphReview />} />
                      <Route path="/settings/security" element={<SecuritySettings />} />
                      <Route path="/notifications" element={<Notifications />} />
                      {enableScanner && (
                        <Route path="/document-scanner/:scanId?" element={
                          <ErrorBoundary fallbackMessage="The document scanner encountered an error. Click below to try again.">
                            <DocumentScanner />
                          </ErrorBoundary>
                        } />
                      )}
                    </Routes>
                  </Suspense>
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
