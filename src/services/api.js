var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
// Ensure API URL has no trailing slash
var API_URL = environment.api.url.replace(/\/$/, '');
console.log('API URL:', API_URL); // Log the API URL for debugging
var publicEndpoints = [
    '/api/clauses',
    '/api/families',
    '/api/clauses/search',
    '/api/clauses/family',
    '/api/clauses/bookmark'
];
var protectedEndpoints = [
    '/api/documents'
];
var ApiError = /** @class */ (function (_super) {
    __extends(ApiError, _super);
    function ApiError(message, status, data) {
        var _this = _super.call(this, message) || this;
        _this.status = status;
        _this.data = data;
        _this.name = 'ApiError';
        return _this;
    }
    return ApiError;
}(Error));
function handleApiResponse(response) {
    return __awaiter(this, void 0, void 0, function () {
        var contentType, text, error, e_1, e_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    contentType = response.headers.get('content-type');
                    if (!(!contentType || !contentType.includes('application/json'))) return [3 /*break*/, 2];
                    console.error('Invalid content type:', contentType);
                    console.error('Response status:', response.status);
                    console.error('Response status text:', response.statusText);
                    return [4 /*yield*/, response.text()];
                case 1:
                    text = _a.sent();
                    console.error('Response body:', text);
                    throw new ApiError("Invalid content type: ".concat(contentType), response.status);
                case 2:
                    if (!!response.ok) return [3 /*break*/, 6];
                    _a.label = 3;
                case 3:
                    _a.trys.push([3, 5, , 6]);
                    return [4 /*yield*/, response.json()];
                case 4:
                    error = _a.sent();
                    throw new ApiError(error.message || 'API request failed', response.status, error);
                case 5:
                    e_1 = _a.sent();
                    console.error('Failed to parse error response:', e_1);
                    throw new ApiError("API request failed: ".concat(response.statusText), response.status);
                case 6:
                    _a.trys.push([6, 8, , 9]);
                    return [4 /*yield*/, response.json()];
                case 7: return [2 /*return*/, _a.sent()];
                case 8:
                    e_2 = _a.sent();
                    console.error('Failed to parse response:', e_2);
                    throw new ApiError('Failed to parse API response', response.status);
                case 9: return [2 /*return*/];
            }
        });
    });
}
function getAuthToken() {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var _b, session, error, error_1;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, supabase.auth.getSession()];
                case 1:
                    _b = _c.sent(), session = _b.data.session, error = _b.error;
                    if (error) {
                        console.error('Failed to get auth session:', error.message);
                        return [2 /*return*/, null];
                    }
                    return [2 /*return*/, (_a = session === null || session === void 0 ? void 0 : session.access_token) !== null && _a !== void 0 ? _a : null];
                case 2:
                    error_1 = _c.sent();
                    console.error('Error getting auth token:', error_1);
                    return [2 /*return*/, null];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function getCommonHeaders(requireAuth) {
    if (requireAuth === void 0) { requireAuth = false; }
    return __awaiter(this, void 0, void 0, function () {
        var headers, token;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    headers = {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Origin': window.location.origin,
                    };
                    if (!requireAuth) return [3 /*break*/, 2];
                    return [4 /*yield*/, getAuthToken()];
                case 1:
                    token = _a.sent();
                    if (token) {
                        headers['Authorization'] = "Bearer ".concat(token);
                    }
                    else {
                        console.warn('Auth token not available for protected endpoint');
                    }
                    _a.label = 2;
                case 2: return [2 /*return*/, headers];
            }
        });
    });
}
export var apiCall = function (endpoint, options) {
    if (options === void 0) { options = {}; }
    return __awaiter(void 0, void 0, void 0, function () {
        var _a, requireAuth, fetchOptions, response, errorData, errorMessage, responseData, error_2;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = options.requireAuth, requireAuth = _a === void 0 ? false : _a, fetchOptions = __rest(options, ["requireAuth"]);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 6, , 7]);
                    return [4 /*yield*/, fetch("".concat(API_URL).concat(endpoint), __assign(__assign({}, fetchOptions), { headers: __assign({ 'Content-Type': 'application/json' }, fetchOptions.headers), credentials: 'include' }))];
                case 2:
                    response = _b.sent();
                    // Handle CORS errors
                    if (response.type === 'opaque' || response.status === 0) {
                        console.error('CORS Error: Unable to access the API');
                        return [2 /*return*/, {
                                data: null,
                                error: 'Unable to access the API. Please check CORS configuration.'
                            }];
                    }
                    if (!!response.ok) return [3 /*break*/, 4];
                    return [4 /*yield*/, response.json().catch(function () { return ({}); })];
                case 3:
                    errorData = _b.sent();
                    errorMessage = errorData.message || "HTTP error! status: ".concat(response.status);
                    // Log detailed error information
                    console.error('API Error:', {
                        endpoint: endpoint,
                        status: response.status,
                        statusText: response.statusText,
                        error: errorData
                    });
                    throw new Error(errorMessage);
                case 4: return [4 /*yield*/, response.json()];
                case 5:
                    responseData = _b.sent();
                    // If the response is already in ApiResponse format, return it directly
                    if (responseData && typeof responseData === 'object' && 'data' in responseData && 'error' in responseData) {
                        return [2 /*return*/, responseData];
                    }
                    // Otherwise, wrap the response in ApiResponse format
                    return [2 /*return*/, {
                            data: responseData,
                            error: null
                        }];
                case 6:
                    error_2 = _b.sent();
                    console.error('API call failed:', {
                        endpoint: endpoint,
                        error: error_2 instanceof Error ? error_2.message : 'Unknown error',
                        stack: error_2 instanceof Error ? error_2.stack : undefined
                    });
                    return [2 /*return*/, {
                            data: null,
                            error: error_2 instanceof Error ? error_2.message : 'An error occurred'
                        }];
                case 7: return [2 /*return*/];
            }
        });
    });
};
// Public endpoints (no auth required)
export function fetchClauses() {
    return __awaiter(this, void 0, void 0, function () {
        var error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, apiCall('/api/clauses')];
                case 1: return [2 /*return*/, _a.sent()];
                case 2:
                    error_3 = _a.sent();
                    console.error('Error fetching clauses:', error_3);
                    throw error_3;
                case 3: return [2 /*return*/];
            }
        });
    });
}
export function getClausesByFamily(family) {
    return __awaiter(this, void 0, void 0, function () {
        var error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, apiCall("/api/clauses/family/".concat(encodeURIComponent(family.id)))];
                case 1: return [2 /*return*/, _a.sent()];
                case 2:
                    error_4 = _a.sent();
                    console.error('Error fetching clauses by family:', error_4);
                    throw error_4;
                case 3: return [2 /*return*/];
            }
        });
    });
}
export function getClauseFamilies() {
    return __awaiter(this, void 0, void 0, function () {
        var error_5;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, apiCall('/api/clauses/families')];
                case 1: return [2 /*return*/, _a.sent()];
                case 2:
                    error_5 = _a.sent();
                    console.error('Error fetching clause families:', error_5);
                    throw error_5;
                case 3: return [2 /*return*/];
            }
        });
    });
}
export function getClauseById(id) {
    return __awaiter(this, void 0, void 0, function () {
        var error_6;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, apiCall("/api/clauses/".concat(id))];
                case 1: return [2 /*return*/, _a.sent()];
                case 2:
                    error_6 = _a.sent();
                    console.error("Error fetching clause ".concat(id, ":"), error_6);
                    throw error_6;
                case 3: return [2 /*return*/];
            }
        });
    });
}
export function searchClauses(query) {
    return __awaiter(this, void 0, void 0, function () {
        var error_7;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, apiCall("/api/clauses/search?q=".concat(encodeURIComponent(query)))];
                case 1: return [2 /*return*/, _a.sent()];
                case 2:
                    error_7 = _a.sent();
                    console.error('Error searching clauses:', error_7);
                    throw error_7;
                case 3: return [2 /*return*/];
            }
        });
    });
}
// Protected endpoints (auth required)
export function bookmarkClause(clauseId) {
    return __awaiter(this, void 0, void 0, function () {
        var error_8;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, apiCall("/api/clauses/bookmark/".concat(clauseId), {
                            method: 'POST',
                            requireAuth: true
                        })];
                case 1: return [2 /*return*/, _a.sent()];
                case 2:
                    error_8 = _a.sent();
                    console.error('Error bookmarking clause:', error_8);
                    throw error_8;
                case 3: return [2 /*return*/];
            }
        });
    });
}
export function uploadDocument(file) {
    return __awaiter(this, void 0, void 0, function () {
        var formData, error_9;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    formData = new FormData();
                    formData.append('file', file);
                    return [4 /*yield*/, apiCall('/api/documents/upload', {
                            method: 'POST',
                            body: formData,
                            requireAuth: true
                        })];
                case 1: return [2 /*return*/, _a.sent()];
                case 2:
                    error_9 = _a.sent();
                    console.error('Error uploading document:', error_9);
                    throw error_9;
                case 3: return [2 /*return*/];
            }
        });
    });
}
export function analyzeDocument(documentId) {
    return __awaiter(this, void 0, void 0, function () {
        var error_10;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, apiCall("/api/documents/".concat(documentId, "/analyze"), {
                            method: 'POST',
                            requireAuth: true
                        })];
                case 1: return [2 /*return*/, _a.sent()];
                case 2:
                    error_10 = _a.sent();
                    console.error("Error analyzing document ".concat(documentId, ":"), error_10);
                    throw error_10;
                case 3: return [2 /*return*/];
            }
        });
    });
}
