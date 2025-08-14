import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { Navigate } from 'react-router-dom';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import { useAuth } from '../hooks/useAuth';
/**
 * AuthGate blocks access to protected parts of the app until the
 * Supabase session has been resolved and a user is authenticated.
 *
 * Usage:
 *   <AuthGate>
 *     {/* providers + routes that require auth *\/}
 *   </AuthGate>
 */
var AuthGate = function (_a) {
    var children = _a.children;
    var _b = useAuth(), isAuthenticated = _b.isAuthenticated, loading = _b.loading;
    // While Supabase is still restoring or verifying a session, show a spinner
    if (loading) {
        return (_jsx(Box, { sx: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }, children: _jsx(CircularProgress, {}) }));
    }
    // If no user, kick them to the login page
    if (!isAuthenticated) {
        return _jsx(Navigate, { to: "/login", replace: true });
    }
    // Authenticated – render the protected app
    return _jsx(_Fragment, { children: children });
};
export default AuthGate;
