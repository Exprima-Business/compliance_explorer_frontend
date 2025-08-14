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
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Box, Button, Typography, Alert, Paper } from '@mui/material';
import { useHybridApi } from '../hooks/useHybridApi';
import { useURLBasedNavigation } from '../hooks/useURLBasedNavigation';
var ENABLE_URL_BASED_ROUTING = import.meta.env.VITE_ENABLE_URL_BASED_ROUTING === 'true';
export var ApiTestComponent = function () {
    var _a = useHybridApi(), apiCall = _a.apiCall, currentOrg = _a.currentOrg, currentProject = _a.currentProject, isURLBasedRouting = _a.isURLBasedRouting;
    var getCurrentPath = useURLBasedNavigation().getCurrentPath;
    var _b = useState({}), testResults = _b[0], setTestResults = _b[1];
    var _c = useState(false), isLoading = _c[0], setIsLoading = _c[1];
    var runApiTests = function () { return __awaiter(void 0, void 0, void 0, function () {
        var clausesResult_1, projectsResult_1, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    setIsLoading(true);
                    setTestResults({});
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, 5, 6]);
                    return [4 /*yield*/, apiCall('/clauses')];
                case 2:
                    clausesResult_1 = _a.sent();
                    setTestResults(function (prev) { return (__assign(__assign({}, prev), { clauses: clausesResult_1 })); });
                    return [4 /*yield*/, apiCall('/projects')];
                case 3:
                    projectsResult_1 = _a.sent();
                    setTestResults(function (prev) { return (__assign(__assign({}, prev), { projects: projectsResult_1 })); });
                    return [3 /*break*/, 6];
                case 4:
                    error_1 = _a.sent();
                    setTestResults(function (prev) { return (__assign(__assign({}, prev), { error: error_1 instanceof Error ? error_1.message : 'Unknown error' })); });
                    return [3 /*break*/, 6];
                case 5:
                    setIsLoading(false);
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); };
    if (!ENABLE_URL_BASED_ROUTING) {
        return null; // Only show in URL-based routing mode
    }
    return (_jsxs(Paper, { sx: { p: 2, m: 2, backgroundColor: '#f8f9fa' }, children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "API Integration Test" }), _jsxs(Box, { sx: { mb: 2 }, children: [_jsx(Typography, { variant: "body2", gutterBottom: true, children: _jsx("strong", { children: "Current Context:" }) }), _jsxs(Typography, { variant: "body2", sx: { fontFamily: 'monospace', fontSize: '0.875rem' }, children: ["Organization: ", currentOrg === null || currentOrg === void 0 ? void 0 : currentOrg.name, " (", currentOrg === null || currentOrg === void 0 ? void 0 : currentOrg.slug, ")"] }), _jsxs(Typography, { variant: "body2", sx: { fontFamily: 'monospace', fontSize: '0.875rem' }, children: ["Project: ", currentProject === null || currentProject === void 0 ? void 0 : currentProject.name, " (", currentProject === null || currentProject === void 0 ? void 0 : currentProject.slug, ")"] }), _jsxs(Typography, { variant: "body2", sx: { fontFamily: 'monospace', fontSize: '0.875rem' }, children: ["Current Path: ", getCurrentPath()] }), _jsxs(Typography, { variant: "body2", sx: { fontFamily: 'monospace', fontSize: '0.875rem' }, children: ["URL-Based Routing: ", isURLBasedRouting ? 'Enabled' : 'Disabled'] })] }), _jsx(Button, { variant: "contained", onClick: runApiTests, disabled: isLoading, sx: { mb: 2 }, children: isLoading ? 'Testing...' : 'Test API Calls' }), testResults.error && (_jsxs(Alert, { severity: "error", sx: { mb: 2 }, children: ["Error: ", testResults.error] })), testResults.clauses && (_jsxs(Box, { sx: { mb: 2 }, children: [_jsx(Typography, { variant: "subtitle2", gutterBottom: true, children: "Clauses API Result:" }), _jsx(Paper, { sx: { p: 1, backgroundColor: '#fff' }, children: _jsx(Typography, { variant: "body2", sx: { fontFamily: 'monospace', fontSize: '0.75rem' }, children: JSON.stringify(testResults.clauses, null, 2) }) })] })), testResults.projects && (_jsxs(Box, { sx: { mb: 2 }, children: [_jsx(Typography, { variant: "subtitle2", gutterBottom: true, children: "Projects API Result:" }), _jsx(Paper, { sx: { p: 1, backgroundColor: '#fff' }, children: _jsx(Typography, { variant: "body2", sx: { fontFamily: 'monospace', fontSize: '0.75rem' }, children: JSON.stringify(testResults.projects, null, 2) }) })] }))] }));
};
