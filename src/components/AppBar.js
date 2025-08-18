var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState } from 'react';
import { AppBar as MuiAppBar, Toolbar, Typography, Button, IconButton, Box, Menu, MenuItem, Avatar, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Tabs, Tab, } from '@mui/material';
import { Settings as SettingsIcon, } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import ProjectSelector from './ProjectSelector';
import { useBookmarks } from '../contexts/BookmarkContext';
import ConnectionStatus from './ConnectionStatus';
export var AppBar = function (_a) {
    var _b, _c;
    var activeTab = _a.activeTab, onTabChange = _a.onTabChange, onSettingsClick = _a.onSettingsClick, enableScanner = _a.enableScanner;
    var _d = React.useState(null), anchorEl = _d[0], setAnchorEl = _d[1];
    var connectionStatus = useBookmarks().connectionStatus;
    var _e = useState(false), logoutOpen = _e[0], setLogoutOpen = _e[1];
    var _f = useAuth(), user = _f.user, signOut = _f.signOut;
    var navigate = useNavigate();
    var handleProfileMenuOpen = function (event) {
        setAnchorEl(event.currentTarget);
    };
    var handleMenuClose = function () {
        setAnchorEl(null);
    };
    var handleLogout = function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, signOut()];
                case 1:
                    _a.sent();
                    handleMenuClose();
                    setLogoutOpen(false);
                    navigate('/login');
                    return [2 /*return*/];
            }
        });
    }); };
    return (_jsx(_Fragment, { children: _jsxs(MuiAppBar, { position: "fixed", color: "default", elevation: 0, sx: {
                width: '100%',
                zIndex: function (theme) { return theme.zIndex.drawer + 1; },
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(8px)',
                borderBottom: '1px solid rgba(148, 163, 184, 0.1)'
            }, children: [_jsxs(Toolbar, { sx: { px: { xs: 2, sm: 3 }, minHeight: { xs: 64, sm: 72 } }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', flexGrow: 1 }, children: [_jsx(Box, { sx: { display: 'flex', alignItems: 'center' }, children: _jsx(Box, { component: "img", src: "/ClauseAtlasLogoSM.png", alt: "ClauseAtlas Logo", sx: {
                                            height: 'auto',
                                            width: 'auto',
                                            maxHeight: 57,
                                            mr: 2.5,
                                            display: 'block',
                                        } }) }), _jsxs(Tabs, { value: activeTab, onChange: onTabChange, "aria-label": "main navigation tabs", sx: {
                                        minHeight: 48,
                                        height: 48,
                                        '.MuiTab-root': {
                                            fontWeight: 600,
                                            fontSize: '1rem',
                                            px: 3,
                                            minHeight: 48,
                                        },
                                        '.MuiTabs-indicator': {
                                            height: 3,
                                            borderRadius: 2,
                                            background: 'linear-gradient(90deg, #6366f1 0%, #0ea5e9 100%)',
                                        },
                                    }, indicatorColor: "secondary", textColor: "primary", children: [_jsx(Tab, { label: "Clauses" }), _jsx(Tab, { label: "Matrix" }), enableScanner && _jsx(Tab, { label: "Document Scanner" })] })] }), _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', ml: 2, gap: 1 }, children: [_jsx(ProjectSelector, {}), _jsx(ConnectionStatus, { status: connectionStatus, showLabel: false, size: "small" }), _jsx(Tooltip, { title: "Settings", children: _jsx(IconButton, { color: "inherit", onClick: onSettingsClick, children: _jsx(SettingsIcon, {}) }) }), user ? (_jsxs(_Fragment, { children: [_jsx(Tooltip, { title: user.email || 'Account settings', children: _jsx(IconButton, { onClick: handleProfileMenuOpen, size: "small", sx: { ml: 2 }, children: _jsx(Avatar, { sx: { width: 32, height: 32 }, children: ((_c = (_b = user.email) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.toUpperCase()) || 'U' }) }) }), _jsx(Button, { color: "inherit", onClick: function () { return setLogoutOpen(true); }, children: "Logout" })] })) : (_jsxs(_Fragment, { children: [_jsx(Button, { color: "inherit", onClick: function () { return navigate('/login'); }, sx: { ml: 2 }, children: "Login" }), _jsx(Button, { color: "secondary", variant: "contained", onClick: function () { return navigate('/login'); }, sx: { ml: 1 }, children: "Sign Up" })] }))] })] }), _jsxs(Menu, { anchorEl: anchorEl, open: Boolean(anchorEl), onClose: handleMenuClose, onClick: handleMenuClose, children: [_jsx(MenuItem, { disabled: true, children: user === null || user === void 0 ? void 0 : user.email }), _jsx(MenuItem, { children: "Profile" }), _jsx(MenuItem, { children: "My Account" }), _jsx(MenuItem, { onClick: function () { return setLogoutOpen(true); }, children: "Logout" })] }), _jsxs(Dialog, { open: logoutOpen, onClose: function () { return setLogoutOpen(false); }, maxWidth: "xs", fullWidth: true, children: [_jsx(DialogTitle, { children: "Confirm Logout" }), _jsx(DialogContent, { children: _jsx(Typography, { children: "Are you sure you want to log out?" }) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: function () { return setLogoutOpen(false); }, children: "Cancel" }), _jsx(Button, { onClick: handleLogout, color: "primary", variant: "contained", children: "Logout" })] })] })] }) }));
};
