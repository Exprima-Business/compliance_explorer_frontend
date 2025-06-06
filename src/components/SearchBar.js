import { jsx as _jsx } from "react/jsx-runtime";
import { TextField, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
export var SearchBar = function (_a) {
    var onSearch = _a.onSearch;
    var handleChange = function (event) {
        onSearch(event.target.value);
    };
    return (_jsx(TextField, { fullWidth: true, variant: "outlined", placeholder: "Search by clause ID, title, or description...", onChange: handleChange, InputProps: {
            startAdornment: (_jsx(InputAdornment, { position: "start", children: _jsx(SearchIcon, {}) })),
        } }));
};
