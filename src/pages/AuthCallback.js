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
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Box, CircularProgress, Typography, Button, Paper, Alert } from '@mui/material';
var AuthCallback = function () {
    var _a = useState(true), loading = _a[0], setLoading = _a[1];
    var _b = useState(null), error = _b[0], setError = _b[1];
    var navigate = useNavigate();
    useEffect(function () {
        var handleAuthCallback = function () { return __awaiter(void 0, void 0, void 0, function () {
            var _a, data, error_1, user, setupRequired, err_1;
            var _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _d.trys.push([0, 2, 3, 4]);
                        return [4 /*yield*/, supabase.auth.getSession()];
                    case 1:
                        _a = _d.sent(), data = _a.data, error_1 = _a.error;
                        if (error_1)
                            throw error_1;
                        if ((_b = data.session) === null || _b === void 0 ? void 0 : _b.user) {
                            user = data.session.user;
                            setupRequired = (_c = user.user_metadata) === null || _c === void 0 ? void 0 : _c.setup_required;
                            if (setupRequired) {
                                // User needs to complete organization setup
                                navigate('/setup-organization');
                            }
                            else {
                                // User is already set up, go to main app
                                navigate('/');
                            }
                        }
                        else {
                            setError('No session found after email verification');
                        }
                        return [3 /*break*/, 4];
                    case 2:
                        err_1 = _d.sent();
                        console.error('Auth callback error:', err_1);
                        setError(err_1 instanceof Error ? err_1.message : 'Authentication failed');
                        return [3 /*break*/, 4];
                    case 3:
                        setLoading(false);
                        return [7 /*endfinally*/];
                    case 4: return [2 /*return*/];
                }
            });
        }); };
        handleAuthCallback();
    }, [navigate]);
    if (loading) {
        return (_jsx(Box, { sx: {
                width: '100vw',
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'grey.100',
            }, children: _jsxs(Paper, { elevation: 3, sx: {
                    p: 4,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    maxWidth: 400,
                }, children: [_jsx(Box, { sx: { mb: 3 }, children: _jsx("img", { src: "/ClauseAtlasLogoSM.png", alt: "ClauseAtlas logo", style: { width: 200, height: 'auto' } }) }), _jsx(CircularProgress, { size: 60, sx: { mb: 3 } }), _jsx(Typography, { variant: "h6", gutterBottom: true, children: "Verifying your account..." }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "Please wait while we complete your email verification." })] }) }));
    }
    if (error) {
        return (_jsx(Box, { sx: {
                width: '100vw',
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'grey.100',
            }, children: _jsxs(Paper, { elevation: 3, sx: {
                    p: 4,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    maxWidth: 400,
                }, children: [_jsx(Box, { sx: { mb: 3 }, children: _jsx("img", { src: "/ClauseAtlasLogoSM.png", alt: "ClauseAtlas logo", style: { width: 200, height: 'auto' } }) }), _jsxs(Alert, { severity: "error", sx: { width: '100%', mb: 3 }, children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "Verification Failed" }), _jsx(Typography, { variant: "body2", children: error })] }), _jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mb: 3 }, children: "There was an issue verifying your email address. Please try again or contact support." }), _jsx(Button, { variant: "contained", onClick: function () { return navigate('/login'); }, sx: { mt: 2 }, children: "Back to Sign In" })] }) }));
    }
    return null;
};
export default AuthCallback;
