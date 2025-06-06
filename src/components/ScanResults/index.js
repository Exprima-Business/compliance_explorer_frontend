import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Chip, } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
export var ScanResults = function (_a) {
    var results = _a.results;
    var getConfidenceColor = function (confidence) {
        if (confidence >= 0.8)
            return 'success';
        if (confidence >= 0.5)
            return 'warning';
        return 'error';
    };
    var getConfidenceIcon = function (confidence) {
        if (confidence >= 0.8)
            return _jsx(CheckCircleIcon, {});
        return _jsx(WarningIcon, {});
    };
    return (_jsxs(Box, { sx: { width: '100%', mt: 4 }, children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "Analysis Results" }), _jsx(TableContainer, { component: Paper, sx: { mt: 2 }, children: _jsxs(Table, { children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "Clause ID" }), _jsx(TableCell, { children: "Title" }), _jsx(TableCell, { children: "Description" }), _jsx(TableCell, { children: "Confidence" })] }) }), _jsxs(TableBody, { children: [results.map(function (result, index) { return (_jsxs(TableRow, { children: [_jsx(TableCell, { children: result.clauseId || 'N/A' }), _jsx(TableCell, { children: result.title }), _jsx(TableCell, { children: result.description }), _jsx(TableCell, { children: _jsx(Chip, { icon: getConfidenceIcon(result.confidence), label: "".concat((result.confidence * 100).toFixed(0), "%"), color: getConfidenceColor(result.confidence), size: "small" }) })] }, index)); }), results.length === 0 && (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 4, align: "center", children: "No clauses found in the document" }) }))] })] }) })] }));
};
