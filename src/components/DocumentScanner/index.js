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
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useCallback } from 'react';
import { Box, Typography, CircularProgress, FormControlLabel, Switch } from '@mui/material';
import { useDropzone } from 'react-dropzone';
import { ScanResults } from '../ScanResults';
import { useAuth } from '../../contexts/AuthContext';
export var DocumentScanner = function () {
    var user = useAuth().user;
    var _a = useState(false), isUploading = _a[0], setIsUploading = _a[1];
    var _b = useState(null), progress = _b[0], setProgress = _b[1];
    var _c = useState([]), results = _c[0], setResults = _c[1];
    var _d = useState(null), error = _d[0], setError = _d[1];
    var _e = useState(true), isTestMode = _e[0], setIsTestMode = _e[1];
    var transformResults = function (scanResults) {
        return scanResults.flatMap(function (result) {
            return result.matches.map(function (match) { return ({
                clauseId: match.clauseId,
                title: "Match in ".concat(result.id),
                description: match.explanation,
                confidence: match.confidence,
                supportingContext: result.text
            }); });
        });
    };
    var onDrop = useCallback(function (acceptedFiles) { return __awaiter(void 0, void 0, void 0, function () {
        var file, formData, endpoint, response, data_1, progressInterval_1, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (acceptedFiles.length === 0)
                        return [2 /*return*/];
                    file = acceptedFiles[0];
                    setIsUploading(true);
                    setError(null);
                    setResults([]);
                    setProgress(null);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    formData = new FormData();
                    formData.append('file', file);
                    endpoint = isTestMode ? '/api/scan/document/test' : '/api/scan/document';
                    return [4 /*yield*/, fetch(endpoint, {
                            method: 'POST',
                            body: formData,
                        })];
                case 2:
                    response = _a.sent();
                    if (!response.ok) {
                        throw new Error("Upload failed: ".concat(response.statusText));
                    }
                    return [4 /*yield*/, response.json()];
                case 3:
                    data_1 = _a.sent();
                    setResults(data_1.results);
                    setIsUploading(false);
                    if (isTestMode) {
                        console.log("Test mode: Processed ".concat(data_1.processedChunks, " of ").concat(data_1.totalChunks, " chunks"));
                    }
                    progressInterval_1 = setInterval(function () { return __awaiter(void 0, void 0, void 0, function () {
                        var progressResponse, progressData, error_1;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 3, , 4]);
                                    return [4 /*yield*/, fetch("/api/scan/progress?scanId=".concat(data_1.scanId))];
                                case 1:
                                    progressResponse = _a.sent();
                                    if (!progressResponse.ok) {
                                        throw new Error('Failed to fetch progress');
                                    }
                                    return [4 /*yield*/, progressResponse.json()];
                                case 2:
                                    progressData = _a.sent();
                                    setProgress(progressData);
                                    if (progressData.status === 'completed' || progressData.status === 'error') {
                                        clearInterval(progressInterval_1);
                                        setIsUploading(false);
                                    }
                                    return [3 /*break*/, 4];
                                case 3:
                                    error_1 = _a.sent();
                                    console.error('Error fetching progress:', error_1);
                                    clearInterval(progressInterval_1);
                                    setIsUploading(false);
                                    return [3 /*break*/, 4];
                                case 4: return [2 /*return*/];
                            }
                        });
                    }); }, 1000);
                    return [3 /*break*/, 5];
                case 4:
                    err_1 = _a.sent();
                    console.error('Upload error:', err_1);
                    setError(err_1 instanceof Error ? err_1.message : 'Upload failed');
                    setIsUploading(false);
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    }); }, [isTestMode]);
    var _f = useDropzone({
        onDrop: onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'application/msword': ['.doc'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'text/plain': ['.txt'],
        },
        maxFiles: 1,
        disabled: isUploading,
    }), getRootProps = _f.getRootProps, getInputProps = _f.getInputProps, isDragActive = _f.isDragActive;
    return (_jsxs(Box, { sx: { width: '100%', maxWidth: 800, mx: 'auto', p: 3 }, children: [_jsx(Typography, { variant: "h5", gutterBottom: true, children: "Document Scanner" }), _jsx(FormControlLabel, { control: _jsx(Switch, { checked: isTestMode, onChange: function (e) { return setIsTestMode(e.target.checked); }, color: "primary" }), label: "Test Mode (Uses GPT-3.5 with optimized settings for cost efficiency)", sx: { mb: 2 } }), !user ? (_jsx(Box, { sx: { textAlign: 'center', py: 4 }, children: _jsx(Typography, { color: "text.secondary", children: "Please sign in to upload and analyze documents" }) })) : (_jsxs(_Fragment, { children: [_jsxs(Box, __assign({}, getRootProps(), { sx: {
                            border: '2px dashed',
                            borderColor: isDragActive ? 'primary.main' : 'grey.300',
                            borderRadius: 2,
                            p: 4,
                            textAlign: 'center',
                            cursor: isUploading ? 'not-allowed' : 'pointer',
                            bgcolor: isDragActive ? 'action.hover' : 'background.paper',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                borderColor: 'primary.main',
                                bgcolor: 'action.hover',
                            },
                        }, children: [_jsx("input", __assign({}, getInputProps())), isUploading ? (_jsxs(Box, { sx: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }, children: [_jsx(CircularProgress, { size: 40 }), _jsx(Typography, { children: (progress === null || progress === void 0 ? void 0 : progress.message) || 'Processing document...' }), progress && (_jsxs(Typography, { variant: "body2", color: "text.secondary", children: ["Processing chunk ", progress.current, " of ", progress.total] }))] })) : (_jsx(Typography, { children: isDragActive
                                    ? 'Drop the document here'
                                    : 'Drag and drop a document here, or click to select' }))] })), error && (_jsx(Typography, { color: "error", sx: { mt: 2 }, children: error })), results.length > 0 && (_jsxs(Box, { sx: { mt: 2 }, children: [_jsx(Typography, { variant: "body2", color: "text.secondary", gutterBottom: true, children: isTestMode
                                    ? 'Document processed with GPT-3.5 (cost-optimized mode)'
                                    : 'Document processed with GPT-4 (full analysis mode)' }), _jsx(ScanResults, { results: transformResults(results), progress: progress })] }))] }))] }));
};
