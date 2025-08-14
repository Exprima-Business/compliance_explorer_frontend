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
import { createContext, useContext, useState, useEffect } from 'react';
import { clauseService } from '../services/clauseService';
import { usePreferences } from './PreferencesContext';
var ClauseContext = createContext(undefined);
export var ClauseProvider = function (_a) {
    var children = _a.children;
    var _b = useState([]), clauses = _b[0], setClauses = _b[1];
    var _c = useState([]), families = _c[0], setFamilies = _c[1];
    var _d = useState(true), loading = _d[0], setLoading = _d[1];
    var _e = useState(null), error = _e[0], setError = _e[1];
    var _f = useState(''), searchQuery = _f[0], setSearchQuery = _f[1];
    var _g = useState(null), selectedFamily = _g[0], setSelectedFamily = _g[1];
    var preferences = usePreferences().preferences;
    // Load families on mount
    useEffect(function () {
        var loadFamilies = function () { return __awaiter(void 0, void 0, void 0, function () {
            var resp, msg, err_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, clauseService.getClauseFamilies()];
                    case 1:
                        resp = _a.sent();
                        if (resp.error) {
                            msg = typeof resp.error === 'string' ? resp.error : resp.error.message;
                            throw new Error(msg);
                        }
                        if (resp.data)
                            setFamilies(resp.data);
                        return [3 /*break*/, 3];
                    case 2:
                        err_1 = _a.sent();
                        setError(err_1 instanceof Error ? err_1.message : 'Failed to fetch families');
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        }); };
        loadFamilies();
    }, []);
    // Load all clauses on mount
    useEffect(function () {
        var loadAllClauses = function () { return __awaiter(void 0, void 0, void 0, function () {
            var resp, msg, err_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, 3, 4]);
                        setLoading(true);
                        return [4 /*yield*/, clauseService.getAllClauses()];
                    case 1:
                        resp = _a.sent();
                        if (resp.error) {
                            msg = typeof resp.error === 'string' ? resp.error : resp.error.message;
                            throw new Error(msg);
                        }
                        if (resp.data)
                            setClauses(resp.data);
                        return [3 /*break*/, 4];
                    case 2:
                        err_2 = _a.sent();
                        setError(err_2 instanceof Error ? err_2.message : 'Failed to fetch clauses');
                        return [3 /*break*/, 4];
                    case 3:
                        setLoading(false);
                        return [7 /*endfinally*/];
                    case 4: return [2 /*return*/];
                }
            });
        }); };
        loadAllClauses();
    }, []);
    // When the user selects / clears a family, (re)load the appropriate clause set
    useEffect(function () {
        if (selectedFamily === null)
            return; // Don't reload if no family is selected (keep all clauses)
        var loadByFamily = function () { return __awaiter(void 0, void 0, void 0, function () {
            var resp, msg, err_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, 3, 4]);
                        setLoading(true);
                        return [4 /*yield*/, clauseService.getClausesByFamily(selectedFamily)];
                    case 1:
                        resp = _a.sent();
                        if (resp.error) {
                            msg = typeof resp.error === 'string' ? resp.error : resp.error.message;
                            throw new Error(msg);
                        }
                        if (resp.data)
                            setClauses(resp.data);
                        return [3 /*break*/, 4];
                    case 2:
                        err_3 = _a.sent();
                        setError(err_3 instanceof Error ? err_3.message : 'Failed to fetch clauses');
                        return [3 /*break*/, 4];
                    case 3:
                        setLoading(false);
                        return [7 /*endfinally*/];
                    case 4: return [2 /*return*/];
                }
            });
        }); };
        loadByFamily();
    }, [selectedFamily]);
    // Helper function to find parent clauses
    var findParentClauses = function (clause) {
        var parentClauses = [];
        clause.relationships.forEach(function (rel) {
            var _a, _b;
            var relAny = rel;
            var rType = ((_b = (_a = relAny.type) !== null && _a !== void 0 ? _a : relAny.relationshipType) !== null && _b !== void 0 ? _b : '').toUpperCase();
            if (rType === 'PARENT') {
                // For a PARENT relationship stored as
                //   clauseId           = child
                //   relatedClauseId    = parent
                // the parent is in the *relatedClauseId* (or targetClauseId) column.
                var parentId_1 = relAny.relatedClauseId || relAny.targetClauseId;
                if (parentId_1) {
                    var parent_1 = clauses.find(function (c) { return c.clauseId === parentId_1; });
                    if (parent_1)
                        parentClauses.push(parent_1);
                }
            }
            else if (rType === 'CHILD') {
                // For a CHILD relationship stored as
                //   clauseId           = parent
                //   relatedClauseId    = child
                // the parent is in the *clauseId* (or sourceClauseId) column.
                var parentId_2 = relAny.clauseId || relAny.sourceClauseId;
                if (parentId_2) {
                    var parent_2 = clauses.find(function (c) { return c.clauseId === parentId_2; });
                    if (parent_2)
                        parentClauses.push(parent_2);
                }
            }
        });
        return parentClauses;
    };
    // Helper function to find child clauses
    var findChildClauses = function (clause) {
        var childClauses = [];
        clauses.forEach(function (otherClause) {
            otherClause.relationships.forEach(function (relationship) {
                // Handle both possible property names
                var targetId = relationship.targetClauseId || relationship.clauseId;
                if (relationship.type === 'PARENT' && targetId === clause.clauseId) {
                    childClauses.push(otherClause);
                }
            });
        });
        return childClauses;
    };
    var value = {
        clauses: clauses,
        families: families,
        loading: loading,
        error: error,
        searchQuery: searchQuery,
        setSearchQuery: setSearchQuery,
        selectedFamily: selectedFamily,
        setSelectedFamily: setSelectedFamily
    };
    return (_jsx(ClauseContext.Provider, { value: value, children: children }));
};
export var useClause = function () {
    var context = useContext(ClauseContext);
    if (context === undefined) {
        throw new Error('useClause must be used within a ClauseProvider');
    }
    return context;
};
