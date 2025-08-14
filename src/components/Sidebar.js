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
import { Drawer, Box, TextField, Divider, FormControl, InputLabel, Select, MenuItem, } from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { useClause } from '../contexts/ClauseContext';
import { useBookmarks } from '../contexts/BookmarkContext';
import { BookmarkedClauses } from './BookmarkedClauses';
var drawerWidth = 320;
export var Sidebar = function () {
    var _a = useClause(), searchQuery = _a.searchQuery, setSearchQuery = _a.setSearchQuery, selectedFamily = _a.selectedFamily, setSelectedFamily = _a.setSelectedFamily, families = _a.families, clauses = _a.clauses;
    var _b = useBookmarks(), bookmarks = _b.bookmarks, toggleBookmark = _b.toggleBookmark;
    var handleFamilyClick = function (family) {
        setSelectedFamily(family);
    };
    var validFamilies = Array.isArray(families)
        ? families.filter(function (fg) {
            return Boolean(fg && fg.family && fg.family.id && fg.family.name);
        })
        : [];
    // Get bookmarked clauses using BookmarkContext as authority
    var bookmarkedClauses = clauses.filter(function (clause) {
        return bookmarks.some(function (bookmark) { return bookmark.clauseId === clause.id; });
    });
    var handleClauseClick = function (clause) {
        // This could trigger opening the clause in the main view
        // For now, we'll just log it
        console.log('Clause clicked:', clause.clauseCode);
    };
    var handleBookmarkToggle = function (clause) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, toggleBookmark(clause.id)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); };
    return (_jsx(Drawer, { variant: "permanent", sx: {
            width: drawerWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
                width: drawerWidth,
                boxSizing: 'border-box',
                marginTop: '64px', // Height of AppBar
                backgroundColor: 'background.paper',
                borderRight: '1px solid rgba(148, 163, 184, 0.1)',
                padding: 2,
            },
        }, children: _jsxs(Box, { sx: { display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }, children: [_jsx(TextField, { fullWidth: true, id: "clause-search", name: "clause-search", variant: "outlined", placeholder: "Search clauses...", value: searchQuery, onChange: function (e) { return setSearchQuery(e.target.value); }, InputProps: {
                        startAdornment: _jsx(SearchIcon, { sx: { color: 'text.secondary', mr: 1 } }),
                    } }), _jsxs(FormControl, { fullWidth: true, children: [_jsx(InputLabel, { children: "Filter by Family" }), _jsxs(Select, { value: (selectedFamily === null || selectedFamily === void 0 ? void 0 : selectedFamily.id) || '', label: "Filter by Family", onChange: function (e) {
                                var familyId = e.target.value;
                                if (!familyId) {
                                    handleFamilyClick(null);
                                    return;
                                }
                                var familyGroup = validFamilies.find(function (fg) { return fg.family.id === familyId; });
                                handleFamilyClick((familyGroup === null || familyGroup === void 0 ? void 0 : familyGroup.family) || null);
                            }, children: [_jsx(MenuItem, { value: "", children: "All Families" }), validFamilies.map(function (familyGroup) { return (_jsx(MenuItem, { value: familyGroup.family.id, children: familyGroup.family.name }, familyGroup.family.id)); })] })] }), _jsx(Divider, {}), _jsx(Box, { sx: { flexGrow: 1, overflow: 'auto' }, children: _jsx(BookmarkedClauses, { bookmarkedClauses: bookmarkedClauses, onClauseClick: handleClauseClick, onBookmarkToggle: handleBookmarkToggle }) })] }) }));
};
