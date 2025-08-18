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
import { dlog } from '../utils/debugLog';
var UserStateService = /** @class */ (function () {
    function UserStateService() {
    }
    /**
     * Get complete user state in a single API call
     * This replaces the complex multi-step validation flow
     */
    UserStateService.getUserState = function () {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            var session, response, errorData, data, error_1, errorMessage;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 6, , 7]);
                        return [4 /*yield*/, supabase.auth.getSession()];
                    case 1:
                        session = (_b.sent()).data.session;
                        if (!(session === null || session === void 0 ? void 0 : session.access_token)) {
                            throw new Error('No valid session found');
                        }
                        dlog('UserStateService: Getting user state', {
                            userId: session.user.id,
                            hasToken: !!session.access_token
                        });
                        return [4 /*yield*/, fetch('/api/auth/user-state', {
                                method: 'GET',
                                headers: {
                                    'Authorization': "Bearer ".concat(session.access_token),
                                    'Content-Type': 'application/json'
                                }
                            })];
                    case 2:
                        response = _b.sent();
                        if (!!response.ok) return [3 /*break*/, 4];
                        return [4 /*yield*/, response.json().catch(function () { return ({}); })];
                    case 3:
                        errorData = _b.sent();
                        dlog('UserStateService: API error', {
                            status: response.status,
                            statusText: response.statusText,
                            error: errorData
                        });
                        if (response.status === 403) {
                            // User needs organization setup
                            return [2 /*return*/, {
                                    needsSetup: true,
                                    organizations: [],
                                    permissions: [],
                                    role: 'unassigned'
                                }];
                        }
                        throw new Error("Failed to get user state: ".concat(response.status, " ").concat(response.statusText));
                    case 4: return [4 /*yield*/, response.json()];
                    case 5:
                        data = _b.sent();
                        dlog('UserStateService: User state received', {
                            needsSetup: data.needsSetup,
                            organizationsCount: ((_a = data.organizations) === null || _a === void 0 ? void 0 : _a.length) || 0,
                            hasCurrentOrg: !!data.currentOrganization,
                            hasCurrentProject: !!data.currentProject,
                            role: data.role,
                            permissions: data.permissions
                        });
                        return [2 /*return*/, data];
                    case 6:
                        error_1 = _b.sent();
                        errorMessage = error_1 instanceof Error ? error_1.message : 'Unknown error';
                        dlog('UserStateService: Error getting user state', { error: errorMessage });
                        // If we can't get user state, assume setup is needed
                        return [2 /*return*/, {
                                needsSetup: true,
                                organizations: [],
                                permissions: [],
                                role: 'unassigned'
                            }];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Check if user needs organization setup
     * This is a fallback method for backward compatibility
     */
    UserStateService.needsSetup = function () {
        return __awaiter(this, void 0, void 0, function () {
            var userState, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.getUserState()];
                    case 1:
                        userState = _a.sent();
                        return [2 /*return*/, userState.needsSetup];
                    case 2:
                        error_2 = _a.sent();
                        dlog('UserStateService: Error checking setup requirement', { error: error_2 });
                        return [2 /*return*/, true]; // Assume setup is needed if we can't determine
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return UserStateService;
}());
export { UserStateService };
