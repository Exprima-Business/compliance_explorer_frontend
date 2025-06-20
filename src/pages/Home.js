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
import { Box, CircularProgress, Alert } from '@mui/material';
import { ClauseGraphD3 as ClauseGraph } from '../components/ClauseGraphD3';
import { FloatingPanel } from '../components/FloatingPanel';
import { useClause } from '../contexts/ClauseContext';
import { useBookmarks } from '../contexts/BookmarkContext';
var Home = function () {
    var _a = useClause(), clauses = _a.clauses, searchQuery = _a.searchQuery, loading = _a.loading, error = _a.error;
    var _b = useBookmarks(), bookmarks = _b.bookmarks, toggleBookmark = _b.toggleBookmark;
    var _c = React.useState({
        open: false,
        message: '',
        severity: 'success'
    }), snackbar = _c[0], setSnackbar = _c[1];
    var _d = React.useState(null), activeClause = _d[0], setActiveClause = _d[1];
    var searchLower = searchQuery.toLowerCase();
    var filtered = clauses.filter(function (clause) {
        var _a, _b;
        if (!clause)
            return false;
        if (!searchLower)
            return true;
        return (((_a = clause.title) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(searchLower)) ||
            ((_b = clause.clauseId) === null || _b === void 0 ? void 0 : _b.toLowerCase().includes(searchLower)));
    });
    var bookmarkedSet = React.useMemo(function () { return new Set(bookmarks.map(function (b) { return b.clauseId; })); }, [bookmarks]);
    var graphData = React.useMemo(function () {
        if (!filtered || !Array.isArray(filtered)) {
            console.warn('No valid clauses data available');
            return { nodes: [], links: [] };
        }
        var nodes = filtered
            .map(function (clause) { return ({
            id: clause.id || '',
            name: clause.title || 'Untitled Clause',
            clauseId: clause.clauseId || '',
            title: clause.title || '',
            riskClassification: clause.riskClassification || 'UNKNOWN',
            category: clause.category || '',
            family: clause.family,
            val: 1,
            isBookmarked: bookmarkedSet.has(clause.id),
            color: bookmarkedSet.has(clause.id) ? '#FFD700' : undefined
        }); });
        var links = filtered
            .flatMap(function (clause) {
            return (clause.relationships || [])
                .filter(function (rel) {
                // Handle both possible relationship structures
                return (rel !== null &&
                    rel !== undefined &&
                    ((typeof rel.sourceClauseId === 'string' && typeof rel.targetClauseId === 'string') ||
                        (typeof rel.clauseId === 'string')));
            })
                .map(function (rel) {
                // Handle both possible relationship structures
                var source = rel.sourceClauseId || clause.clauseId;
                var target = rel.targetClauseId || rel.clauseId;
                return {
                    source: source,
                    target: target,
                    value: 1
                };
            });
        });
        return { nodes: nodes, links: links };
    }, [filtered, bookmarkedSet]);
    var handleNodeClick = function (node) {
        var clause = clauses.find(function (c) { return c.id === node.id; });
        if (clause) {
            setActiveClause(clause);
        }
    };
    if (loading) {
        return (_jsx(Box, { sx: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }, children: _jsx(CircularProgress, {}) }));
    }
    if (error) {
        return (_jsx(Box, { sx: { p: 3 }, children: _jsx(Alert, { severity: "error", children: error }) }));
    }
    return (_jsxs(Box, { sx: { height: 'calc(100vh - 64px)', position: 'relative' }, children: [_jsx(ClauseGraph, { graphData: graphData, onNodeClick: handleNodeClick }), _jsx(FloatingPanel, { clause: activeClause, onClose: function () { return setActiveClause(null); }, isBookmarked: activeClause === null || activeClause === void 0 ? void 0 : activeClause.isBookmarked, onBookmarkToggle: function () { return __awaiter(void 0, void 0, void 0, function () {
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
