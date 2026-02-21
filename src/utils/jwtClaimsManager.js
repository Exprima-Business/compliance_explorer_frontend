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
import { supabase } from '../lib/supabase';
import { dlog } from './debugLog';
var JWTClaimsManager = /** @class */ (function () {
    function JWTClaimsManager() {
    }
    /**
     * Update JWT with custom claims for organization context
     */
    JWTClaimsManager.updateClaims = function (org) {
        return __awaiter(this, void 0, void 0, function () {
            var session, claims, error, error_1, errorMessage;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, supabase.auth.getSession()];
                    case 1:
                        session = (_a.sent()).data.session;
                        if (!session) {
                            return [2 /*return*/, { success: false, error: 'No active session' }];
                        }
                        claims = {
                            organizationId: org.id,
                            organizationSlug: org.slug,
                            organizationName: org.name,
                            updatedAt: new Date().toISOString()
                        };
                        // Store claims in localStorage for persistence across refreshes
                        localStorage.setItem(this.CLAIMS_KEY, JSON.stringify(claims));
                        return [4 /*yield*/, supabase.auth.updateUser({
                                data: claims
                            })];
                    case 2:
                        error = (_a.sent()).error;
                        if (error) {
                            dlog('JWT claims update failed:', error);
                            return [2 /*return*/, { success: false, error: error.message }];
                        }
                        dlog('JWT claims updated successfully', claims);
                        return [2 /*return*/, { success: true }];
                    case 3:
                        error_1 = _a.sent();
                        errorMessage = error_1 instanceof Error ? error_1.message : 'Unknown error';
                        dlog('Error updating JWT claims:', errorMessage);
                        return [2 /*return*/, {
                                success: false,
                                error: "Failed to update JWT claims: ".concat(errorMessage)
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Restore claims from localStorage after token refresh
     */
    JWTClaimsManager.restoreClaims = function () {
        return __awaiter(this, void 0, void 0, function () {
            var storedClaims, claims, result, error_2, errorMessage;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        storedClaims = localStorage.getItem(this.CLAIMS_KEY);
                        if (!storedClaims) {
                            return [2 /*return*/, { success: false, error: 'No stored claims found' }];
                        }
                        claims = JSON.parse(storedClaims);
                        if (!this.isClaimsValid(claims)) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.updateClaims({
                                id: claims.organizationId,
                                slug: claims.organizationSlug,
                                name: claims.organizationName || ''
                            })];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, {
                                success: result.success,
                                claims: result.success ? claims : undefined,
                                error: result.error
                            }];
                    case 2: return [2 /*return*/, { success: false, error: 'Stored claims are invalid or expired' }];
                    case 3:
                        error_2 = _a.sent();
                        errorMessage = error_2 instanceof Error ? error_2.message : 'Unknown error';
                        return [2 /*return*/, {
                                success: false,
                                error: "Failed to restore claims: ".concat(errorMessage)
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Validate current JWT claims
     */
    JWTClaimsManager.validateCurrentClaims = function () {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            var session, claims, error_3, errorMessage;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, supabase.auth.getSession()];
                    case 1:
                        session = (_b.sent()).data.session;
                        if (!session) {
                            return [2 /*return*/, { isValid: false, error: 'No active session' }];
                        }
                        claims = (_a = session.user) === null || _a === void 0 ? void 0 : _a.user_metadata;
                        if (!(claims === null || claims === void 0 ? void 0 : claims.organizationId) || !(claims === null || claims === void 0 ? void 0 : claims.organizationSlug)) {
                            return [2 /*return*/, {
                                    isValid: false,
                                    error: 'Missing required custom claims: organizationId or organizationSlug'
                                }];
                        }
                        return [2 /*return*/, { isValid: true, claims: claims }];
                    case 2:
                        error_3 = _b.sent();
                        errorMessage = error_3 instanceof Error ? error_3.message : 'Unknown error';
                        return [2 /*return*/, {
                                isValid: false,
                                error: "JWT validation failed: ".concat(errorMessage)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Clear stored claims (for logout)
     */
    JWTClaimsManager.clearStoredClaims = function () {
        localStorage.removeItem(this.CLAIMS_KEY);
        dlog('Stored JWT claims cleared');
    };
    /**
     * Debug utility to log current JWT claims
     */
    JWTClaimsManager.debugCurrentClaims = function () {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function () {
            var session, error_4;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, supabase.auth.getSession()];
                    case 1:
                        session = (_c.sent()).data.session;
                        console.log('Current JWT Claims:', {
                            hasSession: !!session,
                            userMetadata: (_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.user_metadata,
                            customClaims: (_b = session === null || session === void 0 ? void 0 : session.user) === null || _b === void 0 ? void 0 : _b.user_metadata,
                            storedClaims: localStorage.getItem(this.CLAIMS_KEY)
                        });
                        return [3 /*break*/, 3];
                    case 2:
                        error_4 = _c.sent();
                        console.error('Error debugging JWT claims:', error_4);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Validate claims structure
     */
    JWTClaimsManager.isClaimsValid = function (claims) {
        return !!(claims.organizationId && claims.organizationSlug);
    };
    JWTClaimsManager.CLAIMS_KEY = 'jwt_organization_claims';
    return JWTClaimsManager;
}());
export { JWTClaimsManager };
