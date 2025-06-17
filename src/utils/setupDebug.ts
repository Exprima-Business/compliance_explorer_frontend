import { DEBUG_LOG } from '../config/debug';

if (DEBUG_LOG && typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    // eslint-disable-next-line no-console
    console.error('[window.error]', e.message, e.error?.stack);
  });

  window.addEventListener('unhandledrejection', (e) => {
    // eslint-disable-next-line no-console
    console.error('[unhandledrejection]', e.reason);
  });
} 