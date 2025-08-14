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
import { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button, CircularProgress, Typography } from '@mui/material';
import { useProject } from '../contexts/ProjectContext';
var ProjectSetupDialog = function () {
    var _a = useProject(), projects = _a.projects, createProject = _a.createProject, initialized = _a.initialized;
    var _b = useState(false), open = _b[0], setOpen = _b[1];
    var _c = useState(''), name = _c[0], setName = _c[1];
    var _d = useState(''), description = _d[0], setDescription = _d[1];
    var _e = useState(false), submitting = _e[0], setSubmitting = _e[1];
    var _f = useState(null), error = _f[0], setError = _f[1];
    useEffect(function () {
        if (!initialized)
            return;
        setOpen(projects.length === 0);
    }, [projects.length, initialized]);
    var handleSubmit = function () { return __awaiter(void 0, void 0, void 0, function () {
        var err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!name.trim())
                        return [2 /*return*/];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, 4, 5]);
                    setSubmitting(true);
                    return [4 /*yield*/, createProject(name.trim(), description.trim())];
                case 2:
                    _a.sent();
                    setOpen(false);
                    setName('');
                    setDescription('');
                    return [3 /*break*/, 5];
                case 3:
                    err_1 = _a.sent();
                    setError(err_1 instanceof Error ? err_1.message : 'Failed to create project');
                    return [3 /*break*/, 5];
                case 4:
                    setSubmitting(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    return (_jsxs(Dialog, { open: open, disableEscapeKeyDown: true, children: [_jsx(DialogTitle, { children: "Create your first project" }), _jsxs(DialogContent, { children: [_jsx(Typography, { sx: { mb: 2 }, children: "Enter a name for your project to get started." }), _jsx(TextField, { fullWidth: true, id: "project-name", name: "project-name", label: "Project name", value: name, onChange: function (e) { return setName(e.target.value); }, disabled: submitting, autoFocus: true }), _jsx(TextField, { fullWidth: true, id: "project-description", name: "project-description", label: "Description (optional)", value: description, onChange: function (e) { return setDescription(e.target.value); }, disabled: submitting, sx: { mt: 2 } }), error && (_jsx(Typography, { color: "error", variant: "body2", sx: { mt: 1 }, children: error }))] }), _jsx(DialogActions, { children: _jsx(Button, { onClick: handleSubmit, variant: "contained", disabled: submitting || !name.trim(), children: submitting ? _jsx(CircularProgress, { size: 20 }) : 'Create' }) })] }));
};
export default ProjectSetupDialog;
