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
import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState, useEffect } from 'react';
var PreferencesContext = createContext(undefined);
var STORAGE_KEY = 'clauseAtlas_preferences';
var defaultPreferences = {
    removeParentWithChild: null, // null = ask each time, true = always remove, false = never remove
    autoBookmarkParents: true, // automatically bookmark parent clauses when child is bookmarked
};
export var PreferencesProvider = function (_a) {
    var children = _a.children;
    var _b = useState(defaultPreferences), preferences = _b[0], setPreferences = _b[1];
    // Load preferences from localStorage on mount
    useEffect(function () {
        try {
            var stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                var parsed = JSON.parse(stored);
                setPreferences(__assign(__assign({}, defaultPreferences), parsed));
            }
        }
        catch (error) {
            console.error('Failed to load preferences:', error);
        }
    }, []);
    // Save preferences to localStorage whenever they change
    useEffect(function () {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
        }
        catch (error) {
            console.error('Failed to save preferences:', error);
        }
    }, [preferences]);
    var updatePreference = function (key, value) {
        setPreferences(function (prev) {
            var _a;
            return (__assign(__assign({}, prev), (_a = {}, _a[key] = value, _a)));
        });
    };
    var value = {
        preferences: preferences,
        updatePreference: updatePreference
    };
    return (_jsx(PreferencesContext.Provider, { value: value, children: children }));
};
export var usePreferences = function () {
    var context = useContext(PreferencesContext);
    if (context === undefined) {
        throw new Error('usePreferences must be used within a PreferencesProvider');
    }
    return context;
};
