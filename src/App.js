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
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Box, CssBaseline, ThemeProvider, createTheme, Select, MenuItem, FormControl, InputLabel, alpha, Button } from '@mui/material';
import { ClauseGraph } from './components/ClauseGraph';
import { SearchBar } from './components/SearchBar';
import { ClauseCard } from './components/ClauseCard';
import { FloatingPanel } from './components/FloatingPanel';
import { ComplianceMatrix } from './components/ComplianceMatrix';
import { DocumentScanner } from './components/DocumentScanner';
import { searchClauses, getClauseFamilies, getClausesByFamily } from './services/clauseService';
import { ParentClauseDialog } from './components/ParentClauseDialog';
import { Settings } from './components/Settings';
import { AppBar } from './components/AppBar';
var theme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#0f172a', // Deep slate
            light: '#334155',
            dark: '#020617',
            contrastText: '#ffffff',
        },
        secondary: {
            main: '#6366f1', // Modern indigo
            light: '#818cf8',
            dark: '#4f46e5',
            contrastText: '#ffffff',
        },
        background: {
            default: '#f1f5f9',
            paper: '#ffffff',
        },
        text: {
            primary: '#0f172a',
            secondary: '#475569',
        },
        divider: 'rgba(148, 163, 184, 0.1)',
    },
    typography: {
        fontFamily: '"Plus Jakarta Sans", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h6: {
            fontWeight: 700,
            letterSpacing: '-0.02em',
            fontSize: '1.25rem',
        },
        body1: {
            fontSize: '0.875rem',
            lineHeight: 1.6,
            letterSpacing: '0.01em',
        },
        button: {
            textTransform: 'none',
            fontWeight: 600,
        },
    },
    shape: {
        borderRadius: 11,
    },
    components: {
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(8px)',
                    boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                    borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                    boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
                },
            },
        },
        MuiSelect: {
            styleOverrides: {
                root: {
                    backgroundColor: '#ffffff',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                        backgroundColor: alpha('#6366f1', 0.04),
                        transform: 'translateY(-1px)',
                    },
                    '&.Mui-focused': {
                        backgroundColor: alpha('#6366f1', 0.08),
                    },
                },
                select: {
                    '&:focus': {
                        backgroundColor: 'transparent',
                    },
                },
            },
        },
        MuiFormControl: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        transition: 'all 0.2s ease-in-out',
                        '&:hover fieldset': {
                            borderColor: '#6366f1',
                        },
                        '&.Mui-focused fieldset': {
                            borderColor: '#6366f1',
                            borderWidth: '2px',
                        },
                    },
                },
            },
        },
        MuiMenuItem: {
            styleOverrides: {
                root: {
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                        backgroundColor: alpha('#6366f1', 0.08),
                    },
                    '&.Mui-selected': {
                        backgroundColor: alpha('#6366f1', 0.12),
                        '&:hover': {
                            backgroundColor: alpha('#6366f1', 0.16),
                        },
                    },
                },
            },
        },
    },
});
export default function App() {
    var _this = this;
    var _a = useState(''), selectedFamily = _a[0], setSelectedFamily = _a[1];
    var _b = useState([]), families = _b[0], setFamilies = _b[1];
    var _c = useState([]), clauses = _c[0], setClauses = _c[1];
    var _d = useState(0), activeTab = _d[0], setActiveTab = _d[1];
    var _e = useState(null), selectedClause = _e[0], setSelectedClause = _e[1];
    var _f = useState(false), showSettings = _f[0], setShowSettings = _f[1];
    var _g = useState(''), searchQuery = _g[0], setSearchQuery = _g[1];
    var _h = useState([]), bookmarkedClauses = _h[0], setBookmarkedClauses = _h[1];
    var _j = useState(false), loading = _j[0], setLoading = _j[1];
    var _k = useState(false), parentClauseDialogOpen = _k[0], setParentClauseDialogOpen = _k[1];
    var _l = useState(null), pendingUnbookmark = _l[0], setPendingUnbookmark = _l[1];
    var _m = useState(function () {
        var savedPreferences = localStorage.getItem('bookmarkPreferences');
        return savedPreferences ? JSON.parse(savedPreferences) : {
            removeParentWithChild: null
        };
    }), preferences = _m[0], setPreferences = _m[1];
    var _o = useState(false), showComplianceMatrix = _o[0], setShowComplianceMatrix = _o[1];
    useEffect(function () {
        var loadFamilies = function () { return __awaiter(_this, void 0, void 0, function () {
            var familyList, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, getClauseFamilies()];
                    case 1:
                        familyList = _a.sent();
                        setFamilies(familyList);
                        return [3 /*break*/, 3];
                    case 2:
                        error_1 = _a.sent();
                        console.error('Error loading families:', error_1);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        }); };
        loadFamilies();
    }, []);
    useEffect(function () {
        var loadClauses = function () { return __awaiter(_this, void 0, void 0, function () {
            var results, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        setLoading(true);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 6, 7, 8]);
                        results = void 0;
                        if (!selectedFamily) return [3 /*break*/, 3];
                        console.log('Loading clauses for family:', selectedFamily);
                        return [4 /*yield*/, getClausesByFamily(selectedFamily)];
                    case 2:
                        results = _a.sent();
                        return [3 /*break*/, 5];
                    case 3:
                        console.log('Loading clauses with search query:', searchQuery);
                        return [4 /*yield*/, searchClauses(searchQuery)];
                    case 4:
                        results = _a.sent();
                        _a.label = 5;
                    case 5:
                        console.log('Loaded clauses:', (results === null || results === void 0 ? void 0 : results.length) || 0, 'clauses');
                        if ((results === null || results === void 0 ? void 0 : results.length) > 0) {
                            console.log('Sample clause:', JSON.stringify(results[0], null, 2));
                        }
                        setClauses(results);
                        return [3 /*break*/, 8];
                    case 6:
                        error_2 = _a.sent();
                        console.error('Error loading clauses:', error_2);
                        return [3 /*break*/, 8];
                    case 7:
                        setLoading(false);
                        return [7 /*endfinally*/];
                    case 8: return [2 /*return*/];
                }
            });
        }); };
        loadClauses();
    }, [searchQuery, selectedFamily]);
    var handleSearch = function (query) {
        setSearchQuery(query);
        setSelectedFamily('');
    };
    var handleFamilyChange = function (event) {
        setSelectedFamily(event.target.value);
        setSearchQuery('');
    };
    var handleNodeClick = function (clause) {
        setSelectedClause(clause);
    };
    var handleClosePanel = function () {
        setSelectedClause(null);
    };
    var findParentClause = function (clause) {
        if (!clause.parentClause)
            return null;
        return clauses.find(function (c) { return c.id === clause.parentClause; }) || null;
    };
    var handlePreferenceChange = function (key, value) {
        var _a;
        var newPreferences = __assign(__assign({}, preferences), (_a = {}, _a[key] = value, _a));
        setPreferences(newPreferences);
        localStorage.setItem('bookmarkPreferences', JSON.stringify(newPreferences));
    };
    var handleBookmarkToggle = function (clause) {
        setBookmarkedClauses(function (prev) {
            var isBookmarked = prev.some(function (c) { return c.id === clause.id; });
            if (isBookmarked) {
                // When unbookmarking, we need to handle both child and parent clauses
                var parentClause_1 = findParentClause(clause);
                if (parentClause_1 && prev.some(function (c) { return c.id === parentClause_1.id; })) {
                    // If there's a parent clause and it's bookmarked
                    if (preferences.removeParentWithChild === null) {
                        // If no preference is set, show the dialog
                        setPendingUnbookmark({ clause: clause, parentClause: parentClause_1 });
                        setParentClauseDialogOpen(true);
                        return prev; // Don't change bookmarks yet
                    }
                    else if (preferences.removeParentWithChild) {
                        // If preference is to remove parent, remove both
                        return prev.filter(function (c) { return c.id !== clause.id && c.id !== parentClause_1.id; });
                    }
                    // If preference is to keep parent, only remove child
                    return prev.filter(function (c) { return c.id !== clause.id; });
                }
                // If no parent clause or parent not bookmarked, just remove the clause
                return prev.filter(function (c) { return c.id !== clause.id; });
            }
            else {
                // When bookmarking, add the clause
                return __spreadArray(__spreadArray([], prev, true), [clause], false);
            }
        });
    };
    var handleParentClauseDialogConfirm = function (removeParent, rememberChoice) {
        if (pendingUnbookmark) {
            setBookmarkedClauses(function (prev) {
                if (removeParent) {
                    return prev.filter(function (c) { return c.id !== pendingUnbookmark.clause.id && c.id !== pendingUnbookmark.parentClause.id; });
                }
                else {
                    return prev.filter(function (c) { return c.id !== pendingUnbookmark.clause.id; });
                }
            });
        }
        if (rememberChoice) {
            handlePreferenceChange('removeParentWithChild', removeParent);
        }
        setParentClauseDialogOpen(false);
        setPendingUnbookmark(null);
    };
    var isClauseBookmarked = function (clause) {
        return bookmarkedClauses.some(function (c) { return c.id === clause.id; });
    };
    var handleTabChange = function (_event, newValue) {
        setActiveTab(newValue);
        setSelectedClause(null);
    };
    return (_jsxs(ThemeProvider, { theme: theme, children: [_jsx(CssBaseline, {}), _jsxs(Box, { sx: {
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: '100vh',
                    width: '100vw',
                    overflow: 'hidden',
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0
                }, children: [_jsx(AppBar, { activeTab: activeTab, onTabChange: handleTabChange, onSettingsClick: function () { return setShowSettings(true); } }), _jsxs(Box, { sx: {
                            display: 'flex',
                            flex: 1,
                            width: '100%',
                            mt: { xs: '64px', sm: '72px' },
                            px: { xs: 2, sm: 3 },
                            pb: { xs: 2, sm: 3 },
                            gap: 3,
                            overflow: 'hidden',
                            minHeight: 0,
                            pt: '1%',
                            height: 'calc(100vh - 72px)'
                        }, children: [_jsxs(Box, { sx: {
                                    width: { xs: '100%', sm: 320 },
                                    display: { xs: activeTab === 0 ? 'flex' : 'none', sm: 'flex' },
                                    flexDirection: 'column',
                                    gap: 2,
                                    bgcolor: 'background.paper',
                                    height: 'calc(100% - 1%)',
                                    borderRadius: 2.8,
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                                    overflow: 'hidden',
                                    flexShrink: 0,
                                    transition: 'all 0.3s ease-in-out',
                                    '&:hover': {
                                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
                                    },
                                    mt: '1%' // Match the top margin of the node map
                                }, children: [_jsxs(Box, { sx: {
                                            p: 2,
                                            borderBottom: '1px solid',
                                            borderColor: 'divider',
                                            bgcolor: 'background.paper'
                                        }, children: [_jsx(SearchBar, { onSearch: handleSearch }), _jsxs(FormControl, { fullWidth: true, sx: { mt: 2 }, children: [_jsx(InputLabel, { children: "Filter by Family" }), _jsxs(Select, { value: selectedFamily, label: "Filter by Family", onChange: handleFamilyChange, children: [_jsx(MenuItem, { value: "", children: "All Families" }), families.map(function (family) { return (_jsx(MenuItem, { value: family.name, children: family.name }, family.name)); })] })] })] }), _jsxs(Box, { sx: {
                                            flex: 1,
                                            overflow: 'auto',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 1,
                                            p: 1.5,
                                            bgcolor: 'background.paper'
                                        }, children: [bookmarkedClauses.map(function (clause) { return (_jsx(ClauseCard, { clause: clause, isBookmarked: true, onBookmarkToggle: function () { return handleBookmarkToggle(clause); }, compact: true, sx: {
                                                    '& .MuiCardContent-root': {
                                                        p: 0
                                                    },
                                                    '& .MuiPaper-root': {
                                                        p: 1.5,
                                                        mb: 1.5
                                                    },
                                                    '& .MuiTypography-h5': {
                                                        fontSize: '0.9rem',
                                                        mb: 0.5
                                                    },
                                                    '& .MuiTypography-h6': {
                                                        fontSize: '0.85rem',
                                                        lineHeight: 1.3
                                                    },
                                                    '& .MuiTypography-body2': {
                                                        fontSize: '0.8rem',
                                                        lineHeight: 1.4
                                                    },
                                                    '& .MuiTypography-caption': {
                                                        fontSize: '0.7rem'
                                                    }
                                                } }, clause.id)); }), bookmarkedClauses.length > 0 && (_jsx(Button, { variant: "outlined", color: "error", onClick: function () { return setBookmarkedClauses([]); }, sx: {
                                                    mt: 'auto',
                                                    mb: 1,
                                                    textTransform: 'none',
                                                    fontWeight: 600,
                                                    borderWidth: 2,
                                                    py: 0.75,
                                                    '&:hover': {
                                                        borderWidth: 2,
                                                    },
                                                }, children: "Clear All Bookmarks" }))] })] }), _jsx(Box, { sx: {
                                    flex: 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    minWidth: 0,
                                    overflow: 'hidden',
                                    width: '100%',
                                    height: 'calc(100% - 1%)',
                                    mt: '1%'
                                }, children: activeTab === 0 ? (_jsx(Box, { sx: {
                                        flex: 1,
                                        width: '100%',
                                        height: '100%',
                                        bgcolor: 'background.paper',
                                        borderRadius: 2.8,
                                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                                        overflow: 'hidden',
                                        transition: 'all 0.3s ease-in-out',
                                        '&:hover': {
                                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
                                        },
                                        display: 'flex',
                                        flexDirection: 'column',
                                        minWidth: 0,
                                        minHeight: 0
                                    }, children: _jsx(ClauseGraph, { clauses: clauses, onNodeClick: handleNodeClick }) })) : activeTab === 1 ? (_jsx(Box, { sx: {
                                        flex: 1,
                                        width: '100%',
                                        height: '100%',
                                        bgcolor: 'background.paper',
                                        borderRadius: 2.8,
                                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                                        overflow: 'hidden',
                                        display: 'flex',
                                        flexDirection: 'column',
                                    }, children: _jsx(ComplianceMatrix, { clauses: bookmarkedClauses, onClose: function () { return setShowComplianceMatrix(false); } }) })) : (_jsx(Box, { sx: {
                                        flex: 1,
                                        width: '100%',
                                        height: '100%',
                                        bgcolor: 'background.paper',
                                        borderRadius: 2.8,
                                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                                        overflow: 'hidden',
                                        display: 'flex',
                                        flexDirection: 'column',
                                    }, children: _jsx(DocumentScanner, {}) })) }), _jsx(FloatingPanel, { clause: selectedClause, onClose: handleClosePanel, isBookmarked: selectedClause ? isClauseBookmarked(selectedClause) : false, onBookmarkToggle: selectedClause ? function () { return handleBookmarkToggle(selectedClause); } : undefined })] }), _jsx(Settings, { open: showSettings, onClose: function () { return setShowSettings(false); }, preferences: preferences, onPreferenceChange: handlePreferenceChange }), pendingUnbookmark && (_jsx(ParentClauseDialog, { open: parentClauseDialogOpen, onClose: function () {
                            setParentClauseDialogOpen(false);
                            setPendingUnbookmark(null);
                        }, onConfirm: handleParentClauseDialogConfirm, childClause: pendingUnbookmark.clause, parentClause: pendingUnbookmark.parentClause })), showComplianceMatrix && (_jsx(Box, { sx: {
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            bgcolor: 'rgba(0, 0, 0, 0.5)',
                            zIndex: 1300,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            p: 2
                        }, children: _jsx(Box, { sx: {
                                width: '100%',
                                height: '100%',
                                bgcolor: 'background.paper',
                                borderRadius: 2,
                                overflow: 'hidden'
                            }, children: _jsx(ComplianceMatrix, { clauses: bookmarkedClauses, onClose: function () { return setShowComplianceMatrix(false); } }) }) }))] })] }));
}
