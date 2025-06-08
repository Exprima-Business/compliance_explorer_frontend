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
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useRef, useEffect } from 'react';
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, IconButton, Tooltip, Button, Dialog, DialogTitle, DialogContent, DialogActions, RadioGroup, Radio, FormControlLabel, CircularProgress, } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
// Helper function to ensure safe string values
var ensureString = function (value) {
    if (value === undefined || value === null)
        return '';
    return String(value);
};
export var ComplianceMatrix = function (_a) {
    var clauses = _a.clauses, onClose = _a.onClose;
    var _b = useState(false), exportDialogOpen = _b[0], setExportDialogOpen = _b[1];
    var _c = useState('PDF'), selectedFormat = _c[0], setSelectedFormat = _c[1];
    var _d = useState(new Set()), expandedRows = _d[0], setExpandedRows = _d[1];
    var _e = useState(false), allExpanded = _e[0], setAllExpanded = _e[1];
    var _f = useState(true), loading = _f[0], setLoading = _f[1];
    var _g = useState([]), rows = _g[0], setRows = _g[1];
    // Define the default column widths
    var DEFAULT_COL_WIDTHS = {
        id: 130,
        title: 200,
        description: 300,
        intent: 200,
        status: 100,
        category: 120,
        family: 100,
        conditions: 240,
        implementationGuidance: 300,
        assessmentMethod: 240,
        parentClause: 120,
        reciprocity: 240,
        penalties: 240,
        riskClassification: 100,
    };
    // Define the columns we want to display
    var columns = [
        { field: 'clauseId', headerName: 'Clause ID', width: 100 },
        { field: 'title', headerName: 'Title', width: 200 },
        { field: 'description', headerName: 'Description', width: 300 },
        { field: 'intent', headerName: 'Intent', width: 200 },
        { field: 'status', headerName: 'Status', width: 100 },
        { field: 'category', headerName: 'Category', width: 150 },
        { field: 'family', headerName: 'Family', width: 150 },
        { field: 'conditions', headerName: 'Conditions', width: 200 },
        { field: 'implementationGuidance', headerName: 'Implementation Guidance', width: 300 },
        { field: 'assessmentMethod', headerName: 'Assessment Method', width: 200 },
        { field: 'riskClassification', headerName: 'Risk Classification', width: 150 },
        { field: 'referenceUrl', headerName: 'Reference URL', width: 200 }
    ];
    // Column widths state
    var _h = useState(function () { return (__assign({}, DEFAULT_COL_WIDTHS)); }), colWidths = _h[0], setColWidths = _h[1];
    var resizingCol = useRef(null);
    var startX = useRef(0);
    var startWidth = useRef(0);
    var handleMouseDown = function (e, colId) {
        resizingCol.current = colId;
        startX.current = e.clientX;
        startWidth.current = colWidths[colId];
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };
    var handleMouseMove = function (e) {
        if (!resizingCol.current)
            return;
        var delta = e.clientX - startX.current;
        setColWidths(function (prev) {
            var _a;
            return (__assign(__assign({}, prev), (_a = {}, _a[resizingCol.current] = Math.max(60, startWidth.current + delta), _a)));
        });
    };
    var handleMouseUp = function () {
        resizingCol.current = null;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };
    // Function to find parent clause's clauseId
    var getParentClauseId = function (clause) {
        if (!clause.parentClause)
            return '';
        var parent = clauses.find(function (c) { return c.id === clause.parentClause; });
        return parent ? parent.clauseId : '';
    };
    // Function to format cell value
    var formatCellValue = function (value) {
        if (value === null || value === undefined)
            return '';
        if (typeof value === 'object') {
            if (Array.isArray(value)) {
                return value.join(', ');
            }
            return JSON.stringify(value);
        }
        return String(value);
    };
    var handleExport = function () {
        setExportDialogOpen(true);
    };
    var handleExportConfirm = function () {
        switch (selectedFormat) {
            case 'PDF':
                exportToPDF();
                break;
            case 'XLSX':
                exportToXLSX();
                break;
            case 'CSV':
                exportToCSV();
                break;
        }
        setExportDialogOpen(false);
    };
    var exportToPDF = function () {
        var doc = new jsPDF('l', 'mm', 'a4'); // Landscape orientation
        var tableColumn = columns.map(function (col) { return col.headerName; });
        var tableRows = rows.map(function (row) {
            return columns.map(function (col) { return ensureString(row[col.field]); });
        });
        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 20,
            theme: 'grid',
            styles: {
                fontSize: 8,
                cellPadding: 2,
            },
            headStyles: {
                fillColor: [15, 23, 42],
                textColor: 255,
                fontStyle: 'bold',
            },
        });
        doc.save('compliance-matrix.pdf');
    };
    var exportToXLSX = function () { return __awaiter(void 0, void 0, void 0, function () {
        var workbook, worksheet_1, headers, buffer, blob, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    workbook = new ExcelJS.Workbook();
                    worksheet_1 = workbook.addWorksheet('Compliance Matrix');
                    headers = columns.map(function (col) { return col.headerName; });
                    worksheet_1.addRow(headers);
                    // Add data with proper type handling
                    rows.forEach(function (row) {
                        var rowData = columns.map(function (col) {
                            return ensureString(row[col.field]);
                        });
                        worksheet_1.addRow(rowData);
                    });
                    // Style the header row
                    worksheet_1.getRow(1).font = { bold: true };
                    worksheet_1.getRow(1).fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFE0E0E0' }
                    };
                    // Auto-fit columns
                    worksheet_1.columns.forEach(function (column) {
                        if (column.header) {
                            var headerLength = column.header.length;
                            column.width = Math.max(headerLength + 2, 15);
                        }
                    });
                    return [4 /*yield*/, workbook.xlsx.writeBuffer()];
                case 1:
                    buffer = _a.sent();
                    blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                    saveAs(blob, 'compliance_matrix.xlsx');
                    return [3 /*break*/, 3];
                case 2:
                    error_1 = _a.sent();
                    console.error('Error exporting to Excel:', error_1);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); };
    var exportToCSV = function () {
        var csvContent = __spreadArray([
            columns.map(function (col) { return col.headerName; }).join(',')
        ], rows.map(function (row) {
            return columns.map(function (col) {
                return "\"".concat(ensureString(row[col.field]).replace(/"/g, '""'), "\"");
            }).join(',');
        }), true).join('\n');
        var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
        saveAs(blob, 'compliance-matrix.csv');
    };
    var toggleRowExpansion = function (rowId) {
        setExpandedRows(function (prev) {
            var newSet = new Set(prev);
            if (newSet.has(rowId)) {
                newSet.delete(rowId);
            }
            else {
                newSet.add(rowId);
            }
            return newSet;
        });
    };
    var toggleAllRows = function () {
        if (allExpanded) {
            setExpandedRows(new Set());
        }
        else {
            setExpandedRows(new Set(clauses.map(function (clause) { return clause.id; })));
        }
        setAllExpanded(!allExpanded);
    };
    useEffect(function () {
        var processClauses = function () { return __awaiter(void 0, void 0, void 0, function () {
            var processedRows;
            return __generator(this, function (_a) {
                try {
                    processedRows = clauses.map(function (clause, index) { return ({
                        id: String(index + 1),
                        clauseId: clause.clauseId,
                        title: clause.title,
                        description: clause.description,
                        intent: clause.intent,
                        status: clause.status,
                        category: clause.category,
                        family: clause.family,
                        conditions: clause.conditions,
                        implementationGuidance: clause.implementationGuidance,
                        assessmentMethod: clause.assessmentMethod,
                        riskClassification: clause.riskClassification,
                        referenceUrl: clause.referenceUrl
                    }); });
                    setRows(processedRows);
                }
                catch (error) {
                    console.error('Error processing clauses:', error);
                }
                finally {
                    setLoading(false);
                }
                return [2 /*return*/];
            });
        }); };
        processClauses();
    }, [clauses]);
    if (loading) {
        return (_jsx(Box, { display: "flex", justifyContent: "center", alignItems: "center", height: "100%", children: _jsx(CircularProgress, {}) }));
    }
    return (_jsxs(Box, { sx: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }, children: [_jsxs(Box, { sx: { p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx(Button, { variant: "outlined", onClick: toggleAllRows, startIcon: allExpanded ? _jsx(ExpandLessIcon, {}) : _jsx(ExpandMoreIcon, {}), sx: {
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 600,
                        }, children: allExpanded ? 'Collapse All' : 'Expand All' }), _jsx(Button, { variant: "contained", startIcon: _jsx(FileDownloadIcon, {}), onClick: handleExport, sx: {
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 600,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            '&:hover': {
                                boxShadow: '0 4px 6px rgba(0,0,0,0.15)',
                            },
                        }, children: "Export Matrix" })] }), _jsx(Box, { sx: { flex: 1, overflow: 'auto', width: '100%' }, children: _jsx(TableContainer, { component: Paper, sx: {
                        maxHeight: '100%',
                        minWidth: 1200,
                        overflowX: 'auto',
                        borderRadius: 3,
                        boxShadow: '0 8px 32px 0 rgba(31,41,55,0.10)',
                        background: 'rgba(255,255,255,0.70)',
                        backdropFilter: 'blur(8px)',
                        border: '1.5px solid rgba(99,102,241,0.08)',
                        p: 0,
                        // Modern, minimal custom scrollbar
                        '&::-webkit-scrollbar': {
                            height: 8,
                            background: 'rgba(226,232,240,0.3)',
                            borderRadius: 6,
                        },
                        '&::-webkit-scrollbar-thumb': {
                            background: 'rgba(99,102,241,0.25)',
                            borderRadius: 6,
                            border: '2px solid rgba(255,255,255,0.5)',
                        },
                    }, children: _jsxs(Table, { stickyHeader: true, size: "small", children: [_jsx(TableHead, { children: _jsx(TableRow, { sx: {
                                        background: 'rgba(255,255,255,0.65)',
                                        backdropFilter: 'blur(6px)',
                                        boxShadow: '0 2px 8px 0 rgba(99,102,241,0.04)',
                                        '& th': {
                                            background: 'rgba(255,255,255,0.65)',
                                            fontWeight: 600,
                                            color: 'primary.main',
                                            letterSpacing: '0.01em',
                                            fontSize: '1rem',
                                            borderBottom: '3px solid #6366f1',
                                            borderColor: '#6366f1',
                                            position: 'sticky',
                                            top: 0,
                                            zIndex: 2,
                                            textShadow: 'none',
                                            boxShadow: 'none',
                                        },
                                    }, children: columns.map(function (column) { return (_jsxs(TableCell, { style: { minWidth: colWidths[column.field], width: colWidths[column.field], position: 'relative', paddingRight: 8 }, children: [(function () {
                                                switch (column.field) {
                                                    case 'intent':
                                                        return (_jsxs(_Fragment, { children: ["Intent", _jsx(Tooltip, { title: "The purpose and objective of the clause, explaining what it aims to achieve", children: _jsx(IconButton, { size: "small", sx: { ml: 0.5, p: 0.5 }, children: _jsx(InfoIcon, { fontSize: "small" }) }) })] }));
                                                    case 'conditions':
                                                        return (_jsxs(_Fragment, { children: ["Conditions", _jsx(Tooltip, { title: "Specific requirements and conditions that must be met to satisfy the clause", children: _jsx(IconButton, { size: "small", sx: { ml: 0.5, p: 0.5 }, children: _jsx(InfoIcon, { fontSize: "small" }) }) })] }));
                                                    case 'implementationGuidance':
                                                        return (_jsxs(_Fragment, { children: ["Implementation Guidance", _jsx(Tooltip, { title: "Practical steps and recommendations for implementing the clause requirements", children: _jsx(IconButton, { size: "small", sx: { ml: 0.5, p: 0.5 }, children: _jsx(InfoIcon, { fontSize: "small" }) }) })] }));
                                                    case 'reciprocity':
                                                        return (_jsxs(_Fragment, { children: ["Reciprocity", _jsx(Tooltip, { title: "How the clause's requirements may satisfy other clause requirements", children: _jsx(IconButton, { size: "small", sx: { ml: 0.5, p: 0.5 }, children: _jsx(InfoIcon, { fontSize: "small" }) }) })] }));
                                                    default:
                                                        return column.headerName;
                                                }
                                            })(), _jsx("span", { onMouseDown: function (e) { return handleMouseDown(e, column.field); }, style: {
                                                    position: 'absolute',
                                                    right: 0,
                                                    top: 0,
                                                    height: '100%',
                                                    width: 7,
                                                    cursor: 'col-resize',
                                                    zIndex: 10,
                                                    background: 'transparent',
                                                    transition: 'background 0.2s',
                                                    borderRight: '2px solid rgba(99,102,241,0.12)',
                                                }, onMouseOver: function (e) { return (e.currentTarget.style.background = 'rgba(99,102,241,0.08)'); }, onMouseOut: function (e) { return (e.currentTarget.style.background = 'transparent'); } })] }, column.field)); }) }) }), _jsx(TableBody, { children: rows.map(function (row) {
                                    var isExpanded = expandedRows.has(row.id.toString());
                                    var hasLongContent = columns.some(function (column) {
                                        var value = column.field === 'parentClause'
                                            ? getParentClauseId(clauses.find(function (c) { return c.id === row.id; }))
                                            : formatCellValue(row[column.field]);
                                        return typeof value === 'string' && value.length > 100;
                                    });
                                    return (_jsx(TableRow, { sx: {
                                            '&:nth-of-type(odd)': {
                                                backgroundColor: 'rgba(99, 102, 241, 0.04)',
                                            },
                                            '&:hover': {
                                                background: 'linear-gradient(90deg, rgba(99,102,241,0.08) 0%, rgba(99,102,241,0.03) 100%)',
                                                boxShadow: '0 2px 8px 0 rgba(99,102,241,0.08)',
                                                transition: 'background 0.2s, box-shadow 0.2s',
                                            },
                                        }, children: columns.map(function (column) {
                                            var value = column.field === 'parentClause'
                                                ? getParentClauseId(clauses.find(function (c) { return c.id === row.id; }))
                                                : formatCellValue(row[column.field]);
                                            var isLong = typeof value === 'string' && value.length > 100;
                                            var showExpandButton = isLong && !isExpanded;
                                            return (_jsx(Tooltip, { title: (!isExpanded && isLong) ? _jsx("span", { style: { whiteSpace: 'pre-line' }, children: value }) : '', placement: "top", arrow: true, disableHoverListener: isExpanded || !isLong, disableFocusListener: isExpanded || !isLong, disableTouchListener: isExpanded || !isLong, children: _jsxs(TableCell, { sx: {
                                                        borderBottom: '1px solid',
                                                        borderColor: 'divider',
                                                        py: 1.5,
                                                        maxWidth: colWidths[column.field],
                                                        width: colWidths[column.field],
                                                        whiteSpace: isExpanded ? 'pre-line' : 'nowrap',
                                                        overflow: isExpanded ? 'visible' : 'hidden',
                                                        textOverflow: isExpanded ? 'clip' : 'ellipsis',
                                                        wordBreak: 'break-word',
                                                        background: 'rgba(255,255,255,0.85)',
                                                        borderRadius: 2,
                                                        boxShadow: '0 1px 2px 0 rgba(99,102,241,0.03)',
                                                        position: 'relative',
                                                        height: isExpanded ? 'auto' : '160px',
                                                        maxHeight: isExpanded ? 'none' : '160px',
                                                    }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'flex-start', gap: 1 }, children: [_jsx(Typography, { variant: "body2", sx: {
                                                                        color: 'text.secondary',
                                                                        flex: 1,
                                                                        maxHeight: isExpanded ? 'none' : '140px',
                                                                        overflow: isExpanded ? 'visible' : 'hidden',
                                                                        whiteSpace: isExpanded ? 'pre-line' : 'normal',
                                                                        display: '-webkit-box',
                                                                        WebkitLineClamp: isExpanded ? 'none' : 6,
                                                                        WebkitBoxOrient: 'vertical',
                                                                    }, children: value }), showExpandButton && (_jsx(Tooltip, { title: "Click to expand", children: _jsx(IconButton, { size: "small", onClick: function () { return toggleRowExpansion(row.id.toString()); }, sx: {
                                                                            p: 0.5,
                                                                            ml: 0.5,
                                                                            color: 'primary.main',
                                                                            '&:hover': {
                                                                                backgroundColor: 'rgba(99,102,241,0.08)',
                                                                            },
                                                                        }, children: _jsx(ExpandMoreIcon, { fontSize: "small" }) }) })), isExpanded && (_jsx(Tooltip, { title: "Click to collapse", children: _jsx(IconButton, { size: "small", onClick: function () { return toggleRowExpansion(row.id.toString()); }, sx: {
                                                                            p: 0.5,
                                                                            ml: 0.5,
                                                                            color: 'primary.main',
                                                                            '&:hover': {
                                                                                backgroundColor: 'rgba(99,102,241,0.08)',
                                                                            },
                                                                        }, children: _jsx(ExpandLessIcon, { fontSize: "small" }) }) }))] }), !isExpanded && isLong && (_jsx(Box, { sx: {
                                                                position: 'absolute',
                                                                bottom: 0,
                                                                left: 0,
                                                                right: 0,
                                                                height: '20px',
                                                                background: 'linear-gradient(transparent, rgba(255,255,255,0.9))',
                                                                pointerEvents: 'none',
                                                            } }))] }) }, "".concat(row.id, "-").concat(column.field)));
                                        }) }, row.id));
                                }) })] }) }) }), _jsxs(Dialog, { open: exportDialogOpen, onClose: function () { return setExportDialogOpen(false); }, maxWidth: "xs", fullWidth: true, children: [_jsx(DialogTitle, { children: "Export Compliance Matrix" }), _jsx(DialogContent, { children: _jsxs(RadioGroup, { value: selectedFormat, onChange: function (e) { return setSelectedFormat(e.target.value); }, children: [_jsx(FormControlLabel, { value: "PDF", control: _jsx(Radio, {}), label: "PDF Document" }), _jsx(FormControlLabel, { value: "XLSX", control: _jsx(Radio, {}), label: "Excel Spreadsheet" }), _jsx(FormControlLabel, { value: "CSV", control: _jsx(Radio, {}), label: "CSV File" })] }) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: function () { return setExportDialogOpen(false); }, children: "Cancel" }), _jsx(Button, { onClick: handleExportConfirm, variant: "contained", sx: {
                                    textTransform: 'none',
                                    fontWeight: 600,
                                }, children: "Export" })] })] })] }));
};
