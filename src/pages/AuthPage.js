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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { Box, Paper, Typography, TextField, Button, Alert, Tabs, Tab, Divider, Link, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
function TabPanel(props) {
    var children = props.children, value = props.value, index = props.index, other = __rest(props, ["children", "value", "index"]);
    return (_jsx("div", __assign({ role: "tabpanel", hidden: value !== index, id: "auth-tabpanel-".concat(index), "aria-labelledby": "auth-tab-".concat(index) }, other, { children: value === index && _jsx(Box, { sx: { pt: 3 }, children: children }) })));
}
var AuthPage = function () {
    var _a = useState(0), activeTab = _a[0], setActiveTab = _a[1];
    var _b = useState(''), email = _b[0], setEmail = _b[1];
    var _c = useState(''), password = _c[0], setPassword = _c[1];
    var _d = useState(''), confirmPassword = _d[0], setConfirmPassword = _d[1];
    var _e = useState(false), loading = _e[0], setLoading = _e[1];
    var _f = useState(null), error = _f[0], setError = _f[1];
    var _g = useState(false), emailSent = _g[0], setEmailSent = _g[1];
    var signIn = useAuth().signIn;
    var navigate = useNavigate();
    var handleTabChange = function (event, newValue) {
        setActiveTab(newValue);
        setError(null);
        setPassword('');
        setConfirmPassword('');
    };
    var validateForm = function () {
        if (activeTab === 1) { // Registration mode
            if (password !== confirmPassword) {
                setError('Passwords do not match');
                return false;
            }
            if (password.length < 8) {
                setError('Password must be at least 8 characters long');
                return false;
            }
        }
        return true;
    };
    var handleSignUp = function (e) { return __awaiter(void 0, void 0, void 0, function () {
        var _a, data, error_1, err_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    e.preventDefault();
                    setError(null);
                    setLoading(true);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, 4, 5]);
                    return [4 /*yield*/, supabase.auth.signUp({
                            email: email,
                            password: password,
                            options: {
                                emailRedirectTo: "".concat(import.meta.env.PROD ? 'https://staging.clauseatlas.com' : window.location.origin, "/auth/callback"),
                                data: {
                                    setup_required: true,
                                    registration_date: new Date().toISOString()
                                }
                            }
                        })];
                case 2:
                    _a = _b.sent(), data = _a.data, error_1 = _a.error;
                    if (error_1)
                        throw error_1;
                    if (data.user && !data.session) {
                        // Email confirmation required
                        setEmailSent(true);
                        setError(null);
                    }
                    else if (data.session) {
                        // User is automatically signed in (email confirmation disabled)
                        navigate('/setup-organization');
                    }
                    return [3 /*break*/, 5];
                case 3:
                    err_1 = _b.sent();
                    setError(err_1 instanceof Error ? err_1.message : 'Registration failed');
                    return [3 /*break*/, 5];
                case 4:
                    setLoading(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    var handleSignIn = function (e) { return __awaiter(void 0, void 0, void 0, function () {
        var err_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    e.preventDefault();
                    setError(null);
                    setLoading(true);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, 4, 5]);
                    return [4 /*yield*/, signIn(email, password)];
                case 2:
                    _a.sent();
                    navigate('/');
                    return [3 /*break*/, 5];
                case 3:
                    err_2 = _a.sent();
                    setError(err_2 instanceof Error ? err_2.message : 'Sign in failed');
                    return [3 /*break*/, 5];
                case 4:
                    setLoading(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    var handleSubmit = function (e) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!validateForm()) {
                        return [2 /*return*/];
                    }
                    if (!(activeTab === 0)) return [3 /*break*/, 2];
                    return [4 /*yield*/, handleSignIn(e)];
                case 1:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 2: return [4 /*yield*/, handleSignUp(e)];
                case 3:
                    _a.sent();
                    _a.label = 4;
                case 4: return [2 /*return*/];
            }
        });
    }); };
    var isLoginMode = activeTab === 0;
    // Show email confirmation message
    if (emailSent) {
        return (_jsx(Box, { sx: {
                width: '100vw',
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'grey.100',
                p: 2,
            }, children: _jsxs(Paper, { elevation: 3, sx: {
                    p: 4,
                    width: '100%',
                    maxWidth: 480,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                }, children: [_jsx(Box, { sx: { mb: 3 }, children: _jsx("img", { src: "/ClauseAtlasLogoSM.png", alt: "ClauseAtlas logo", style: { width: 240, height: 'auto' } }) }), _jsx(Typography, { variant: "h5", component: "h1", gutterBottom: true, children: "Check Your Email" }), _jsxs(Typography, { variant: "body1", sx: { mb: 3 }, children: ["We've sent a confirmation link to ", _jsx("strong", { children: email })] }), _jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mb: 3 }, children: "Click the link in your email to verify your account and complete registration." }), _jsx(Button, { variant: "outlined", onClick: function () {
                            setEmailSent(false);
                            setActiveTab(0);
                        }, sx: { mt: 2 }, children: "Back to Sign In" })] }) }));
    }
    return (_jsx(Box, { sx: {
            width: '100vw',
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'grey.100',
            p: 2,
        }, children: _jsxs(Paper, { elevation: 3, sx: {
                p: 4,
                width: '100%',
                maxWidth: 480,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
            }, children: [_jsx(Box, { sx: { mb: 3 }, children: _jsx("img", { src: "/ClauseAtlasLogoSM.png", alt: "ClauseAtlas logo", style: { width: 240, height: 'auto' } }) }), _jsx(Typography, { variant: "h4", component: "h1", gutterBottom: true, align: "center", children: "Welcome to ClauseAtlas" }), _jsx(Typography, { variant: "body1", color: "text.secondary", align: "center", sx: { mb: 3 }, children: isLoginMode
                        ? 'Sign in to your account to continue'
                        : 'Create your account to get started' }), _jsx(Box, { sx: { width: '100%', mb: 2 }, children: _jsxs(Tabs, { value: activeTab, onChange: handleTabChange, variant: "fullWidth", sx: {
                            '& .MuiTab-root': {
                                fontWeight: 600,
                                fontSize: '1rem',
                                py: 2,
                            },
                            '& .MuiTabs-indicator': {
                                height: 3,
                                borderRadius: 2,
                                background: 'linear-gradient(90deg, #6366f1 0%, #0ea5e9 100%)',
                            },
                        }, children: [_jsx(Tab, { label: "Sign In" }), _jsx(Tab, { label: "Create Account" })] }) }), error && (_jsx(Alert, { severity: "error", sx: { width: '100%', mb: 2 }, children: error })), _jsxs(Box, { component: "form", onSubmit: handleSubmit, sx: { width: '100%' }, children: [_jsx(TextField, { fullWidth: true, id: "email", name: "email", label: "Email Address", type: "email", value: email, onChange: function (e) { return setEmail(e.target.value); }, required: true, margin: "normal", autoComplete: "email", autoFocus: true }), _jsx(TextField, { fullWidth: true, id: "password", name: "password", label: "Password", type: "password", value: password, onChange: function (e) { return setPassword(e.target.value); }, required: true, margin: "normal", autoComplete: isLoginMode ? "current-password" : "new-password" }), !isLoginMode && (_jsx(TextField, { fullWidth: true, id: "confirmPassword", name: "confirmPassword", label: "Confirm Password", type: "password", value: confirmPassword, onChange: function (e) { return setConfirmPassword(e.target.value); }, required: true, margin: "normal", autoComplete: "new-password" })), _jsx(Button, { type: "submit", fullWidth: true, variant: "contained", size: "large", disabled: loading, sx: {
                                mt: 3,
                                mb: 2,
                                py: 1.5,
                                fontSize: '1.1rem',
                                fontWeight: 600,
                                background: 'linear-gradient(90deg, #6366f1 0%, #0ea5e9 100%)',
                                '&:hover': {
                                    background: 'linear-gradient(90deg, #5855eb 0%, #0d9488 100%)',
                                }
                            }, children: loading ? (_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(CircularProgress, { size: 20, color: "inherit" }), isLoginMode ? 'Signing In...' : 'Creating Account...'] })) : (isLoginMode ? 'Sign In' : 'Create Account') })] }), _jsx(Divider, { sx: { width: '100%', my: 2 } }), _jsx(Typography, { variant: "body2", color: "text.secondary", align: "center", children: isLoginMode ? (_jsxs(_Fragment, { children: ["Don't have an account?", ' ', _jsx(Link, { component: "button", variant: "body2", onClick: function () { return setActiveTab(1); }, sx: { fontWeight: 600 }, children: "Create one here" })] })) : (_jsxs(_Fragment, { children: ["Already have an account?", ' ', _jsx(Link, { component: "button", variant: "body2", onClick: function () { return setActiveTab(0); }, sx: { fontWeight: 600 }, children: "Sign in here" })] })) })] }) }));
};
export default AuthPage;
