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
import { useState } from 'react';
import { MenuItem, Select, FormControl, Tooltip } from '@mui/material';
import { useOrg } from '../contexts/OrgContext';
import { useProject } from '../contexts/ProjectContext';
import { useURLBasedNavigation } from '../hooks/useURLBasedNavigation';
export var OrgSelector = function () {
    var _a = useOrg(), orgs = _a.orgs, currentOrg = _a.currentOrg, setCurrentOrg = _a.setCurrentOrg;
    var currentProject = useProject().currentProject;
    var _b = useURLBasedNavigation(), navigateTo = _b.navigateTo, isURLBasedRouting = _b.isURLBasedRouting;
    var _c = useState(null), anchorEl = _c[0], setAnchorEl = _c[1];
    if (!orgs || orgs.length === 0 || !currentOrg)
        return null;
    var handleOrgChange = function (orgId) { return __awaiter(void 0, void 0, void 0, function () {
        var org, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    org = orgs.find(function (o) { return o.id === orgId; });
                    if (!org) return [3 /*break*/, 4];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, setCurrentOrg(org)];
                case 2:
                    _a.sent();
                    // If using URL-based routing, navigate to the new organization
                    if (isURLBasedRouting && currentProject) {
                        navigateTo('/matrix'); // Navigate to matrix page in new org
                    }
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _a.sent();
                    console.error('Failed to update organization context:', error_1);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    return (_jsx(Tooltip, { title: "Switch organization", children: _jsx(FormControl, { size: "small", sx: { minWidth: 140 }, children: _jsx(Select, { value: currentOrg.id, onChange: function (e) { return handleOrgChange(e.target.value); }, variant: "outlined", displayEmpty: true, inputProps: { 'aria-label': 'organization selector' }, sx: { fontWeight: 600 }, children: orgs.map(function (o) { return (_jsx(MenuItem, { value: o.id, children: o.name }, o.id)); }) }) }) }));
};
