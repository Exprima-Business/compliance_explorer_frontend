var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import { DEBUG_LOG } from '../config/debug';
// Development-only logger. Emits to console when VITE_DEBUG_LOG=1
export function dlog() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    /* eslint-disable no-console */
    if (DEBUG_LOG)
        console.log.apply(console, __spreadArray(['[DEBUG]'], args, false));
    /* eslint-enable no-console */
}
