import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Box, CssBaseline } from '@mui/material';
import { AppBar } from './AppBar';
import { Sidebar } from './Sidebar';
import { useNavigate, useLocation } from 'react-router-dom';
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
        else if (path === '/document-scanner')
            setActiveTab(2);
    }, [location]);
    var handleTabChange = function (event, newValue) {
        setActiveTab(newValue);
        switch (newValue) {
            case 0:
                navigate('/');
                break;
            case 1:
                navigate('/matrix');
                break;
            case 2:
                navigate('/document-scanner');
                break;
        }
    };
    var handleSettingsClick = function () {
        setSettingsOpen(true);
    };
    return (_jsxs(Box, { sx: { display: 'flex', minHeight: '100vh', width: '100%' }, children: [_jsx(CssBaseline, {}), _jsx(Box, { sx: {
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: function (theme) { return theme.zIndex.drawer + 1; }
                }, children: _jsx(AppBar, { activeTab: activeTab, onTabChange: handleTabChange, onSettingsClick: handleSettingsClick }) }), _jsx(Sidebar, {}), _jsx(Box, { component: "main", sx: {
                    flexGrow: 1,
                    p: 3,
                    width: { sm: "calc(100% - 320px)" },
                    ml: { sm: '320px' },
                    mt: '64px', // Height of AppBar
                    height: 'calc(100vh - 64px)',
                    overflow: 'auto'
                }, children: children })] }));
}
