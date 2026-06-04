import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Accordion, AccordionDetails, AccordionSummary,
  Box, Typography, Card, CardContent, CircularProgress, Alert, Chip, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Checkbox,
  Snackbar, Link, LinearProgress, useTheme, useMediaQuery,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import PendingIcon from '@mui/icons-material/Pending';
import BlockIcon from '@mui/icons-material/Block';
import LinkIcon from '@mui/icons-material/Link';
import {
  evaluationService,
  type EvaluationDetail as EvaluationDetailData,
  type RequiredFramework,
  type ImplicatedControl,
  type CoverageStatus,
} from '../services/evaluationService';
import { useProject } from '../contexts/ProjectContext';
import { useBookmarks } from '../contexts/BookmarkContext';

// The clause-row chip describes SCOPE — is this detected clause already in
// your program, or a new requirement? It is deliberately NOT a compliance
// signal; compliance lives in the per-framework completion panel above.
const SCOPE_COLOR: Record<CoverageStatus, 'info' | 'warning' | 'default'> = {
  covered: 'info',
  gap: 'warning',
  unknown: 'default',
};
const SCOPE_LABEL: Record<CoverageStatus, string> = {
  covered: 'Already in program',
  gap: 'New requirement',
  unknown: 'Not in catalog',
};

/** MUI palette key for a completion percentage. */
const pctColor = (pct: number): 'success' | 'warning' | 'error' =>
  pct >= 80 ? 'success' : pct >= 40 ? 'warning' : 'error';

// ─────────────────────────────────────────────────────────────────────────────
// Go / Evaluate / No-Go verdict — derived purely from data we already have
// ─────────────────────────────────────────────────────────────────────────────

type Verdict = 'GO' | 'EVALUATE' | 'NO_GO';

interface VerdictResult {
  verdict: Verdict;
  headline: string;
  rationale: string[];
  /** Min framework completion across all required-but-activated frameworks (or null if none). */
  minActivatedPct: number | null;
  /** Required frameworks the program hasn't activated yet. */
  notActivatedNames: string[];
  /** Critical detected clauses that are "new" (not yet in program). */
  newClauseCount: number;
}

/**
 * Compute the Go / Evaluate / No-Go verdict from the evaluation data.
 *
 * Inputs (all sourced from the BE response — no platform interpretation):
 *   - coverage summary (detected / covered / gaps / unknown)
 *   - per-framework completion % for required frameworks
 *   - activated flag on each required framework
 *
 * Defensibility note: this is a heuristic *decision-support* summary, NOT a
 * compliance attestation. The rationale strings make the inputs explicit so
 * a contracting officer / acquisition lead sees why the verdict landed.
 */
function computeVerdict(
  frameworks: RequiredFramework[],
  coverage: { detected: number; covered: number; gaps: number; unknown: number },
): VerdictResult {
  const activated = frameworks.filter(f => f.activated);
  const notActivated = frameworks.filter(f => !f.activated);

  // Phase B-2: verdict now uses doc-SCOPED completion — the percentage of
  // controls THIS document implicates that are implemented. Framework-wide
  // posture is informative but the verdict's job is "are you ready for
  // THIS solicitation," which depends on the implicated subset.
  const minActivatedPct = activated.length > 0
    ? Math.min(...activated.map(f => f.docScopedCompletionPct))
    : null;

  const newClauseCount = coverage.gaps;
  const rationale: string[] = [];
  let verdict: Verdict;
  let headline: string;

  if (notActivated.length > 0) {
    rationale.push(
      `${notActivated.length} required framework${notActivated.length === 1 ? '' : 's'} not activated: ${notActivated.map(f => f.name).join(', ')}.`
    );
  }

  if (activated.length > 0) {
    rationale.push(
      `For the controls this document implicates, completion ranges from ${Math.min(...activated.map(f => f.docScopedCompletionPct))}% to ${Math.max(...activated.map(f => f.docScopedCompletionPct))}%.`
    );
  }

  if (newClauseCount > 0) {
    rationale.push(
      `${newClauseCount} new requirement${newClauseCount === 1 ? '' : 's'} the solicitation introduces beyond your current program scope.`
    );
  }

  if (coverage.unknown > 0) {
    rationale.push(
      `${coverage.unknown} detected clause${coverage.unknown === 1 ? '' : 's'} not yet in our catalog — manual review recommended.`
    );
  }

  // Verdict thresholds — intentionally conservative. A "GO" recommendation
  // implies the platform has high confidence; ambiguous cases get
  // "EVALUATE" so the user is forced to look at the detail.
  if (frameworks.length === 0) {
    verdict = 'EVALUATE';
    headline = 'Solicitation detected no tracked compliance frameworks';
  } else if (notActivated.length > 0 && newClauseCount > 0) {
    verdict = 'NO_GO';
    headline = 'You have not activated required frameworks for this solicitation';
  } else if (minActivatedPct !== null && minActivatedPct < 40) {
    verdict = 'NO_GO';
    headline = 'A required framework is less than 40% implemented';
  } else if (minActivatedPct !== null && minActivatedPct < 80) {
    verdict = 'EVALUATE';
    headline = 'Required frameworks are partially implemented — review the gaps';
  } else if (minActivatedPct !== null && minActivatedPct >= 80) {
    verdict = 'GO';
    headline = 'Your program substantially covers this solicitation';
  } else {
    verdict = 'EVALUATE';
    headline = 'Review required before bidding';
  }

  return {
    verdict,
    headline,
    rationale,
    minActivatedPct,
    notActivatedNames: notActivated.map(f => f.name),
    newClauseCount,
  };
}

const VERDICT_PALETTE: Record<Verdict, { color: string; bg: string; label: string }> = {
  GO: { color: '#22c55e', bg: 'rgba(34,197,94,0.08)', label: 'GO' },
  EVALUATE: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', label: 'EVALUATE' },
  NO_GO: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)', label: 'NO-GO' },
};

/**
 * Renderer for an implicated control's implementation state — icon + chip
 * combo that the per-framework breakdown uses to surface "control 3 not
 * addressed" affordances.
 */
const STATUS_ICON: Record<NonNullable<ImplicatedControl['status']> | 'NULL', React.ReactNode> = {
  IMPLEMENTED: <CheckCircleIcon fontSize="small" sx={{ color: 'success.main' }} />,
  IN_PROGRESS: <PendingIcon fontSize="small" sx={{ color: 'warning.main' }} />,
  NOT_STARTED: <RadioButtonUncheckedIcon fontSize="small" sx={{ color: 'error.main' }} />,
  NOT_APPLICABLE: <BlockIcon fontSize="small" sx={{ color: 'text.disabled' }} />,
  NULL: <RadioButtonUncheckedIcon fontSize="small" sx={{ color: 'error.main' }} />,
};

const STATUS_LABEL: Record<NonNullable<ImplicatedControl['status']> | 'NULL', string> = {
  IMPLEMENTED: 'Implemented',
  IN_PROGRESS: 'In progress',
  NOT_STARTED: 'Not started',
  NOT_APPLICABLE: 'N/A',
  NULL: 'Not addressed',
};

const ControlRow: React.FC<{ ctl: ImplicatedControl }> = ({ ctl }) => {
  const key = (ctl.status ?? 'NULL') as keyof typeof STATUS_ICON;
  // Crosswalk-satisfied controls render as "Implemented" with a distinct
  // chip so the user can see the credit chain.
  const effectiveKey = ctl.satisfiedViaCrosswalk ? 'IMPLEMENTED' : key;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.5 }}>
      {STATUS_ICON[effectiveKey]}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
          {ctl.identifier}
          {ctl.name && (
            <Typography component="span" variant="body2" color="text.secondary" sx={{ fontWeight: 400, ml: 1 }}>
              {ctl.name}
            </Typography>
          )}
        </Typography>
      </Box>
      <Chip
        size="small"
        label={STATUS_LABEL[effectiveKey]}
        color={effectiveKey === 'IMPLEMENTED' ? 'success' : effectiveKey === 'IN_PROGRESS' ? 'warning' : effectiveKey === 'NOT_APPLICABLE' ? 'default' : 'error'}
        sx={{ height: 20, fontSize: 11 }}
      />
      {ctl.satisfiedViaCrosswalk && (
        <Chip
          size="small"
          icon={<LinkIcon sx={{ fontSize: 14 }} />}
          label="crosswalk"
          variant="outlined"
          sx={{ height: 20, fontSize: 11 }}
          title="Satisfied because every cross-framework derived-from target is implemented"
        />
      )}
    </Box>
  );
};

/**
 * Compliance breakdown — the headline answer to "am I ready for this
 * document?" One card per framework the document implicates. Each card
 * shows:
 *   - DOC-SCOPED percentage as the headline (controls THIS document
 *     requires that are implemented). The user's question is "ready
 *     for this doc?", not "ready overall?"
 *   - Framework-wide percentage as small secondary context.
 *   - Expandable list of implicated controls + their status so the user
 *     can drill into "control 3 not addressed" specifics.
 *
 * Frameworks are sorted: not-activated first (the biggest gaps), then by
 * doc-scoped completion ascending (lowest first — the work to do).
 */
const ComplianceBreakdown: React.FC<{
  frameworks: RequiredFramework[];
  controlsByClauseId: Record<string, ImplicatedControl[]>;
}> = ({ frameworks, controlsByClauseId }) => {
  if (frameworks.length === 0) return null;

  // Build per-framework control roster by flattening + deduping across clauses
  // — a control may be implicated by more than one clause; we show it once.
  const controlsByFwId = new Map<string, ImplicatedControl[]>();
  const seen = new Set<string>();
  for (const list of Object.values(controlsByClauseId)) {
    for (const ic of list) {
      const key = `${ic.frameworkId}|${ic.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const arr = controlsByFwId.get(ic.frameworkId) ?? [];
      arr.push(ic);
      controlsByFwId.set(ic.frameworkId, arr);
    }
  }

  const sorted = [...frameworks].sort((a, b) => {
    // Not-activated frameworks first
    if (a.activated !== b.activated) return a.activated ? 1 : -1;
    // Then lowest doc-scoped completion first (more work to do)
    return a.docScopedCompletionPct - b.docScopedCompletionPct;
  });

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
          Compliance against this document
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
          Each framework this document implicates, scored against the controls THIS
          document requires (not the framework as a whole). Expand a framework to see
          the specific implicated controls and their current status.
        </Typography>

        {sorted.map(fw => {
          const fwControls = (controlsByFwId.get(fw.id) ?? []).sort((a, b) =>
            a.identifier.localeCompare(b.identifier),
          );
          const docPct = fw.docScopedCompletionPct;
          return (
            <Accordion key={fw.id} disableGutters sx={{ mb: 1, '&:before': { display: 'none' } }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 0.5 }}>
                    <Typography variant="body1" sx={{ fontWeight: 700 }}>
                      {fw.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {fw.version}
                    </Typography>
                    {!fw.activated && (
                      <Chip size="small" label="Not activated" color="warning" variant="outlined" sx={{ height: 18, fontSize: 11 }} />
                    )}
                    <Box sx={{ flex: 1 }} />
                    <Typography variant="h6" sx={{ fontWeight: 800, color: `${pctColor(docPct)}.main` }}>
                      {docPct}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={docPct}
                    color={pctColor(docPct)}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5, gap: 2, flexWrap: 'wrap' }}>
                    <Typography variant="caption" color="text.secondary">
                      {fw.controlsImplementedFromImplicated} of {fw.controlsImplicatedByDoc} implicated controls implemented
                    </Typography>
                    <Typography variant="caption" color="text.disabled">
                      Overall framework: {fw.completionPct}% ({fw.implementedControls}/{fw.totalControls})
                      {fw.crosswalkCredited > 0 && ` · +${fw.crosswalkCredited} via crosswalk`}
                    </Typography>
                  </Box>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                {fwControls.length === 0 ? (
                  <Typography variant="caption" color="text.secondary">
                    No specific implicated controls were resolved for this framework.
                    The clauses may match the framework as a whole rather than specific
                    controls (e.g., "NIST SP 800-171" cited without a control number).
                  </Typography>
                ) : (
                  <Box>
                    {fwControls.map(c => <ControlRow key={c.id} ctl={c} />)}
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>
          );
        })}
      </CardContent>
    </Card>
  );
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

  // Pre-bid go/no-go verdict derived from coverage + per-framework completion.
  const verdictResult = useMemo(() => {
    if (!detail) return null;
    return computeVerdict(detail.frameworks, summary);
  }, [detail, summary]);

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

      {/* Pre-bid verdict — Go / Evaluate / No-Go decision support */}
      {verdictResult && (
        <Card
          sx={{
            mb: 3,
            borderLeft: '6px solid',
            borderColor: VERDICT_PALETTE[verdictResult.verdict].color,
            bgcolor: VERDICT_PALETTE[verdictResult.verdict].bg,
          }}
        >
          <CardContent sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{
              flexShrink: 0,
              minWidth: 110,
              textAlign: 'center',
              py: 1,
              px: 2,
              borderRadius: 1,
              bgcolor: VERDICT_PALETTE[verdictResult.verdict].color,
              color: '#fff',
            }}>
              <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: 1, lineHeight: 1 }}>
                {VERDICT_PALETTE[verdictResult.verdict].label}
              </Typography>
              <Typography variant="caption" sx={{ fontSize: '0.65rem', opacity: 0.9 }}>
                pre-bid verdict
              </Typography>
            </Box>
            <Box sx={{ flex: 1, minWidth: 240 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                {verdictResult.headline}
              </Typography>
              {verdictResult.rationale.length > 0 && (
                <Box component="ul" sx={{ pl: 2.5, my: 0, color: 'text.secondary' }}>
                  {verdictResult.rationale.map((r, i) => (
                    <Typography key={i} component="li" variant="body2" sx={{ lineHeight: 1.6 }}>
                      {r}
                    </Typography>
                  ))}
                </Box>
              )}
              <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 1.5, fontStyle: 'italic' }}>
                Decision support only — verdict is derived from your current compliance posture
                vs. the clauses this solicitation detects. Not a compliance attestation.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Coverage summary */}
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 3 }}>
        <StatTile label="Detected" value={summary.detected} />
        <StatTile label="In Program" value={summary.covered} color={theme.palette.info.main} />
        <StatTile label="New" value={summary.gaps} color={theme.palette.warning.main} />
        <StatTile label="Not in Catalog" value={summary.unknown} color={theme.palette.text.disabled} />
      </Box>

      {/* Per-framework completion — the compliance headline */}
      <ComplianceBreakdown
        frameworks={detail!.frameworks}
        controlsByClauseId={detail!.controlsByClauseId ?? {}}
      />

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
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        Scope marks whether each detected clause is already in your program or a new
        requirement. Completion is the live progress of the framework that clause
        belongs to — a dash means the clause maps to no tracked framework.
      </Typography>
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
                <TableCell sx={{ fontWeight: 600 }}>Scope</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Completion</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {clauses.map(c => (
                <TableRow key={c.id} hover selected={selected.has(c.id)}>
                  <TableCell padding="checkbox">
                    <Checkbox checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
                  </TableCell>
                  <TableCell>
                    {c.clauseCode ? (
                      <Typography
                        variant="body2"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/clauses/${encodeURIComponent(c.clauseCode!)}`);
                        }}
                        sx={{
                          fontWeight: 600,
                          color: 'primary.main',
                          cursor: 'pointer',
                          display: 'inline-block',
                          textDecorationLine: 'underline',
                          textDecorationStyle: 'dotted',
                          textDecorationColor: 'rgba(99,102,241,0.4)',
                          textUnderlineOffset: '3px',
                          '&:hover': { color: 'primary.dark' },
                        }}
                        title={`Open ${c.clauseCode} detail page`}
                      >
                        {c.clauseCode}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary">—</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{c.title || '—'}</Typography>
                  </TableCell>
                  <TableCell>
                    {c.confidence != null ? `${Math.round(c.confidence * 100)}%` : '—'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={SCOPE_LABEL[c.coverageStatus]}
                      color={SCOPE_COLOR[c.coverageStatus]}
                    />
                  </TableCell>
                  <TableCell>
                    {c.completionPct != null ? (
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 700, color: `${pctColor(c.completionPct)}.main` }}
                      >
                        {c.completionPct}%
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.disabled">—</Typography>
                    )}
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
