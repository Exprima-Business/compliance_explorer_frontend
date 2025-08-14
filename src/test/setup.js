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
import '@testing-library/jest-dom';
import { vi } from 'vitest';
// Mock localStorage
var localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
};
global.localStorage = localStorageMock;
// Mock EventSource
var EventSourceMock = vi.fn().mockImplementation(function () { return ({
    onopen: vi.fn(),
    onmessage: vi.fn(),
    onerror: vi.fn(),
    close: vi.fn(),
}); });
// Add static properties to the mock
EventSourceMock.CONNECTING = 0;
EventSourceMock.OPEN = 1;
EventSourceMock.CLOSED = 2;
global.EventSource = EventSourceMock;
// Mock fetch
global.fetch = vi.fn();
// Mock console methods to reduce noise in tests
global.console = __assign(__assign({}, console), { log: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() });
