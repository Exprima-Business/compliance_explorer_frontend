import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { Drawer, List, ListItem, ListItemIcon, ListItemText, ListItemButton, Divider, Box, Typography, Collapse, } from '@mui/material';
import { Dashboard as DashboardIcon, Assessment as AssessmentIcon, Settings as SettingsIcon, ExpandLess, ExpandMore, Security as SecurityIcon, Business as BusinessIcon, Gavel as GavelIcon, } from '@mui/icons-material';
var drawerWidth = 240;
export var Sidebar = function () {
    var _a = React.useState(true), open = _a[0], setOpen = _a[1];
    var _b = React.useState(true), complianceOpen = _b[0], setComplianceOpen = _b[1];
    var handleComplianceClick = function () {
        setComplianceOpen(!complianceOpen);
    };
    return (_jsx(Drawer, { variant: "permanent", sx: {
            width: drawerWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
                width: drawerWidth,
                boxSizing: 'border-box',
                marginTop: '64px', // Height of AppBar
            },
        }, children: _jsxs(Box, { sx: { overflow: 'auto' }, children: [_jsxs(List, { children: [_jsx(ListItem, { disablePadding: true, children: _jsxs(ListItemButton, { children: [_jsx(ListItemIcon, { children: _jsx(DashboardIcon, {}) }), _jsx(ListItemText, { primary: "Dashboard" })] }) }), _jsx(ListItem, { disablePadding: true, children: _jsxs(ListItemButton, { onClick: handleComplianceClick, children: [_jsx(ListItemIcon, { children: _jsx(SecurityIcon, {}) }), _jsx(ListItemText, { primary: "Compliance" }), complianceOpen ? _jsx(ExpandLess, {}) : _jsx(ExpandMore, {})] }) }), _jsx(Collapse, { in: complianceOpen, timeout: "auto", unmountOnExit: true, children: _jsxs(List, { component: "div", disablePadding: true, children: [_jsxs(ListItemButton, { sx: { pl: 4 }, children: [_jsx(ListItemIcon, { children: _jsx(BusinessIcon, {}) }), _jsx(ListItemText, { primary: "Business Rules" })] }), _jsxs(ListItemButton, { sx: { pl: 4 }, children: [_jsx(ListItemIcon, { children: _jsx(GavelIcon, {}) }), _jsx(ListItemText, { primary: "Legal Requirements" })] })] }) }), _jsx(ListItem, { disablePadding: true, children: _jsxs(ListItemButton, { children: [_jsx(ListItemIcon, { children: _jsx(AssessmentIcon, {}) }), _jsx(ListItemText, { primary: "Reports" })] }) }), _jsx(ListItem, { disablePadding: true, children: _jsxs(ListItemButton, { children: [_jsx(ListItemIcon, { children: _jsx(SettingsIcon, {}) }), _jsx(ListItemText, { primary: "Settings" })] }) })] }), _jsx(Divider, {}), _jsxs(Box, { sx: { p: 2 }, children: [_jsx(Typography, { variant: "subtitle2", color: "text.secondary", children: "Quick Links" }), _jsxs(List, { children: [_jsx(ListItem, { disablePadding: true, children: _jsx(ListItemButton, { children: _jsx(ListItemText, { primary: "Recent Items" }) }) }), _jsx(ListItem, { disablePadding: true, children: _jsx(ListItemButton, { children: _jsx(ListItemText, { primary: "Favorites" }) }) })] })] })] }) }));
};
