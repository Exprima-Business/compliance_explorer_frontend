import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Drawer, Box, TextField, FormControl, InputLabel, Select, MenuItem, } from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { useClause } from '../contexts/ClauseContext';
var drawerWidth = 320;
export var Sidebar = function () {
    var _a = useClause(), searchQuery = _a.searchQuery, setSearchQuery = _a.setSearchQuery, selectedFamily = _a.selectedFamily, setSelectedFamily = _a.setSelectedFamily, families = _a.families;
    var handleFamilyClick = function (family) {
        setSelectedFamily(family);
    };
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
        }, children: _jsxs(Box, { sx: { display: 'flex', flexDirection: 'column', gap: 2 }, children: [_jsx(TextField, { fullWidth: true, variant: "outlined", placeholder: "Search clauses...", value: searchQuery, onChange: function (e) { return setSearchQuery(e.target.value); }, InputProps: {
                        startAdornment: _jsx(SearchIcon, { sx: { color: 'text.secondary', mr: 1 } }),
                    } }), _jsxs(FormControl, { fullWidth: true, children: [_jsx(InputLabel, { children: "Filter by Family" }), _jsxs(Select, { value: (selectedFamily === null || selectedFamily === void 0 ? void 0 : selectedFamily.id) || '', label: "Filter by Family", onChange: function (e) {
                                var familyId = e.target.value;
                                if (!familyId) {
                                    handleFamilyClick(null);
                                    return;
                                }
                                var familyGroup = families.find(function (f) { return f.family.id === familyId; });
                                handleFamilyClick((familyGroup === null || familyGroup === void 0 ? void 0 : familyGroup.family) || null);
                            }, children: [_jsx(MenuItem, { value: "", children: "All Families" }), families.map(function (familyGroup) { return (_jsx(MenuItem, { value: familyGroup.family.id, children: familyGroup.family.name }, familyGroup.family.id)); })] })] })] }) }));
};
