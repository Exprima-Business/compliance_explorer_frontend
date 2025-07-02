import { DEBUG_LOG } from '../config/debug';

// Development-only logger. Emits to console when VITE_DEBUG_LOG=1
export function dlog(...args: any[]): void {
  /* eslint-disable no-console */
  if (DEBUG_LOG) console.log('[DEBUG]', ...args);
  /* eslint-enable no-console */
} 