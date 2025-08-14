import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Chip, LinearProgress, CircularProgress, Button, } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
export var ScanResults = function (_a) {
    var results = _a.results, progress = _a.progress;
    var _b = useState(new Set()), expandedContexts = _b[0], setExpandedContexts = _b[1];
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
    var toggleContext = function (resultId) {
        var newExpanded = new Set(expandedContexts);
        if (newExpanded.has(resultId)) {
            newExpanded.delete(resultId);
        }
        else {
            newExpanded.add(resultId);
        }
        setExpandedContexts(newExpanded);
    };
    return (_jsxs(Box, { sx: { width: '100%', mt: 4 }, children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "Analysis Results" }), progress && (_jsxs(Box, { sx: { mb: 3 }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', mb: 1 }, children: [_jsx(Typography, { variant: "body2", sx: { mr: 1 }, children: progress.status === 'processing' ? 'Processing document...' :
                                    progress.status === 'completed' ? 'Analysis completed' :
                                        'Error occurred' }), progress.status === 'processing' && (_jsx(CircularProgress, { size: 20, sx: { ml: 1 } }))] }), _jsx(LinearProgress, { variant: "determinate", value: (progress.current / progress.total) * 100, color: progress.status === 'error' ? 'error' : 'primary' }), progress.message && (_jsx(Typography, { variant: "caption", color: "text.secondary", sx: { mt: 0.5 }, children: progress.message }))] })), _jsx(TableContainer, { component: Paper, sx: { mt: 2 }, children: _jsxs(Table, { children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "Clause ID" }), _jsx(TableCell, { children: "Title" }), _jsx(TableCell, { children: "Description" }), _jsx(TableCell, { children: "Family" }), _jsx(TableCell, { children: "Confidence" }), _jsx(TableCell, { children: "Details" })] }) }), _jsxs(TableBody, { children: [results.map(function (result, index) { return (_jsxs(TableRow, { children: [_jsx(TableCell, { children: result.clauseId || 'N/A' }), _jsx(TableCell, { children: result.title }), _jsx(TableCell, { children: result.description }), _jsx(TableCell, { children: result.family || 'N/A' }), _jsx(TableCell, { children: _jsx(Chip, { icon: getConfidenceIcon(result.confidence), label: "".concat((result.confidence * 100).toFixed(0), "%"), color: getConfidenceColor(result.confidence), size: "small" }) }), _jsx(TableCell, { children: result.supportingContext && (_jsxs(Box, { children: [_jsx(Button, { variant: "outlined", size: "small", startIcon: _jsx(InfoIcon, {}), onClick: function () { return toggleContext(result.clauseId); }, sx: {
                                                            minWidth: 'auto',
                                                            px: 1.5,
                                                            py: 0.5,
                                                            fontSize: '0.75rem'
                                                        }, children: expandedContexts.has(result.clauseId) ? 'Hide Context' : 'View Context' }), expandedContexts.has(result.clauseId) && (_jsxs(Box, { sx: {
                                                            mt: 1,
                                                            p: 2,
                                                            bgcolor: 'grey.50',
                                                            borderRadius: 1,
                                                            border: '1px solid',
                                                            borderColor: 'grey.300',
                                                            maxWidth: '400px'
                                                        }, children: [_jsx(Typography, { variant: "body2", sx: { fontWeight: 600, mb: 1, color: 'primary.main' }, children: "Supporting Context:" }), _jsx(Typography, { variant: "body2", color: "text.secondary", sx: { lineHeight: 1.5 }, children: result.supportingContext })] }))] })) })] }, index)); }), results.length === 0 && (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 6, align: "center", children: "No clauses found in the document" }) }))] })] }) })] }));
};
