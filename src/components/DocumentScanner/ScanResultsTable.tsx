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
  Collapse,
  IconButton,
  Tooltip,
  Slider,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import type { ValidatedClause, MatchType } from '../../utils/clauseMatching';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScanResultsTableProps {
  results: ValidatedClause[];
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

function matchLabel(type: MatchType): string {
  switch (type) {
    case 'exact':      return 'Exact match';
    case 'normalized': return 'Matched (normalized)';
    case 'title':      return 'Matched by title';
    case 'none':       return 'Not in database';
  }
}

function matchChipColor(type: MatchType): 'success' | 'info' | 'warning' | 'error' {
  switch (type) {
    case 'exact':      return 'success';
    case 'normalized': return 'success';
    case 'title':      return 'info';
    case 'none':       return 'error';
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ScanResultsTable: React.FC<ScanResultsTableProps> = ({ results, onSelectionChange }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [selected, setSelected] = useState<Set<string>>(() => {
    // Default: select EVERY detected clause — matched and unmatched alike.
    // The scanner found it in the solicitation, so the safe default is to
    // include it. Excluding a clause is a deliberate user action, guarded by
    // a confirmation dialog at save time. Auto-deselecting unmatched clauses
    // would make the riskiest items (regulations not in our database) the
    // easiest to silently lose.
    return new Set(results.map(r => r.clauseId));
  });
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0);

  // Keep parent in sync — send matchedClauseId (DB UUID) for matched clauses,
  // or the AI clauseId string for unmatched clauses so they are included in the
  // clauseFilter and the backend can create new clause records for them.
  const updateSelection = (next: Set<string>) => {
    setSelected(next);
    const ids = results
      .filter(r => next.has(r.clauseId))
      .map(r => r.matchedClauseId || r.clauseId);
    onSelectionChange(ids);
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

  // Memoized counts
  const selectedCount = useMemo(() => selected.size, [selected]);
  const matchedCount = useMemo(() => results.filter(r => r.matchType !== 'none').length, [results]);

  // Apply confidence threshold — select clauses at or above the threshold,
  // deselect below. Filters purely on confidence; matched and unmatched
  // clauses are treated alike (an unmatched clause above the threshold is
  // still a real detection worth keeping).
  const applyThreshold = (threshold: number) => {
    setConfidenceThreshold(threshold);
    if (threshold === 0) return; // 0 means no filter active
    const thresholdDecimal = threshold / 100;
    const next = new Set<string>(
      results
        .filter(r => r.confidence >= thresholdDecimal)
        .map(r => r.clauseId),
    );
    updateSelection(next);
  };

  // Reset selection & expanded state when results change (e.g. second scan).
  // Also notifies parent with the correct initial UUIDs for the new results.
  // Default selects ALL detected clauses (see useState initializer above).
  React.useEffect(() => {
    const defaultSelected = new Set(results.map(r => r.clauseId));
    setSelected(defaultSelected);
    setExpandedRows(new Set());
    setConfidenceThreshold(0);

    const initialIds = results.map(r => r.matchedClauseId || r.clauseId);
    onSelectionChange(initialIds);
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
      <Box sx={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'flex-start' : 'center',
        gap: isMobile ? 1 : 0,
        mb: 1,
      }}>
        <Typography variant={isMobile ? 'subtitle1' : 'h6'}>
          Scan Results &mdash; {results.length} clause{results.length !== 1 && 's'} detected
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <Chip
            icon={<LinkIcon />}
            label={`${matchedCount} matched`}
            color="success"
            variant="outlined"
            size="small"
          />
          {results.length - matchedCount > 0 && (
            <Chip
              icon={<LinkOffIcon />}
              label={`${results.length - matchedCount} unmatched`}
              color="error"
              variant="outlined"
              size="small"
            />
          )}
          <Typography variant="body2" color="text.secondary">
            {selectedCount} selected
          </Typography>
        </Box>
      </Box>

      {/* Confidence threshold slider */}
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 2, mb: 1.5, px: 1,
        flexDirection: isMobile ? 'column' : 'row',
      }}>
        <Typography variant="body2" sx={{ fontWeight: 500, whiteSpace: 'nowrap', minWidth: 140 }}>
          Confidence Threshold: {confidenceThreshold > 0 ? `${confidenceThreshold}%` : 'Off'}
        </Typography>
        <Slider
          value={confidenceThreshold}
          onChange={(_, v) => applyThreshold(v as number)}
          min={0}
          max={100}
          step={5}
          marks={[
            { value: 0, label: 'Off' },
            { value: 50, label: '50%' },
            { value: 80, label: '80%' },
            { value: 100, label: '100%' },
          ]}
          valueLabelDisplay="auto"
          valueLabelFormat={(v) => v === 0 ? 'Off' : `${v}%`}
          sx={{
            flex: 1,
            '& .MuiSlider-markLabel': { fontSize: '0.65rem' },
            '& .MuiSlider-thumb': { width: 16, height: 16 },
          }}
        />
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
              {!isMobile && <TableCell>Title</TableCell>}
              {!isMobile && <TableCell>Family</TableCell>}
              <TableCell>Confidence</TableCell>
              <TableCell>DB Status</TableCell>
              {!isMobile && <TableCell align="center">Details</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {results.map(row => {
              const isExpanded = expandedRows.has(row.clauseId);
              const isUnmatched = row.matchType === 'none';
              return (
                <React.Fragment key={row.clauseId}>
                  <TableRow
                    hover
                    selected={selected.has(row.clauseId)}
                    sx={{
                      '& > *': { borderBottom: isExpanded ? 'none' : undefined },
                      opacity: isUnmatched ? 0.7 : 1,
                    }}
                  >
                    <TableCell padding="checkbox">
                      <Tooltip
                        title={isUnmatched
                          ? 'This clause is not in the database. Including it may result in limited data in the project matrix.'
                          : ''
                        }
                      >
                        <Checkbox
                          checked={selected.has(row.clauseId)}
                          onChange={() => toggleRow(row.clauseId)}
                        />
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: isUnmatched ? 'normal' : 'medium' }}>
                        {row.clauseId}
                      </Typography>
                    </TableCell>
                    {!isMobile && (
                      <TableCell>
                        {row.dbMatch ? (
                          <Tooltip title={`DB title: ${row.dbMatch.title}`}>
                            <Typography variant="body2">{row.dbMatch.title}</Typography>
                          </Tooltip>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            {row.title}
                          </Typography>
                        )}
                      </TableCell>
                    )}
                    {!isMobile && <TableCell>{row.family || '\u2014'}</TableCell>}
                    <TableCell>
                      <Chip
                        icon={confidenceIcon(row.confidence)}
                        label={`${Math.round(row.confidence * 100)}%`}
                        color={confidenceColor(row.confidence)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={isUnmatched ? <ErrorOutlineIcon /> : <CheckCircleIcon />}
                        label={matchLabel(row.matchType)}
                        color={matchChipColor(row.matchType)}
                        size="small"
                        variant={isUnmatched ? 'outlined' : 'filled'}
                      />
                    </TableCell>
                    {!isMobile && (
                      <TableCell align="center">
                        {(row.supportingContext || row.dbMatch) && (
                          <IconButton size="small" onClick={() => toggleExpand(row.clauseId)}>
                            {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                          </IconButton>
                        )}
                      </TableCell>
                    )}
                  </TableRow>

                  {/* Expandable detail row */}
                  {!isMobile && (row.supportingContext || row.dbMatch) && (
                    <TableRow>
                      <TableCell colSpan={7} sx={{ py: 0 }}>
                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                          <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, my: 1 }}>
                            {/* DB match info */}
                            {row.dbMatch && (
                              <Box sx={{ mb: row.supportingContext ? 2 : 0 }}>
                                <Typography variant="subtitle2" color="success.main" gutterBottom>
                                  Matched Database Entry
                                </Typography>
                                {row.dbMatch.description && (
                                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                    <strong>Description:</strong> {row.dbMatch.description}
                                  </Typography>
                                )}
                                {row.dbMatch.intent && (
                                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                    <strong>Intent:</strong> {row.dbMatch.intent}
                                  </Typography>
                                )}
                                {row.dbMatch.clauseCategory && (
                                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                    <strong>Category:</strong> {row.dbMatch.clauseCategory}
                                  </Typography>
                                )}
                                <Typography variant="caption" color="text.disabled">
                                  Clause Code: {row.dbMatch.clauseCode} | Match: {matchLabel(row.matchType)}
                                </Typography>
                              </Box>
                            )}

                            {/* Scan supporting context */}
                            {row.supportingContext && (
                              <Box>
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

      {/* Summary note about unmatched clauses */}
      {results.length - matchedCount > 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, fontStyle: 'italic' }}>
          Clauses not found in the database will have limited data in the project matrix
          (no framework controls or implementation guidance). They are still selected by
          default — the scanner found them in your solicitation, so they are tracked as
          posture gaps unless you deliberately exclude them.
        </Typography>
      )}
    </Box>
  );
};

export default ScanResultsTable;
