import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  RadioGroup,
  Radio,
  FormControlLabel,
  CircularProgress,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { Clause, MatrixRow, ClauseFamily } from '../types/clause';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';

interface ComplianceMatrixProps {
  rows: MatrixRow[];
}

type ExportFormat = 'PDF' | 'XLSX' | 'CSV';

// Helper function to ensure safe string values
const ensureString = (value: any): string => {
  if (value === undefined || value === null) return '';

  // Handle arrays gracefully
  if (Array.isArray(value)) {
    return value.join(', ');
  }

  // Handle objects – if there is a `name` field, prefer that, otherwise JSON stringify
  if (typeof value === 'object') {
    if ('name' in value && typeof (value as any).name === 'string') {
      return (value as any).name as string;
    }
    // Fallback: stringify the object so that it is at least readable
    return JSON.stringify(value);
  }

  return String(value);
};

export const ComplianceMatrix: React.FC<ComplianceMatrixProps> = ({ rows }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('PDF');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [allExpanded, setAllExpanded] = useState(false);

  // Define the default column widths
  const DEFAULT_COL_WIDTHS: Record<string, number> = {
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

  // Mobile-optimized column widths (narrower to fit small screens)
  const MOBILE_COL_WIDTHS: Record<string, number> = {
    clauseId: 90,
    title: 180,
    status: 80,
    riskClassification: 90,
  };

  // All columns available on desktop
  const allColumns: GridColDef[] = [
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
    { field: 'riskClassification', headerName: 'Risk', width: 150 },
    { field: 'referenceUrl', headerName: 'Reference URL', width: 200 }
  ];

  // Mobile: show only key columns; Desktop: show all
  const MOBILE_FIELDS = ['clauseId', 'title', 'status', 'riskClassification'];
  const columns = isMobile
    ? allColumns.filter(c => MOBILE_FIELDS.includes(c.field))
    : allColumns;

  // Column widths state — use mobile-optimized widths on small screens
  const [colWidths, setColWidths] = useState(() =>
    isMobile ? { ...MOBILE_COL_WIDTHS } : { ...DEFAULT_COL_WIDTHS }
  );
  const resizingCol = useRef<string | null>(null);
  const startX = useRef<number>(0);
  const startWidth = useRef<number>(0);

  const handleMouseDown = (e: React.MouseEvent, colId: string) => {
    resizingCol.current = colId;
    startX.current = e.clientX;
    startWidth.current = colWidths[colId];
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!resizingCol.current) return;
    const delta = e.clientX - startX.current;
    setColWidths((prev) => ({
      ...prev,
      [resizingCol.current!]: Math.max(60, startWidth.current + delta),
    }));
  };

  const handleMouseUp = () => {
    resizingCol.current = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  // Function to find parent clause's clauseId
  const getParentClauseId = (clause: Clause): string => {
    if (!clause.parentClause) return '';
    const parent = rows.find(c => c.id === clause.parentClause);
    return parent ? parent.clauseId : '';
  };

  // Function to format cell value
  const formatCellValue = (value: any): string => {
    if (value === null || value === undefined) return '';

    // Handle arrays first
    if (Array.isArray(value)) {
      return value.join(', ');
    }

    // Handle objects – show `name` if present, otherwise JSON stringify
    if (typeof value === 'object') {
      if ('name' in value && typeof (value as any).name === 'string') {
        return (value as any).name as string;
      }
      return JSON.stringify(value);
    }

    return String(value);
  };

  const handleExport = () => {
    setExportDialogOpen(true);
  };

  const handleExportConfirm = () => {
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

  const exportToPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape orientation
    const tableColumn = columns.map(col => col.headerName);
    const tableRows = rows.map(row => 
      columns.map(col => ensureString(row[col.field as keyof MatrixRow]))
    );

    autoTable(doc, {
      head: [tableColumn as string[]],
      body: tableRows as string[][],
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

  const exportToXLSX = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Compliance Matrix');

      // Add headers
      const headers = columns.map(col => col.headerName);
      worksheet.addRow(headers);

      // Add data with proper type handling
      rows.forEach(row => {
        const rowData = columns.map(col => 
          ensureString(row[col.field as keyof MatrixRow])
        );
        worksheet.addRow(rowData);
      });

      // Style the header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      // Auto-fit columns
      worksheet.columns.forEach(column => {
        if (column.header) {
          const headerLength = column.header.length;
          column.width = Math.max(headerLength + 2, 15);
        }
      });

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, 'compliance_matrix.xlsx');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
    }
  };

  const exportToCSV = () => {
    const csvContent = [
      columns.map(col => col.headerName).join(','),
      ...rows.map(row => 
        columns.map(col => 
          `"${ensureString(row[col.field as keyof MatrixRow]).replace(/"/g, '""')}"`
        ).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, 'compliance-matrix.csv');
  };

  const toggleRowExpansion = (rowId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) {
        newSet.delete(rowId);
      } else {
        newSet.add(rowId);
      }
      return newSet;
    });
  };

  const toggleAllRows = () => {
    if (allExpanded) {
      setExpandedRows(new Set());
    } else {
      setExpandedRows(new Set(rows.map(clause => clause.id)));
    }
    setAllExpanded(!allExpanded);
  };

  const getFamilyName = (family: ClauseFamily | null): string => {
    return family?.name || 'Uncategorized';
  };

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{
        p: isMobile ? 1 : 2,
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'stretch' : 'center',
        gap: isMobile ? 1 : 0,
      }}>
        <Button
          variant="outlined"
          size={isMobile ? 'small' : 'medium'}
          onClick={toggleAllRows}
          startIcon={allExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
          }}
        >
          {allExpanded ? 'Collapse All' : 'Expand All'}
        </Button>
        <Button
          variant="contained"
          size={isMobile ? 'small' : 'medium'}
          startIcon={<FileDownloadIcon />}
          onClick={handleExport}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            '&:hover': {
              boxShadow: '0 4px 6px rgba(0,0,0,0.15)',
            },
          }}
        >
          Export Matrix
        </Button>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', width: '100%' }}>
        <TableContainer
          component={Paper}
          sx={{
            maxHeight: '100%',
            minWidth: isMobile ? 'unset' : 1200,
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
          }}
        >
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow
                sx={{
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
                }}
              >
                {columns.map((column) => (
                  <TableCell key={column.field} style={{ minWidth: colWidths[column.field], width: colWidths[column.field], position: 'relative', paddingRight: 8 }}>
                    {(() => {
                      switch (column.field) {
                        case 'intent':
                          return (
                            <>
                              Intent
                              <Tooltip title="The purpose and objective of the clause, explaining what it aims to achieve">
                                <IconButton size="small" sx={{ ml: 0.5, p: 0.5 }}>
                                  <InfoIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          );
                        case 'conditions':
                          return (
                            <>
                              Conditions
                              <Tooltip title="Specific requirements and conditions that must be met to satisfy the clause">
                                <IconButton size="small" sx={{ ml: 0.5, p: 0.5 }}>
                                  <InfoIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          );
                        case 'implementationGuidance':
                          return (
                            <>
                              Implementation Guidance
                              <Tooltip title="Practical steps and recommendations for implementing the clause requirements">
                                <IconButton size="small" sx={{ ml: 0.5, p: 0.5 }}>
                                  <InfoIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          );
                        case 'reciprocity':
                          return (
                            <>
                              Reciprocity
                              <Tooltip title="How the clause's requirements may satisfy other clause requirements">
                                <IconButton size="small" sx={{ ml: 0.5, p: 0.5 }}>
                                  <InfoIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          );
                        default:
                          return column.headerName;
                      }
                    })()}
                    {/* Resizer handle – hidden on mobile (no mouse drag) */}
                    {!isMobile && (
                      <span
                        onMouseDown={(e) => handleMouseDown(e, column.field)}
                        style={{
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
                        }}
                        onMouseOver={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.08)')}
                        onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                      />
                    )}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => {
                const isExpanded = expandedRows.has(row.id.toString());
                const hasLongContent = columns.some(column => {
                  const value = column.field === 'parentClause' 
                    ? getParentClauseId(rows.find(c => c.id === row.id) as Clause)
                    : formatCellValue(row[column.field as keyof MatrixRow]);
                  return typeof value === 'string' && value.length > 100;
                });

                return (
                  <TableRow
                    key={row.id}
                    sx={{
                      '&:nth-of-type(odd)': {
                        backgroundColor: 'rgba(99, 102, 241, 0.04)',
                      },
                      '&:hover': {
                        background: 'linear-gradient(90deg, rgba(99,102,241,0.08) 0%, rgba(99,102,241,0.03) 100%)',
                        boxShadow: '0 2px 8px 0 rgba(99,102,241,0.08)',
                        transition: 'background 0.2s, box-shadow 0.2s',
                      },
                    }}
                  >
                    {columns.map((column) => {
                      const value = column.field === 'parentClause'
                        ? getParentClauseId(rows.find(c => c.id === row.id) as Clause)
                        : formatCellValue(row[column.field as keyof MatrixRow]);
                      const isLong = typeof value === 'string' && value.length > 100;
                      const showExpandButton = isLong && !isExpanded;

                      return (
                        <Tooltip
                          key={`${row.id}-${column.field}`}
                          title={(!isExpanded && isLong) ? <span style={{ whiteSpace: 'pre-line' }}>{value}</span> : ''}
                          placement="top"
                          arrow
                          disableHoverListener={isExpanded || !isLong}
                          disableFocusListener={isExpanded || !isLong}
                          disableTouchListener={isExpanded || !isLong}
                        >
                          <TableCell
                            sx={{
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
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                              <Typography
                                variant="body2"
                                sx={{
                                  color: 'text.secondary',
                                  flex: 1,
                                  maxHeight: isExpanded ? 'none' : '140px',
                                  overflow: isExpanded ? 'visible' : 'hidden',
                                  whiteSpace: isExpanded ? 'pre-line' : 'normal',
                                  display: '-webkit-box',
                                  WebkitLineClamp: isExpanded ? 'none' : 6,
                                  WebkitBoxOrient: 'vertical',
                                }}
                              >
                                {value}
                              </Typography>
                              {showExpandButton && (
                                <Tooltip title="Click to expand">
                                  <IconButton
                                    size="small"
                                    onClick={() => toggleRowExpansion(row.id.toString())}
                                    sx={{
                                      p: 0.5,
                                      ml: 0.5,
                                      color: 'primary.main',
                                      '&:hover': {
                                        backgroundColor: 'rgba(99,102,241,0.08)',
                                      },
                                    }}
                                  >
                                    <ExpandMoreIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                              {isExpanded && (
                                <Tooltip title="Click to collapse">
                                  <IconButton
                                    size="small"
                                    onClick={() => toggleRowExpansion(row.id.toString())}
                                    sx={{
                                      p: 0.5,
                                      ml: 0.5,
                                      color: 'primary.main',
                                      '&:hover': {
                                        backgroundColor: 'rgba(99,102,241,0.08)',
                                      },
                                    }}
                                  >
                                    <ExpandLessIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Box>
                            {!isExpanded && isLong && (
                              <Box
                                sx={{
                                  position: 'absolute',
                                  bottom: 0,
                                  left: 0,
                                  right: 0,
                                  height: '20px',
                                  background: 'linear-gradient(transparent, rgba(255,255,255,0.9))',
                                  pointerEvents: 'none',
                                }}
                              />
                            )}
                          </TableCell>
                        </Tooltip>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Dialog 
        open={exportDialogOpen} 
        onClose={() => setExportDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Export Compliance Matrix</DialogTitle>
        <DialogContent>
          <RadioGroup
            value={selectedFormat}
            onChange={(e) => setSelectedFormat(e.target.value as ExportFormat)}
          >
            <FormControlLabel 
              value="PDF" 
              control={<Radio />} 
              label="PDF Document" 
            />
            <FormControlLabel 
              value="XLSX" 
              control={<Radio />} 
              label="Excel Spreadsheet" 
            />
            <FormControlLabel 
              value="CSV" 
              control={<Radio />} 
              label="CSV File" 
            />
          </RadioGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleExportConfirm} 
            variant="contained"
            sx={{
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            Export
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}; 