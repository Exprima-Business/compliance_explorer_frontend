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
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import { ClauseGraphD3 as ClauseGraph } from '../components/ClauseGraphD3';
import { FloatingPanel } from '../components/FloatingPanel';
import { useClause } from '../contexts/ClauseContext';
import { useBookmarks } from '../contexts/BookmarkContext';
import { useAuth } from '../hooks/useAuth';
import { clauseService } from '../services/clauseService';
import { dlog } from '../utils/debugLog';
var Home = function () {
    var _a = useClause(), clauses = _a.clauses, searchQuery = _a.searchQuery, loading = _a.loading, error = _a.error;
    var _b = useBookmarks(), bookmarks = _b.bookmarks, toggleBookmark = _b.toggleBookmark, isClauseBookmarked = _b.isClauseBookmarked;
    var _c = useAuth(), isAuthenticated = _c.isAuthenticated, authLoading = _c.loading;
    // Track render count for debugging
    var renderCountRef = React.useRef(0);
    renderCountRef.current += 1;
    dlog('Home: Component render count', {
        component: 'Home',
        renderCount: renderCountRef.current,
        timestamp: Date.now(),
        clausesLength: clauses.length,
        isAuthenticated: isAuthenticated,
        authLoading: authLoading
    });
    var _d = React.useState({
        open: false,
        message: '',
        severity: 'success'
    }), snackbar = _d[0], setSnackbar = _d[1];
    var _e = React.useState(null), activeClause = _e[0], setActiveClause = _e[1];
    // Auth state stabilization - only proceed when auth is fully loaded
    var authStable = React.useMemo(function () {
        return !authLoading && isAuthenticated;
    }, [authLoading, isAuthenticated]);
    var searchLower = searchQuery.toLowerCase();
    var filtered = clauses.filter(function (clause) {
        var _a;
        if (!clause)
            return false;
        if (!searchLower)
            return true;
        return (((_a = clause.title) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(searchLower)) ||
            (clause.clauseCode || '').toLowerCase().includes(searchLower));
    });
    var bookmarkedSet = React.useMemo(function () { return new Set(bookmarks.map(function (b) { return b.clauseId; })); }, [bookmarks]);
    // ------------------------------------------------------------------
    // Fetch relationship links with stable authentication check
    // ------------------------------------------------------------------
    var _f = React.useState([]), remoteLinks = _f[0], setRemoteLinks = _f[1];
    var _g = React.useState(true), linksLoading = _g[0], setLinksLoading = _g[1];
    var hasFetchedRef = React.useRef(false);
    var persistedLinksRef = React.useRef([]);
    // Persist links in ref to prevent loss during re-renders
    React.useEffect(function () {
        if (remoteLinks.length > 0) {
            persistedLinksRef.current = remoteLinks;
            dlog('Home: Links persisted to ref', { count: remoteLinks.length });
        }
    }, [remoteLinks]);
    // Use persisted links if current links are empty but we have persisted data
    var effectiveLinks = remoteLinks.length > 0 ? remoteLinks : persistedLinksRef.current;
    React.useEffect(function () {
        if (!authStable) {
            setLinksLoading(false);
            return;
        }
        // Only fetch once when auth becomes stable
        if (hasFetchedRef.current) {
            dlog('Home: Skipping graph links fetch - already fetched', { hasFetched: hasFetchedRef.current });
            return;
        }
        hasFetchedRef.current = true;
        setLinksLoading(true);
        dlog('Home: Starting graph links fetch', { authStable: authStable, hasFetched: hasFetchedRef.current });
        (function () { return __awaiter(void 0, void 0, void 0, function () {
            var resp, err_1;
            var _a, _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        _e.trys.push([0, 2, 3, 4]);
                        return [4 /*yield*/, clauseService.getGraphData()];
                    case 1:
                        resp = _e.sent();
                        dlog('Home: Graph links API response received', {
                            hasError: !!resp.error,
                            hasData: !!resp.data,
                            linksLength: ((_b = (_a = resp.data) === null || _a === void 0 ? void 0 : _a.links) === null || _b === void 0 ? void 0 : _b.length) || 0,
                            sampleLinks: ((_d = (_c = resp.data) === null || _c === void 0 ? void 0 : _c.links) === null || _d === void 0 ? void 0 : _d.slice(0, 3)) || []
                        });
                        if (!resp.error && resp.data && Array.isArray(resp.data.links)) {
                            setRemoteLinks(resp.data.links);
                            dlog('Home: Graph links loaded successfully', { count: resp.data.links.length });
                        }
                        else {
                            console.warn('graphData fetch error', resp.error);
                            setRemoteLinks([]);
                        }
                        return [3 /*break*/, 4];
                    case 2:
                        err_1 = _e.sent();
                        console.error('Failed to fetch graph links', err_1);
                        setRemoteLinks([]);
                        return [3 /*break*/, 4];
                    case 3:
                        setLinksLoading(false);
                        return [7 /*endfinally*/];
                    case 4: return [2 /*return*/];
                }
            });
        }); })();
    }, [authStable]); // Only re-fetch when auth is stable
    // Debug remoteLinks state changes
    React.useEffect(function () {
        dlog('Home: remoteLinks state changed', {
            linksLength: remoteLinks.length,
            sampleLinks: remoteLinks.slice(0, 3),
            timestamp: Date.now()
        });
    }, [remoteLinks]);
    // Reset fetch flag when auth becomes unstable
    React.useEffect(function () {
        if (!authStable) {
            hasFetchedRef.current = false;
        }
    }, [authStable]);
    // Debug: Track component re-render triggers
    React.useEffect(function () {
        var _a;
        dlog('Home: Component re-render triggered', {
            filteredLength: filtered.length,
            effectiveLinksLength: effectiveLinks.length,
            authStable: authStable,
            linksLoading: linksLoading,
            stack: (_a = new Error().stack) === null || _a === void 0 ? void 0 : _a.split('\n').slice(1, 4).join('\n')
        });
    }, [filtered, effectiveLinks, authStable, linksLoading]);
    var graphData = React.useMemo(function () {
        var _a;
        if (!authStable || linksLoading) {
            dlog('Home: Returning empty graph data', { authStable: authStable, linksLoading: linksLoading });
            return { nodes: [], links: [] };
        }
        // Don't create graph data if we have no clauses (nodes)
        if (filtered.length === 0) {
            dlog('Home: No clauses available for graph data', { filteredLength: filtered.length });
            return { nodes: [], links: [] };
        }
        // Don't create graph data if we have no links
        if (effectiveLinks.length === 0) {
            dlog('Home: No links available for graph data', { effectiveLinksLength: effectiveLinks.length });
            return { nodes: [], links: [] };
        }
        // Build nodes from currently filtered clauses
        var nodes = filtered.map(function (clause) {
            var _a;
            return ({
                id: clause.id || '',
                name: clause.title || 'Untitled Clause',
                clauseId: clause.clauseCode || '',
                title: clause.title || '',
                riskClassification: clause.riskClassification || 'UNKNOWN',
                category: clause.category || '',
                family: (_a = clause.family) !== null && _a !== void 0 ? _a : undefined,
                val: 1,
                isBookmarked: isClauseBookmarked(clause.id),
                color: bookmarkedSet.has(clause.id) ? '#FFD700' : undefined
            });
        });
        // Debug: Log sample node IDs and link IDs to identify mismatch
        var nodeIds = new Set(nodes.map(function (n) { return n.id; }));
        var sampleNodeIds = Array.from(nodeIds).slice(0, 3);
        var sampleLinkIds = effectiveLinks.slice(0, 3).map(function (link) { return ({
            source: link.source,
            target: link.target
        }); });
        dlog('Home: ID format analysis', {
            nodeIdsCount: nodeIds.size,
            sampleNodeIds: sampleNodeIds,
            sampleLinkIds: sampleLinkIds,
            nodeIdType: typeof sampleNodeIds[0],
            linkSourceType: typeof ((_a = sampleLinkIds[0]) === null || _a === void 0 ? void 0 : _a.source)
        });
        // Filter links to only include those where both source and target nodes exist
        var validLinks = effectiveLinks.filter(function (link) {
            // Handle D3.js object transformation - source/target can be objects or strings
            var sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            var targetId = typeof link.target === 'object' ? link.target.id : link.target;
            var isValid = sourceId && targetId && nodeIds.has(sourceId) && nodeIds.has(targetId);
            if (!isValid) {
                dlog('Home: Filtering out invalid link', {
                    link: link,
                    sourceId: sourceId,
                    targetId: targetId,
                    hasSource: !!sourceId,
                    hasTarget: !!targetId,
                    sourceInNodes: nodeIds.has(sourceId),
                    targetInNodes: nodeIds.has(targetId),
                    sourceType: typeof link.source,
                    targetType: typeof link.target,
                    nodeIds: Array.from(nodeIds)
                });
            }
            return isValid;
        });
        dlog('Home: Graph data created', {
            nodesLength: nodes.length,
            remoteLinksLength: effectiveLinks.length,
            validLinksLength: validLinks.length,
            filteredOut: effectiveLinks.length - validLinks.length,
            nodeIds: Array.from(nodeIds),
            sampleLinks: effectiveLinks.slice(0, 3)
        });
        return { nodes: nodes, links: validLinks };
    }, [filtered, bookmarkedSet, effectiveLinks, authStable, linksLoading]);
    // ------------------------------------------------------------------
    // DEBUG: Log the graph data size and a sample of the links
    // ------------------------------------------------------------------
    React.useEffect(function () {
        if (process.env.NODE_ENV !== 'production') {
            dlog('GRAPH-DEBUG', {
                nodes: graphData.nodes.length,
                links: graphData.links.length,
                authenticated: isAuthenticated,
                authLoading: authLoading,
                authStable: authStable,
                linksLoading: linksLoading
            }, graphData.links.slice(0, 5));
        }
    }, [graphData, isAuthenticated, authLoading, authStable, linksLoading]);
    var handleNodeClick = function (node) {
        var clause = clauses.find(function (c) { return c.id === node.id; });
        if (clause) {
            setActiveClause(clause);
        }
    };
    // Show loading state while auth is loading or graph data is loading
    if (authLoading || linksLoading) {
        dlog('Home: Showing loading state', { loading: loading, authLoading: authLoading, linksLoading: linksLoading });
        return (_jsxs(Box, { sx: {
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                height: 'calc(100vh - 64px)',
                gap: 2
            }, children: [_jsx(CircularProgress, { size: 60 }), _jsx(Typography, { variant: "h6", color: "text.secondary", children: authLoading ? 'Initializing...' : linksLoading ? 'Loading graph data...' : 'Loading...' })] }));
    }
    if (error) {
        dlog('Home: Showing error state', { error: error });
        return (_jsx(Box, { sx: { p: 3 }, children: _jsx(Alert, { severity: "error", children: error }) }));
    }
    // Show empty state if not authenticated
    if (!authStable) {
        dlog('Home: Showing not authenticated state', { authStable: authStable, isAuthenticated: isAuthenticated, authLoading: authLoading });
        return (_jsx(Box, { sx: {
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: 'calc(100vh - 64px)'
            }, children: _jsx(Typography, { variant: "h6", color: "text.secondary", children: "Please log in to view the graph" }) }));
    }
    // Show loading only for initial clause loading, not for graph data
    if (loading && clauses.length === 0) {
        dlog('Home: Showing initial loading state', { loading: loading, clausesLength: clauses.length });
        return (_jsxs(Box, { sx: {
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                height: 'calc(100vh - 64px)',
                gap: 2
            }, children: [_jsx(CircularProgress, { size: 60 }), _jsx(Typography, { variant: "h6", color: "text.secondary", children: "Loading clauses..." })] }));
    }
    dlog('Home: Rendering graph', {
        nodes: graphData.nodes.length,
        links: graphData.links.length,
        authStable: authStable,
        isAuthenticated: isAuthenticated,
        authLoading: authLoading,
        linksLoading: linksLoading,
        loading: loading,
        clausesLength: clauses.length
    });
    return (_jsxs(Box, { sx: { height: 'calc(100vh - 64px)', position: 'relative' }, children: [_jsx(ClauseGraph, { graphData: graphData, onNodeClick: handleNodeClick }), _jsx(FloatingPanel, { clause: activeClause, onClose: function () { return setActiveClause(null); }, onBookmarkToggle: function () { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                if (!activeClause)
                                    return [2 /*return*/];
                                return [4 /*yield*/, toggleBookmark(activeClause.id)];
                            case 1:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); } })] }));
};
export default Home;
