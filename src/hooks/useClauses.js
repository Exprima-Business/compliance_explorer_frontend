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
import { useState, useEffect } from 'react';
import { clauseService } from '../services/clauseService';
export function useClauses() {
    var _this = this;
    var _a = useState([]), clauses = _a[0], setClauses = _a[1];
    var _b = useState([]), families = _b[0], setFamilies = _b[1];
    var _c = useState(null), selectedFamily = _c[0], setSelectedFamily = _c[1];
    var _d = useState(true), loading = _d[0], setLoading = _d[1];
    var _e = useState(null), error = _e[0], setError = _e[1];
    useEffect(function () {
        var fetchData = function () { return __awaiter(_this, void 0, void 0, function () {
            var _a, clausesResponse, familiesResponse, err_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, 3, 4]);
                        setLoading(true);
                        return [4 /*yield*/, Promise.all([
                                clauseService.getAllClauses(),
                                clauseService.getClauseFamilies()
                            ])];
                    case 1:
                        _a = _b.sent(), clausesResponse = _a[0], familiesResponse = _a[1];
                        if (clausesResponse.error) {
                            throw new Error(typeof clausesResponse.error === 'string' ? clausesResponse.error : clausesResponse.error.message);
                        }
                        if (familiesResponse.error) {
                            throw new Error(typeof familiesResponse.error === 'string' ? familiesResponse.error : familiesResponse.error.message);
                        }
                        if (clausesResponse.data)
                            setClauses(clausesResponse.data);
                        if (familiesResponse.data)
                            setFamilies(familiesResponse.data);
                        return [3 /*break*/, 4];
                    case 2:
                        err_1 = _b.sent();
                        setError(err_1 instanceof Error ? err_1.message : 'An error occurred');
                        return [3 /*break*/, 4];
                    case 3:
                        setLoading(false);
                        return [7 /*endfinally*/];
                    case 4: return [2 /*return*/];
                }
            });
        }); };
        fetchData();
    }, []);
    var fetchClausesByFamily = function (family) { return __awaiter(_this, void 0, void 0, function () {
        var response, err_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, 3, 4]);
                    setLoading(true);
                    return [4 /*yield*/, clauseService.getClausesByFamily(family)];
                case 1:
                    response = _a.sent();
                    if (response.error) {
                        throw new Error(typeof response.error === 'string' ? response.error : response.error.message);
                    }
                    if (response.data)
                        setClauses(response.data);
                    setSelectedFamily(family);
                    return [3 /*break*/, 4];
                case 2:
                    err_2 = _a.sent();
                    setError(err_2 instanceof Error ? err_2.message : 'Failed to fetch clauses by family');
                    return [3 /*break*/, 4];
                case 3:
                    setLoading(false);
                    return [7 /*endfinally*/];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    var searchClauses = function (query) { return __awaiter(_this, void 0, void 0, function () {
        var response, err_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, 3, 4]);
                    setLoading(true);
                    return [4 /*yield*/, clauseService.searchClauses(query)];
                case 1:
                    response = _a.sent();
                    if (response.error) {
                        throw new Error(typeof response.error === 'string' ? response.error : response.error.message);
                    }
                    if (response.data)
                        setClauses(response.data);
                    return [3 /*break*/, 4];
                case 2:
                    err_3 = _a.sent();
                    setError(err_3 instanceof Error ? err_3.message : 'Failed to search clauses');
                    return [3 /*break*/, 4];
                case 3:
                    setLoading(false);
                    return [7 /*endfinally*/];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    var selectFamily = function (family) {
        setSelectedFamily(family);
        if (family) {
            fetchClausesByFamily(family);
        }
        else if (families.length > 0) {
            fetchClausesByFamily(families[0].family);
        }
    };
    var bookmarkClause = function (clauseId) { return __awaiter(_this, void 0, void 0, function () {
        var err_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 4, , 5]);
                    setError(null);
                    return [4 /*yield*/, clauseService.bookmarkClause(clauseId)];
                case 1:
                    _a.sent();
                    if (!selectedFamily) return [3 /*break*/, 3];
                    return [4 /*yield*/, fetchClausesByFamily(selectedFamily)];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3: return [3 /*break*/, 5];
                case 4:
                    err_4 = _a.sent();
                    setError(err_4 instanceof Error ? err_4.message : 'Failed to bookmark clause');
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    return {
        clauses: clauses,
        families: families,
        loading: loading,
        error: error,
        fetchClausesByFamily: fetchClausesByFamily,
        searchClauses: searchClauses,
        selectFamily: selectFamily,
        bookmarkClause: bookmarkClause
    };
}
