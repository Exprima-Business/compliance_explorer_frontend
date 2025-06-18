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
var ErrorFallbackBoundary = /** @class */ (function (_super) {
    __extends(ErrorFallbackBoundary, _super);
    function ErrorFallbackBoundary(props) {
        var _this = _super.call(this, props) || this;
        _this.state = { hasError: false, message: '' };
        return _this;
    }
    ErrorFallbackBoundary.getDerivedStateFromError = function (error) {
        return { hasError: true, message: error.message };
    };
    ErrorFallbackBoundary.prototype.componentDidCatch = function (error, info) {
        // Always log error to console
        console.error('[ErrorBoundary]', error, info.componentStack);
    };
    ErrorFallbackBoundary.prototype.render = function () {
        var _a = this.state, hasError = _a.hasError, message = _a.message;
        var children = this.props.children;
        if (hasError) {
            return (_jsxs("div", { style: { padding: '1rem', color: 'red' }, children: [_jsx("h2", { children: "Something went wrong while rendering this section." }), _jsx("pre", { style: { whiteSpace: 'pre-wrap' }, children: message })] }));
        }
        return children;
    };
    return ErrorFallbackBoundary;
}(React.Component));
export { ErrorFallbackBoundary };
