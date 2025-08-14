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
import { dlog } from './debugLog';
export var DEFAULT_CONNECTION_CONFIG = {
    keepAliveInterval: 30000, // 30 seconds
    maxReconnectAttempts: 5,
    initialReconnectDelay: 1000, // 1 second
    maxReconnectDelay: 30000, // 30 seconds
    enableKeepAlive: true,
    enableSystemEvents: true
};
var ConnectionMonitor = /** @class */ (function () {
    function ConnectionMonitor(config) {
        if (config === void 0) { config = {}; }
        this.eventListeners = new Map();
        this.config = __assign(__assign({}, DEFAULT_CONNECTION_CONFIG), config);
        this.state = {
            status: 'disconnected',
            reconnectAttempts: 0,
            isReconnecting: false
        };
    }
    ConnectionMonitor.prototype.getState = function () {
        return __assign({}, this.state);
    };
    ConnectionMonitor.prototype.getStatus = function () {
        return this.state.status;
    };
    ConnectionMonitor.prototype.onStatusChange = function (callback) {
        var _this = this;
        var listener = function () { return callback(_this.state.status); };
        this.eventListeners.set("status_".concat(Date.now()), listener);
        return function () {
            _this.eventListeners.delete("status_".concat(Date.now()));
        };
    };
    ConnectionMonitor.prototype.setStatus = function (status, error) {
        var previousStatus = this.state.status;
        this.state.status = status;
        if (status === 'connected') {
            this.state.lastConnected = new Date();
            this.state.reconnectAttempts = 0;
            this.state.isReconnecting = false;
            this.state.lastError = undefined;
            this.startKeepAlive();
        }
        else if (status === 'error') {
            this.state.lastError = error;
            this.stopKeepAlive();
        }
        else if (status === 'disconnected') {
            this.stopKeepAlive();
        }
        dlog('Connection status changed:', {
            from: previousStatus,
            to: status,
            error: error,
            reconnectAttempts: this.state.reconnectAttempts
        });
        // Notify listeners
        this.eventListeners.forEach(function (listener) { return listener(); });
    };
    ConnectionMonitor.prototype.startKeepAlive = function () {
        var _this = this;
        if (!this.config.enableKeepAlive)
            return;
        this.stopKeepAlive();
        this.keepAliveInterval = setInterval(function () {
            dlog('Sending keep-alive ping');
            _this.sendKeepAlive();
        }, this.config.keepAliveInterval);
        dlog('Keep-alive started with interval:', this.config.keepAliveInterval);
    };
    ConnectionMonitor.prototype.stopKeepAlive = function () {
        if (this.keepAliveInterval) {
            clearInterval(this.keepAliveInterval);
            this.keepAliveInterval = undefined;
            dlog('Keep-alive stopped');
        }
    };
    ConnectionMonitor.prototype.sendKeepAlive = function () {
        // This should be implemented by the specific connection handler
        // (e.g., Supabase channel)
        dlog('Keep-alive ping sent');
    };
    ConnectionMonitor.prototype.attemptReconnect = function () {
        var _this = this;
        if (this.state.isReconnecting) {
            dlog('Reconnection already in progress, skipping');
            return false;
        }
        if (this.state.reconnectAttempts >= this.config.maxReconnectAttempts) {
            dlog('Max reconnection attempts reached, giving up');
            this.setStatus('error', 'Max reconnection attempts reached');
            return false;
        }
        this.state.isReconnecting = true;
        this.state.reconnectAttempts++;
        var delay = Math.min(this.config.initialReconnectDelay * Math.pow(2, this.state.reconnectAttempts - 1), this.config.maxReconnectDelay);
        dlog("Scheduling reconnection attempt ".concat(this.state.reconnectAttempts, "/").concat(this.config.maxReconnectAttempts, " in ").concat(delay, "ms"));
        this.reconnectTimeout = setTimeout(function () {
            _this.state.isReconnecting = false;
            _this.setStatus('connecting');
            // The actual reconnection logic should be implemented by the caller
        }, delay);
        return true;
    };
    ConnectionMonitor.prototype.cancelReconnect = function () {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = undefined;
            this.state.isReconnecting = false;
            dlog('Reconnection cancelled');
        }
    };
    ConnectionMonitor.prototype.setupSystemEvents = function () {
        var _this = this;
        if (!this.config.enableSystemEvents)
            return;
        var handleVisibilityChange = function () {
            if (document.visibilityState === 'visible') {
                dlog('Page became visible, checking connection');
                _this.handleSystemEvent('visibility_change');
            }
        };
        var handleOnline = function () {
            dlog('Network came online');
            _this.handleSystemEvent('online');
        };
        var handleFocus = function () {
            dlog('Window gained focus');
            _this.handleSystemEvent('focus');
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('online', handleOnline);
        window.addEventListener('focus', handleFocus);
        dlog('System event listeners attached');
    };
    ConnectionMonitor.prototype.cleanup = function () {
        this.stopKeepAlive();
        this.cancelReconnect();
        // Remove system event listeners
        document.removeEventListener('visibilitychange', function () { });
        window.removeEventListener('online', function () { });
        window.removeEventListener('focus', function () { });
        this.eventListeners.clear();
        dlog('Connection monitor cleaned up');
    };
    ConnectionMonitor.prototype.handleSystemEvent = function (eventType) {
        if (this.state.status === 'disconnected' || this.state.status === 'error') {
            dlog("Reconnecting due to system event: ".concat(eventType));
            this.attemptReconnect();
        }
    };
    return ConnectionMonitor;
}());
export { ConnectionMonitor };
// Export a singleton instance for global use
export var globalConnectionMonitor = new ConnectionMonitor();
