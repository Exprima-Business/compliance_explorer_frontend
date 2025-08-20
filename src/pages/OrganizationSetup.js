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
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Box, Paper, Typography, TextField, Button, Alert, CircularProgress, Stepper, Step, StepLabel, StepContent } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import environment from '../config/environment';
import { dlog } from '../utils/debugLog';
var OrganizationSetup = function () {
    var _a = useState(0), activeStep = _a[0], setActiveStep = _a[1];
    var _b = useState({
        organizationName: '',
        projectName: ''
    }), formData = _b[0], setFormData = _b[1];
    var _c = useState(false), loading = _c[0], setLoading = _c[1];
    var _d = useState(null), error = _d[0], setError = _d[1];
    var _e = useState(null), user = _e[0], setUser = _e[1];
    var authUser = useAuth().user;
    var navigate = useNavigate();
    useEffect(function () {
        // Get current user session
        var getCurrentUser = function () { return __awaiter(void 0, void 0, void 0, function () {
            var session, err_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, import('../lib/supabase').then(function (m) { return m.supabase.auth.getSession(); })];
                    case 1:
                        session = (_a.sent()).data.session;
                        if (session === null || session === void 0 ? void 0 : session.user) {
                            setUser(session.user);
                            dlog('OrganizationSetup: User session loaded', { userId: session.user.id });
                        }
                        else {
                            // No session, redirect to login
                            navigate('/login');
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        err_1 = _a.sent();
                        console.error('Failed to get user session:', err_1);
                        navigate('/login');
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        }); };
        getCurrentUser();
    }, [navigate]);
    var validateOrganizationName = function (name) {
        if (!name.trim()) {
            return 'Organization name is required';
        }
        if (name.length < 2) {
            return 'Organization name must be at least 2 characters long';
        }
        if (name.length > 50) {
            return 'Organization name must be no more than 50 characters';
        }
        if (!/^[a-zA-Z0-9\s\-_]+$/.test(name)) {
            return 'Organization name can only contain letters, numbers, spaces, hyphens, and underscores';
        }
        return null;
    };
    var handleOrganizationNameChange = function (value) {
        setFormData(function (prev) { return (__assign(__assign({}, prev), { organizationName: value })); });
        setError(null); // Clear error when user types
    };
    var handleProjectNameChange = function (value) {
        setFormData(function (prev) { return (__assign(__assign({}, prev), { projectName: value })); });
    };
    var handleNext = function () {
        var validationError = validateOrganizationName(formData.organizationName);
        if (validationError) {
            setError(validationError);
            return;
        }
        setActiveStep(1);
    };
    var handleBack = function () {
        setActiveStep(0);
    };
    var handleSubmit = function () { return __awaiter(void 0, void 0, void 0, function () {
        var response, data, sessionError, sessionError_1, updateError, updateError_1, err_2, errorMessage;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!user) {
                        setError('No user session found');
                        return [2 /*return*/];
                    }
                    setLoading(true);
                    setError(null);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 13, 14, 15]);
                    dlog('OrganizationSetup: Submitting organization setup', {
                        organizationName: formData.organizationName,
                        projectName: formData.projectName,
                        userId: user.id
                    });
                    return [4 /*yield*/, fetch("".concat(environment.api.url, "/api/organizations/setup"), {
                            method: 'POST',
                            headers: {
                                'Authorization': "Bearer ".concat(user.access_token),
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                organizationName: formData.organizationName,
                                projectName: formData.projectName || undefined
                            })
                        })];
                case 2:
                    response = _a.sent();
                    return [4 /*yield*/, response.json()];
                case 3:
                    data = _a.sent();
                    if (!data.success) return [3 /*break*/, 11];
                    dlog('OrganizationSetup: Setup successful', {
                        organization: data.organization,
                        project: data.project,
                        redirectTo: data.redirectTo
                    });
                    if (!data.token) return [3 /*break*/, 7];
                    _a.label = 4;
                case 4:
                    _a.trys.push([4, 6, , 7]);
                    return [4 /*yield*/, supabase.auth.setSession({
                            access_token: data.token,
                            refresh_token: data.refreshToken || ''
                        })];
                case 5:
                    sessionError = (_a.sent()).error;
                    if (sessionError) {
                        dlog('OrganizationSetup: Failed to update session with new token', { error: sessionError });
                    }
                    else {
                        dlog('OrganizationSetup: Successfully updated session with new token');
                    }
                    return [3 /*break*/, 7];
                case 6:
                    sessionError_1 = _a.sent();
                    dlog('OrganizationSetup: Error updating session', { error: sessionError_1 });
                    return [3 /*break*/, 7];
                case 7:
                    _a.trys.push([7, 9, , 10]);
                    return [4 /*yield*/, supabase.auth.updateUser({
                            data: { setup_required: false }
                        })];
                case 8:
                    updateError = (_a.sent()).error;
                    if (updateError) {
                        dlog('OrganizationSetup: Failed to clear setup_required flag', { error: updateError });
                    }
                    else {
                        dlog('OrganizationSetup: Successfully cleared setup_required flag');
                    }
                    return [3 /*break*/, 10];
                case 9:
                    updateError_1 = _a.sent();
                    dlog('OrganizationSetup: Error clearing setup_required flag', { error: updateError_1 });
                    return [3 /*break*/, 10];
                case 10:
                    // Navigate to the specified redirect URL
                    navigate(data.redirectTo);
                    return [3 /*break*/, 12];
                case 11:
                    setError(data.error.message);
                    dlog('OrganizationSetup: Setup failed', { error: data.error });
                    _a.label = 12;
                case 12: return [3 /*break*/, 15];
                case 13:
                    err_2 = _a.sent();
                    errorMessage = err_2 instanceof Error ? err_2.message : 'Failed to setup organization';
                    setError(errorMessage);
                    dlog('OrganizationSetup: Setup error', { error: errorMessage });
                    return [3 /*break*/, 15];
                case 14:
                    setLoading(false);
                    return [7 /*endfinally*/];
                case 15: return [2 /*return*/];
            }
        });
    }); };
    var steps = [
        {
            label: 'Organization Details',
            description: 'Set up your organization',
            content: (_jsxs(Box, { sx: { mt: 2 }, children: [_jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mb: 3 }, children: "Create your organization to get started with ClauseAtlas. This will be your workspace for managing compliance clauses and projects." }), _jsx(TextField, { fullWidth: true, label: "Organization Name", value: formData.organizationName, onChange: function (e) { return handleOrganizationNameChange(e.target.value); }, placeholder: "Enter your organization name", helperText: "2-50 characters, letters, numbers, spaces, hyphens, and underscores only", error: !!error, disabled: loading, sx: { mb: 2 } }), error && (_jsx(Alert, { severity: "error", sx: { mb: 2 }, children: error })), _jsx(Box, { sx: { display: 'flex', gap: 2 }, children: _jsx(Button, { variant: "contained", onClick: handleNext, disabled: !formData.organizationName.trim() || loading, children: "Next" }) })] }))
        },
        {
            label: 'Project Setup',
            description: 'Create your first project',
            content: (_jsxs(Box, { sx: { mt: 2 }, children: [_jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mb: 3 }, children: "Create your first project within the organization. You can always add more projects later." }), _jsx(TextField, { fullWidth: true, label: "Project Name (Optional)", value: formData.projectName, onChange: function (e) { return handleProjectNameChange(e.target.value); }, placeholder: "Enter project name or leave blank for default", helperText: "Leave blank to create 'Default Project'", disabled: loading, sx: { mb: 2 } }), _jsxs(Box, { sx: { display: 'flex', gap: 2 }, children: [_jsx(Button, { variant: "outlined", onClick: handleBack, disabled: loading, children: "Back" }), _jsx(Button, { variant: "contained", onClick: handleSubmit, disabled: loading, children: loading ? (_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(CircularProgress, { size: 20, color: "inherit" }), "Setting up..."] })) : ('Complete Setup') })] })] }))
        }
    ];
    if (!user) {
        return (_jsx(Box, { sx: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }, children: _jsx(CircularProgress, {}) }));
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
                maxWidth: 600,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
            }, children: [_jsx(Box, { sx: { mb: 3 }, children: _jsx("img", { src: "/ClauseAtlasLogoSM.png", alt: "ClauseAtlas logo", style: { width: 240, height: 'auto' } }) }), _jsx(Typography, { variant: "h4", component: "h1", gutterBottom: true, align: "center", children: "Complete Your Setup" }), _jsx(Typography, { variant: "body1", color: "text.secondary", align: "center", sx: { mb: 4 }, children: "Welcome to ClauseAtlas! Let's set up your organization and first project." }), _jsx(Box, { sx: { width: '100%' }, children: _jsx(Stepper, { activeStep: activeStep, orientation: "vertical", children: steps.map(function (step, index) { return (_jsxs(Step, { children: [_jsx(StepLabel, { children: step.label }), _jsxs(StepContent, { children: [_jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mb: 2 }, children: step.description }), step.content] })] }, step.label)); }) }) })] }) }));
};
export default OrganizationSetup;
