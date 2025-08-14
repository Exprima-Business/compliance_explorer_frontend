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
import { supabase } from '../lib/supabase';
import environment from '../config/environment';
import { dlog } from '../utils/debugLog';
// API configuration
var API_URL = environment.api.url;
var ENABLE_URL_BASED_ROUTING = import.meta.env.VITE_ENABLE_URL_BASED_ROUTING === 'true';
// Get current organization and project IDs for header-based fallback
var getCurrentOrgId = function () {
    if (typeof window === 'undefined')
        return '00000000-0000-0000-0000-000000000000';
    return localStorage.getItem('orgId') || '00000000-0000-0000-0000-000000000000';
};
var getCurrentProjectId = function () {
    if (typeof window === 'undefined')
        return null;
    return localStorage.getItem('projectId');
};
function getAuthToken() {
    return __awaiter(this, void 0, void 0, function () {
        var session, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, supabase.auth.getSession()];
                case 1:
                    session = (_a.sent()).data.session;
                    return [2 /*return*/, (session === null || session === void 0 ? void 0 : session.access_token) || null];
                case 2:
                    error_1 = _a.sent();
                    console.error('Error getting auth token:', error_1);
                    return [2 /*return*/, null];
                case 3: return [2 /*return*/];
            }
        });
    });
}
// Simplified API call that accepts context directly
export var urlBasedApiCall = function (endpoint, options, context) {
    if (options === void 0) { options = {}; }
    return __awaiter(void 0, void 0, void 0, function () {
        var _a, requireAuth, fetchOptions, session, accessToken, urlBasedEndpoint, urlBasedHeaders, response_1, responseData_1, error_2, headerBasedHeaders, response, errorData, errObj, responseData, error_3, err;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = options.requireAuth, requireAuth = _a === void 0 ? false : _a, fetchOptions = __rest(options, ["requireAuth"]);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 13, , 14]);
                    return [4 /*yield*/, supabase.auth.getSession()];
                case 2:
                    session = (_b.sent()).data.session;
                    accessToken = session === null || session === void 0 ? void 0 : session.access_token;
                    if (!(ENABLE_URL_BASED_ROUTING && (context === null || context === void 0 ? void 0 : context.orgSlug) && (context === null || context === void 0 ? void 0 : context.projectSlug))) return [3 /*break*/, 8];
                    _b.label = 3;
                case 3:
                    _b.trys.push([3, 7, , 8]);
                    urlBasedEndpoint = "/api/".concat(context.orgSlug, "/").concat(context.projectSlug).concat(endpoint);
                    urlBasedHeaders = __assign(__assign({ 'Content-Type': 'application/json' }, (accessToken ? { Authorization: "Bearer ".concat(accessToken) } : {})), fetchOptions.headers);
                    dlog('Trying URL-based API call:', {
                        endpoint: urlBasedEndpoint,
                        orgSlug: context.orgSlug,
                        projectSlug: context.projectSlug
                    });
                    return [4 /*yield*/, fetch("".concat(API_URL).concat(urlBasedEndpoint), __assign(__assign({}, fetchOptions), { headers: urlBasedHeaders, credentials: 'include' }))];
                case 4:
                    response_1 = _b.sent();
                    if (!response_1.ok) return [3 /*break*/, 6];
                    return [4 /*yield*/, response_1.json()];
                case 5:
                    responseData_1 = _b.sent();
                    // If the response is already in ApiResponse format, return it directly
                    if (responseData_1 && typeof responseData_1 === 'object' && 'data' in responseData_1 && 'error' in responseData_1) {
                        return [2 /*return*/, responseData_1];
                    }
                    // Otherwise, wrap the response in ApiResponse format
                    return [2 /*return*/, {
                            data: responseData_1,
                            error: null,
                        }];
                case 6: return [3 /*break*/, 8];
                case 7:
                    error_2 = _b.sent();
                    console.warn('URL-based API call failed, falling back to header-based:', error_2);
                    return [3 /*break*/, 8];
                case 8:
                    headerBasedHeaders = __assign(__assign(__assign({ 'Content-Type': 'application/json', 'x-org-id': getCurrentOrgId() }, (accessToken ? { Authorization: "Bearer ".concat(accessToken) } : {})), (getCurrentProjectId() ? { 'x-project-id': getCurrentProjectId() } : {})), fetchOptions.headers);
                    dlog('Using header-based API call:', {
                        endpoint: endpoint,
                        'x-org-id': headerBasedHeaders['x-org-id'],
                        'x-project-id': headerBasedHeaders['x-project-id']
                    });
                    return [4 /*yield*/, fetch("".concat(API_URL).concat(endpoint), __assign(__assign({}, fetchOptions), { headers: headerBasedHeaders, credentials: 'include' }))];
                case 9:
                    response = _b.sent();
                    // Handle CORS errors
                    if (response.type === 'opaque' || response.status === 0) {
                        console.error('CORS Error: Unable to access the API');
                        return [2 /*return*/, {
                                data: null,
                                error: 'Unable to access the API. Please check CORS configuration.'
                            }];
                    }
                    if (!!response.ok) return [3 /*break*/, 11];
                    return [4 /*yield*/, response.json().catch(function () { return ({}); })];
                case 10:
                    errorData = _b.sent();
                    errObj = typeof errorData === 'object' && errorData !== null && 'message' in errorData
                        ? {
                            code: errorData.code || 'UNKNOWN',
                            message: errorData.message || 'Request failed',
                        }
                        : { code: 'UNKNOWN', message: "HTTP error! status: ".concat(response.status) };
                    // Log detailed error information
                    console.error('API Error:', {
                        endpoint: endpoint,
                        status: response.status,
                        statusText: response.statusText,
                        error: errObj,
                    });
                    throw new Error(errObj.message);
                case 11: return [4 /*yield*/, response.json()];
                case 12:
                    responseData = _b.sent();
                    // If the response is already in ApiResponse format, return it directly
                    if (responseData && typeof responseData === 'object' && 'data' in responseData && 'error' in responseData) {
                        return [2 /*return*/, responseData];
                    }
                    // Otherwise, wrap the response in ApiResponse format
                    return [2 /*return*/, {
                            data: responseData,
                            error: null,
                        }];
                case 13:
                    error_3 = _b.sent();
                    console.error('API call failed:', {
                        endpoint: endpoint,
                        error: error_3 instanceof Error ? error_3.message : 'Unknown error',
                        stack: error_3 instanceof Error ? error_3.stack : undefined
                    });
                    err = error_3 && error_3 instanceof Error
                        ? { code: 'UNKNOWN', message: error_3.message }
                        : { code: 'UNKNOWN', message: 'An error occurred' };
                    return [2 /*return*/, {
                            data: null,
                            error: err,
                        }];
                case 14: return [2 /*return*/];
            }
        });
    });
};
