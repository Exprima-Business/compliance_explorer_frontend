import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Box, CssBaseline } from '@mui/material';
import { AppBar } from './AppBar';
import { Sidebar } from './Sidebar';
import { Settings } from './Settings';
import { useNavigate, useLocation } from 'react-router-dom';
var ENABLE_SCANNER = import.meta.env.VITE_ENABLE_SCANNER === 'true';
export default function Layout(_a) {
    var children = _a.children;
    var _b = useState(0), activeTab = _b[0], setActiveTab = _b[1];
    var _c = useState(false), settingsOpen = _c[0], setSettingsOpen = _c[1];
    var navigate = useNavigate();
    var location = useLocation();
    // Update active tab based on current route
    useEffect(function () {
        var path = location.pathname;
        if (path === '/')
            setActiveTab(0);
        else if (path === '/matrix')
            setActiveTab(1);
        else if (ENABLE_SCANNER && path === '/document-scanner')
            setActiveTab(2);
    }, [location]);
    var handleTabChange = function (event, newValue) {
        setActiveTab(newValue);
        if (newValue === 0)
            navigate('/');
        else if (newValue === 1)
            navigate('/matrix');
        else if (ENABLE_SCANNER && newValue === 2)
            navigate('/document-scanner');
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
                }, children: _jsx(AppBar, { activeTab: activeTab, onTabChange: handleTabChange, onSettingsClick: handleSettingsClick, enableScanner: ENABLE_SCANNER }) }), _jsx(Sidebar, {}), _jsx(Box, { component: "main", sx: {
                    position: 'absolute',
                    left: '320px',
                    right: 0,
                    top: '64px',
                    bottom: 0,
                    width: 'auto',
                    maxWidth: 'none',
                    overflow: 'auto'
                }, children: children }), _jsx(Settings, { open: settingsOpen, onClose: handleSettingsClose })] }));
}
