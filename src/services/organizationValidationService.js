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
import environment from '../config/environment';
var OrganizationValidationService = /** @class */ (function () {
    function OrganizationValidationService() {
    }
    /**
     * Validate user's organization access and get validated organization context
     */
    OrganizationValidationService.validateOrganization = function (request) {
        var _a, _b, _c, _d, _e, _f, _g;
        return __awaiter(this, void 0, void 0, function () {
            var session, requestBody, response, errorData, errorMessage, rawData, data, error_1, errorMessage;
            return __generator(this, function (_h) {
                switch (_h.label) {
                    case 0:
                        _h.trys.push([0, 6, , 7]);
                        return [4 /*yield*/, supabase.auth.getSession()];
                    case 1:
                        session = (_h.sent()).data.session;
                        if (!(session === null || session === void 0 ? void 0 : session.access_token)) {
                            return [2 /*return*/, {
                                    valid: false,
                                    error: 'No active session found'
                                }];
                        }
                        dlog('Validating organization access', {
                            hasSession: !!session,
                            userId: session.user.id,
                            requestOrgId: request === null || request === void 0 ? void 0 : request.organizationId
                        });
                        requestBody = request || {};
                        dlog('Organization validation request - REQUEST DEBUG', {
                            url: "".concat(environment.api.url).concat(this.VALIDATION_ENDPOINT),
                            method: 'POST',
                            requestBody: requestBody,
                            requestBodyType: typeof requestBody,
                            hasSession: !!session,
                            userId: (_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id,
                            tokenLength: ((_b = session === null || session === void 0 ? void 0 : session.access_token) === null || _b === void 0 ? void 0 : _b.length) || 0
                        });
                        return [4 /*yield*/, fetch("".concat(environment.api.url).concat(this.VALIDATION_ENDPOINT), {
                                method: 'POST',
                                headers: {
                                    'Authorization': "Bearer ".concat(session.access_token),
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify(requestBody)
                            })];
                    case 2:
                        response = _h.sent();
                        if (!!response.ok) return [3 /*break*/, 4];
                        return [4 /*yield*/, response.json().catch(function () { return ({}); })];
                    case 3:
                        errorData = _h.sent();
                        errorMessage = errorData.message || "HTTP ".concat(response.status, ": ").concat(response.statusText);
                        dlog('Organization validation failed - ERROR RESPONSE DEBUG', {
                            status: response.status,
                            statusText: response.statusText,
                            responseHeaders: 'Headers object (not enumerable)',
                            errorData: errorData,
                            errorDataType: typeof errorData,
                            errorDataKeys: errorData ? Object.keys(errorData) : 'null/undefined',
                            error: errorMessage
                        });
                        return [2 /*return*/, {
                                valid: false,
                                error: errorMessage
                            }];
                    case 4: return [4 /*yield*/, response.json()];
                    case 5:
                        rawData = _h.sent();
                        // Comprehensive response debugging
                        dlog('Organization validation successful - FULL RESPONSE DEBUG', {
                            responseStatus: response.status,
                            responseHeaders: 'Headers object (not enumerable)',
                            responseData: rawData,
                            responseDataType: typeof rawData,
                            responseDataKeys: rawData ? Object.keys(rawData) : 'null/undefined',
                            hasDataField: !!rawData.data,
                            dataKeys: rawData.data ? Object.keys(rawData.data) : 'null/undefined',
                            hasOrganization: !!((_c = rawData.data) === null || _c === void 0 ? void 0 : _c.organization),
                            organizationDetails: (_d = rawData.data) === null || _d === void 0 ? void 0 : _d.organization,
                            error: rawData.error
                        });
                        data = {
                            valid: !!((_e = rawData.data) === null || _e === void 0 ? void 0 : _e.organization),
                            organization: ((_f = rawData.data) === null || _f === void 0 ? void 0 : _f.organization) ? {
                                id: rawData.data.organization.id,
                                name: rawData.data.organization.name,
                                slug: rawData.data.organization.slug
                            } : undefined,
                            organizations: ((_g = rawData.data) === null || _g === void 0 ? void 0 : _g.organization) ? [{
                                    id: rawData.data.organization.id,
                                    name: rawData.data.organization.name,
                                    slug: rawData.data.organization.slug
                                }] : undefined,
                            error: rawData.error || null
                        };
                        dlog('Organization validation parsed response', {
                            parsedValid: data.valid,
                            parsedOrganization: data.organization,
                            parsedOrganizations: data.organizations,
                            parsedError: data.error
                        });
                        return [2 /*return*/, data];
                    case 6:
                        error_1 = _h.sent();
                        errorMessage = error_1 instanceof Error ? error_1.message : 'Unknown error';
                        dlog('Organization validation error', { error: errorMessage });
                        return [2 /*return*/, {
                                valid: false,
                                error: "Organization validation failed: ".concat(errorMessage)
                            }];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get user's validated organizations (for multi-org users)
     */
    OrganizationValidationService.getUserOrganizations = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.validateOrganization()];
            });
        });
    };
    /**
     * Validate and set specific organization context
     */
    OrganizationValidationService.setOrganizationContext = function (organizationId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.validateOrganization({ organizationId: organizationId })];
            });
        });
    };
    /**
     * Check if user has valid organization context
     */
    OrganizationValidationService.hasValidOrganizationContext = function () {
        return __awaiter(this, void 0, void 0, function () {
            var session, tokenParts, payload, hasCustomClaims, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, supabase.auth.getSession()];
                    case 1:
                        session = (_a.sent()).data.session;
                        if (!(session === null || session === void 0 ? void 0 : session.access_token)) {
                            return [2 /*return*/, false];
                        }
                        tokenParts = session.access_token.split('.');
                        if (tokenParts.length !== 3) {
                            return [2 /*return*/, false];
                        }
                        payload = JSON.parse(atob(tokenParts[1]));
                        hasCustomClaims = payload.custom_claims &&
                            payload.custom_claims.organizationId &&
                            payload.custom_claims.organizationSlug;
                        dlog('Checking organization context', {
                            hasCustomClaims: hasCustomClaims,
                            claims: payload.custom_claims
                        });
                        return [2 /*return*/, hasCustomClaims];
                    case 2:
                        error_2 = _a.sent();
                        dlog('Error checking organization context', { error: error_2 });
                        return [2 /*return*/, false];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    OrganizationValidationService.VALIDATION_ENDPOINT = '/api/auth/validate-organization';
    return OrganizationValidationService;
}());
export { OrganizationValidationService };
