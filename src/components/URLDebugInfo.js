import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useParams, useLocation } from 'react-router-dom';
import { Box, Typography, Paper } from '@mui/material';
import { useURLBasedNavigation } from '../hooks/useURLBasedNavigation';
var ENABLE_URL_BASED_ROUTING = import.meta.env.VITE_ENABLE_URL_BASED_ROUTING === 'true';
export var URLDebugInfo = function () {
    var _a = useParams(), orgSlug = _a.orgSlug, projectSlug = _a.projectSlug;
    var location = useLocation();
    var _b = useURLBasedNavigation(), getCurrentPath = _b.getCurrentPath, isURLBasedRouting = _b.isURLBasedRouting, isProduction = _b.isProduction;
    if (!ENABLE_URL_BASED_ROUTING) {
        return null; // Only show in URL-based routing mode
    }
    return (_jsxs(Paper, { sx: { p: 2, m: 2, backgroundColor: '#f5f5f5' }, children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "URL Debug Information" }), _jsxs(Box, { sx: { fontFamily: 'monospace', fontSize: '0.875rem' }, children: [_jsxs("div", { children: [_jsx("strong", { children: "Full URL:" }), " ", location.pathname] }), _jsx("div", { children: _jsx("strong", { children: "URL Parameters:" }) }), _jsxs("div", { style: { marginLeft: '1rem' }, children: [_jsxs("div", { children: ["orgSlug: ", orgSlug || 'undefined'] }), _jsxs("div", { children: ["projectSlug: ", projectSlug || 'undefined'] })] }), _jsxs("div", { children: [_jsx("strong", { children: "Extracted Path:" }), " ", getCurrentPath()] }), _jsxs("div", { children: [_jsx("strong", { children: "URL-Based Routing:" }), " ", isURLBasedRouting ? 'Enabled' : 'Disabled'] }), _jsxs("div", { children: [_jsx("strong", { children: "Production Mode:" }), " ", isProduction ? 'Yes' : 'No'] })] })] }));
};
