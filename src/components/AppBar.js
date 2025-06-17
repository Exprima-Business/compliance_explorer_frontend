var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
import { AppBar as MuiAppBar, Toolbar, Typography, Button, IconButton, Box, Menu, MenuItem, Avatar, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert, Tabs, Tab, Snackbar, } from '@mui/material';
import { Settings as SettingsIcon, } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { SignIn } from './SignIn';
import { useNavigate } from 'react-router-dom';
export var AppBar = function (_a) {
    var _b, _c;
    var activeTab = _a.activeTab, onTabChange = _a.onTabChange, onSettingsClick = _a.onSettingsClick;
    var _d = React.useState(null), anchorEl = _d[0], setAnchorEl = _d[1];
    var _e = useState(false), loginOpen = _e[0], setLoginOpen = _e[1];
    var _f = useState(false), signUpOpen = _f[0], setSignUpOpen = _f[1];
    var _g = useState(''), signUpEmail = _g[0], setSignUpEmail = _g[1];
    var _h = useState(''), signUpPassword = _h[0], setSignUpPassword = _h[1];
    var _j = useState(null), signUpError = _j[0], setSignUpError = _j[1];
    var _k = useState(false), signUpLoading = _k[0], setSignUpLoading = _k[1];
    var _l = useState(false), logoutOpen = _l[0], setLogoutOpen = _l[1];
    var _m = useState({
        open: false,
        message: '',
        severity: 'info'
    }), snackbar = _m[0], setSnackbar = _m[1];
    var _o = useAuth(), user = _o.user, signOut = _o.signOut, signUp = _o.signUp;
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
    var handleSignUp = function (e) { return __awaiter(void 0, void 0, void 0, function () {
        var err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    e.preventDefault();
                    setSignUpError(null);
                    setSignUpLoading(true);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, 4, 5]);
                    return [4 /*yield*/, signUp(signUpEmail, signUpPassword)];
                case 2:
                    _a.sent();
                    setSignUpOpen(false);
                    setSnackbar({
                        open: true,
                        message: 'Account created successfully! Please check your email to verify your account.',
                        severity: 'success'
                    });
                    return [3 /*break*/, 5];
                case 3:
                    err_1 = _a.sent();
                    setSignUpError(err_1 instanceof Error ? err_1.message : 'Sign up failed');
                    return [3 /*break*/, 5];
                case 4:
                    setSignUpLoading(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    var handleSnackbarClose = function () {
        setSnackbar(function (prev) { return (__assign(__assign({}, prev), { open: false })); });
    };
    return (_jsxs(_Fragment, { children: [_jsxs(MuiAppBar, { position: "fixed", color: "default", elevation: 0, sx: {
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
                                        }, indicatorColor: "secondary", textColor: "primary", children: [_jsx(Tab, { label: "Clauses" }), _jsx(Tab, { label: "Matrix" }), _jsx(Tab, { label: "Document Scanner" })] })] }), _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', ml: 2 }, children: [_jsx(Tooltip, { title: "Settings", children: _jsx(IconButton, { color: "inherit", onClick: onSettingsClick, children: _jsx(SettingsIcon, {}) }) }), user ? (_jsxs(_Fragment, { children: [_jsx(Tooltip, { title: user.email || 'Account settings', children: _jsx(IconButton, { onClick: handleProfileMenuOpen, size: "small", sx: { ml: 2 }, children: _jsx(Avatar, { sx: { width: 32, height: 32 }, children: ((_c = (_b = user.email) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.toUpperCase()) || 'U' }) }) }), _jsx(Button, { color: "inherit", onClick: function () { return setLogoutOpen(true); }, children: "Logout" })] })) : (_jsxs(_Fragment, { children: [_jsx(Button, { color: "inherit", onClick: function () { return setLoginOpen(true); }, sx: { ml: 2 }, children: "Login" }), _jsx(Button, { color: "secondary", variant: "contained", onClick: function () { return setSignUpOpen(true); }, sx: { ml: 1 }, children: "Sign Up" })] }))] })] }), _jsxs(Menu, { anchorEl: anchorEl, open: Boolean(anchorEl), onClose: handleMenuClose, onClick: handleMenuClose, children: [_jsx(MenuItem, { disabled: true, children: user === null || user === void 0 ? void 0 : user.email }), _jsx(MenuItem, { children: "Profile" }), _jsx(MenuItem, { children: "My Account" }), _jsx(MenuItem, { onClick: function () { return setLogoutOpen(true); }, children: "Logout" })] }), _jsxs(Dialog, { open: loginOpen, onClose: function () { return setLoginOpen(false); }, maxWidth: "xs", fullWidth: true, children: [_jsx(DialogTitle, { children: "Sign In" }), _jsx(DialogContent, { children: _jsx(SignIn, {}) }), _jsx(DialogActions, { children: _jsx(Button, { onClick: function () { return setLoginOpen(false); }, children: "Close" }) })] }), _jsxs(Dialog, { open: logoutOpen, onClose: function () { return setLogoutOpen(false); }, maxWidth: "xs", fullWidth: true, children: [_jsx(DialogTitle, { children: "Confirm Logout" }), _jsx(DialogContent, { children: _jsx(Typography, { children: "Are you sure you want to log out?" }) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: function () { return setLogoutOpen(false); }, children: "Cancel" }), _jsx(Button, { onClick: handleLogout, color: "primary", variant: "contained", children: "Logout" })] })] }), _jsxs(Dialog, { open: signUpOpen, onClose: function () { return setSignUpOpen(false); }, maxWidth: "xs", fullWidth: true, children: [_jsx(DialogTitle, { children: "Create Account" }), _jsx(DialogContent, { children: _jsxs("form", { onSubmit: handleSignUp, children: [_jsx(TextField, { autoFocus: true, margin: "dense", label: "Email Address", type: "email", fullWidth: true, value: signUpEmail, onChange: function (e) { return setSignUpEmail(e.target.value); }, required: true }), _jsx(TextField, { margin: "dense", label: "Password", type: "password", fullWidth: true, value: signUpPassword, onChange: function (e) { return setSignUpPassword(e.target.value); }, required: true }), signUpError && (_jsx(Alert, { severity: "error", sx: { mt: 2 }, children: signUpError }))] }) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: function () { return setSignUpOpen(false); }, children: "Cancel" }), _jsx(Button, { onClick: handleSignUp, color: "primary", variant: "contained", disabled: signUpLoading, children: signUpLoading ? 'Creating Account...' : 'Sign Up' })] })] })] }), _jsx(Snackbar, { open: snackbar.open, autoHideDuration: 6000, onClose: handleSnackbarClose, anchorOrigin: { vertical: 'bottom', horizontal: 'center' }, children: _jsx(Alert, { onClose: handleSnackbarClose, severity: snackbar.severity, sx: { width: '100%' }, children: snackbar.message }) })] }));
};
