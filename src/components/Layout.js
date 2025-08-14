import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Box, CssBaseline } from '@mui/material';
import { AppBar } from './AppBar';
import { Sidebar } from './Sidebar';
import { Settings } from './Settings';
import { URLDebugInfo } from './URLDebugInfo';
import { ApiTestComponent } from './ApiTestComponent';
import { useURLBasedNavigation } from '../hooks/useURLBasedNavigation';
var ENABLE_SCANNER = import.meta.env.VITE_ENABLE_SCANNER === 'true';
var ENABLE_URL_BASED_ROUTING = import.meta.env.VITE_ENABLE_URL_BASED_ROUTING === 'true';
export default function Layout(_a) {
    var children = _a.children;
    var _b = useState(0), activeTab = _b[0], setActiveTab = _b[1];
    var _c = useState(false), settingsOpen = _c[0], setSettingsOpen = _c[1];
    var _d = useURLBasedNavigation(), navigateTo = _d.navigateTo, getCurrentPath = _d.getCurrentPath, isActiveTab = _d.isActiveTab;
    // Update active tab based on current route
    useEffect(function () {
        var path = getCurrentPath();
        console.log('[LAYOUT DEBUG] Updating active tab based on path:', path);
        if (path === '/')
            setActiveTab(0);
        else if (path === '/matrix')
            setActiveTab(1);
        else if (ENABLE_SCANNER && (path === '/document-scanner' || path.startsWith('/document-scanner/'))) {
            console.log('[LAYOUT DEBUG] Setting active tab to document scanner (tab 2)');
            setActiveTab(2);
        }
    }, [getCurrentPath]);
    var handleTabChange = function (event, newValue) {
        setActiveTab(newValue);
        if (newValue === 0)
            navigateTo('/');
        else if (newValue === 1)
            navigateTo('/matrix');
        else if (ENABLE_SCANNER && newValue === 2) {
            // Check if we're currently on a document scanner page with a scanId
            var currentPath = getCurrentPath();
            var scanIdMatch = currentPath.match(/^\/document-scanner\/([^\/]+)$/);
            console.log('[LAYOUT DEBUG] Tab change to document scanner:', {
                currentPath: currentPath,
                scanIdMatch: scanIdMatch ? scanIdMatch[1] : null,
                willNavigateTo: scanIdMatch ? "/document-scanner/".concat(scanIdMatch[1]) : '/document-scanner'
            });
            if (scanIdMatch) {
                // Preserve the current scanId when navigating to document scanner
                navigateTo("/document-scanner/".concat(scanIdMatch[1]));
            }
            else {
                // Navigate to new document scanner
                navigateTo('/document-scanner');
            }
        }
    };
    var handleSettingsClick = function () {
        setSettingsOpen(true);
    };
    var handleSettingsClose = function () {
        setSettingsOpen(false);
    };
    return (_jsxs(Box, { sx: { display: 'flex', minHeight: '100vh', width: '100%' }, children: [_jsx(CssBaseline, {}), _jsx(Box, { sx: {
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: function (theme) { return theme.zIndex.drawer + 1; }
                }, children: _jsx(AppBar, { activeTab: activeTab, onTabChange: handleTabChange, onSettingsClick: handleSettingsClick, enableScanner: ENABLE_SCANNER }) }), _jsx(Sidebar, {}), _jsxs(Box, { component: "main", sx: {
                    position: 'absolute',
                    left: '320px',
                    right: 0,
                    top: '64px',
                    bottom: 0,
                    width: 'auto',
                    maxWidth: 'none',
                    overflow: 'auto'
                }, children: [ENABLE_URL_BASED_ROUTING && _jsx(URLDebugInfo, {}), ENABLE_URL_BASED_ROUTING && _jsx(ApiTestComponent, {}), children] }), _jsx(Settings, { open: settingsOpen, onClose: handleSettingsClose })] }));
}
