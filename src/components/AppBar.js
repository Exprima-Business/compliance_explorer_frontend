import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { AppBar as MuiAppBar, Toolbar, Typography, Button, IconButton, Box, Menu, MenuItem, Avatar, Tooltip, } from '@mui/material';
import { Menu as MenuIcon, Help as HelpIcon, Notifications as NotificationsIcon, } from '@mui/icons-material';
export var AppBar = function () {
    var _a = React.useState(null), anchorEl = _a[0], setAnchorEl = _a[1];
    var _b = React.useState(null), mobileMenuAnchorEl = _b[0], setMobileMenuAnchorEl = _b[1];
    var handleProfileMenuOpen = function (event) {
        setAnchorEl(event.currentTarget);
    };
    var handleMobileMenuOpen = function (event) {
        setMobileMenuAnchorEl(event.currentTarget);
    };
    var handleMenuClose = function () {
        setAnchorEl(null);
        setMobileMenuAnchorEl(null);
    };
    return (_jsxs(MuiAppBar, { position: "fixed", sx: { zIndex: function (theme) { return theme.zIndex.drawer + 1; } }, children: [_jsxs(Toolbar, { children: [_jsx(IconButton, { edge: "start", color: "inherit", "aria-label": "menu", onClick: handleMobileMenuOpen, sx: { mr: 2, display: { sm: 'none' } }, children: _jsx(MenuIcon, {}) }), _jsxs(Typography, { variant: "h6", component: "div", sx: { flexGrow: 1, display: 'flex', alignItems: 'center' }, children: [_jsx(Box, { component: "img", src: "/compliance-logo.svg", alt: "Compliance Explorer", sx: { height: 32, mr: 1 } }), "Compliance Explorer"] }), _jsxs(Box, { sx: { display: { xs: 'none', sm: 'flex' }, gap: 2 }, children: [_jsx(Button, { color: "inherit", children: "Dashboard" }), _jsx(Button, { color: "inherit", children: "Reports" }), _jsx(Button, { color: "inherit", children: "Settings" })] }), _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', ml: 2 }, children: [_jsx(Tooltip, { title: "Help & Documentation", children: _jsx(IconButton, { color: "inherit", children: _jsx(HelpIcon, {}) }) }), _jsx(Tooltip, { title: "Notifications", children: _jsx(IconButton, { color: "inherit", children: _jsx(NotificationsIcon, {}) }) }), _jsx(Tooltip, { title: "Account settings", children: _jsx(IconButton, { onClick: handleProfileMenuOpen, size: "small", sx: { ml: 2 }, children: _jsx(Avatar, { sx: { width: 32, height: 32 }, children: "EM" }) }) })] })] }), _jsxs(Menu, { anchorEl: anchorEl, open: Boolean(anchorEl), onClose: handleMenuClose, onClick: handleMenuClose, children: [_jsx(MenuItem, { children: "Profile" }), _jsx(MenuItem, { children: "My Account" }), _jsx(MenuItem, { children: "Logout" })] }), _jsxs(Menu, { anchorEl: mobileMenuAnchorEl, open: Boolean(mobileMenuAnchorEl), onClose: handleMenuClose, children: [_jsx(MenuItem, { children: "Dashboard" }), _jsx(MenuItem, { children: "Reports" }), _jsx(MenuItem, { children: "Settings" })] })] }));
};
