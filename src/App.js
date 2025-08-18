import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
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
import { OrgSelectionWrapper } from './components/OrgSelectionWrapper';
var ENABLE_SCANNER = import.meta.env.VITE_ENABLE_SCANNER === 'true';
var ENABLE_URL_BASED_ROUTING = import.meta.env.VITE_ENABLE_URL_BASED_ROUTING === 'true';
export default function App() {
    return (_jsxs(ThemeProvider, { theme: theme, children: [_jsx(CssBaseline, {}), _jsx(Router, { basename: import.meta.env.PROD ? '/app' : undefined, children: _jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(AuthPage, {}) }), _jsx(Route, { path: "/auth/callback", element: _jsx(AuthCallback, {}) }), _jsx(Route, { path: "/setup-organization", element: _jsx(OrganizationSetup, {}) }), ENABLE_URL_BASED_ROUTING ? (
                        // URL-based routing with organization and project slugs
                        _jsx(Route, { path: "/:orgSlug/:projectSlug/*", element: _jsx(AuthGate, { children: _jsx(OrgProvider, { children: _jsx(ProjectProvider, { children: _jsx(URLValidation, { children: _jsx(ProjectGate, { children: _jsx(PreferencesProvider, { children: _jsx(ClauseProvider, { children: _jsxs(BookmarkProvider, { children: [_jsx(OrgSetupDialog, {}), _jsx(OrgSelectionWrapper, { children: _jsx(Layout, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Home, {}) }), _jsx(Route, { path: "/matrix", element: _jsx(Matrix, {}) }), ENABLE_SCANNER && (_jsxs(_Fragment, { children: [_jsx(Route, { path: "/document-scanner", element: _jsx(DocumentScanner, {}) }), _jsx(Route, { path: "/document-scanner/:scanId", element: _jsx(DocumentScanner, {}) })] }))] }) }) })] }) }) }) }) }) }) }) }) })) : (
                        // Header-based routing (current approach)
                        _jsx(Route, { path: "/*", element: _jsx(AuthGate, { children: _jsx(OrgProvider, { children: _jsx(ProjectProvider, { children: _jsx(ProjectGate, { children: _jsx(PreferencesProvider, { children: _jsx(ClauseProvider, { children: _jsxs(BookmarkProvider, { children: [_jsx(OrgSetupDialog, {}), _jsx(OrgSelectionWrapper, { children: _jsx(Layout, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Home, {}) }), _jsx(Route, { path: "/matrix", element: _jsx(Matrix, {}) }), ENABLE_SCANNER && (_jsxs(_Fragment, { children: [_jsx(Route, { path: "/document-scanner", element: _jsx(DocumentScanner, {}) }), _jsx(Route, { path: "/document-scanner/:scanId", element: _jsx(DocumentScanner, {}) })] }))] }) }) })] }) }) }) }) }) }) }) }))] }) })] }));
}
