import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  Checkbox,
  Button,
  Collapse,
  IconButton,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import type { DetectedClause } from '../../services/scanApi';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScanResultsTableProps {
  results: DetectedClause[];
  onSelectionChange: (selectedClauseIds: string[]) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function confidenceColor(c: number): 'success' | 'warning' | 'error' {
  if (c >= 0.8) return 'success';
  if (c >= 0.5) return 'warning';
  return 'error';
}

function confidenceIcon(c: number) {
  return c >= 0.8 ? <CheckCircleIcon /> : <WarningIcon />;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ScanResultsTable: React.FC<ScanResultsTableProps> = ({ results, onSelectionChange }) => {
  const [selected, setSelected] = useState<Set<string>>(() => {
    // Default: select all clauses
    return new Set(results.map(r => r.clauseId));
  });
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Keep parent in sync
  const updateSelection = (next: Set<string>) => {
    setSelected(next);
    onSelectionChange(Array.from(next));
  };

  // Select / deselect all
  const allSelected = selected.size === results.length && results.length > 0;
  const someSelected = selected.size > 0 && selected.size < results.length;

  const handleSelectAll = () => {
    if (allSelected) {
      updateSelection(new Set());
    } else {
      updateSelection(new Set(results.map(r => r.clauseId)));
    }
  };

  const toggleRow = (clauseId: string) => {
    const next = new Set(selected);
    if (next.has(clauseId)) {
      next.delete(clauseId);
    } else {
      next.add(clauseId);
    }
    updateSelection(next);
  };

  const toggleExpand = (clauseId: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(clauseId)) {
        next.delete(clauseId);
      } else {
        next.add(clauseId);
      }
      return next;
    });
  };

  // Memoized selected count
  const selectedCount = useMemo(() => selected.size, [selected]);

  // Notify parent of initial selection (all selected) on first render
  React.useEffect(() => {
    onSelectionChange(results.map(r => r.clauseId));
    // Only on mount / when results change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results]);

  if (results.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">No clauses were detected in this document.</Typography>
      </Paper>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6">
          Scan Results &mdash; {results.length} clause{results.length !== 1 && 's'} detected
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {selectedCount} selected
        </Typography>
      </Box>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell>Clause ID</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Family</TableCell>
              <TableCell>Confidence</TableCell>
              <TableCell align="center">Details</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {results.map(row => {
              const isExpanded = expandedRows.has(row.clauseId);
              return (
                <React.Fragment key={row.clauseId}>
                  <TableRow
                    hover
                    selected={selected.has(row.clauseId)}
                    sx={{ '& > *': { borderBottom: isExpanded ? 'none' : undefined } }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selected.has(row.clauseId)}
                        onChange={() => toggleRow(row.clauseId)}
                      />
                    </TableCell>
                    <TableCell>{row.clauseId}</TableCell>
                    <TableCell>{row.title}</TableCell>
                    <TableCell>{row.family || '\u2014'}</TableCell>
                    <TableCell>
                      <Chip
                        icon={confidenceIcon(row.confidence)}
                        label={`${Math.round(row.confidence * 100)}%`}
                        color={confidenceColor(row.confidence)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      {row.supportingContext && (
                        <IconButton size="small" onClick={() => toggleExpand(row.clauseId)}>
                          {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>

                  {/* Expandable context row */}
                  {row.supportingContext && (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ py: 0 }}>
                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                          <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, my: 1 }}>
                            <Typography variant="subtitle2" color="primary" gutterBottom>
                              Supporting Context
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                              {row.supportingContext}
                            </Typography>
                            {row.conditions && (
                              <Box sx={{ mt: 1 }}>
                                <Typography variant="subtitle2" gutterBottom>Conditions</Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {row.conditions}
                                </Typography>
                              </Box>
                            )}
                            {row.implementationRequirements && (
                              <Box sx={{ mt: 1 }}>
                                <Typography variant="subtitle2" gutterBottom>Implementation Requirements</Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {row.implementationRequirements}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default ScanResultsTable;
