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
import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOrg } from '../contexts/OrgContext';
import { OrganizationValidationService } from '../services/organizationValidationService';
import { OrgSelectionFlow } from './OrgSelectionFlow';
import { dlog } from '../utils/debugLog';
export var OrgSelectionWrapper = function (_a) {
    var children = _a.children;
    var _b = useAuth(), isAuthenticated = _b.isAuthenticated, authLoading = _b.loading;
    var _c = useOrg(), currentOrg = _c.currentOrg, orgInitialized = _c.initialized;
    var _d = useState(false), claimsValidated = _d[0], setClaimsValidated = _d[1];
    var _e = useState(true), validatingClaims = _e[0], setValidatingClaims = _e[1];
    useEffect(function () {
        var validateClaims = function () { return __awaiter(void 0, void 0, void 0, function () {
            var hasValidContext, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!isAuthenticated || !orgInitialized) {
                            setValidatingClaims(false);
                            return [2 /*return*/];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, 4, 5]);
                        setValidatingClaims(true);
                        return [4 /*yield*/, OrganizationValidationService.hasValidOrganizationContext()];
                    case 2:
                        hasValidContext = _a.sent();
                        if (hasValidContext) {
                            dlog('Organization context validation successful');
                            setClaimsValidated(true);
                        }
                        else {
                            dlog('Organization context validation failed - no valid context found');
                            setClaimsValidated(false);
                        }
                        return [3 /*break*/, 5];
                    case 3:
                        error_1 = _a.sent();
                        dlog('Error validating organization context:', error_1);
                        setClaimsValidated(false);
                        return [3 /*break*/, 5];
                    case 4:
                        setValidatingClaims(false);
                        return [7 /*endfinally*/];
                    case 5: return [2 /*return*/];
                }
            });
        }); };
        validateClaims();
    }, [isAuthenticated, orgInitialized]);
    // Show loading while authentication or organization context is initializing
    if (authLoading || !orgInitialized || validatingClaims) {
        return (_jsx("div", { style: {
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh'
            }, children: _jsx("div", { children: "Loading..." }) }));
    }
    // If not authenticated, don't show organization selection
    if (!isAuthenticated) {
        return _jsx(_Fragment, { children: children });
    }
    // If no current organization or claims are invalid, show organization selection
    if (!currentOrg || !claimsValidated) {
        return (_jsx(OrgSelectionFlow, { onOrganizationSelected: function () {
                dlog('Organization selected, re-validating claims');
                setClaimsValidated(true);
            } }));
    }
    // User is authenticated and has valid organization claims, show the app
    return _jsx(_Fragment, { children: children });
};
