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
import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { bookmarkService } from '../services/bookmarkService';
import { clauseService } from '../services/clauseService';
import { supabase } from '../lib/supabase';
import { useOrg } from './OrgContext';
import { useProject } from './ProjectContext';
import { dlog } from '../utils/debugLog';
var BookmarkContext = createContext(undefined);
// Connection management constants
var KEEP_ALIVE_INTERVAL = 30000; // 30 seconds
var MAX_RECONNECT_ATTEMPTS = 5;
var INITIAL_RECONNECT_DELAY = 1000; // 1 second
var MAX_RECONNECT_DELAY = 30000; // 30 seconds
export var BookmarkProvider = function (_a) {
    var children = _a.children;
    var currentOrg = useOrg().currentOrg;
    var currentProject = useProject().currentProject;
    var _b = useState([]), bookmarks = _b[0], setBookmarks = _b[1];
    var _c = useState(true), loading = _c[0], setLoading = _c[1];
    var _d = useState('disconnected'), connectionStatus = _d[0], setConnectionStatus = _d[1];
    var connectionStatusRef = useRef(connectionStatus);
    // Connection management refs
    var channelRef = useRef(null);
    var keepAliveIntervalRef = useRef(null);
    var reconnectTimeoutRef = useRef(null);
    var reconnectAttemptsRef = useRef(0);
    var isReconnectingRef = useRef(false);
    // keep ref in sync
    useEffect(function () {
        connectionStatusRef.current = connectionStatus;
    }, [connectionStatus]);
    var load = useCallback(function () { return __awaiter(void 0, void 0, void 0, function () {
        var list, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, 3, 4]);
                    setLoading(true);
                    if (!currentOrg || !currentProject)
                        return [2 /*return*/];
                    return [4 /*yield*/, bookmarkService.getBookmarks(currentOrg.id)];
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
    }); }, [currentOrg, currentProject]);
    useEffect(function () {
        load();
    }, [load]);
    // Cleanup function for connection management
    var cleanupConnection = useCallback(function () {
        dlog('Cleaning up connection resources');
        // Clear keep-alive interval
        if (keepAliveIntervalRef.current) {
            clearInterval(keepAliveIntervalRef.current);
            keepAliveIntervalRef.current = null;
        }
        // Clear reconnect timeout
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
        // Unsubscribe from channel
        if (channelRef.current) {
            channelRef.current
                .unsubscribe()
                .catch(function (err) {
                console.warn('BookmarkContext: failed to unsubscribe channel during cleanup', err);
                supabase.removeChannel(channelRef.current).catch(function () { });
            });
            channelRef.current = null;
        }
        isReconnectingRef.current = false;
        reconnectAttemptsRef.current = 0;
    }, []);
    // Keep-alive ping function
    var sendKeepAlive = useCallback(function () {
        if (channelRef.current && connectionStatusRef.current === 'connected') {
            dlog('Sending keep-alive ping');
            channelRef.current.send({
                type: 'broadcast',
                event: 'keep-alive',
                payload: { timestamp: Date.now() }
            }).catch(function (err) {
                console.warn('Keep-alive ping failed:', err);
                setConnectionStatus('error');
            });
        }
    }, []);
    // Reconnection logic with exponential backoff
    var attemptReconnect = useCallback(function () {
        if (isReconnectingRef.current || !currentOrg || !currentProject)
            return;
        if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
            dlog('Max reconnection attempts reached, giving up');
            setConnectionStatus('error');
            return;
        }
        isReconnectingRef.current = true;
        setConnectionStatus('connecting');
        var delay = Math.min(INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current), MAX_RECONNECT_DELAY);
        dlog("Attempting reconnection in ".concat(delay, "ms (attempt ").concat(reconnectAttemptsRef.current + 1, "/").concat(MAX_RECONNECT_ATTEMPTS, ")"));
        reconnectTimeoutRef.current = setTimeout(function () {
            reconnectAttemptsRef.current++;
            setupRealtimeSubscription();
        }, delay);
    }, [currentOrg, currentProject]);
    // Setup realtime subscription with connection monitoring
    var setupRealtimeSubscription = useCallback(function () {
        if (!currentOrg || !currentProject) {
            dlog('Cannot setup subscription: missing org or project');
            return;
        }
        // Cleanup existing connection
        cleanupConnection();
        dlog('Setting up realtime subscription for bookmarks');
        setConnectionStatus('connecting');
        // Subscribe to all row changes for this organisation
        var channel = supabase
            .channel('bookmarks-realtime')
            .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'bookmarks',
            filter: "organizationId=eq.".concat(currentOrg.id)
        }, function (payload) {
            // Backend's comprehensive payload logging
            console.log('=== REALTIME EVENT DEBUG ===');
            console.log('Event type:', payload.eventType);
            console.log('Table:', payload.table);
            console.log('Schema:', payload.schema);
            console.log('Commit timestamp:', payload.commit_timestamp);
            console.log('Event timestamp:', payload.event_timestamp);
            console.log('Errors:', payload.errors);
            console.log('Payload:', JSON.stringify(payload, null, 2));
            console.log('Payload keys:', Object.keys(payload));
            console.log('Payload type:', typeof payload);
            console.log('Payload length:', payload ? Object.keys(payload).length : 'null');
            // Specifically log the old/new objects for DELETE events
            if (payload.eventType === 'DELETE') {
                console.log('DELETE old object:', JSON.stringify(payload.old, null, 2));
                console.log('DELETE old object keys:', payload.old ? Object.keys(payload.old) : 'null');
                console.log('DELETE new object:', JSON.stringify(payload.new, null, 2));
                console.log('DELETE new object keys:', payload.new ? Object.keys(payload.new) : 'null');
            }
            console.log('=== END DEBUG ===');
            // Generic log for every event before any filtering – helps debug missing DELETEs
            dlog('RT payload', {
                eventType: payload.eventType,
                new: payload.new,
                old: payload.old,
                table: payload.table,
                filterOrg: currentOrg.id,
                filterProject: currentProject.id,
            });
            dlog('Bookmark realtime event received:', {
                eventType: payload.eventType,
                new: payload.new,
                old: payload.old,
                currentProject: currentProject.id,
                table: payload.table,
                schema: payload.schema,
                commit_timestamp: payload.commit_timestamp,
                errors: payload.errors
            });
            if (payload.eventType === 'INSERT') {
                var b_1 = payload.new;
                dlog('Processing INSERT event:', { bookmark: b_1, currentProject: currentProject.id });
                // Only process changes for the current project
                if (b_1.projectId !== currentProject.id) {
                    dlog('Skipping INSERT - wrong project:', { bookmarkProject: b_1.projectId, currentProject: currentProject.id });
                    return;
                }
                setBookmarks(function (prev) {
                    // avoid duplicates by checking both id and clauseId
                    var exists = prev.some(function (item) { return item.id === b_1.id || item.clauseId === b_1.clauseId; });
                    if (exists) {
                        dlog('Skipping INSERT - bookmark already exists:', { bookmarkId: b_1.id, clauseId: b_1.clauseId });
                        return prev;
                    }
                    dlog('Adding bookmark to state:', { bookmark: b_1, newCount: prev.length + 1 });
                    return __spreadArray(__spreadArray([], prev, true), [b_1], false);
                });
            }
            else if (payload.eventType === 'DELETE') {
                // Since we now handle UI updates immediately via API response,
                // DELETE events are mainly for multi-user synchronization
                // We can safely ignore them since the UI is already updated
                dlog('DELETE event received - UI already updated via API response, skipping');
                return;
            }
            else if (payload.eventType === 'UPDATE') {
                var b_2 = payload.new;
                dlog('Processing UPDATE event:', { bookmark: b_2, currentProject: currentProject.id });
                // Only process changes for the current project
                if (b_2.projectId !== currentProject.id) {
                    dlog('Skipping UPDATE - wrong project:', { bookmarkProject: b_2.projectId, currentProject: currentProject.id });
                    return;
                }
                setBookmarks(function (prev) { return prev.map(function (item) { return item.id === b_2.id ? b_2 : item; }); });
            }
            else {
                dlog('Unknown event type:', payload.eventType);
            }
        })
            .subscribe(function (status) {
            console.log('=== SUBSCRIPTION STATUS ===');
            console.log('Status:', status);
            console.log('Channel:', channel);
            console.log('=== END STATUS ===');
            dlog('Realtime subscription status:', status);
            if (status === 'SUBSCRIBED') {
                setConnectionStatus('connected');
                isReconnectingRef.current = false;
                reconnectAttemptsRef.current = 0;
                // Backend's subscription verification logging
                console.log('Realtime subscription established for bookmarks');
                // Start keep-alive ping
                keepAliveIntervalRef.current = setInterval(sendKeepAlive, KEEP_ALIVE_INTERVAL);
                dlog('Realtime subscription established, keep-alive started');
            }
            else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                setConnectionStatus('error');
                dlog('Realtime subscription error, attempting reconnection');
                attemptReconnect();
            }
            else if (status === 'CLOSED') {
                setConnectionStatus('disconnected');
                dlog('Realtime subscription closed');
            }
        });
        channelRef.current = channel;
    }, [currentOrg, currentProject, cleanupConnection, sendKeepAlive, attemptReconnect]);
    // ---------------------------------------------
    // Realtime subscription: keep bookmarks in sync
    // ---------------------------------------------
    useEffect(function () {
        setupRealtimeSubscription();
        // Cleanup on unmount
        return function () {
            cleanupConnection();
        };
    }, [setupRealtimeSubscription, cleanupConnection]);
    // Handle system events that can affect connection
    useEffect(function () {
        var handleVisibilityChange = function () {
            if (document.visibilityState === 'visible') {
                dlog('Page became visible, checking connection status');
                if (connectionStatus === 'disconnected' || connectionStatus === 'error') {
                    dlog('Reconnecting due to page visibility change');
                    attemptReconnect();
                }
            }
        };
        var handleOnline = function () {
            dlog('Network came online, checking connection status');
            if (connectionStatus === 'disconnected' || connectionStatus === 'error') {
                dlog('Reconnecting due to network online event');
                attemptReconnect();
            }
        };
        var handleFocus = function () {
            dlog('Window gained focus, checking connection status');
            if (connectionStatus === 'disconnected' || connectionStatus === 'error') {
                dlog('Reconnecting due to window focus event');
                attemptReconnect();
            }
        };
        // Add event listeners
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('online', handleOnline);
        window.addEventListener('focus', handleFocus);
        // Cleanup event listeners
        return function () {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('focus', handleFocus);
        };
    }, [connectionStatus, attemptReconnect]);
    var toggleBookmark = function (clauseId) { return __awaiter(void 0, void 0, void 0, function () {
        var resp, msg, _a, responseClauseId_1, isBookmarked, err_2;
        var _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (!currentProject) {
                        console.warn('toggleBookmark called without currentProject');
                        return [2 /*return*/];
                    }
                    dlog('toggleBookmark called:', {
                        clauseId: clauseId,
                        currentProject: currentProject.id,
                        currentOrg: currentOrg === null || currentOrg === void 0 ? void 0 : currentOrg.id
                    });
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, clauseService.bookmarkClause(clauseId)];
                case 2:
                    resp = _c.sent();
                    if (resp.error) {
                        msg = typeof resp.error === 'string' ? resp.error : resp.error.message;
                        throw new Error(msg);
                    }
                    dlog('API response received:', {
                        clauseId: clauseId,
                        response: resp.data,
                        isBookmarked: (_b = resp.data) === null || _b === void 0 ? void 0 : _b.isBookmarked
                    });
                    // ---------------------------------------------
                    // IMMEDIATE UI UPDATE USING API RESPONSE
                    // ---------------------------------------------
                    // Use the API response to update UI immediately, then let realtime events
                    // handle multi-user synchronization and verification
                    if (resp.data) {
                        _a = resp.data, responseClauseId_1 = _a.id, isBookmarked = _a.isBookmarked;
                        if (isBookmarked) {
                            // Add bookmark to state immediately
                            setBookmarks(function (prev) {
                                // Check if bookmark already exists
                                var exists = prev.some(function (item) { return item.clauseId === responseClauseId_1; });
                                if (exists) {
                                    dlog('Bookmark already exists in state, skipping add:', { clauseId: responseClauseId_1 });
                                    return prev;
                                }
                                // Create a minimal bookmark object for immediate UI update
                                var newBookmark = {
                                    id: '', // Will be filled by realtime event
                                    clauseId: responseClauseId_1,
                                    organizationId: (currentOrg === null || currentOrg === void 0 ? void 0 : currentOrg.id) || '',
                                    projectId: currentProject.id,
                                    createdAt: new Date().toISOString(),
                                    updatedAt: new Date().toISOString()
                                };
                                dlog('Adding bookmark to state immediately:', {
                                    clauseId: responseClauseId_1,
                                    newCount: prev.length + 1
                                });
                                return __spreadArray(__spreadArray([], prev, true), [newBookmark], false);
                            });
                        }
                        else {
                            // Remove bookmark from state immediately
                            setBookmarks(function (prev) {
                                var newState = prev.filter(function (item) { return item.clauseId !== responseClauseId_1; });
                                var removed = prev.length - newState.length;
                                dlog('Removing bookmark from state immediately:', {
                                    clauseId: responseClauseId_1,
                                    oldCount: prev.length,
                                    newCount: newState.length,
                                    removed: removed
                                });
                                return newState;
                            });
                        }
                    }
                    return [3 /*break*/, 4];
                case 3:
                    err_2 = _c.sent();
                    console.error('toggle bookmark failed', err_2);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    // Helper function to check if a clause is bookmarked
    var isClauseBookmarked = useCallback(function (clauseId) {
        return bookmarks.some(function (bookmark) { return bookmark.clauseId === clauseId; });
    }, [bookmarks]);
    var value = {
        bookmarks: bookmarks,
        loading: loading,
        toggleBookmark: toggleBookmark,
        connectionStatus: connectionStatus,
        isClauseBookmarked: isClauseBookmarked
    };
    return _jsx(BookmarkContext.Provider, { value: value, children: children });
};
export var useBookmarks = function () {
    var ctx = useContext(BookmarkContext);
    if (!ctx)
        throw new Error('useBookmarks must be within BookmarkProvider');
    return ctx;
};
