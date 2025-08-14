import { useState, useEffect, useCallback } from 'react';
import { ConnectionMonitor } from '../utils/connectionMonitor';
export var useConnectionMonitor = function (options) {
    if (options === void 0) { options = {}; }
    var _a = options.monitor, monitor = _a === void 0 ? new ConnectionMonitor() : _a, _b = options.autoSetup, autoSetup = _b === void 0 ? true : _b;
    var _c = useState(monitor.getStatus()), status = _c[0], setStatus = _c[1];
    var _d = useState(monitor.getState()), state = _d[0], setState = _d[1];
    useEffect(function () {
        // Subscribe to status changes
        var unsubscribe = monitor.onStatusChange(function (newStatus) {
            setStatus(newStatus);
            setState(monitor.getState());
        });
        // Setup system events if autoSetup is enabled
        if (autoSetup) {
            monitor.setupSystemEvents();
        }
        return function () {
            unsubscribe();
            if (autoSetup) {
                monitor.cleanup();
            }
        };
    }, [monitor, autoSetup]);
    var attemptReconnect = useCallback(function () {
        return monitor.attemptReconnect();
    }, [monitor]);
    var cancelReconnect = useCallback(function () {
        monitor.cancelReconnect();
    }, [monitor]);
    var setStatusManually = useCallback(function (newStatus, error) {
        monitor.setStatus(newStatus, error);
    }, [monitor]);
    return {
        status: status,
        state: state,
        attemptReconnect: attemptReconnect,
        cancelReconnect: cancelReconnect,
        setStatus: setStatusManually,
        monitor: monitor
    };
};
