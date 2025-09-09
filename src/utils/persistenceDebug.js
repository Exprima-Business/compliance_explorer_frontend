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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import { DEBUG_LOG } from "../config/debug";
// Development-only logger. Emits to console when VITE_DEBUG_LOG=1
export function dlog() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    /* eslint-disable no-console */
    if (DEBUG_LOG)
        console.log.apply(console, __spreadArray(["[DEBUG]"], args, false));
    /* eslint-enable no-console */
}
// Comprehensive persistence debugging utilities
export function logPersistenceState(context, additionalData) {
    if (additionalData === void 0) { additionalData = {}; }
    if (DEBUG_LOG) {
        console.log("[PERSISTENCE DEBUG] ".concat(context, ":"), __assign({ timestamp: new Date().toISOString(), localStorage: {
                currentScanId: localStorage.getItem("currentScanId"),
                scanStatus: localStorage.getItem("scanStatus"),
                allKeys: Object.keys(localStorage).filter(function (key) {
                    return key.includes("scan") || key.includes("current") || key.includes("auth");
                })
            }, urlState: {
                pathname: window.location.pathname,
                search: window.location.search,
                hash: window.location.hash
            } }, additionalData));
    }
}
export function logStateReconstruction(scanId, source, additionalData) {
    if (additionalData === void 0) { additionalData = {}; }
    if (DEBUG_LOG) {
        console.log("[STATE RECONSTRUCTION DEBUG] Attempting to load existing scan:", __assign({ scanId: scanId, source: source, timestamp: new Date().toISOString(), localStorageState: {
                currentScanId: localStorage.getItem("currentScanId"),
                scanStatus: localStorage.getItem("scanStatus"),
                allKeys: Object.keys(localStorage).filter(function (key) {
                    return key.includes("scan") || key.includes("current");
                })
            }, urlState: {
                pathname: window.location.pathname,
                search: window.location.search,
                hash: window.location.hash
            } }, additionalData));
    }
}
export function logCompletionHandling(scanId, status, additionalData) {
    if (additionalData === void 0) { additionalData = {}; }
    if (DEBUG_LOG) {
        console.log("[COMPLETION DEBUG] Scan completion handling:", __assign({ scanId: scanId, status: status, beforeLocalStorage: {
                currentScanId: localStorage.getItem("currentScanId"),
                scanStatus: localStorage.getItem("scanStatus")
            }, action: "about_to_clear_localStorage", timestamp: new Date().toISOString() }, additionalData));
    }
}
export function logNavigationFlow(context, additionalData) {
    if (additionalData === void 0) { additionalData = {}; }
    if (DEBUG_LOG) {
        console.log("[NAVIGATION DEBUG] ".concat(context, ":"), __assign({ timestamp: new Date().toISOString(), urlScanId: window.location.pathname.split("/").pop(), localStorageScanId: localStorage.getItem("currentScanId"), componentPath: window.location.pathname }, additionalData));
    }
}
export function logComponentLifecycle(trigger, additionalData) {
    if (additionalData === void 0) { additionalData = {}; }
    if (DEBUG_LOG) {
        console.log("[LIFECYCLE DEBUG] DocumentScanner useEffect triggered:", __assign({ trigger: trigger, urlScanId: window.location.pathname.split("/").pop(), localStorageScanId: localStorage.getItem("currentScanId"), currentPath: window.location.pathname, timestamp: new Date().toISOString() }, additionalData));
    }
}
export function logFullStateSnapshot(context) {
    if (DEBUG_LOG) {
        console.log("[FULL STATE SNAPSHOT] ".concat(context, ":"), {
            timestamp: new Date().toISOString(),
            localStorage: Object.keys(localStorage).reduce(function (acc, key) {
                acc[key] = localStorage.getItem(key);
                return acc;
            }, {}),
            urlParams: new URLSearchParams(window.location.search),
            pathname: window.location.pathname,
            componentState: {
                // These would need to be passed in from the component
                currentScan: "not_available",
                uploadState: "not_available"
            }
        });
    }
}
