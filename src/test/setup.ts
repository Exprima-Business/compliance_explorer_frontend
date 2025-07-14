import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
global.localStorage = localStorageMock as Storage;

// Mock EventSource
const EventSourceMock = vi.fn().mockImplementation(() => ({
  onopen: vi.fn(),
  onmessage: vi.fn(),
  onerror: vi.fn(),
  close: vi.fn(),
})) as any;

// Add static properties to the mock
EventSourceMock.CONNECTING = 0;
EventSourceMock.OPEN = 1;
EventSourceMock.CLOSED = 2;

global.EventSource = EventSourceMock;

// Mock fetch
global.fetch = vi.fn();

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}; 