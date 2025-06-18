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
import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import { Box, CircularProgress, Alert } from '@mui/material';
import { ClauseGraph } from '../components/ClauseGraph';
import { ErrorFallbackBoundary } from '../components/ErrorFallbackBoundary';
import { useClause } from '../contexts/ClauseContext';
import { useGraph } from '../hooks/useGraph';
var Home = function () {
    var useGraphApi = import.meta.env.VITE_USE_GRAPH === '1';
    var _a = useGraphApi ? useGraph() : { data: null, isLoading: false, isError: false }, graphApiData = _a.data, graphLoading = _a.isLoading, graphError = _a.isError;
    var _b = useClause(), clauses = _b.clauses, loading = _b.loading, error = _b.error, bookmarkClause = _b.bookmarkClause;
    var _c = React.useState({
        open: false,
        message: '',
        severity: 'success'
    }), snackbar = _c[0], setSnackbar = _c[1];
    var graphData = React.useMemo(function () {
        if (useGraphApi && graphApiData) {
            return graphApiData;
        }
        if (!clauses || !Array.isArray(clauses)) {
            console.warn('No valid clauses data available');
            return { nodes: [], links: [] };
        }
        // ---- DEBUG: inspect raw first clause before mapping ----
        if (clauses.length > 0) {
            console.log('🔍 raw clause[0]:', clauses[0]);
        }
        // Build nodes, ensuring uniqueness by clause id
        var nodeMap = new Map();
        clauses
            .filter(function (clause) { return clause !== null && clause !== undefined; })
            .forEach(function (clause) {
            var id = clause.id || '';
            if (!nodeMap.has(id)) {
                nodeMap.set(id, {
                    id: id,
                    name: clause.title || 'Untitled Clause',
                    val: 1,
                    color: clause.is_bookmarked ? '#FFD700' : undefined,
                    family: clause.family
                });
            }
        });
        var nodes = Array.from(nodeMap.values());
        var edges = clauses
            .filter(function (clause) { return clause !== null && clause !== undefined; })
            .flatMap(function (clause) {
            console.log('Processing relationships for clause:', {
                clauseId: clause.id,
                relationships: clause.relationships
            });
            return (clause.relationships || [])
                .filter(function (rel) {
                console.log('Checking relationship:', rel);
                return rel !== null &&
                    rel !== undefined &&
                    typeof rel.sourceClauseId === 'string' &&
                    typeof rel.targetClauseId === 'string';
            })
                .map(function (rel) { return ({
                source: rel.sourceClauseId,
                target: rel.targetClauseId,
                value: 1
            }); });
        });
        // Trim edges whose nodes are missing
        var nodeSet = new Set(nodes.map(function (n) { return n.id; }));
        var safeLinks = edges.filter(function (e) { return nodeSet.has(e.source) && nodeSet.has(e.target); });
        // ---- DEBUG: dump final graph ----
        console.log('🧩 final graph nodes:', nodes);
        console.log('🧩 final graph links:', safeLinks);
        return { nodes: nodes, links: safeLinks };
    }, [clauses, useGraphApi, graphApiData]);
    var handleNodeClick = function (node) { return __awaiter(void 0, void 0, void 0, function () {
        var error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, bookmarkClause(node.id)];
                case 1:
                    _a.sent();
                    setSnackbar({
                        open: true,
                        message: 'Clause bookmarked successfully',
                        severity: 'success'
                    });
                    return [3 /*break*/, 3];
                case 2:
                    error_1 = _a.sent();
                    setSnackbar({
                        open: true,
                        message: 'Failed to bookmark clause',
                        severity: 'error'
                    });
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); };
    if (loading) {
        return (_jsx(Box, { sx: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }, children: _jsx(CircularProgress, {}) }));
    }
    if (error) {
        return (_jsx(Box, { sx: { p: 3 }, children: _jsx(Alert, { severity: "error", children: error }) }));
    }
    // Don't mount the graph until data is ready to avoid empty-graph flicker
    if (!graphData.nodes.length) {
        return null; // or a small spinner could go here
    }
    return (_jsx(Box, { sx: { height: 'calc(100vh - 64px)', position: 'relative' }, children: _jsx(ErrorFallbackBoundary, { children: _jsx(ClauseGraph, { graphData: graphData, onNodeClick: handleNodeClick }) }) }));
};
export default Home;
