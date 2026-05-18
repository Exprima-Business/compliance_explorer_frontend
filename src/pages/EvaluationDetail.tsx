import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, CircularProgress, Alert, Chip, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Checkbox,
  Snackbar, Link, useTheme, useMediaQuery,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  evaluationService,
  type EvaluationDetail as EvaluationDetailData,
  type CoverageStatus,
} from '../services/evaluationService';
import { useProject } from '../contexts/ProjectContext';
import { useBookmarks } from '../contexts/BookmarkContext';

const COVERAGE_COLOR: Record<CoverageStatus, 'success' | 'warning' | 'default'> = {
  covered: 'success',
  gap: 'warning',
  unknown: 'default',
};

/** One coverage stat tile. */
const StatTile: React.FC<{ label: string; value: number; color?: string }> = ({ label, value, color }) => (
  <Card variant="outlined" sx={{ flex: 1, minWidth: 110 }}>
    <CardContent sx={{ textAlign: 'center', '&:last-child': { pb: 2 } }}>
      <Typography variant="h4" sx={{ fontWeight: 700, color }}>{value}</Typography>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
    </CardContent>
  </Card>
);

const EvaluationDetail: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { currentProject, projects } = useProject();
  const { refresh: refreshBookmarks } = useBookmarks();
  const program = currentProject ?? projects?.[0] ?? null;

  const [detail, setDetail] = useState<EvaluationDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);
  const [snack, setSnack] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const resp = await evaluationService.get(id);
      if (cancelled) return;
      if (resp.error) {
        setError(typeof resp.error === 'string' ? resp.error : resp.error.message);
      } else if (resp.data) {
        setDetail(resp.data);
        // Default selection: the gaps — clauses the solicitation needs that
        // the program does not yet track. Those are the actionable items.
        setSelected(new Set(
          resp.data.clauses.filter(c => c.coverageStatus === 'gap').map(c => c.id),
        ));
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id]);

  const clauses = detail?.clauses ?? [];
  const allSelected = clauses.length > 0 && selected.size === clauses.length;

  const toggle = (clauseRowId: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(clauseRowId) ? next.delete(clauseRowId) : next.add(clauseRowId);
      return next;
    });
  };
  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(clauses.map(c => c.id)));
  };

  const handleApply = async () => {
    if (!id || !program) return;
    setApplying(true);
    setError(null);
    const resp = await evaluationService.apply(id, program.id, Array.from(selected));
    if (resp.error) {
      setApplying(false);
      setError(typeof resp.error === 'string' ? resp.error : resp.error.message);
      return;
    }
    const r = resp.data;
    setSnack(
      `Applied to ${program.name}: ${r?.appliedMatched ?? 0} tracked clause(s)` +
      `${r?.appliedScanDetected ? `, ${r.appliedScanDetected} posture gap(s)` : ''}` +
      `, ${r?.bookmarksCreated ?? 0} bookmark(s). Opening your compliance matrix…`,
    );
    // Pull the freshly-applied clauses into the bookmark cache so the matrix
    // renders them, then route the user to their next step: activating the
    // frameworks those clauses require and working the controls.
    await refreshBookmarks();
    setApplying(false);
    setTimeout(() => navigate('/matrix'), 1800);
  };

  const summary = useMemo(
    () => detail?.evaluation.coverageSummary ?? { detected: 0, covered: 0, gaps: 0, unknown: 0 },
    [detail],
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !detail) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/evaluations')} sx={{ mt: 2 }}>
          All evaluations
        </Button>
      </Box>
    );
  }

  const evaluation = detail!.evaluation;

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <Link
        component="button"
        onClick={() => navigate('/evaluations')}
        sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mb: 1.5 }}
      >
        <ArrowBackIcon fontSize="small" /> All evaluations
      </Link>

      <Typography variant={isMobile ? 'h5' : 'h4'} gutterBottom>{evaluation.title}</Typography>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3, color: 'text.secondary' }}>
        {evaluation.agency && <Typography variant="body2">Agency: {evaluation.agency}</Typography>}
        {evaluation.solicitationNumber && (
          <Typography variant="body2">No. {evaluation.solicitationNumber}</Typography>
        )}
        {evaluation.responseDueDate && (
          <Typography variant="body2">
            Due: {new Date(evaluation.responseDueDate).toLocaleDateString()}
          </Typography>
        )}
        <Chip size="small" label={evaluation.status} variant="outlined" />
      </Box>

      {/* Coverage summary */}
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 3 }}>
        <StatTile label="Detected" value={summary.detected} />
        <StatTile label="Covered" value={summary.covered} color={theme.palette.success.main} />
        <StatTile label="Gaps" value={summary.gaps} color={theme.palette.warning.main} />
        <StatTile label="Unknown" value={summary.unknown} color={theme.palette.text.disabled} />
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Apply bar */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ flex: 1, minWidth: 220 }}>
            <Typography variant="subtitle2">Apply clauses to your compliance program</Typography>
            <Typography variant="caption" color="text.secondary">
              {program
                ? `Selected clauses are added to "${program.name}" for tracking. The evaluation record is unchanged.`
                : 'No compliance program found — applying is unavailable.'}
            </Typography>
          </Box>
          <Button
            variant="contained"
            disabled={!program || applying || selected.size === 0}
            startIcon={applying ? <CircularProgress size={18} /> : undefined}
            onClick={handleApply}
          >
            {applying ? 'Applying…' : `Apply ${selected.size} to program`}
          </Button>
        </CardContent>
      </Card>

      {/* Clause list */}
      <Card>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={allSelected}
                    indeterminate={selected.size > 0 && !allSelected}
                    onChange={toggleAll}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Clause</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Title</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Confidence</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Coverage</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {clauses.map(c => (
                <TableRow key={c.id} hover selected={selected.has(c.id)}>
                  <TableCell padding="checkbox">
                    <Checkbox checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {c.clauseCode || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{c.title || '—'}</Typography>
                  </TableCell>
                  <TableCell>
                    {c.confidence != null ? `${Math.round(c.confidence * 100)}%` : '—'}
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={c.coverageStatus} color={COVERAGE_COLOR[c.coverageStatus]} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Snackbar
        open={!!snack}
        autoHideDuration={6000}
        onClose={() => setSnack(null)}
        message={snack ?? ''}
      />
    </Box>
  );
};

export default EvaluationDetail;
