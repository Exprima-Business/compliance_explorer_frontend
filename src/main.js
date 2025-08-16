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
import { jsx as _jsx } from "react/jsx-runtime";
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { DEBUG_LOG } from './config/debug';
import { DebugErrorBoundary } from './components/DebugErrorBoundary';
import './utils/setupDebug';
import { supabase } from './lib/supabase';
// --- Supabase Auth Event Logging (4, 7) ---
if (typeof window !== 'undefined' && !window.__SUPABASE_AUTH_LOGGED) {
    window.__SUPABASE_AUTH_LOGGED = true;
    supabase.auth.onAuthStateChange(function (event, session) {
        console.log('[SUPABASE AUTH EVENT]', event, session);
        if (session) {
            var now = Math.floor(Date.now() / 1000);
            console.log('[SUPABASE AUTH SESSION STATE]', {
                access_token: session.access_token,
                refresh_token: session.refresh_token,
                expires_at: session.expires_at,
                expires_in: session.expires_in,
                now: now,
                expires_in_seconds: session.expires_at ? session.expires_at - now : undefined,
                user: session.user
            });
        }
    });
}
// --- Global fetch interceptor for refresh token requests (6) ---
if (typeof window !== 'undefined' && !window.__SUPABASE_FETCH_LOGGED) {
    window.__SUPABASE_FETCH_LOGGED = true;
    var origFetch_1 = window.fetch;
    window.fetch = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return __awaiter(void 0, void 0, void 0, function () {
            var resp, clone, data, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (typeof args[0] === 'string' && args[0].includes('/auth/v1/token?grant_type=refresh_token')) {
                            console.log('[SUPABASE REFRESH REQUEST]', args);
                        }
                        return [4 /*yield*/, origFetch_1.apply(void 0, args)];
                    case 1:
                        resp = _a.sent();
                        if (!(typeof args[0] === 'string' && args[0].includes('/auth/v1/token?grant_type=refresh_token'))) return [3 /*break*/, 5];
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        clone = resp.clone();
                        return [4 /*yield*/, clone.json()];
                    case 3:
                        data = _a.sent();
                        console.log('[SUPABASE REFRESH RESPONSE]', data);
                        return [3 /*break*/, 5];
                    case 4:
                        e_1 = _a.sent();
                        console.error('[SUPABASE REFRESH RESPONSE ERROR]', e_1);
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/, resp];
                }
            });
        });
    };
}
// --- Log session persistence after reload (1, 5) ---
if (typeof window !== 'undefined') {
    supabase.auth.getSession().then(function (_a) {
        var session = _a.data.session;
        var now = Math.floor(Date.now() / 1000);
        console.log('[SSE DEBUG] Session after reload:', session);
        if (session) {
            console.log('[SSE DEBUG] Session after reload details:', {
                access_token: session.access_token,
                refresh_token: session.refresh_token,
                expires_at: session.expires_at,
                expires_in: session.expires_in,
                now: now,
                expires_in_seconds: session.expires_at ? session.expires_at - now : undefined,
                user: session.user
            });
        }
    });
}
// --- Manual refreshSession logging utility (2) ---
if (typeof window !== 'undefined') {
    window.debugRefreshSession = function () { return __awaiter(void 0, void 0, void 0, function () {
        var result, now, e_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, supabase.auth.refreshSession()];
                case 1:
                    result = _a.sent();
                    console.log('[SUPABASE REFRESHSESSION RESULT]', result);
                    now = Math.floor(Date.now() / 1000);
                    if (result.data.session) {
                        console.log('[SUPABASE REFRESHSESSION SESSION DETAILS]', {
                            access_token: result.data.session.access_token,
                            refresh_token: result.data.session.refresh_token,
                            expires_at: result.data.session.expires_at,
                            expires_in: result.data.session.expires_in,
                            now: now,
                            expires_in_seconds: result.data.session.expires_at ? result.data.session.expires_at - now : undefined,
                            user: result.data.session.user
                        });
                    }
                    return [3 /*break*/, 3];
                case 2:
                    e_2 = _a.sent();
                    console.error('[SUPABASE REFRESHSESSION ERROR]', e_2);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); };
    console.log('[SUPABASE DEBUG] Call window.debugRefreshSession() in the console to manually refresh and log session.');
}
// --- Organization Validation debugging utility ---
if (typeof window !== 'undefined') {
    window.debugOrganizationValidation = function () { return __awaiter(void 0, void 0, void 0, function () {
        var OrganizationValidationService, hasContext, userOrgs, e_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 4, , 5]);
                    return [4 /*yield*/, import('./services/organizationValidationService')];
                case 1:
                    OrganizationValidationService = (_a.sent()).OrganizationValidationService;
                    return [4 /*yield*/, OrganizationValidationService.hasValidOrganizationContext()];
                case 2:
                    hasContext = _a.sent();
                    return [4 /*yield*/, OrganizationValidationService.getUserOrganizations()];
                case 3:
                    userOrgs = _a.sent();
                    console.log('[ORGANIZATION VALIDATION DEBUG]', {
                        hasValidContext: hasContext,
                        userOrganizations: userOrgs
                    });
                    return [3 /*break*/, 5];
                case 4:
                    e_3 = _a.sent();
                    console.error('[ORGANIZATION VALIDATION DEBUG ERROR]', e_3);
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    window.debugRawOrganizationValidation = function () { return __awaiter(void 0, void 0, void 0, function () {
        var OrganizationValidationService, result, supabase_1, session, e_4;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 5, , 6]);
                    return [4 /*yield*/, import('./services/organizationValidationService')];
                case 1:
                    OrganizationValidationService = (_c.sent()).OrganizationValidationService;
                    console.log('[RAW ORGANIZATION VALIDATION DEBUG] Starting raw validation call...');
                    return [4 /*yield*/, OrganizationValidationService.validateOrganization()];
                case 2:
                    result = _c.sent();
                    console.log('[RAW ORGANIZATION VALIDATION DEBUG] Raw result:', result);
                    return [4 /*yield*/, import('./lib/supabase')];
                case 3:
                    supabase_1 = (_c.sent()).supabase;
                    return [4 /*yield*/, supabase_1.auth.getSession()];
                case 4:
                    session = (_c.sent()).data.session;
                    console.log('[RAW ORGANIZATION VALIDATION DEBUG] Current session:', {
                        hasSession: !!session,
                        userId: (_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id,
                        tokenLength: ((_b = session === null || session === void 0 ? void 0 : session.access_token) === null || _b === void 0 ? void 0 : _b.length) || 0
                    });
                    return [3 /*break*/, 6];
                case 5:
                    e_4 = _c.sent();
                    console.error('[RAW ORGANIZATION VALIDATION DEBUG ERROR]', e_4);
                    return [3 /*break*/, 6];
                case 6: return [2 /*return*/];
            }
        });
    }); };
    console.log('[ORGANIZATION VALIDATION DEBUG] Call window.debugOrganizationValidation() in the console to debug organization validation.');
    console.log('[RAW ORGANIZATION VALIDATION DEBUG] Call window.debugRawOrganizationValidation() in the console to see raw validation response.');
}
createRoot(document.getElementById('root')).render(_jsx(StrictMode, { children: _jsx(AuthProvider, { children: DEBUG_LOG ? (_jsx(DebugErrorBoundary, { children: _jsx(App, {}) })) : (_jsx(App, {})) }) }));
