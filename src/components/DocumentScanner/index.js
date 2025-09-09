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
import { useState, useCallback, useEffect, useRef } from 'react';
import { Box, Typography, CircularProgress, Alert, Button, Chip, LinearProgress, Card, CardContent, Paper, Fade, Slide, Grow, alpha } from '@mui/material';
import { CloudUpload as UploadIcon, Description as DocumentIcon, Security as SecurityIcon, Refresh as RefreshIcon, Add as AddIcon } from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { ScanResults } from '../ScanResults';
import { useAuth } from '../../contexts/AuthContext';
import { scanApi, ScanSSEConnection, validateFile, handleScanError } from '../../services/scanApi';
import { useNavigate, useParams } from 'react-router-dom';
/**
 * DocumentScanner Component
 *
 * SINGLE PROGRESS REFACTOR (Latest Update):
 *
 * 1. Consolidated State Management:
 *    - Added 'loading-from-be' status to distinguish from 'processing'
 *    - Single renderProgressState() function handles all progress states
 *    - Eliminates overlapping UI elements (multiple spinning circles)
 *
 * 2. Unified Progress Display:
 *    - Single progress indicator for all states
 *    - Mutually exclusive rendering conditions
 *    - Clear state transitions and messaging
 *
 * 3. Removed Redundant Elements:
 *    - Eliminated duplicate CircularProgress components
 *    - Removed overlapping renderResults() calls during progress states
 *    - Consolidated manual refresh logic into main progress display
 *
 * 4. Enhanced User Experience:
 *    - Single, consistent progress feedback
 *    - Clear state messaging for each phase
 *    - Integrated refresh functionality within progress display
 *
 * This refactor addresses the "too many UI elements" issue by ensuring only one
 * progress indicator is shown at any time, with clear state transitions.
 */
export var DocumentScanner = function () {
    var user = useAuth().user;
    var organization = { id: localStorage.getItem('orgId') || '00000000-0000-0000-0000-000000000000' };
    var navigate = useNavigate();
    var urlScanId = useParams().scanId;
    var _a = useState({ status: 'idle' }), uploadState = _a[0], setUploadState = _a[1];
    var _b = useState(null), currentScan = _b[0], setCurrentScan = _b[1];
    var _c = useState([]), mainResults = _c[0], setMainResults = _c[1];
    var _d = useState([]), inProgressResults = _d[0], setInProgressResults = _d[1];
    var _e = useState(null), error = _e[0], setError = _e[1];
    var _f = useState(null), pollingInterval = _f[0], setPollingInterval = _f[1];
    // Production-ready error reporting utility
    var reportError = function (context, error, additionalData) {
        var errorReport = {
            timestamp: new Date().toISOString(),
            context: context,
            error: error instanceof Error ? {
                message: error.message,
                stack: error.stack,
                name: error.name
            } : error,
            additionalData: additionalData,
            userAgent: navigator.userAgent,
            url: window.location.href,
            scanId: (currentScan === null || currentScan === void 0 ? void 0 : currentScan.scanId) || (currentScan === null || currentScan === void 0 ? void 0 : currentScan.id) || 'unknown'
        };
        console.error("[ERROR REPORT] ".concat(context, ":"), errorReport);
        // In production, you might want to send this to an error reporting service
        // Example: Sentry.captureException(error, { extra: errorReport });
        return errorReport;
    };
    // Safe error setter that ensures we always set a string
    var setErrorSafe = function (errorValue) {
        if (errorValue === null || errorValue === undefined) {
            setError(null);
        }
        else if (typeof errorValue === 'string') {
            setError(errorValue);
        }
        else if (errorValue instanceof Error) {
            setError(errorValue.message);
        }
        else {
            setError(JSON.stringify(errorValue));
        }
    };
    var sseConnectionRef = useRef(null);
    // Navigation debugging (suppressed - no longer needed after persistence fixes)
    // useEffect(() => {
    //   console.log('[NAVIGATION DEBUG] Component mounted/updated with urlScanId:', urlScanId);
    //   console.log('[NAVIGATION DEBUG] Current state:', {
    //     currentScan: !!currentScan,
    //     mainResults: mainResults.length,
    //     error: error,
    //     uploadState: uploadState.status
    //   });
    //   
    //   // Log when we have a scanId but no results (potential navigation issue)
    //   if (urlScanId && urlScanId !== 'undefined' && mainResults.length === 0 && inProgressResults.length === 0 && uploadState.status === 'loading-from-be') {
    //     console.log('[NAVIGATION DEBUG] POTENTIAL ISSUE: Have scanId but no results - this might be the navigation scenario');
    //   }
    // }, [urlScanId, currentScan, mainResults, inProgressResults, error, uploadState.status]);
    // URL tracking debugging (suppressed - no longer needed after persistence fixes)
    // useEffect(() => {
    //   console.log('[URL DEBUG] URL changed to:', window.location.pathname);
    //   console.log('[URL DEBUG] urlScanId from params:', urlScanId);
    // }, [urlScanId]);
    // Auto-save hook for user modifications
    var useAutoSave = function (scanId, data) {
        var _a = useState(false), isSaving = _a[0], setIsSaving = _a[1];
        var _b = useState(null), lastSaved = _b[0], setLastSaved = _b[1];
        var debouncedSave = useCallback(function (data) { return __awaiter(void 0, void 0, void 0, function () {
            var error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        setIsSaving(true);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, 4, 5]);
                        return [4 /*yield*/, scanApi.updateScanResults(scanId, data)];
                    case 2:
                        _a.sent();
                        setLastSaved(new Date());
                        return [3 /*break*/, 5];
                    case 3:
                        error_1 = _a.sent();
                        console.error('Auto-save failed:', error_1);
                        return [3 /*break*/, 5];
                    case 4:
                        setIsSaving(false);
                        return [7 /*endfinally*/];
                    case 5: return [2 /*return*/];
                }
            });
        }); }, [scanId]);
        useEffect(function () {
            var timeoutId = setTimeout(function () {
                debouncedSave(data);
            }, 2000);
            return function () { return clearTimeout(timeoutId); };
        }, [data, debouncedSave]);
        return { isSaving: isSaving, lastSaved: lastSaved };
    };
    // Load existing scan data on mount (no polling during processing)
    useEffect(function () {
        var loadExistingScan = function () { return __awaiter(void 0, void 0, void 0, function () {
            var scanIdToFetch, storedScanId, response, scanSession, scanId, err_1;
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
            return __generator(this, function (_s) {
                switch (_s.label) {
                    case 0:
                        scanIdToFetch = urlScanId;
                        // If no scanId in URL but we have one in localStorage, redirect to it
                        if ((!urlScanId || urlScanId === 'undefined') && typeof window !== 'undefined') {
                            storedScanId = localStorage.getItem('currentScanId');
                            if (storedScanId) {
                                console.log('[PERSISTENCE DEBUG] No scanId in URL, but found in localStorage:', storedScanId);
                                console.log('[PERSISTENCE DEBUG] Redirecting to preserve scan state');
                                navigate("/document-scanner/".concat(storedScanId), { replace: true });
                                return [2 /*return*/];
                            }
                        }
                        if (!(scanIdToFetch && scanIdToFetch !== 'undefined')) return [3 /*break*/, 5];
                        console.log('[DEBUG] Loading existing scan for scanId:', scanIdToFetch);
                        _s.label = 1;
                    case 1:
                        _s.trys.push([1, 3, , 4]);
                        setUploadState({ status: 'loading-from-be', message: 'Loading scan results...' });
                        setErrorSafe(null);
                        return [4 /*yield*/, scanApi.getScan(scanIdToFetch)];
                    case 2:
                        response = _s.sent();
                        if (response.error || !response.data) {
                            console.error('[DEBUG] Error loading scan:', response.error);
                            setErrorSafe('Failed to load scan results. Please try again or contact support.');
                            setUploadState({ status: 'error', message: 'Failed to load scan results' });
                            return [2 /*return*/];
                        }
                        scanSession = response.data;
                        console.log('[DEBUG] Loaded scan session:', scanSession);
                        // Set the scan data
                        setCurrentScan(scanSession);
                        setMainResults(scanSession.results || []);
                        setInProgressResults([]);
                        setErrorSafe(null);
                        if (scanSession.status === 'complete') {
                            // Scan is complete, show results
                            console.log('[DEBUG] Scan is complete, showing results');
                            setUploadState({
                                status: 'complete',
                                message: scanSession.results && scanSession.results.length > 0
                                    ? 'Analysis completed successfully'
                                    : 'Analysis completed. No relevant clauses found in this document.',
                                progress: {
                                    scanId: scanSession.id,
                                    current: (_b = (_a = scanSession.metadata) === null || _a === void 0 ? void 0 : _a.chunksProcessed) !== null && _b !== void 0 ? _b : 0,
                                    total: (_d = (_c = scanSession.metadata) === null || _c === void 0 ? void 0 : _c.totalChunks) !== null && _d !== void 0 ? _d : 0,
                                    status: 'complete',
                                    message: 'Analysis completed',
                                    estimatedTimeRemaining: 0,
                                    pagesProcessed: (_f = (_e = scanSession.metadata) === null || _e === void 0 ? void 0 : _e.totalPages) !== null && _f !== void 0 ? _f : 0,
                                    totalPages: (_h = (_g = scanSession.metadata) === null || _g === void 0 ? void 0 : _g.totalPages) !== null && _h !== void 0 ? _h : 0
                                }
                            });
                        }
                        else if (scanSession.status === 'processing') {
                            // Scan is still processing, establish SSE connection for real-time updates
                            console.log('[DEBUG] Scan is processing, establishing SSE connection');
                            scanId = scanSession.scanId || scanSession.id;
                            console.log('[DEBUG] Scan session fields:', {
                                scanId: scanSession.scanId,
                                id: scanSession.id,
                                extractedScanId: scanId
                            });
                            setUploadState({
                                status: 'processing',
                                message: 'Analysis in progress...',
                                progress: {
                                    scanId: scanId,
                                    current: (_k = (_j = scanSession.metadata) === null || _j === void 0 ? void 0 : _j.chunksProcessed) !== null && _k !== void 0 ? _k : 0,
                                    total: (_m = (_l = scanSession.metadata) === null || _l === void 0 ? void 0 : _l.totalChunks) !== null && _m !== void 0 ? _m : 0,
                                    status: 'processing',
                                    message: 'Processing...',
                                    estimatedTimeRemaining: 0,
                                    pagesProcessed: (_p = (_o = scanSession.metadata) === null || _o === void 0 ? void 0 : _o.totalPages) !== null && _p !== void 0 ? _p : 0,
                                    totalPages: (_r = (_q = scanSession.metadata) === null || _q === void 0 ? void 0 : _q.totalPages) !== null && _r !== void 0 ? _r : 0
                                }
                            });
                            // Validate scanId before establishing SSE connection
                            if (scanId && scanId !== 'undefined' && scanId !== 'null') {
                                console.log('[DEBUG] Establishing SSE connection for existing scan:', scanId);
                                establishSSEConnection(scanId);
                            }
                            else {
                                console.error('[DEBUG] Cannot establish SSE connection: Invalid scanId:', scanId);
                                console.error('[DEBUG] Full scan session for debugging:', scanSession);
                                setErrorSafe('Invalid scan ID. Cannot establish connection to server.');
                                setUploadState({ status: 'error', message: 'Invalid scan ID.' });
                            }
                        }
                        else {
                            // Unknown status
                            console.error('[DEBUG] Unknown scan status:', scanSession.status);
                            setErrorSafe('Unknown scan status. Please try again or contact support.');
                            setUploadState({ status: 'error', message: 'Unknown scan status' });
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        err_1 = _s.sent();
                        console.error('[DEBUG] Error loading scan:', err_1);
                        setErrorSafe(err_1 instanceof Error ? err_1.message : 'Failed to load scan results');
                        setUploadState({ status: 'error', message: 'Failed to load scan results' });
                        return [3 /*break*/, 4];
                    case 4: return [3 /*break*/, 6];
                    case 5:
                        if (urlScanId === 'undefined') {
                            // Invalid scanId
                            console.error('[DEBUG] Invalid scanId in URL:', urlScanId);
                            setErrorSafe('Invalid scan ID. Please try again or contact support.');
                            setUploadState({ status: 'error', message: 'Invalid scan ID.' });
                        }
                        _s.label = 6;
                    case 6: return [2 /*return*/];
                }
            });
        }); };
        loadExistingScan();
    }, [urlScanId, navigate]);
    var handleFileUpload = useCallback(function (file) { return __awaiter(void 0, void 0, void 0, function () {
        var response, scanId, uuidRegex, scanSession, err_2, errorMessage;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!user || !organization) {
                        setErrorSafe('Authentication required. Please sign in and try again.');
                        return [2 /*return*/];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    // Validate file
                    validateFile(file);
                    setUploadState({ status: 'uploading', message: 'Uploading document...' });
                    setErrorSafe(null);
                    setMainResults([]);
                    setInProgressResults([]);
                    // Debug: Log upload initiation
                    console.log('[UPLOAD DEBUG] Starting upload for file:', {
                        name: file.name,
                        size: file.size,
                        type: file.type,
                        organizationId: organization.id
                    });
                    return [4 /*yield*/, scanApi.uploadDocument(file, organization.id)];
                case 2:
                    response = _a.sent();
                    // Debug: Log full response for analysis
                    console.log('[UPLOAD DEBUG] Full upload response:', response);
                    console.log('[UPLOAD DEBUG] Response status:', response.error ? 'ERROR' : 'SUCCESS');
                    if (response.error) {
                        console.error('[UPLOAD DEBUG] Upload failed with error:', response.error);
                        throw new Error(typeof response.error === 'string' ? response.error : response.error.message);
                    }
                    // Validate response structure
                    if (!response.data) {
                        console.error('[UPLOAD DEBUG] No response data received');
                        throw new Error('No response data received from server');
                    }
                    // Debug: Log response data structure
                    console.log('[UPLOAD DEBUG] Response data:', response.data);
                    console.log('[UPLOAD DEBUG] Response data type:', typeof response.data);
                    console.log('[UPLOAD DEBUG] Response data keys:', Object.keys(response.data));
                    scanId = response.data.scanId;
                    // Debug: Log scanId extraction
                    console.log('[UPLOAD DEBUG] Raw scanId from response:', scanId);
                    console.log('[UPLOAD DEBUG] scanId type:', typeof scanId);
                    console.log('[UPLOAD DEBUG] scanId length:', scanId ? scanId.length : 'N/A');
                    // Comprehensive scanId validation
                    if (!scanId) {
                        console.error('[UPLOAD DEBUG] scanId is falsy:', scanId);
                        console.error('[UPLOAD DEBUG] Full response data for debugging:', response.data);
                        throw new Error('Scan ID is missing from server response');
                    }
                    if (typeof scanId !== 'string') {
                        console.error('[UPLOAD DEBUG] scanId is not a string:', typeof scanId, scanId);
                        throw new Error('Invalid scan ID format received from server');
                    }
                    if (scanId === 'undefined' || scanId === 'null' || scanId.trim() === '') {
                        console.error('[UPLOAD DEBUG] scanId is invalid string:', scanId);
                        throw new Error('Invalid scan ID received from server');
                    }
                    uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                    if (!uuidRegex.test(scanId)) {
                        console.error('[UPLOAD DEBUG] scanId does not match UUID format:', scanId);
                        // Don't throw error here as backend might use different format
                        console.warn('[UPLOAD DEBUG] scanId format warning, but continuing:', scanId);
                    }
                    console.log('[UPLOAD DEBUG] Valid scanId confirmed:', scanId);
                    // Store scanId in localStorage for persistence
                    if (typeof window !== 'undefined') {
                        localStorage.setItem('currentScanId', scanId);
                        console.log('[PERSISTENCE DEBUG] Stored scanId in localStorage:', scanId);
                    }
                    scanSession = {
                        id: scanId,
                        status: 'processing',
                        organizationId: organization.id,
                        fileName: file.name,
                        fileSize: file.size,
                        createdAt: new Date().toISOString(),
                        results: [],
                        metadata: {
                            totalTokens: 0,
                            estimatedCost: 0,
                            processingTime: 0,
                            totalPages: 0,
                            modelUsed: 'gpt-4',
                            chunksProcessed: 0,
                            totalChunks: 0
                        },
                        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                    };
                    setCurrentScan(scanSession);
                    setUploadState({
                        status: 'processing',
                        message: 'Processing document...',
                        progress: {
                            scanId: scanId,
                            current: 0,
                            total: 0,
                            status: 'processing',
                            message: 'Starting document analysis...',
                            estimatedTimeRemaining: 0,
                            pagesProcessed: 0,
                            totalPages: 0
                        }
                    });
                    // Update URL for persistence
                    navigate("/document-scanner/".concat(scanId), { replace: false });
                    // Establish SSE connection with validated scanId
                    console.log('[UPLOAD DEBUG] Establishing SSE connection with validated scanId:', scanId);
                    establishSSEConnection(scanId);
                    return [3 /*break*/, 4];
                case 3:
                    err_2 = _a.sent();
                    console.error('[UPLOAD DEBUG] Upload error:', err_2);
                    // Report error with context
                    reportError('File Upload', err_2, {
                        fileName: file.name,
                        fileSize: file.size,
                        fileType: file.type,
                        organizationId: organization.id
                    });
                    errorMessage = handleScanError(err_2);
                    setErrorSafe(errorMessage);
                    setUploadState({ status: 'error', message: errorMessage });
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); }, [user, organization, navigate]);
    var establishSSEConnection = function (scanId) {
        // Comprehensive scanId validation before establishing connection
        console.log('[SSE DEBUG] Attempting to establish SSE connection for scanId:', scanId);
        if (!scanId) {
            console.error('[SSE DEBUG] Cannot establish SSE connection: scanId is falsy');
            setErrorSafe('Invalid scan ID. Cannot establish connection to server.');
            setUploadState({ status: 'error', message: 'Invalid scan ID.' });
            return;
        }
        if (typeof scanId !== 'string') {
            console.error('[SSE DEBUG] Cannot establish SSE connection: scanId is not a string:', typeof scanId);
            setErrorSafe('Invalid scan ID format. Cannot establish connection to server.');
            setUploadState({ status: 'error', message: 'Invalid scan ID format.' });
            return;
        }
        if (scanId === 'undefined' || scanId === 'null' || scanId.trim() === '') {
            console.error('[SSE DEBUG] Cannot establish SSE connection: scanId is invalid string:', scanId);
            setErrorSafe('Invalid scan ID. Cannot establish connection to server.');
            setUploadState({ status: 'error', message: 'Invalid scan ID.' });
            return;
        }
        // Validate UUID format (basic check)
        var uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(scanId)) {
            console.warn('[SSE DEBUG] scanId does not match UUID format, but continuing:', scanId);
        }
        console.log('[SSE DEBUG] scanId validation passed, proceeding with SSE connection');
        try {
            // Clean up existing connection
            if (sseConnectionRef.current) {
                console.log('[SSE DEBUG] Cleaning up existing SSE connection');
                sseConnectionRef.current.disconnect();
            }
            // Create new SSE connection with validated scanId
            console.log('[SSE DEBUG] Creating new ScanSSEConnection with scanId:', scanId);
            sseConnectionRef.current = new ScanSSEConnection(scanId, function (data) { return handleSSEMessage(data); }, function (error) { return handleSSEError(error); }, function () { return handleSSEComplete(); });
            console.log('[SSE DEBUG] Initiating SSE connection...');
            sseConnectionRef.current.connect();
        }
        catch (error) {
            console.error('[SSE DEBUG] Error creating SSE connection:', error);
            setErrorSafe('Failed to establish connection to server. Please try refreshing the page.');
            setUploadState({ status: 'error', message: 'Failed to establish connection.' });
            // Start fallback polling if SSE fails
            console.log('[SSE DEBUG] Starting fallback polling due to SSE creation error');
            startPolling(scanId);
        }
    };
    var handleSSEMessage = function (data) { return __awaiter(void 0, void 0, void 0, function () {
        var response, finalScanSession, err_3, progressiveData_1, scanId, response, finalScanSession, err_4;
        var _a, _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    console.log('[DEBUG] SSE message received:', data);
                    if (!(data.status === 'complete')) return [3 /*break*/, 5];
                    console.log('[DEBUG] SSE completion message received:', data);
                    // Set upload state to complete
                    setUploadState({
                        status: 'complete',
                        message: 'Analysis completed successfully',
                        progress: {
                            scanId: data.scanId,
                            current: 100,
                            total: 100,
                            status: 'complete',
                            message: 'Analysis completed',
                            estimatedTimeRemaining: 0,
                            pagesProcessed: 0,
                            totalPages: 0
                        }
                    });
                    // Clear localStorage
                    if (typeof window !== 'undefined') {
                        localStorage.removeItem('currentScanId');
                        console.log('[PERSISTENCE DEBUG] Cleared scanId from localStorage after completion');
                    }
                    // Navigate to results page
                    console.log('[DEBUG] Navigating to scanId:', data.scanId);
                    setErrorSafe(null);
                    navigate("/document-scanner/".concat(data.scanId), { replace: false });
                    _e.label = 1;
                case 1:
                    _e.trys.push([1, 3, , 4]);
                    console.log('[DEBUG] Fetching final results from API after SSE completion');
                    return [4 /*yield*/, scanApi.getScan(data.scanId)];
                case 2:
                    response = _e.sent();
                    if (response.error) {
                        console.error('[DEBUG] Error fetching final results:', response.error);
                        setErrorSafe('Failed to load scan results. Please try refreshing the page.');
                        return [2 /*return*/];
                    }
                    finalScanSession = response.data;
                    if (finalScanSession) {
                        console.log('[DEBUG] Final results from API:', finalScanSession.results);
                        console.log('[DEBUG] Results count:', ((_a = finalScanSession.results) === null || _a === void 0 ? void 0 : _a.length) || 0);
                        setMainResults(finalScanSession.results || []);
                        setCurrentScan(finalScanSession);
                    }
                    else {
                        console.error('[DEBUG] No scan session data returned from API');
                        setErrorSafe('No scan data found. Please try again or contact support.');
                    }
                    return [3 /*break*/, 4];
                case 3:
                    err_3 = _e.sent();
                    console.error('[DEBUG] Error fetching final results after SSE completion:', err_3);
                    setErrorSafe('Failed to load scan results. Please try refreshing the page.');
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/]; // Exit early to prevent further processing
                case 5:
                    // Handle error messages
                    if (data.status === 'error') {
                        console.error('[DEBUG] SSE error message received:', data);
                        setErrorSafe(data.message || 'An error occurred during processing');
                        setUploadState({ status: 'error', message: data.message || 'Processing error' });
                        return [2 /*return*/]; // Exit early to prevent further processing
                    }
                    if (!(data.progress !== undefined && data.status)) return [3 /*break*/, 6];
                    setUploadState(function (prev) {
                        var newState = __assign(__assign({}, prev), { progress: {
                                scanId: data.scanId,
                                current: data.currentChunk || 0,
                                total: data.totalChunks || 1,
                                status: 'processing', // Always 'processing' during analysis, not 'error'
                                message: data.status === 'analyzing' ? 'Analyzing document...' : data.message || 'Processing...',
                                estimatedTimeRemaining: data.estimatedTimeRemaining || 0,
                                pagesProcessed: data.pagesProcessed || 0,
                                totalPages: data.totalPages || 0
                            }, message: data.status === 'analyzing' ? 'Analyzing document...' : data.message || 'Processing...' });
                        console.log('[DEBUG] SSE progress update, new uploadState:', newState);
                        return newState;
                    });
                    return [3 /*break*/, 12];
                case 6:
                    if (!(data.type === 'progress')) return [3 /*break*/, 7];
                    setUploadState(function (prev) {
                        var newState = __assign(__assign({}, prev), { progress: data.data, message: data.data.message });
                        console.log('[DEBUG] SSE progress update, new uploadState:', newState);
                        return newState;
                    });
                    return [3 /*break*/, 12];
                case 7:
                    if (!(data.type === 'progressive_update')) return [3 /*break*/, 8];
                    progressiveData_1 = data.data;
                    console.log('[DEBUG] SSE progressive_update:', progressiveData_1);
                    setInProgressResults(progressiveData_1.partialResults);
                    setUploadState(function (prev) {
                        var newState = __assign(__assign({}, prev), { progress: __assign(__assign({}, prev.progress), { status: 'processing', pagesProcessed: progressiveData_1.pagesProcessed, totalPages: progressiveData_1.totalPages, estimatedTimeRemaining: progressiveData_1.estimatedTimeRemaining }) });
                        console.log('[DEBUG] SSE progressive_update, new uploadState:', newState);
                        return newState;
                    });
                    return [3 /*break*/, 12];
                case 8:
                    if (!(data.type === 'complete')) return [3 /*break*/, 12];
                    scanId = ((_b = data.data) === null || _b === void 0 ? void 0 : _b.scanId) || ((_c = data.data) === null || _c === void 0 ? void 0 : _c.id);
                    console.log('[DEBUG] SSE complete event received for scanId:', scanId);
                    if (!scanId || scanId === 'undefined') {
                        console.error('[DEBUG] SSE complete event missing valid scanId:', data);
                        setError('Invalid scan ID received from server. Please try again or contact support.');
                        setUploadState({ status: 'error', message: 'Invalid scan ID.' });
                        return [2 /*return*/];
                    }
                    // Set upload state to complete
                    setUploadState({
                        status: 'complete',
                        message: 'Analysis completed successfully',
                        progress: {
                            scanId: scanId,
                            current: 100,
                            total: 100,
                            status: 'complete',
                            message: 'Analysis completed',
                            estimatedTimeRemaining: 0,
                            pagesProcessed: 0,
                            totalPages: 0
                        }
                    });
                    // Clear localStorage
                    if (typeof window !== 'undefined') {
                        localStorage.removeItem('currentScanId');
                        console.log('[PERSISTENCE DEBUG] Cleared scanId from localStorage after completion');
                    }
                    // Navigate to results page
                    console.log('[DEBUG] Navigating to scanId:', scanId);
                    setErrorSafe(null);
                    navigate("/document-scanner/".concat(scanId), { replace: false });
                    _e.label = 9;
                case 9:
                    _e.trys.push([9, 11, , 12]);
                    console.log('[DEBUG] Fetching final results from API after SSE completion');
                    return [4 /*yield*/, scanApi.getScan(scanId)];
                case 10:
                    response = _e.sent();
                    if (response.error) {
                        console.error('[DEBUG] Error fetching final results:', response.error);
                        setErrorSafe('Failed to load scan results. Please try refreshing the page.');
                        return [2 /*return*/];
                    }
                    finalScanSession = response.data;
                    if (finalScanSession) {
                        console.log('[DEBUG] Final results from API:', finalScanSession.results);
                        console.log('[DEBUG] Results count:', ((_d = finalScanSession.results) === null || _d === void 0 ? void 0 : _d.length) || 0);
                        setMainResults(finalScanSession.results || []);
                        setCurrentScan(finalScanSession);
                    }
                    else {
                        console.error('[DEBUG] No scan session data returned from API');
                        setErrorSafe('No scan data found. Please try again or contact support.');
                    }
                    return [3 /*break*/, 12];
                case 11:
                    err_4 = _e.sent();
                    console.error('[DEBUG] Error fetching final results after SSE completion:', err_4);
                    setErrorSafe('Failed to load scan results. Please try refreshing the page.');
                    return [3 /*break*/, 12];
                case 12: return [2 /*return*/];
            }
        });
    }); };
    var handleSSEError = function (error) {
        console.error('SSE error:', error);
        setErrorSafe(error);
        setUploadState({ status: 'error', message: error });
        // Start polling as fallback if SSE fails
        var scanId = (currentScan === null || currentScan === void 0 ? void 0 : currentScan.scanId) || (currentScan === null || currentScan === void 0 ? void 0 : currentScan.id);
        if (scanId) {
            console.log('[DEBUG] Starting fallback polling due to SSE error');
            startPolling(scanId);
        }
    };
    // Fallback polling mechanism
    var startPolling = function (scanId) {
        // Clear any existing polling
        if (pollingInterval) {
            clearInterval(pollingInterval);
        }
        console.log('[DEBUG] Starting fallback polling for scanId:', scanId);
        var interval = setInterval(function () { return __awaiter(void 0, void 0, void 0, function () {
            var response, scanSession, err_5;
            var _a, _b, _c, _d, _e, _f, _g, _h;
            return __generator(this, function (_j) {
                switch (_j.label) {
                    case 0:
                        _j.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, scanApi.getScan(scanId)];
                    case 1:
                        response = _j.sent();
                        if (response.error || !response.data) {
                            console.error('[DEBUG] Polling error:', response.error);
                            return [2 /*return*/];
                        }
                        scanSession = response.data;
                        console.log('[DEBUG] Polling update:', scanSession.status);
                        if (scanSession.status === 'complete') {
                            console.log('[DEBUG] Scan completed via polling');
                            setCurrentScan(scanSession);
                            setMainResults(scanSession.results || []);
                            setUploadState({
                                status: 'complete',
                                message: 'Analysis completed successfully',
                                progress: {
                                    scanId: scanSession.id,
                                    current: (_b = (_a = scanSession.metadata) === null || _a === void 0 ? void 0 : _a.chunksProcessed) !== null && _b !== void 0 ? _b : 0,
                                    total: (_d = (_c = scanSession.metadata) === null || _c === void 0 ? void 0 : _c.totalChunks) !== null && _d !== void 0 ? _d : 0,
                                    status: 'complete',
                                    message: 'Analysis completed',
                                    estimatedTimeRemaining: 0,
                                    pagesProcessed: (_f = (_e = scanSession.metadata) === null || _e === void 0 ? void 0 : _e.totalPages) !== null && _f !== void 0 ? _f : 0,
                                    totalPages: (_h = (_g = scanSession.metadata) === null || _g === void 0 ? void 0 : _g.totalPages) !== null && _h !== void 0 ? _h : 0
                                }
                            });
                            stopPolling();
                        }
                        else if (scanSession.status === 'error') {
                            console.error('[DEBUG] Scan failed via polling');
                            setErrorSafe('Document processing failed. Please try again.');
                            setUploadState({ status: 'error', message: 'Processing failed' });
                            stopPolling();
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        err_5 = _j.sent();
                        console.error('[DEBUG] Polling error:', err_5);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        }); }, 5000); // Poll every 5 seconds
        setPollingInterval(interval);
    };
    var stopPolling = function () {
        if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
            console.log('[DEBUG] Stopped fallback polling');
        }
    };
    var handleSSEComplete = function () {
        console.log('SSE connection completed');
        if (sseConnectionRef.current) {
            sseConnectionRef.current.disconnect();
            sseConnectionRef.current = null;
        }
        // Stop polling if SSE completes successfully
        stopPolling();
    };
    var handleRetry = function () { return __awaiter(void 0, void 0, void 0, function () {
        var response, scanId, err_6, errorMessage;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!currentScan)
                        return [2 /*return*/];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    setErrorSafe(null);
                    setUploadState({ status: 'processing', message: 'Retrying scan...' });
                    return [4 /*yield*/, scanApi.retryScan(currentScan.id)];
                case 2:
                    response = _a.sent();
                    if (response.error) {
                        throw new Error(typeof response.error === 'string' ? response.error : response.error.message);
                    }
                    scanId = currentScan.scanId || currentScan.id;
                    if (scanId && scanId !== 'undefined' && scanId !== 'null') {
                        console.log('[DEBUG] Re-establishing SSE connection for retry:', scanId);
                        establishSSEConnection(scanId);
                    }
                    else {
                        console.error('[DEBUG] Cannot re-establish SSE connection: Invalid scanId:', scanId);
                        setErrorSafe('Invalid scan ID. Cannot establish connection to server.');
                        setUploadState({ status: 'error', message: 'Invalid scan ID.' });
                    }
                    return [3 /*break*/, 4];
                case 3:
                    err_6 = _a.sent();
                    console.error('Retry error:', err_6);
                    errorMessage = handleScanError(err_6);
                    setErrorSafe(errorMessage);
                    setUploadState({ status: 'error', message: errorMessage });
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    var handleManualRefresh = function () { return __awaiter(void 0, void 0, void 0, function () {
        var response, scanSession, scanId, err_7, errorMessage;
        var _a, _b, _c, _d, _e, _f, _g, _h;
        return __generator(this, function (_j) {
            switch (_j.label) {
                case 0:
                    if (!urlScanId || urlScanId === 'undefined')
                        return [2 /*return*/];
                    console.log('[MANUAL REFRESH] User triggered manual refresh for scanId:', urlScanId);
                    _j.label = 1;
                case 1:
                    _j.trys.push([1, 3, 4, 5]);
                    setErrorSafe(null);
                    setUploadState({ status: 'loading-from-be', message: 'Refreshing scan results...' });
                    // Clear existing results to show loading state
                    setMainResults([]);
                    setInProgressResults([]);
                    return [4 /*yield*/, scanApi.getScan(urlScanId)];
                case 2:
                    response = _j.sent();
                    if (response.error || !response.data) {
                        throw new Error(response.error ? String(response.error) : 'Failed to fetch scan results');
                    }
                    scanSession = response.data;
                    console.log('[MANUAL REFRESH] Fresh data from BE:', scanSession);
                    scanId = scanSession.scanId || scanSession.id;
                    setCurrentScan(scanSession);
                    setMainResults(scanSession.results || []);
                    setInProgressResults([]);
                    // If scan is still processing, re-establish SSE connection
                    if (scanSession.status === 'processing') {
                        console.log('[MANUAL REFRESH] Scan is processing, re-establishing SSE connection');
                        if (scanId && scanId !== 'undefined' && scanId !== 'null') {
                            establishSSEConnection(scanId);
                        }
                        else {
                            console.error('[MANUAL REFRESH] Cannot re-establish SSE connection: Invalid scanId:', scanId);
                            setErrorSafe('Invalid scan ID. Cannot establish connection to server.');
                            setUploadState({ status: 'error', message: 'Invalid scan ID.' });
                        }
                    }
                    setUploadState({
                        status: scanSession.status === 'complete' ? 'complete' : 'processing',
                        message: scanSession.status === 'complete' ? 'Analysis completed successfully' : 'Processing document...',
                        progress: {
                            scanId: scanId,
                            current: (_b = (_a = scanSession.metadata) === null || _a === void 0 ? void 0 : _a.chunksProcessed) !== null && _b !== void 0 ? _b : 0,
                            total: (_d = (_c = scanSession.metadata) === null || _c === void 0 ? void 0 : _c.totalChunks) !== null && _d !== void 0 ? _d : 0,
                            status: scanSession.status === 'complete' ? 'complete' : 'processing',
                            message: scanSession.status === 'complete' ? 'Analysis completed' : 'Processing...',
                            estimatedTimeRemaining: 0,
                            pagesProcessed: (_f = (_e = scanSession.metadata) === null || _e === void 0 ? void 0 : _e.totalPages) !== null && _f !== void 0 ? _f : 0,
                            totalPages: (_h = (_g = scanSession.metadata) === null || _g === void 0 ? void 0 : _g.totalPages) !== null && _h !== void 0 ? _h : 0
                        }
                    });
                    return [3 /*break*/, 5];
                case 3:
                    err_7 = _j.sent();
                    console.error('[MANUAL REFRESH] Error:', err_7);
                    errorMessage = err_7 instanceof Error ? err_7.message : 'Failed to refresh results';
                    setErrorSafe(errorMessage);
                    setUploadState({ status: 'error', message: errorMessage });
                    return [3 /*break*/, 5];
                case 4: return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    var handleReset = function () {
        setUploadState({ status: 'idle' });
        setCurrentScan(null);
        setMainResults([]);
        setInProgressResults([]);
        setErrorSafe(null);
        // Clear localStorage when resetting
        if (typeof window !== 'undefined') {
            localStorage.removeItem('currentScanId');
            console.log('[PERSISTENCE DEBUG] Cleared scanId from localStorage');
        }
        if (sseConnectionRef.current) {
            sseConnectionRef.current.disconnect();
            sseConnectionRef.current = null;
        }
        // Stop polling when resetting
        stopPolling();
        // Navigate to the base document scanner URL to show the upload interface
        navigate('/document-scanner');
    };
    // Function to clear all scan results and return to initial state
    var clearAllResults = function () {
        console.log('[DEBUG] Clearing all scan results and returning to initial state');
        handleReset();
    };
    // Cleanup on unmount
    useEffect(function () {
        return function () {
            if (sseConnectionRef.current) {
                sseConnectionRef.current.disconnect();
            }
            if (pollingInterval) {
                clearInterval(pollingInterval);
            }
        };
    }, [pollingInterval]);
    // Keyboard shortcuts
    useEffect(function () {
        var handleKeyDown = function (event) {
            // Escape key to clear results and return to upload state
            if (event.key === 'Escape' && (error || currentScan || mainResults.length > 0)) {
                event.preventDefault();
                console.log('[DEBUG] Escape key pressed - clearing results');
                clearAllResults();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return function () { return document.removeEventListener('keydown', handleKeyDown); };
    }, [error, currentScan, mainResults.length]);
    var _g = useDropzone({
        onDrop: function (acceptedFiles) {
            if (acceptedFiles.length > 0) {
                handleFileUpload(acceptedFiles[0]);
            }
        },
        accept: {
            'application/pdf': ['.pdf'],
            'application/msword': ['.doc'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'application/vnd.ms-excel': ['.xls'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'text/plain': ['.txt'],
        },
        maxFiles: 1,
        disabled: uploadState.status === 'uploading' || uploadState.status === 'processing',
    }), getRootProps = _g.getRootProps, getInputProps = _g.getInputProps, isDragActive = _g.isDragActive;
    var renderProgressState = function () {
        if (!uploadState.progress)
            return null;
        var _a = uploadState.progress, current = _a.current, total = _a.total, status = _a.status, message = _a.message, estimatedTimeRemaining = _a.estimatedTimeRemaining, pagesProcessed = _a.pagesProcessed, totalPages = _a.totalPages;
        var progress = total > 0 ? (current / total) * 100 : 0;
        return (_jsx(Fade, { in: true, timeout: 500, children: _jsx(Card, { sx: {
                    mt: 3,
                    mb: 3,
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(14, 165, 233, 0.05) 100%)',
                    border: '1px solid',
                    borderColor: 'primary.main',
                    borderRadius: 3,
                    overflow: 'hidden',
                    position: 'relative',
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '3px',
                        background: 'linear-gradient(90deg, #6366f1 0%, #0ea5e9 100%)',
                    }
                }, children: _jsxs(CardContent, { sx: { p: 3 }, children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(SecurityIcon, { sx: { color: 'primary.main', fontSize: 24 } }), _jsx(Typography, { variant: "h6", sx: { fontWeight: 600 }, children: "AI Analysis in Progress" })] }), _jsx(Chip, { label: status === 'processing' ? 'Analyzing' :
                                        status === 'complete' ? 'Complete' :
                                            status === 'error' ? 'Error' :
                                                'Processing', color: status === 'processing' ? 'primary' :
                                        status === 'complete' ? 'success' :
                                            status === 'error' ? 'error' :
                                                'default', size: "small", sx: {
                                        fontWeight: 600,
                                        '& .MuiChip-label': { px: 2 }
                                    } })] }), _jsx(Typography, { variant: "body1", color: "text.secondary", sx: { mb: 3, lineHeight: 1.6 }, children: message }), total > 0 && (_jsxs(Box, { sx: { mb: 3 }, children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', mb: 1 }, children: [_jsx(Typography, { variant: "body2", sx: { fontWeight: 600 }, children: "Processing Progress" }), _jsxs(Typography, { variant: "body2", sx: { fontWeight: 600, color: 'primary.main' }, children: [Math.round(progress), "%"] })] }), _jsx(LinearProgress, { variant: "determinate", value: progress, sx: {
                                        height: 8,
                                        borderRadius: 4,
                                        backgroundColor: alpha('#6366f1', 0.1),
                                        '& .MuiLinearProgress-bar': {
                                            borderRadius: 4,
                                            background: 'linear-gradient(90deg, #6366f1 0%, #0ea5e9 100%)',
                                        }
                                    } }), _jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', mt: 1 }, children: [_jsxs(Typography, { variant: "body2", color: "text.secondary", children: ["Chunk ", current, " of ", total] }), estimatedTimeRemaining && estimatedTimeRemaining > 0 && (_jsxs(Typography, { variant: "body2", color: "text.secondary", children: ["~", Math.ceil(estimatedTimeRemaining / 60), " min remaining"] }))] })] })), totalPages && totalPages > 0 && (_jsx(Box, { sx: { mb: 2 }, children: _jsxs(Typography, { variant: "body2", color: "text.secondary", sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(DocumentIcon, { sx: { fontSize: 16 } }), "Pages processed: ", pagesProcessed || 0, " of ", totalPages] }) })), estimatedTimeRemaining && estimatedTimeRemaining > 0 && (_jsxs(Typography, { variant: "body2", color: "text.secondary", children: ["Estimated time remaining: ", Math.ceil(estimatedTimeRemaining / 60), " minutes"] }))] }) }) }));
    };
    var renderResults = function () {
        // Only render results when we actually have them and are not in a progress state
        if (mainResults.length === 0 && inProgressResults.length === 0)
            return null;
        // Don't render results during progress states - let the unified progress display handle those
        if (uploadState.status === 'uploading' || uploadState.status === 'loading-from-be') {
            return null;
        }
        // Helper to map ScanProgress status for ScanResults
        var mapProgressForScanResults = function (progress) {
            if (!progress)
                return null;
            // Map 'complete' to 'completed' for ScanResults compatibility
            return __assign(__assign({}, progress), { status: progress.status === 'complete' ? 'completed' : progress.status });
        };
        return (_jsx(Grow, { in: true, timeout: 600, children: _jsxs(Box, { sx: { mt: 4 }, children: [_jsx(Typography, { variant: "h5", gutterBottom: true, sx: { fontWeight: 700, mb: 3 }, children: "Analysis Results" }), inProgressResults.length > 0 && (_jsx(Card, { sx: {
                            mb: 3,
                            border: '2px dashed',
                            borderColor: 'primary.main',
                            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.02) 0%, rgba(14, 165, 233, 0.02) 100%)',
                            borderRadius: 3
                        }, children: _jsxs(CardContent, { sx: { p: 3 }, children: [_jsxs(Typography, { variant: "h6", color: "primary", gutterBottom: true, sx: { fontWeight: 600 }, children: ["Processing Results (", inProgressResults.length, " clauses detected so far)"] }), _jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mb: 3 }, children: "These are partial results. More clauses may be detected as processing continues." }), _jsx(ScanResults, { results: inProgressResults, progress: mapProgressForScanResults(uploadState.progress) })] }) })), mainResults.length > 0 && (_jsx(Card, { sx: { borderRadius: 3, overflow: 'hidden' }, children: _jsxs(CardContent, { sx: { p: 3 }, children: [_jsxs(Typography, { variant: "h6", gutterBottom: true, sx: { fontWeight: 600 }, children: ["Final Results (", mainResults.length, " clauses detected)"] }), _jsx(ScanResults, { results: mainResults, progress: mapProgressForScanResults(uploadState.progress) })] }) }))] }) }));
    };
    // console.log('[DEBUG] Render: uploadState', uploadState, 'mainResults', mainResults, 'currentScan', currentScan, 'error', error);
    return (_jsxs(Box, { sx: {
            width: '100%',
            maxWidth: 900,
            mx: 'auto',
            p: 4,
            minHeight: '100vh',
            background: 'linear-gradient(135deg, rgba(241, 245, 249, 0.5) 0%, rgba(255, 255, 255, 0.8) 100%)'
        }, children: [_jsxs(Box, { sx: { mb: 4, textAlign: 'center' }, children: [_jsx(Typography, { variant: "h3", gutterBottom: true, sx: {
                            fontWeight: 800,
                            background: 'linear-gradient(135deg, #0f172a 0%, #6366f1 100%)',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            mb: 2
                        }, children: "AI Document Scanner" }), _jsx(Typography, { variant: "h6", color: "text.secondary", sx: {
                            maxWidth: 600,
                            mx: 'auto',
                            lineHeight: 1.6,
                            fontWeight: 400
                        }, children: "Upload compliance documents to automatically detect IT security clauses using advanced AI analysis" })] }), _jsx(Box, { sx: { mb: 4, display: 'flex', justifyContent: 'center' }, children: _jsx(Paper, { sx: {
                        p: 2,
                        borderRadius: 3,
                        background: 'rgba(255, 255, 255, 0.8)',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid',
                        borderColor: 'divider'
                    } }) }), !user ? (_jsx(Fade, { in: true, timeout: 500, children: _jsxs(Box, { sx: {
                        textAlign: 'center',
                        py: 8,
                        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(241, 245, 249, 0.6) 100%)',
                        borderRadius: 3,
                        border: '1px solid',
                        borderColor: 'divider'
                    }, children: [_jsx(SecurityIcon, { sx: { fontSize: 64, color: 'text.secondary', mb: 2 } }), _jsx(Typography, { variant: "h6", color: "text.secondary", sx: { fontWeight: 600 }, children: "Authentication Required" }), _jsx(Typography, { variant: "body1", color: "text.secondary", sx: { mt: 1 }, children: "Please sign in to upload and analyze documents" })] }) })) : (_jsxs(_Fragment, { children: [uploadState.status === 'idle' && !urlScanId && (_jsx(Slide, { direction: "up", in: true, timeout: 600, children: _jsxs(Box, __assign({}, getRootProps(), { sx: {
                                border: '3px dashed',
                                borderColor: isDragActive ? 'primary.main' : 'grey.300',
                                borderRadius: 4,
                                p: 6,
                                textAlign: 'center',
                                cursor: 'pointer',
                                background: isDragActive
                                    ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(14, 165, 233, 0.1) 100%)'
                                    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(241, 245, 249, 0.6) 100%)',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                backdropFilter: 'blur(8px)',
                                '&:hover': {
                                    borderColor: 'primary.main',
                                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(14, 165, 233, 0.15) 100%)',
                                    transform: 'translateY(-2px)',
                                    boxShadow: '0 8px 32px rgba(99, 102, 241, 0.15)',
                                },
                            }, children: [_jsx("input", __assign({}, getInputProps())), _jsx(UploadIcon, { sx: { fontSize: 64, color: 'primary.main', mb: 2 } }), _jsx(Typography, { variant: "h5", sx: { fontWeight: 600, mb: 2 }, children: isDragActive ? 'Drop your document here' : 'Upload Document for AI Analysis' }), _jsx(Typography, { variant: "body1", color: "text.secondary", sx: { mb: 3 }, children: isDragActive
                                        ? 'Release to upload and analyze'
                                        : 'Drag and drop your document here, or click to browse files' }), _jsxs(Box, { sx: { display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }, children: [_jsx(Chip, { label: "PDF", size: "small", sx: { fontWeight: 500 } }), _jsx(Chip, { label: "Word", size: "small", sx: { fontWeight: 500 } }), _jsx(Chip, { label: "Excel", size: "small", sx: { fontWeight: 500 } }), _jsx(Chip, { label: "Text", size: "small", sx: { fontWeight: 500 } })] }), _jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mt: 2 }, children: "Maximum file size: 50MB" })] })) })), (uploadState.status === 'uploading' || uploadState.status === 'processing' || uploadState.status === 'loading-from-be') && (_jsx(Fade, { in: true, timeout: 500, children: _jsxs(Box, { sx: { textAlign: 'center', py: 4 }, children: [_jsx(Box, { sx: {
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: 80,
                                        height: 80,
                                        borderRadius: '50%',
                                        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(14, 165, 233, 0.1) 100%)',
                                        mb: 3
                                    }, children: _jsx(CircularProgress, { size: 60, sx: {
                                            color: 'primary.main',
                                            '& .MuiCircularProgress-circle': {
                                                strokeLinecap: 'round',
                                            }
                                        } }) }), _jsx(Typography, { variant: "h6", sx: { fontWeight: 600, mb: 1 }, children: uploadState.message || 'Processing document...' }), uploadState.progress && renderProgressState(), uploadState.status === 'loading-from-be' && currentScan && (_jsx(Button, { variant: "outlined", onClick: handleManualRefresh, sx: { mt: 3 }, startIcon: _jsx(RefreshIcon, {}), children: "Refresh Results" }))] }) })), error && (_jsx(Slide, { direction: "up", in: true, timeout: 400, children: _jsx(Alert, { severity: "error", sx: {
                                mt: 3,
                                borderRadius: 2,
                                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%)',
                                border: '1px solid',
                                borderColor: 'error.main'
                            }, action: _jsxs(Box, { sx: { display: 'flex', gap: 1 }, children: [_jsx(Button, { color: "inherit", size: "small", onClick: handleRetry, startIcon: _jsx(RefreshIcon, {}), sx: { fontWeight: 600 }, children: "Retry" }), _jsx(Button, { color: "inherit", size: "small", onClick: clearAllResults, startIcon: _jsx(AddIcon, {}), sx: { fontWeight: 600 }, children: "Start Fresh" })] }), children: _jsx(Typography, { variant: "body1", sx: { fontWeight: 500 }, children: typeof error === 'string' ? error : JSON.stringify(error) }) }) })), urlScanId && urlScanId !== 'undefined' && mainResults.length === 0 && inProgressResults.length === 0 && uploadState.status !== 'uploading' && uploadState.status !== 'processing' && uploadState.status !== 'loading-from-be' && (_jsx(Fade, { in: true, timeout: 500, children: _jsx(Box, { sx: { mt: 4, textAlign: 'center' }, children: _jsx(Alert, { severity: "info", sx: {
                                    mb: 3,
                                    borderRadius: 2,
                                    background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%)',
                                    border: '1px solid',
                                    borderColor: 'primary.light'
                                }, action: _jsx(Button, { color: "inherit", size: "small", onClick: handleManualRefresh, startIcon: _jsx(RefreshIcon, {}), sx: { fontWeight: 600 }, children: "Refresh" }), children: _jsx(Typography, { variant: "body2", children: "No results found for this scan. The analysis may still be processing or the results may not be available yet." }) }) }) })), renderResults(), uploadState.status === 'complete' && (_jsx(Grow, { in: true, timeout: 800, children: _jsxs(Box, { sx: { mt: 4, display: 'flex', gap: 2, justifyContent: 'center' }, children: [_jsx(Button, { variant: "contained", onClick: handleReset, startIcon: _jsx(AddIcon, {}), sx: {
                                        background: 'linear-gradient(135deg, #6366f1 0%, #0ea5e9 100%)',
                                        borderRadius: 2,
                                        px: 4,
                                        py: 1.5,
                                        fontWeight: 600,
                                        textTransform: 'none',
                                        fontSize: '1rem',
                                        '&:hover': {
                                            background: 'linear-gradient(135deg, #4f46e5 0%, #0284c7 100%)',
                                            transform: 'translateY(-1px)',
                                            boxShadow: '0 8px 25px rgba(99, 102, 241, 0.3)',
                                        }
                                    }, children: "Scan Another Document" }), currentScan && (_jsx(Button, { variant: "outlined", onClick: function () {
                                        // TODO: Implement project creation from scan
                                        console.log('Create project from scan:', currentScan.id);
                                    }, sx: {
                                        borderRadius: 2,
                                        px: 4,
                                        py: 1.5,
                                        fontWeight: 600,
                                        textTransform: 'none',
                                        fontSize: '1rem',
                                        borderColor: 'primary.main',
                                        color: 'primary.main',
                                        '&:hover': {
                                            background: 'rgba(99, 102, 241, 0.08)',
                                            borderColor: 'primary.dark',
                                            transform: 'translateY(-1px)',
                                        }
                                    }, children: "Create Project from Results" }))] }) }))] }))] }));
};
