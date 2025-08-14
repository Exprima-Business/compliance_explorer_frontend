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
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scanApi, validateFile, handleScanError, ScanSSEConnection } from '../scanApi';
// Mock the apiCall function
vi.mock('../api', function () { return ({
    apiCall: vi.fn(),
}); });
describe('scanApi', function () {
    beforeEach(function () {
        vi.clearAllMocks();
        // Reset localStorage mock
        vi.mocked(localStorage.getItem).mockReturnValue('test-org-id');
    });
    describe('validateFile', function () {
        it('should validate PDF files', function () {
            var file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
            expect(function () { return validateFile(file); }).not.toThrow();
        });
        it('should validate DOCX files', function () {
            var file = new File(['test'], 'test.docx', {
                type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            });
            expect(function () { return validateFile(file); }).not.toThrow();
        });
        it('should validate Excel files', function () {
            var file = new File(['test'], 'test.xlsx', {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            expect(function () { return validateFile(file); }).not.toThrow();
        });
        it('should validate text files', function () {
            var file = new File(['test'], 'test.txt', { type: 'text/plain' });
            expect(function () { return validateFile(file); }).not.toThrow();
        });
        it('should reject unsupported file types', function () {
            var file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
            expect(function () { return validateFile(file); }).toThrow('Invalid file type');
        });
        it('should reject files larger than 25MB', function () {
            var file = new File(['x'.repeat(26 * 1024 * 1024)], 'large.txt', { type: 'text/plain' });
            expect(function () { return validateFile(file); }).toThrow('File size exceeds 25MB limit');
        });
    });
    describe('handleScanError', function () {
        it('should handle SCAN_PROCESSING_FAILED error', function () {
            var error = { code: 'SCAN_PROCESSING_FAILED' };
            var message = handleScanError(error);
            expect(message).toBe('Document processing failed. Please try again.');
        });
        it('should handle FILE_TOO_LARGE error', function () {
            var error = { code: 'FILE_TOO_LARGE' };
            var message = handleScanError(error);
            expect(message).toBe('File size exceeds 25MB limit.');
        });
        it('should handle UNSUPPORTED_FORMAT error', function () {
            var error = { code: 'UNSUPPORTED_FORMAT' };
            var message = handleScanError(error);
            expect(message).toBe('File format not supported. Please use PDF, Word, or text files.');
        });
        it('should handle API_QUOTA_EXCEEDED error', function () {
            var error = { code: 'API_QUOTA_EXCEEDED' };
            var message = handleScanError(error);
            expect(message).toBe('API quota exceeded. Please try again later.');
        });
        it('should handle NETWORK_ERROR error', function () {
            var error = { code: 'NETWORK_ERROR' };
            var message = handleScanError(error);
            expect(message).toBe('Network error. Please check your connection and try again.');
        });
        it('should handle AUTHENTICATION_ERROR error', function () {
            var error = { code: 'AUTHENTICATION_ERROR' };
            var message = handleScanError(error);
            expect(message).toBe('Authentication required. Please sign in and try again.');
        });
        it('should handle unknown errors', function () {
            var error = { code: 'UNKNOWN_ERROR' };
            var message = handleScanError(error);
            expect(message).toBe('An unexpected error occurred. Please try again.');
        });
    });
    describe('uploadDocument', function () {
        it('should upload document successfully', function () { return __awaiter(void 0, void 0, void 0, function () {
            var apiCall, mockResponse, file, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, import('../api')];
                    case 1:
                        apiCall = (_a.sent()).apiCall;
                        mockResponse = {
                            data: {
                                scanId: 'test-scan-id',
                                status: 'processing',
                                estimatedTime: 300,
                                sseUrl: '/api/scans/test-scan-id/stream'
                            },
                            error: null
                        };
                        vi.mocked(apiCall).mockResolvedValue(mockResponse);
                        file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
                        return [4 /*yield*/, scanApi.uploadDocument(file, 'test-org-id')];
                    case 2:
                        result = _a.sent();
                        expect(result).toEqual(mockResponse);
                        expect(apiCall).toHaveBeenCalledWith('/api/scans', {
                            method: 'POST',
                            body: expect.any(FormData),
                            requireAuth: true,
                            headers: {
                                'Content-Type': undefined
                            }
                        });
                        return [2 /*return*/];
                }
            });
        }); });
        it('should throw error for invalid file', function () { return __awaiter(void 0, void 0, void 0, function () {
            var file;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
                        return [4 /*yield*/, expect(scanApi.uploadDocument(file, 'test-org-id')).rejects.toThrow('Invalid file type')];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('getScan', function () {
        it('should fetch scan details successfully', function () { return __awaiter(void 0, void 0, void 0, function () {
            var apiCall, mockResponse, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, import('../api')];
                    case 1:
                        apiCall = (_a.sent()).apiCall;
                        mockResponse = {
                            data: {
                                id: 'test-scan-id',
                                status: 'complete',
                                results: []
                            },
                            error: null
                        };
                        vi.mocked(apiCall).mockResolvedValue(mockResponse);
                        return [4 /*yield*/, scanApi.getScan('test-scan-id')];
                    case 2:
                        result = _a.sent();
                        expect(result).toEqual(mockResponse);
                        expect(apiCall).toHaveBeenCalledWith('/api/scans/test-scan-id', {
                            requireAuth: true
                        });
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('retryScan', function () {
        it('should retry scan successfully', function () { return __awaiter(void 0, void 0, void 0, function () {
            var apiCall, mockResponse, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, import('../api')];
                    case 1:
                        apiCall = (_a.sent()).apiCall;
                        mockResponse = {
                            data: {
                                scanId: 'test-scan-id',
                                status: 'processing'
                            },
                            error: null
                        };
                        vi.mocked(apiCall).mockResolvedValue(mockResponse);
                        return [4 /*yield*/, scanApi.retryScan('test-scan-id')];
                    case 2:
                        result = _a.sent();
                        expect(result).toEqual(mockResponse);
                        expect(apiCall).toHaveBeenCalledWith('/api/scans/test-scan-id/retry', {
                            method: 'POST',
                            requireAuth: true
                        });
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('deleteScan', function () {
        it('should delete scan successfully', function () { return __awaiter(void 0, void 0, void 0, function () {
            var apiCall, mockResponse, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, import('../api')];
                    case 1:
                        apiCall = (_a.sent()).apiCall;
                        mockResponse = {
                            data: null,
                            error: null
                        };
                        vi.mocked(apiCall).mockResolvedValue(mockResponse);
                        return [4 /*yield*/, scanApi.deleteScan('test-scan-id')];
                    case 2:
                        result = _a.sent();
                        expect(result).toEqual(mockResponse);
                        expect(apiCall).toHaveBeenCalledWith('/api/scans/test-scan-id', {
                            method: 'DELETE',
                            requireAuth: true
                        });
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('createProjectFromScan', function () {
        it('should create project from scan successfully', function () { return __awaiter(void 0, void 0, void 0, function () {
            var apiCall, mockResponse, request, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, import('../api')];
                    case 1:
                        apiCall = (_a.sent()).apiCall;
                        mockResponse = {
                            data: { projectId: 'test-project-id' },
                            error: null
                        };
                        vi.mocked(apiCall).mockResolvedValue(mockResponse);
                        request = {
                            scanId: 'test-scan-id',
                            projectName: 'Test Project',
                            selectedClauses: ['clause1', 'clause2'],
                            organizationId: 'test-org-id'
                        };
                        return [4 /*yield*/, scanApi.createProjectFromScan(request)];
                    case 2:
                        result = _a.sent();
                        expect(result).toEqual(mockResponse);
                        expect(apiCall).toHaveBeenCalledWith('/api/projects/from-scan', {
                            method: 'POST',
                            body: JSON.stringify(request),
                            requireAuth: true
                        });
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('importClauses', function () {
        it('should import clauses successfully', function () { return __awaiter(void 0, void 0, void 0, function () {
            var apiCall, mockResponse, request, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, import('../api')];
                    case 1:
                        apiCall = (_a.sent()).apiCall;
                        mockResponse = {
                            data: { success: true },
                            error: null
                        };
                        vi.mocked(apiCall).mockResolvedValue(mockResponse);
                        request = {
                            scanId: 'test-scan-id',
                            projectId: 'test-project-id',
                            selectedClauses: ['clause1', 'clause2']
                        };
                        return [4 /*yield*/, scanApi.importClauses(request)];
                    case 2:
                        result = _a.sent();
                        expect(result).toEqual(mockResponse);
                        expect(apiCall).toHaveBeenCalledWith('/api/scans/import-clauses', {
                            method: 'POST',
                            body: JSON.stringify(request),
                            requireAuth: true
                        });
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('updateScanResults', function () {
        it('should update scan results successfully', function () { return __awaiter(void 0, void 0, void 0, function () {
            var apiCall, mockResponse, modifications, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, import('../api')];
                    case 1:
                        apiCall = (_a.sent()).apiCall;
                        mockResponse = {
                            data: null,
                            error: null
                        };
                        vi.mocked(apiCall).mockResolvedValue(mockResponse);
                        modifications = {
                            notes: 'Test notes',
                            selectedClauses: ['clause1'],
                            customTags: ['tag1']
                        };
                        return [4 /*yield*/, scanApi.updateScanResults('test-scan-id', modifications)];
                    case 2:
                        result = _a.sent();
                        expect(result).toEqual(mockResponse);
                        expect(apiCall).toHaveBeenCalledWith('/api/scans/test-scan-id/modifications', {
                            method: 'PATCH',
                            body: JSON.stringify(modifications),
                            requireAuth: true
                        });
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
describe('ScanSSEConnection', function () {
    var sseConnection;
    var mockOnMessage = vi.fn();
    var mockOnError = vi.fn();
    var mockOnComplete = vi.fn();
    beforeEach(function () {
        vi.clearAllMocks();
        sseConnection = new ScanSSEConnection('test-scan-id', mockOnMessage, mockOnError, mockOnComplete);
    });
    it('should create EventSource with correct URL', function () {
        sseConnection.connect();
        expect(global.EventSource).toHaveBeenCalledWith(expect.stringContaining('/api/scans/test-scan-id/stream'));
    });
    it('should handle connection open', function () {
        var _a;
        var mockEventSource = vi.mocked(global.EventSource).mock.results[0].value;
        sseConnection.connect();
        // Simulate connection open
        (_a = mockEventSource.onopen) === null || _a === void 0 ? void 0 : _a.call(mockEventSource);
        expect(mockEventSource.onopen).toBeDefined();
    });
    it('should handle messages', function () {
        var _a;
        var mockEventSource = vi.mocked(global.EventSource).mock.results[0].value;
        sseConnection.connect();
        // Simulate message
        var testData = { type: 'progress', data: { status: 'processing' } };
        (_a = mockEventSource.onmessage) === null || _a === void 0 ? void 0 : _a.call(mockEventSource, { data: JSON.stringify(testData) });
        expect(mockOnMessage).toHaveBeenCalledWith(testData);
    });
    it('should handle errors', function () {
        var _a;
        var mockEventSource = vi.mocked(global.EventSource).mock.results[0].value;
        sseConnection.connect();
        // Simulate error
        (_a = mockEventSource.onerror) === null || _a === void 0 ? void 0 : _a.call(mockEventSource, new Event('error'));
        expect(mockOnError).toHaveBeenCalled();
    });
    it('should disconnect properly', function () {
        var mockEventSource = vi.mocked(global.EventSource).mock.results[0].value;
        sseConnection.connect();
        sseConnection.disconnect();
        expect(mockEventSource.close).toHaveBeenCalled();
    });
});
