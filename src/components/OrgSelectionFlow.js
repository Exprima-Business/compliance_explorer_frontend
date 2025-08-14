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
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { Box, Typography, Card, CardContent, Alert, CircularProgress, List, ListItem, ListItemButton, ListItemText, Divider } from '@mui/material';
import { useOrg } from '../contexts/OrgContext';
import { dlog } from '../utils/debugLog';
export var OrgSelectionFlow = function (_a) {
    var onOrganizationSelected = _a.onOrganizationSelected;
    var _b = useOrg(), orgs = _b.orgs, setCurrentOrg = _b.setCurrentOrg, initialized = _b.initialized;
    var _c = useState(false), selecting = _c[0], setSelecting = _c[1];
    var _d = useState(null), error = _d[0], setError = _d[1];
    var handleOrgSelection = function (org) { return __awaiter(void 0, void 0, void 0, function () {
        var error_1, errorMessage;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    setSelecting(true);
                    setError(null);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, 4, 5]);
                    dlog('User selecting organization:', { orgId: org.id, orgName: org.name });
                    return [4 /*yield*/, setCurrentOrg(org)];
                case 2:
                    _a.sent();
                    dlog('Organization selection successful:', { orgId: org.id, orgName: org.name });
                    // Notify parent component
                    if (onOrganizationSelected) {
                        onOrganizationSelected();
                    }
                    return [3 /*break*/, 5];
                case 3:
                    error_1 = _a.sent();
                    errorMessage = error_1 instanceof Error ? error_1.message : 'Failed to select organization';
                    setError(errorMessage);
                    dlog('Organization selection failed:', { error: errorMessage });
                    return [3 /*break*/, 5];
                case 4:
                    setSelecting(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    if (!initialized) {
        return (_jsx(Box, { display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px", children: _jsx(CircularProgress, {}) }));
    }
    if (!orgs || orgs.length === 0) {
        return (_jsx(Box, { display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px", children: _jsx(Card, { sx: { maxWidth: 400, width: '100%' }, children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "No Organizations Available" }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "You don't have access to any organizations. Please contact your administrator." })] }) }) }));
    }
    return (_jsx(Box, { display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px", p: 2, children: _jsx(Card, { sx: { maxWidth: 500, width: '100%' }, children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h5", gutterBottom: true, align: "center", children: "Select Your Organization" }), _jsx(Typography, { variant: "body2", color: "text.secondary", align: "center", sx: { mb: 3 }, children: "Please select an organization to continue using the application." }), error && (_jsx(Alert, { severity: "error", sx: { mb: 2 }, children: error })), _jsx(List, { children: orgs.map(function (org, index) { return (_jsxs(React.Fragment, { children: [_jsx(ListItem, { disablePadding: true, children: _jsxs(ListItemButton, { onClick: function () { return handleOrgSelection(org); }, disabled: selecting, sx: {
                                            borderRadius: 1,
                                            mb: 1,
                                            '&:hover': {
                                                backgroundColor: 'primary.light',
                                                color: 'primary.contrastText'
                                            }
                                        }, children: [_jsx(ListItemText, { primary: org.name, secondary: org.slug, primaryTypographyProps: {
                                                    fontWeight: 600
                                                } }), selecting && _jsx(CircularProgress, { size: 20 })] }) }), index < orgs.length - 1 && _jsx(Divider, {})] }, org.id)); }) }), selecting && (_jsx(Box, { display: "flex", justifyContent: "center", mt: 2, children: _jsx(Typography, { variant: "body2", color: "text.secondary", children: "Updating authentication context..." }) }))] }) }) }));
};
