import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
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
var MainApp = function (_a) {
    var enableScanner = _a.enableScanner;
    return (_jsx(OrgProvider, { children: _jsx(ProjectProvider, { children: _jsx(ProjectGate, { children: _jsx(PreferencesProvider, { children: _jsx(ClauseProvider, { children: _jsxs(BookmarkProvider, { children: [_jsx(OrgSetupDialog, {}), _jsx(Layout, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Home, {}) }), _jsx(Route, { path: "/matrix", element: _jsx(Matrix, {}) }), enableScanner && (_jsxs(_Fragment, { children: [_jsx(Route, { path: "/document-scanner", element: _jsx(DocumentScanner, {}) }), _jsx(Route, { path: "/document-scanner/:scanId", element: _jsx(DocumentScanner, {}) })] }))] }) })] }) }) }) }) }) }));
};
export default MainApp;
