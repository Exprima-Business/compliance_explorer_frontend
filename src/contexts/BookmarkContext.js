var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
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
import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { bookmarkService } from '../services/bookmarkService';
import { clauseService } from '../services/clauseService';
import { supabase } from '../lib/supabase';
var BookmarkContext = createContext(undefined);
var DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000000';
export var BookmarkProvider = function (_a) {
    var children = _a.children;
    var _b = useState([]), bookmarks = _b[0], setBookmarks = _b[1];
    var _c = useState(true), loading = _c[0], setLoading = _c[1];
    var load = useCallback(function () { return __awaiter(void 0, void 0, void 0, function () {
        var list, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, 3, 4]);
                    setLoading(true);
                    return [4 /*yield*/, bookmarkService.getBookmarks(DEFAULT_ORG_ID)];
                case 1:
                    list = _a.sent();
                    setBookmarks(Array.isArray(list) ? list : []);
                    return [3 /*break*/, 4];
                case 2:
                    err_1 = _a.sent();
                    console.error('Failed to load bookmarks', err_1);
                    return [3 /*break*/, 4];
                case 3:
                    setLoading(false);
                    return [7 /*endfinally*/];
                case 4: return [2 /*return*/];
            }
        });
    }); }, []);
    useEffect(function () {
        load();
    }, [load]);
    // ---------------------------------------------
    // Realtime subscription: keep bookmarks in sync
    // ---------------------------------------------
    useEffect(function () {
        // Subscribe to all row changes for this organisation
        var channel = supabase
            .channel('bookmarks-realtime')
            .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'bookmarks',
            filter: "organizationId=eq.".concat(DEFAULT_ORG_ID)
        }, function (payload) {
            // We receive INSERT, UPDATE, DELETE events.
            if (payload.eventType === 'INSERT') {
                setBookmarks(function (prev) {
                    var b = payload.new;
                    // avoid duplicates if we already have it
                    return prev.some(function (item) { return item.id === b.id; }) ? prev : __spreadArray(__spreadArray([], prev, true), [b], false);
                });
            }
            else if (payload.eventType === 'DELETE') {
                setBookmarks(function (prev) { return prev.filter(function (b) { return b.id !== payload.old.id; }); });
            }
            else if (payload.eventType === 'UPDATE') {
                setBookmarks(function (prev) { return prev.map(function (b) { return b.id === payload.new.id ? payload.new : b; }); });
            }
        })
            .subscribe();
        // Cleanup on unmount
        return function () {
            supabase.removeChannel(channel);
        };
    }, []);
    var toggleBookmark = function (clauseId) { return __awaiter(void 0, void 0, void 0, function () {
        var resp_1, isBookmarked_1, err_2;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, clauseService.bookmarkClause(clauseId)];
                case 1:
                    resp_1 = _c.sent();
                    if (resp_1.error)
                        throw new Error(resp_1.error);
                    isBookmarked_1 = (_b = (_a = resp_1.data) === null || _a === void 0 ? void 0 : _a.isBookmarked) !== null && _b !== void 0 ? _b : false;
                    setBookmarks(function (prev) {
                        var exists = prev.find(function (b) { return b.clauseId === clauseId; });
                        if (isBookmarked_1) {
                            // add if not exists
                            if (!exists) {
                                return __spreadArray(__spreadArray([], prev, true), [
                                    { id: resp_1.data.id, clauseId: clauseId, organizationId: DEFAULT_ORG_ID, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
                                ], false);
                            }
                            return prev;
                        }
                        else {
                            // remove
                            return prev.filter(function (b) { return b.clauseId !== clauseId; });
                        }
                    });
                    return [3 /*break*/, 3];
                case 2:
                    err_2 = _c.sent();
                    console.error('toggle bookmark failed', err_2);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); };
    var value = { bookmarks: bookmarks, loading: loading, toggleBookmark: toggleBookmark };
    return _jsx(BookmarkContext.Provider, { value: value, children: children });
};
export var useBookmarks = function () {
    var ctx = useContext(BookmarkContext);
    if (!ctx)
        throw new Error('useBookmarks must be within BookmarkProvider');
    return ctx;
};
