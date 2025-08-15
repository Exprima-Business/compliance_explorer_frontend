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
import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { OrganizationValidationService } from '../services/organizationValidationService';
export var AuthContext = createContext(undefined);
export var AuthProvider = function (_a) {
    var children = _a.children;
    var _b = useState(null), user = _b[0], setUser = _b[1];
    var _c = useState(true), loading = _c[0], setLoading = _c[1];
    var _d = useState(null), error = _d[0], setError = _d[1];
    useEffect(function () {
        var initializeAuth = function () { return __awaiter(void 0, void 0, void 0, function () {
            var session, hasValidContext, error_1;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 4, , 5]);
                        return [4 /*yield*/, supabase.auth.getSession()];
                    case 1:
                        session = (_b.sent()).data.session;
                        setUser((_a = session === null || session === void 0 ? void 0 : session.user) !== null && _a !== void 0 ? _a : null);
                        if (!(session === null || session === void 0 ? void 0 : session.user)) return [3 /*break*/, 3];
                        return [4 /*yield*/, OrganizationValidationService.hasValidOrganizationContext()];
                    case 2:
                        hasValidContext = _b.sent();
                        if (!hasValidContext) {
                            console.warn('User does not have valid organization context');
                            // Don't fail auth, but mark as needing organization validation
                        }
                        _b.label = 3;
                    case 3:
                        setLoading(false);
                        return [3 /*break*/, 5];
                    case 4:
                        error_1 = _b.sent();
                        console.error('Auth initialization error:', error_1);
                        setError('Authentication initialization failed');
                        setLoading(false);
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                }
            });
        }); };
        initializeAuth();
        // Listen for changes on auth state
        var subscription = supabase.auth.onAuthStateChange(function (event, session) { return __awaiter(void 0, void 0, void 0, function () {
            var hasValidContext;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        setUser((_a = session === null || session === void 0 ? void 0 : session.user) !== null && _a !== void 0 ? _a : null);
                        if (!((session === null || session === void 0 ? void 0 : session.user) && event === 'SIGNED_IN')) return [3 /*break*/, 2];
                        return [4 /*yield*/, OrganizationValidationService.hasValidOrganizationContext()];
                    case 1:
                        hasValidContext = _b.sent();
                        if (!hasValidContext) {
                            console.warn('User signed in but lacks organization context');
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        if (event === 'SIGNED_OUT') {
                            // Clear any stored organization context
                            localStorage.removeItem('orgId');
                        }
                        _b.label = 3;
                    case 3:
                        setLoading(false);
                        return [2 /*return*/];
                }
            });
        }); }).data.subscription;
        return function () { return subscription.unsubscribe(); };
    }, []);
    var signIn = function (email, password) { return __awaiter(void 0, void 0, void 0, function () {
        var error_2, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    setError(null);
                    return [4 /*yield*/, supabase.auth.signInWithPassword({ email: email, password: password })];
                case 1:
                    error_2 = (_a.sent()).error;
                    if (error_2)
                        throw error_2;
                    return [3 /*break*/, 3];
                case 2:
                    err_1 = _a.sent();
                    setError(err_1 instanceof Error ? err_1.message : 'Failed to sign in');
                    throw err_1;
                case 3: return [2 /*return*/];
            }
        });
    }); };
    var signUp = function (email, password) { return __awaiter(void 0, void 0, void 0, function () {
        var error_3, err_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    setError(null);
                    return [4 /*yield*/, supabase.auth.signUp({ email: email, password: password })];
                case 1:
                    error_3 = (_a.sent()).error;
                    if (error_3)
                        throw error_3;
                    return [3 /*break*/, 3];
                case 2:
                    err_2 = _a.sent();
                    setError(err_2 instanceof Error ? err_2.message : 'Failed to sign up');
                    throw err_2;
                case 3: return [2 /*return*/];
            }
        });
    }); };
    var signOut = function () { return __awaiter(void 0, void 0, void 0, function () {
        var error_4, err_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    setError(null);
                    return [4 /*yield*/, supabase.auth.signOut()];
                case 1:
                    error_4 = (_a.sent()).error;
                    if (error_4)
                        throw error_4;
                    return [3 /*break*/, 3];
                case 2:
                    err_3 = _a.sent();
                    setError(err_3 instanceof Error ? err_3.message : 'Failed to sign out');
                    throw err_3;
                case 3: return [2 /*return*/];
            }
        });
    }); };
    var value = {
        user: user,
        signIn: signIn,
        signUp: signUp,
        signOut: signOut,
        loading: loading,
        error: error,
        isAuthenticated: !!user
    };
    return (_jsx(AuthContext.Provider, { value: value, children: children }));
};
export function useAuth() {
    var context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
