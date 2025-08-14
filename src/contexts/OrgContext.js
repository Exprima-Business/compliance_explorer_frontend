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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiCall } from '../services/api';
import { dlog } from '../utils/debugLog';
import { JWTClaimsManager } from '../utils/jwtClaimsManager';
var OrgContext = createContext(undefined);
var ORG_KEY = 'orgId';
export var OrgProvider = function (_a) {
    var children = _a.children;
    var _b = useState([]), orgs = _b[0], setOrgs = _b[1];
    var _c = useState(null), currentOrg = _c[0], setCurrentOrgState = _c[1];
    var _d = useState(false), initialized = _d[0], setInitialized = _d[1];
    var refreshOrgs = useCallback(function () { return __awaiter(void 0, void 0, void 0, function () {
        var resp, storedId_1, match;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    dlog('OrgProvider: loading organizations');
                    return [4 /*yield*/, apiCall('/api/organizations')];
                case 1:
                    resp = _a.sent();
                    if (!(!resp.error && Array.isArray(resp.data))) return [3 /*break*/, 5];
                    dlog('OrgProvider: organizations loaded successfully', {
                        count: resp.data.length,
                        orgs: resp.data.map(function (o) { return ({ id: o.id, name: o.name }); })
                    });
                    setOrgs(resp.data);
                    storedId_1 = localStorage.getItem(ORG_KEY);
                    match = resp.data.find(function (o) { return o.id === storedId_1; }) || resp.data[0] || null;
                    if (!match) return [3 /*break*/, 3];
                    return [4 /*yield*/, setCurrentOrg(match)];
                case 2:
                    _a.sent(); // This now updates JWT claims
                    dlog('OrgProvider: current org restored with JWT claims', {
                        orgId: match.id,
                        orgName: match.name
                    });
                    return [3 /*break*/, 4];
                case 3:
                    setCurrentOrgState(null);
                    localStorage.removeItem(ORG_KEY);
                    dlog('OrgProvider: no current org found');
                    _a.label = 4;
                case 4: return [3 /*break*/, 6];
                case 5:
                    dlog('OrgProvider: failed to load organizations', { error: resp.error });
                    _a.label = 6;
                case 6:
                    setInitialized(true);
                    return [2 /*return*/];
            }
        });
    }); }, []);
    useEffect(function () {
        refreshOrgs();
    }, [refreshOrgs]);
    var setCurrentOrg = function (org) { return __awaiter(void 0, void 0, void 0, function () {
        var claimsResult, error_1, errorMessage;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, JWTClaimsManager.updateClaims(org)];
                case 1:
                    claimsResult = _a.sent();
                    if (!claimsResult.success) {
                        throw new Error(claimsResult.error || 'Failed to update authentication context');
                    }
                    // Update local state only after successful JWT update
                    setCurrentOrgState(org);
                    localStorage.setItem(ORG_KEY, org.id);
                    dlog('Organization context updated with JWT claims', {
                        orgId: org.id,
                        orgName: org.name,
                        claimsUpdated: true
                    });
                    return [3 /*break*/, 3];
                case 2:
                    error_1 = _a.sent();
                    errorMessage = error_1 instanceof Error ? error_1.message : 'Unknown error';
                    dlog('Error updating organization context:', errorMessage);
                    throw new Error("Organization selection failed: ".concat(errorMessage));
                case 3: return [2 /*return*/];
            }
        });
    }); };
    // Create organization via backend and refresh list
    var createOrg = function (name) { return __awaiter(void 0, void 0, void 0, function () {
        var resp;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, apiCall('/api/organizations', {
                        method: 'POST',
                        body: JSON.stringify({ name: name }),
                    })];
                case 1:
                    resp = _a.sent();
                    if (resp.error) {
                        throw new Error(typeof resp.error === 'string' ? resp.error : resp.error.message);
                    }
                    // Push new org into state
                    if (resp.data) {
                        setOrgs(function (prev) { return __spreadArray(__spreadArray([], prev, true), [resp.data], false); });
                        setCurrentOrg(resp.data);
                    }
                    return [2 /*return*/];
            }
        });
    }); };
    var value = { orgs: orgs, currentOrg: currentOrg, setCurrentOrg: setCurrentOrg, refreshOrgs: refreshOrgs, createOrg: createOrg, initialized: initialized };
    return _jsx(OrgContext.Provider, { value: value, children: children });
};
export var useOrg = function () {
    var ctx = useContext(OrgContext);
    if (!ctx)
        throw new Error('useOrg must be used within OrgProvider');
    return ctx;
};
