import { DEBUG_LOG } from '../config/debug';

export function dlog(...args: any[]): void {
  if (DEBUG_LOG) {
    // eslint-disable-next-line no-console
    console.log('[DEBUG]', ...args);
  }
} 