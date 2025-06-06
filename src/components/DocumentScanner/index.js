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
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
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
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Box, Typography, Paper, CircularProgress } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import { ScanResults } from '../ScanResults';
export var DocumentScanner = function () {
    var _a = useState({ status: 'idle' }), uploadStatus = _a[0], setUploadStatus = _a[1];
    var _b = useState(null), scanResults = _b[0], setScanResults = _b[1];
    var onDrop = useCallback(function (acceptedFiles) { return __awaiter(void 0, void 0, void 0, function () {
        var file, formData, response, data, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    file = acceptedFiles[0];
                    if (!file)
                        return [2 /*return*/];
                    setUploadStatus({ status: 'uploading' });
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    formData = new FormData();
                    formData.append('file', file);
                    return [4 /*yield*/, fetch('http://localhost:3001/api/scan/document', {
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
                    data = _a.sent();
                    setScanResults(data.results);
                    setUploadStatus({
                        status: 'success',
                        message: 'Document processed successfully'
                    });
                    return [3 /*break*/, 5];
                case 4:
                    error_1 = _a.sent();
                    console.error('Upload error:', error_1);
                    setUploadStatus({
                        status: 'error',
                        message: error_1 instanceof Error ? error_1.message : 'Failed to upload document'
                    });
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    }); }, []);
    var _c = useDropzone({
        onDrop: onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'application/msword': ['.doc'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'text/plain': ['.txt']
        },
        maxFiles: 1
    }), getRootProps = _c.getRootProps, getInputProps = _c.getInputProps, isDragActive = _c.isDragActive;
    return (_jsxs(Box, { sx: { p: 3 }, children: [_jsxs(Paper, __assign({}, getRootProps(), { sx: {
                    p: 4,
                    textAlign: 'center',
                    cursor: 'pointer',
                    border: '2px dashed',
                    borderColor: isDragActive ? 'primary.main' : 'grey.300',
                    bgcolor: isDragActive ? 'action.hover' : 'background.paper',
                    '&:hover': {
                        bgcolor: 'action.hover'
                    }
                }, children: [_jsx("input", __assign({}, getInputProps())), _jsx(CloudUploadIcon, { sx: { fontSize: 48, color: 'primary.main', mb: 2 } }), _jsx(Typography, { variant: "h6", gutterBottom: true, children: isDragActive
                            ? 'Drop the document here'
                            : 'Drag and drop a document here, or click to select' }), _jsx(Typography, { variant: "body2", color: "textSecondary", children: "Supported formats: PDF, DOC, DOCX, TXT" })] })), uploadStatus.status === 'uploading' && (_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', mt: 2 }, children: [_jsx(CircularProgress, { size: 24, sx: { mr: 2 } }), _jsx(Typography, { children: "Processing document..." })] })), uploadStatus.status === 'success' && (_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', mt: 2, color: 'success.main' }, children: [_jsx(CheckCircleIcon, { sx: { mr: 1 } }), _jsx(Typography, { children: uploadStatus.message })] })), uploadStatus.status === 'error' && (_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', mt: 2, color: 'error.main' }, children: [_jsx(WarningIcon, { sx: { mr: 1 } }), _jsx(Typography, { children: uploadStatus.message })] })), scanResults && _jsx(ScanResults, { results: scanResults })] }));
};
