import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Paper, InputBase, IconButton } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
export function SearchBar(_a) {
    var onSearch = _a.onSearch;
    var _b = useState(''), query = _b[0], setQuery = _b[1];
    var handleSubmit = function (e) {
        e.preventDefault();
        onSearch(query);
    };
    return (_jsxs(Paper, { component: "form", onSubmit: handleSubmit, sx: {
            p: '2px 4px',
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            maxWidth: 600,
        }, children: [_jsx(InputBase, { sx: { ml: 1, flex: 1 }, placeholder: "Search clauses...", value: query, onChange: function (e) { return setQuery(e.target.value); } }), _jsx(IconButton, { type: "submit", sx: { p: '10px' }, "aria-label": "search", children: _jsx(SearchIcon, {}) })] }));
}
