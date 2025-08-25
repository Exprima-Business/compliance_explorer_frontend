import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from './theme';
import AuthPage from './pages/AuthPage';
import AuthCallback from './pages/AuthCallback';
import OrganizationSetup from './pages/OrganizationSetup';
import AuthGate from './components/AuthGate';
import { URLValidation } from './components/URLValidation';
import { useUserState } from './hooks/useUserState';
import MainApp from './components/MainApp';
import { useAuth } from './hooks/useAuth';
var ENABLE_SCANNER = import.meta.env.VITE_ENABLE_SCANNER === 'true';
var ENABLE_URL_BASED_ROUTING = import.meta.env.VITE_ENABLE_URL_BASED_ROUTING === 'true';
// Simplified App component that handles routing based on user state
var AppContent = function () {
    var _a, _b, _c;
    var _d = useUserState(), userState = _d.userState, loading = _d.loading, error = _d.error;
    var user = useAuth().user;
    // Show loading while getting user state
    if (loading) {
        return (_jsx("div", { style: {
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh'
            }, children: _jsx("div", { children: "Loading..." }) }));
    }
    // Show error if user state failed to load
    if (error) {
        return (_jsx("div", { style: {
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh'
            }, children: _jsxs("div", { children: ["Error: ", error] }) }));
    }
    // Check if user needs setup - use backend response or fallback to user metadata
    var needsSetup = (_c = (_a = userState === null || userState === void 0 ? void 0 : userState.needsSetup) !== null && _a !== void 0 ? _a : (_b = user === null || user === void 0 ? void 0 : user.user_metadata) === null || _b === void 0 ? void 0 : _b.setup_required) !== null && _c !== void 0 ? _c : false;
    // Show organization setup if user needs setup
    if (needsSetup) {
        return _jsx(OrganizationSetup, {});
    }
    // Show main app if user is set up
    return _jsx(MainApp, { enableScanner: ENABLE_SCANNER });
};
export default function App() {
    return (_jsxs(ThemeProvider, { theme: theme, children: [_jsx(CssBaseline, {}), _jsx(Router, { basename: import.meta.env.PROD ? '/app' : undefined, children: _jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(AuthPage, {}) }), _jsx(Route, { path: "/auth/callback", element: _jsx(AuthCallback, {}) }), _jsx(Route, { path: "/setup-organization", element: _jsx(OrganizationSetup, {}) }), ENABLE_URL_BASED_ROUTING ? (
                        // URL-based routing with organization and project slugs
                        _jsx(Route, { path: "/:orgSlug/:projectSlug/*", element: _jsx(AuthGate, { children: _jsx(URLValidation, { children: _jsx(AppContent, {}) }) }) })) : (
                        // Header-based routing (current approach)
                        _jsx(Route, { path: "/*", element: _jsx(AuthGate, { children: _jsx(AppContent, {}) }) }))] }) })] }));
}
