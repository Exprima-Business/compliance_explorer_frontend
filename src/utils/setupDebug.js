import { DEBUG_LOG } from '../config/debug';
if (DEBUG_LOG && typeof window !== 'undefined') {
    window.addEventListener('error', function (e) {
        var _a;
        // eslint-disable-next-line no-console
        console.error('[window.error]', e.message, (_a = e.error) === null || _a === void 0 ? void 0 : _a.stack);
    });
    window.addEventListener('unhandledrejection', function (e) {
        // eslint-disable-next-line no-console
        console.error('[unhandledrejection]', e.reason);
    });
}
