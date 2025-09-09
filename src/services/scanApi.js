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
import { apiCall } from './api';
import environment from '../config/environment';
import { supabase } from '../lib/supabase';
// File validation
export var validateFile = function (file) {
    var allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain'
    ];
    var maxSize = 25 * 1024 * 1024; // 25MB
    if (!allowedTypes.includes(file.type)) {
        throw new Error('Invalid file type. Only PDF, Word, Excel, and text files are allowed.');
    }
    if (file.size > maxSize) {
        throw new Error('File size exceeds 25MB limit.');
    }
    return true;
};
// Error handling
export var handleScanError = function (error) {
    if (error.code === 'SCAN_PROCESSING_FAILED') {
        return 'Document processing failed. Please try again.';
    }
    if (error.code === 'FILE_TOO_LARGE') {
        return 'File size exceeds 25MB limit.';
    }
    if (error.code === 'UNSUPPORTED_FORMAT') {
        return 'File format not supported. Please use PDF, Word, or text files.';
    }
    if (error.code === 'API_QUOTA_EXCEEDED') {
        return 'API quota exceeded. Please try again later.';
    }
    if (error.code === 'NETWORK_ERROR') {
        return 'Network error. Please check your connection and try again.';
    }
    if (error.code === 'AUTHENTICATION_ERROR') {
        return 'Authentication required. Please sign in and try again.';
    }
    return 'An unexpected error occurred. Please try again.';
};
// Scan API Service
export var scanApi = {
    // Upload document and start scan
    uploadDocument: function (file, organizationId) { return __awaiter(void 0, void 0, void 0, function () {
        var formData, _i, _a, _b, key, value, error_1;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 2, , 3]);
                    // Validate file first
                    validateFile(file);
                    formData = new FormData();
                    formData.append('file', file);
                    formData.append('organizationId', organizationId);
                    // Debug logging
                    console.log('Uploading document:', {
                        fileName: file.name,
                        fileSize: file.size,
                        fileType: file.type,
                        organizationId: organizationId,
                        endpoint: '/api/scans'
                    });
                    // Guarded debug log for FormData entries (production safe)
                    if (typeof formData.entries === 'function') {
                        for (_i = 0, _a = formData.entries(); _i < _a.length; _i++) {
                            _b = _a[_i], key = _b[0], value = _b[1];
                            console.log("FormData - ".concat(key, ":"), value);
                        }
                    }
                    return [4 /*yield*/, apiCall('/api/scans', {
                            method: 'POST',
                            body: formData,
                            requireAuth: true
                        })];
                case 1: return [2 /*return*/, _c.sent()];
                case 2:
                    error_1 = _c.sent();
                    console.error('Error uploading document:', error_1);
                    throw error_1;
                case 3: return [2 /*return*/];
            }
        });
    }); },
    // Get scan details
    getScan: function (scanId) { return __awaiter(void 0, void 0, void 0, function () {
        var error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, apiCall("/api/scans/".concat(scanId), {
                            requireAuth: true
                        })];
                case 1: return [2 /*return*/, _a.sent()];
                case 2:
                    error_2 = _a.sent();
                    console.error("Error fetching scan ".concat(scanId, ":"), error_2);
                    throw error_2;
                case 3: return [2 /*return*/];
            }
        });
    }); },
    // List user's scans
    getScans: function () { return __awaiter(void 0, void 0, void 0, function () {
        var error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, apiCall('/api/scans', {
                            requireAuth: true
                        })];
                case 1: return [2 /*return*/, _a.sent()];
                case 2:
                    error_3 = _a.sent();
                    console.error('Error fetching scans:', error_3);
                    throw error_3;
                case 3: return [2 /*return*/];
            }
        });
    }); },
    // Retry failed scan
    retryScan: function (scanId) { return __awaiter(void 0, void 0, void 0, function () {
        var error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, apiCall("/api/scans/".concat(scanId, "/retry"), {
                            method: 'POST',
                            requireAuth: true
                        })];
                case 1: return [2 /*return*/, _a.sent()];
                case 2:
                    error_4 = _a.sent();
                    console.error("Error retrying scan ".concat(scanId, ":"), error_4);
                    throw error_4;
                case 3: return [2 /*return*/];
            }
        });
    }); },
    // Delete scan
    deleteScan: function (scanId) { return __awaiter(void 0, void 0, void 0, function () {
        var error_5;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, apiCall("/api/scans/".concat(scanId), {
                            method: 'DELETE',
                            requireAuth: true
                        })];
                case 1: return [2 /*return*/, _a.sent()];
                case 2:
                    error_5 = _a.sent();
                    console.error("Error deleting scan ".concat(scanId, ":"), error_5);
                    throw error_5;
                case 3: return [2 /*return*/];
            }
        });
    }); },
    // Create project from scan
    createProjectFromScan: function (request) { return __awaiter(void 0, void 0, void 0, function () {
        var error_6;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, apiCall('/api/projects/from-scan', {
                            method: 'POST',
                            body: JSON.stringify(request),
                            requireAuth: true
                        })];
                case 1: return [2 /*return*/, _a.sent()];
                case 2:
                    error_6 = _a.sent();
                    console.error('Error creating project from scan:', error_6);
                    throw error_6;
                case 3: return [2 /*return*/];
            }
        });
    }); },
    // Import clauses to existing project
    importClauses: function (request) { return __awaiter(void 0, void 0, void 0, function () {
        var error_7;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, apiCall('/api/scans/import-clauses', {
                            method: 'POST',
                            body: JSON.stringify(request),
                            requireAuth: true
                        })];
                case 1: return [2 /*return*/, _a.sent()];
                case 2:
                    error_7 = _a.sent();
                    console.error('Error importing clauses:', error_7);
                    throw error_7;
                case 3: return [2 /*return*/];
            }
        });
    }); },
    // Update scan results (for user modifications)
    updateScanResults: function (scanId, modifications) { return __awaiter(void 0, void 0, void 0, function () {
        var error_8;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, apiCall("/api/scans/".concat(scanId, "/modifications"), {
                            method: 'PATCH',
                            body: JSON.stringify(modifications),
                            requireAuth: true
                        })];
                case 1: return [2 /*return*/, _a.sent()];
                case 2:
                    error_8 = _a.sent();
                    console.error("Error updating scan ".concat(scanId, ":"), error_8);
                    throw error_8;
                case 3: return [2 /*return*/];
            }
        });
    }); }
};
// SSE Connection Helper
var ScanSSEConnection = /** @class */ (function () {
    function ScanSSEConnection(scanId, onMessage, onError, onComplete) {
        this.scanId = scanId;
        this.onMessage = onMessage;
        this.onError = onError;
        this.onComplete = onComplete;
        this.eventSource = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        // Comprehensive scanId validation in constructor
        console.log('[SSE CONNECTION DEBUG] ScanSSEConnection constructor called with scanId:', scanId);
        if (!scanId) {
            console.error('[SSE CONNECTION DEBUG] Invalid scanId in constructor: scanId is falsy');
            throw new Error('Invalid scan ID provided to SSE connection: scanId is falsy');
        }
        if (typeof scanId !== 'string') {
            console.error('[SSE CONNECTION DEBUG] Invalid scanId in constructor: scanId is not a string:', typeof scanId);
            throw new Error('Invalid scan ID provided to SSE connection: scanId is not a string');
        }
        if (scanId === 'undefined' || scanId === 'null' || scanId.trim() === '') {
            console.error('[SSE CONNECTION DEBUG] Invalid scanId in constructor: scanId is invalid string:', scanId);
            throw new Error('Invalid scan ID provided to SSE connection: scanId is invalid string');
        }
        // Validate UUID format (basic check)
        var uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(scanId)) {
            console.warn('[SSE CONNECTION DEBUG] scanId does not match UUID format, but continuing:', scanId);
        }
        console.log('[SSE CONNECTION DEBUG] ScanSSEConnection created successfully with scanId:', scanId);
    }
    ScanSSEConnection.prototype.connect = function () {
        return __awaiter(this, void 0, void 0, function () {
            var session, e_1, token, getAuthToken, e_2, orgId, projectId, url, error_9;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 10, , 11]);
                        // Additional validation before connection
                        if (!this.scanId || this.scanId === 'undefined' || this.scanId === 'null') {
                            console.error('[SSE CONNECTION DEBUG] Cannot connect: Invalid scanId:', this.scanId);
                            throw new Error('Invalid scan ID for SSE connection');
                        }
                        console.log('[SSE CONNECTION DEBUG] Attempting to connect with scanId:', this.scanId);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, supabase.auth.getSession()];
                    case 2:
                        session = (_a.sent()).data.session;
                        console.log('[SSE CONNECTION DEBUG] Session before SSE connect:', session);
                        return [3 /*break*/, 4];
                    case 3:
                        e_1 = _a.sent();
                        console.warn('[SSE CONNECTION DEBUG] Could not log session before SSE connect:', e_1);
                        return [3 /*break*/, 4];
                    case 4:
                        token = null;
                        _a.label = 5;
                    case 5:
                        _a.trys.push([5, 8, , 9]);
                        return [4 /*yield*/, import('./api')];
                    case 6:
                        getAuthToken = (_a.sent()).getAuthToken;
                        return [4 /*yield*/, getAuthToken()];
                    case 7:
                        token = _a.sent();
                        console.log('[SSE CONNECTION DEBUG] Token source: getAuthToken()', token ? 'SUCCESS' : 'NULL');
                        return [3 /*break*/, 9];
                    case 8:
                        e_2 = _a.sent();
                        console.warn('[SSE CONNECTION DEBUG] getAuthToken() failed, falling back to localStorage:', e_2);
                        token = localStorage.getItem('supabase.auth.token');
                        console.log('[SSE CONNECTION DEBUG] Token source: localStorage', token ? 'SUCCESS' : 'NULL');
                        return [3 /*break*/, 9];
                    case 9:
                        orgId = localStorage.getItem('orgId');
                        projectId = localStorage.getItem('projectId');
                        console.log('[SSE CONNECTION DEBUG] Connection parameters:', {
                            scanId: this.scanId,
                            orgId: orgId,
                            projectId: projectId,
                            hasToken: !!token
                        });
                        url = "".concat(environment.api.url, "/api/scans/").concat(this.scanId, "/stream?token=").concat(encodeURIComponent(token !== null && token !== void 0 ? token : ''));
                        if (orgId) {
                            url += "&orgId=".concat(encodeURIComponent(orgId));
                        }
                        if (projectId) {
                            url += "&projectId=".concat(encodeURIComponent(projectId));
                        }
                        console.log('[SSE CONNECTION DEBUG] EventSource URL:', url);
                        console.log('[SSE CONNECTION DEBUG] URL validation - contains scanId:', url.includes(this.scanId));
                        console.log('[SSE CONNECTION DEBUG] URL validation - contains undefined:', url.includes('undefined'));
                        this.eventSource = new EventSource(url);
                        this.eventSource.onopen = function () {
                            console.log('[SSE CONNECTION DEBUG] SSE connection opened successfully for scanId:', _this.scanId);
                            _this.reconnectAttempts = 0;
                        };
                        this.eventSource.onmessage = function (event) {
                            try {
                                console.log('[SSE CONNECTION DEBUG] Raw SSE message received:', event.data);
                                var data = JSON.parse(event.data);
                                console.log('[SSE CONNECTION DEBUG] Parsed SSE message:', data);
                                _this.onMessage(data);
                                // Check if scan is complete
                                if (data.status === 'complete' || data.status === 'error') {
                                    console.log('[SSE CONNECTION DEBUG] Scan completed via SSE, status:', data.status);
                                    _this.onComplete();
                                    _this.disconnect();
                                }
                            }
                            catch (error) {
                                console.error('[SSE CONNECTION DEBUG] Error parsing SSE message:', error);
                                console.error('[SSE CONNECTION DEBUG] Raw message that failed to parse:', event.data);
                                _this.onError('Failed to parse progress update');
                            }
                        };
                        this.eventSource.onerror = function (error) {
                            var _a, _b;
                            console.error('[SSE CONNECTION DEBUG] SSE connection error for scanId:', _this.scanId, error);
                            console.error('[SSE CONNECTION DEBUG] Error details:', {
                                readyState: (_a = _this.eventSource) === null || _a === void 0 ? void 0 : _a.readyState,
                                url: (_b = _this.eventSource) === null || _b === void 0 ? void 0 : _b.url,
                                scanId: _this.scanId
                            });
                            if (_this.reconnectAttempts < _this.maxReconnectAttempts) {
                                _this.reconnectAttempts++;
                                var delay = _this.reconnectDelay * Math.pow(2, _this.reconnectAttempts - 1);
                                console.log("[SSE CONNECTION DEBUG] Attempting to reconnect (".concat(_this.reconnectAttempts, "/").concat(_this.maxReconnectAttempts, ") in ").concat(delay, "ms..."));
                                setTimeout(function () {
                                    _this.connect();
                                }, delay);
                            }
                            else {
                                console.error('[SSE CONNECTION DEBUG] Max reconnection attempts reached, giving up');
                                _this.onError('Connection lost. Please refresh the page to try again.');
                                _this.disconnect();
                            }
                        };
                        return [3 /*break*/, 11];
                    case 10:
                        error_9 = _a.sent();
                        console.error('Error creating SSE connection:', error_9);
                        this.onError('Failed to establish connection');
                        return [3 /*break*/, 11];
                    case 11: return [2 /*return*/];
                }
            });
        });
    };
    ScanSSEConnection.prototype.disconnect = function () {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
    };
    return ScanSSEConnection;
}());
export { ScanSSEConnection };
