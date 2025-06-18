var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { DEBUG_LOG } from '../config/debug';
var DebugErrorBoundary = /** @class */ (function (_super) {
    __extends(DebugErrorBoundary, _super);
    function DebugErrorBoundary(props) {
        var _this = _super.call(this, props) || this;
        _this.state = { error: null };
        return _this;
    }
    DebugErrorBoundary.getDerivedStateFromError = function (error) {
        return { error: error };
    };
    DebugErrorBoundary.prototype.componentDidCatch = function (error, info) {
        if (DEBUG_LOG) {
            // eslint-disable-next-line no-console
            console.error('[ReactErrorBoundary]', error, info.componentStack);
        }
    };
    DebugErrorBoundary.prototype.render = function () {
        var error = this.state.error;
        var children = this.props.children;
        if (error && DEBUG_LOG) {
            return (_jsxs("div", { style: { color: 'red', padding: 16 }, children: [_jsx("h2", { children: "Runtime error" }), _jsx("pre", { style: { whiteSpace: 'pre-wrap' }, children: error.message })] }));
        }
        return children;
    };
    return DebugErrorBoundary;
}(React.Component));
export { DebugErrorBoundary };
