import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Accordion, AccordionDetails, AccordionSummary,
  Box, Typography, Card, CardContent, CircularProgress, Alert, Chip, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Checkbox,
  Snackbar, Link, LinearProgress, useTheme, useMediaQuery,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
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
  type EvaluationClause,
  type RequiredFramework,
  type ImplicatedControl,
  type TriggeredObligation,
  type CoverageStatus,
  type ClauseCategory,
} from '../services/evaluationService';
import { useProject } from '../contexts/ProjectContext';
import { pendingClauseService } from '../services/pendingClauseService';

// The clause-row chip describes SCOPE — is this detected obligation already in
// your ORGANIZATION's compliance baseline (covered by an activated framework or
// the cascade), or a new requirement this solicitation introduces? It is
// deliberately NOT a compliance signal (in-scope ≠ implemented); implementation
// status lives in the per-framework completion panel above.
const SCOPE_COLOR: Record<CoverageStatus, 'info' | 'warning' | 'default'> = {
  covered: 'info',
  gap: 'warning',
  unknown: 'default',
};
const SCOPE_LABEL: Record<CoverageStatus, string> = {
  covered: 'In baseline',
  gap: 'New requirement',
  unknown: 'Not in catalog',
};

/**
 * Phase B-1.5: category badge palette. Compliance gets the strongest color
 * (success/green) because that's the headline view; procurement and
 * informational are muted so they don't compete for attention. NULL is
 * treated as compliance so legacy rows never disappear from the default
 * sort.
 */
const CATEGORY_BADGE: Record<ClauseCategory, { color: 'success' | 'default' | 'warning'; label: string }> = {
  compliance: { color: 'success', label: 'Compliance' },
  procurement: { color: 'default', label: 'Procurement' },
  informational: { color: 'default', label: 'Informational' },
};

/** Sort weight per category — compliance first, then procurement, then informational. */
const CATEGORY_ORDER: Record<ClauseCategory, number> = {
  compliance: 0,
  procurement: 1,
  informational: 2,
};

/**
 * Treat a missing category as 'compliance' on display.
 *
 * This is the FE half of the silent-hide defense: legacy rows (pre-B-1.5
 * mig 077) have category = null in the DB; rather than sort them last
 * or hide them in a separate group, we surface them in the compliance
 * bucket where the user can see them by default. Combined with the BE's
 * deterministic family allowlist override (clauseCategoryOverride), the
 * worst-case for a misclassified compliance clause is that it appears
 * exactly where the user would look.
 */
const effectiveCategory = (c: EvaluationClause): ClauseCategory =>
  (c.category ?? 'compliance') as ClauseCategory;

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
  // Doc-scoped implementation % — the % of controls THIS document implicates
  // that are implemented. Often null in the org-baseline model (the matched
  // obligations may be pubs the document names, not framework controls), so
  // COVERAGE below is the primary signal and this only refines the verdict
  // when per-framework data is present.
  const minActivatedPct = activated.length > 0
    ? Math.min(...activated.map(f => f.docScopedCompletionPct))
    : null;

  const newClauseCount = coverage.gaps;
  const rationale: string[] = [];
  let verdict: Verdict;
  let headline: string;

  // Coverage rationale first — these are the org-baseline signals.
  if (coverage.detected > 0) {
    rationale.push(
      `${coverage.covered} of ${coverage.detected} detected obligation${coverage.detected === 1 ? '' : 's'} ${coverage.covered === 1 ? 'is' : 'are'} already in your organization's compliance baseline.`
    );
  }
  if (newClauseCount > 0) {
    rationale.push(
      `${newClauseCount} new requirement${newClauseCount === 1 ? '' : 's'} this document introduces beyond your current baseline.`
    );
  }
  if (coverage.unknown > 0) {
    rationale.push(
      `${coverage.unknown} detected clause${coverage.unknown === 1 ? '' : 's'} not yet in our catalog — review before adding to your baseline.`
    );
  }
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

  // Verdict — coverage-driven, refined by implementation % when available.
  // Conservative: a "GO" needs high confidence; ambiguous cases get "EVALUATE"
  // so the user looks at the detail.
  const toReview = newClauseCount + coverage.unknown;
  if (coverage.detected === 0) {
    verdict = 'EVALUATE';
    headline = 'No compliance obligations detected in this document';
  } else if (notActivated.length > 0 && newClauseCount > 0) {
    verdict = 'NO_GO';
    headline = 'You have not activated required frameworks for this document';
  } else if (minActivatedPct !== null && minActivatedPct < 40) {
    verdict = 'NO_GO';
    headline = 'A required framework is less than 40% implemented';
  } else if (toReview === 0) {
    // Everything this document names is already in your baseline.
    if (minActivatedPct !== null && minActivatedPct < 80) {
      verdict = 'EVALUATE';
      headline = 'All obligations are in your baseline — finish implementing the gaps';
    } else {
      verdict = 'GO';
      headline = 'Your org baseline covers every obligation this document names';
    }
  } else if (minActivatedPct !== null && minActivatedPct < 80) {
    verdict = 'EVALUATE';
    headline = 'Required frameworks are partially implemented — review the gaps';
  } else {
    verdict = 'EVALUATE';
    headline = `${toReview} requirement${toReview === 1 ? '' : 's'} to review and add to your baseline before bidding`;
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

/** Edge type → neutral, non-asserting label (NOT a claim that the doc mandates it). */
const VIA_LABEL: Record<string, string> = {
  incorporates_by_reference: 'Incorporated by ref.',
  mandates: 'Per named standard',
  flows_down_to: 'Flows to subs',
};

/**
 * Per-opportunity cascade — standards/rules the named (in-document) clauses
 * reference or incorporate, surfaced from the regulatory graph. Deliberately
 * framed as DERIVED context, never as obligations beyond the document: each row
 * cites the in-document clause it descends from (viaNamedClause), and the copy
 * defers to the solicitation text as authoritative. The document is the source
 * of truth — this panel never asserts a requirement the doc does not name.
 * Renders nothing when nothing cascades.
 */
const TriggeredObligationsCard: React.FC<{
  obligations: TriggeredObligation[];
  namedCount: number;
}> = ({ obligations, namedCount }) => {
  if (!obligations.length) return null;
  const authorities = new Set(obligations.map(o => o.sourceAuthority));
  return (
    <Card variant="outlined" sx={{ mb: 3, borderLeft: '4px solid', borderColor: 'secondary.main' }}>
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
          Referenced by the named clauses
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          The {namedCount} clause{namedCount === 1 ? '' : 's'} this solicitation names reference{' '}
          <strong>{obligations.length}</strong> further standard{obligations.length === 1 ? '' : 's'} or
          rule{obligations.length === 1 ? '' : 's'} across <strong>{authorities.size}</strong>{' '}
          authorit{authorities.size === 1 ? 'y' : 'ies'} via the regulatory graph. These are derived,
          not read from the document — confirm each against the solicitation text.
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          {obligations.map(o => (
            <Box key={o.artifactId} sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Chip size="small" variant="outlined" label={VIA_LABEL[o.via] ?? o.via} />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{o.identifier}</Typography>
                <Box sx={{ flex: 1 }} />
                <Chip size="small" variant="outlined" label={o.sourceAuthority} />
              </Box>
              <Typography variant="caption" color="text.secondary">
                {o.title}
                {o.viaNamedClause && (
                  <> — via <Box component="span" sx={{ fontWeight: 600 }}>{o.viaNamedClause}</Box></>
                )}
                {o.hop > 1 ? ` · ${o.hop} steps from the document` : ''}
              </Typography>
            </Box>
          ))}
        </Box>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mt: 2, fontStyle: 'italic' }}
        >
          Derived from the regulatory graph. The solicitation text is authoritative — verify before
          relying on these.
        </Typography>
      </CardContent>
    </Card>
  );
};

const EvaluationDetail: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { currentProject, projects } = useProject();
  const program = currentProject ?? projects?.[0] ?? null;

  const [detail, setDetail] = useState<EvaluationDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [snack, setSnack] = useState<string | null>(null);
  // Phase B-3 — bulk POA&M from gaps state. Confirm dialog gate prevents
  // accidental mass creation (a 100-gap eval would spawn 100 POA&Ms).
  const [poamDialogOpen, setPoamDialogOpen] = useState(false);
  const [creatingPoams, setCreatingPoams] = useState(false);

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

  /**
   * Phase B-1.5: sort by category (compliance → procurement → informational)
   * so the headline compliance set is at the top of the table without
   * hiding the others. Stable inside each category — preserves the BE
   * scan order so identical citations don't reshuffle on re-render.
   *
   * NOTE: we sort, we DO NOT filter. The three-layer defense
   * (BE family override + prompt bias + don't-hide UX) only holds if
   * this stays a sort. Adding a category filter here would re-open
   * the silent-hide risk we designed against.
   */
  const clauses = useMemo(() => {
    const raw = detail?.clauses ?? [];
    return [...raw].sort((a, b) =>
      CATEGORY_ORDER[effectiveCategory(a)] - CATEGORY_ORDER[effectiveCategory(b)],
    );
  }, [detail?.clauses]);
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

  // Org-baseline (human-in-the-loop): add the SELECTED MATCHED clauses to the
  // organization's standing baseline. Not-in-catalog selections are skipped here
  // (they go to catalog curation via handleSubmitForReview).
  const handleAddToOrgBaseline = async () => {
    if (!id) return;
    const matchedRowIds = clauses.filter(c => selected.has(c.id) && c.clauseId).map(c => c.id);
    if (matchedRowIds.length === 0) {
      setSnack('No catalog clauses selected. Select matched clauses to add to your baseline, or submit not-in-catalog finds for review.');
      return;
    }
    setApplying(true);
    setError(null);
    const resp = await evaluationService.applyToOrgBaseline(id, matchedRowIds);
    if (resp.error) {
      setApplying(false);
      setError(typeof resp.error === 'string' ? resp.error : resp.error.message);
      return;
    }
    setSnack(`Added ${resp.data?.added ?? 0} obligation${resp.data?.added === 1 ? '' : 's'} to your organization's baseline.`);
    setApplying(false);
  };

  // Submit the SELECTED not-in-catalog finds to the catalog-curation queue, so a
  // platform reviewer can flesh them out into authoritative, guidance-backed
  // clauses (rather than tracking guidance-less dead-ends).
  const handleSubmitForReview = async () => {
    if (!id) return;
    const unknown = clauses.filter(c => selected.has(c.id) && c.coverageStatus === 'unknown');
    if (unknown.length === 0) {
      setSnack('No not-in-catalog clauses selected.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const results = await Promise.all(unknown.map(c =>
      pendingClauseService.submit({
        clauseCode: c.clauseCode || c.title || 'Unnamed clause',
        title: c.title ?? undefined,
        description: c.supportingContext ?? null,
        confidence: c.confidence ?? null,
        supportingContext: c.supportingContext ?? null,
        sourceEvaluationId: id,
      }),
    ));
    const failed = results.filter(r => r.error).length;
    setSubmitting(false);
    setSnack(
      `Submitted ${unknown.length - failed} clause${unknown.length - failed === 1 ? '' : 's'} for catalog review` +
      (failed ? `, ${failed} failed` : '') + '.',
    );
  };

  /**
   * Phase B-3 — bulk create POA&Ms from gap clauses. The confirm dialog
   * shows the gap count before we commit so the user knows what they're
   * about to spawn. Per-clause dedup on the BE means re-running is safe.
   */
  const handleCreatePoams = async () => {
    if (!id || !program) return;
    setCreatingPoams(true);
    setError(null);
    const resp = await evaluationService.createPoamsFromGaps(id, program.id);
    if (resp.error) {
      setCreatingPoams(false);
      setError(typeof resp.error === 'string' ? resp.error : resp.error.message);
      setPoamDialogOpen(false);
      return;
    }
    const r = resp.data;
    setSnack(
      `Created ${r?.created ?? 0} POA&M${r?.created === 1 ? '' : 's'} from gaps` +
      (r?.skipped_duplicate ? `, skipped ${r.skipped_duplicate} already tracked` : '') +
      (r?.failed ? `, ${r.failed} failed` : '') +
      '. Opening POA&M page…',
    );
    setCreatingPoams(false);
    setPoamDialogOpen(false);
    // 1.8s matches handleApply's snack-then-navigate delay so the success
    // message is readable before we route away.
    setTimeout(() => navigate('/poam'), 1800);
  };

  const summary = useMemo(
    () => detail?.evaluation.coverageSummary ?? { detected: 0, covered: 0, gaps: 0, unknown: 0 },
    [detail],
  );

  // Split the current selection by what each action can act on: matched
  // (catalog) clauses → org baseline; not-in-catalog finds → curation queue.
  const selectedMatchedCount = useMemo(
    () => clauses.filter(c => selected.has(c.id) && c.clauseId).length,
    [clauses, selected],
  );
  const selectedUnknownCount = useMemo(
    () => clauses.filter(c => selected.has(c.id) && c.coverageStatus === 'unknown').length,
    [clauses, selected],
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
                vs. the clauses this document detects. Not a compliance attestation.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Coverage summary */}
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 3 }}>
        <StatTile label="Detected" value={summary.detected} />
        <StatTile label="In baseline" value={summary.covered} color={theme.palette.info.main} />
        <StatTile label="New" value={summary.gaps} color={theme.palette.warning.main} />
        <StatTile label="Not in Catalog" value={summary.unknown} color={theme.palette.text.disabled} />
      </Box>

      {/* Per-opportunity cascade — obligations triggered beyond the named clauses */}
      <TriggeredObligationsCard
        obligations={detail!.triggeredObligations ?? []}
        namedCount={summary.detected}
      />

      {/* Per-framework completion — the compliance headline */}
      <ComplianceBreakdown
        frameworks={detail!.frameworks}
        controlsByClauseId={detail!.controlsByClauseId ?? {}}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Add-to-org-baseline bar (human-in-the-loop) — matched clauses only */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ flex: 1, minWidth: 220 }}>
            <Typography variant="subtitle2">Add to your organization baseline</Typography>
            <Typography variant="caption" color="text.secondary">
              Adds the selected <strong>catalog</strong> clauses ({selectedMatchedCount} selected) to your
              organization's standing requirement set. You decide what to track — nothing is added automatically.
            </Typography>
          </Box>
          <Button
            variant="contained"
            disabled={applying || selectedMatchedCount === 0}
            startIcon={applying ? <CircularProgress size={18} /> : undefined}
            onClick={handleAddToOrgBaseline}
          >
            {applying ? 'Adding…' : `Add ${selectedMatchedCount} to baseline`}
          </Button>
        </CardContent>
      </Card>

      {/* Submit-for-catalog-review bar — not-in-catalog finds only */}
      {summary.unknown > 0 && (
        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: 1, minWidth: 220 }}>
              <Typography variant="subtitle2">Submit not-in-catalog finds for review</Typography>
              <Typography variant="caption" color="text.secondary">
                The selected clauses we don't yet have ({selectedUnknownCount} selected) are sent to the
                catalog-curation queue, where a reviewer fleshes them out with authoritative guidance before
                they become trackable — rather than tracking guidance-less dead-ends.
              </Typography>
            </Box>
            <Button
              variant="outlined"
              disabled={submitting || selectedUnknownCount === 0}
              startIcon={submitting ? <CircularProgress size={18} /> : undefined}
              onClick={handleSubmitForReview}
            >
              {submitting ? 'Submitting…' : `Submit ${selectedUnknownCount} for review`}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create-POA&Ms-from-gaps bar (Phase B-3) — appears only when there are
          gaps to track AND a program is available. Parallel structure to Apply
          bar so the two bulk actions read as siblings: Apply = adds clauses to
          program tracking; Create POA&Ms = opens remediation items for the new
          requirements. Re-running is safe (per-clause dedup on the BE). */}
      {summary.gaps > 0 && (
        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: 1, minWidth: 220 }}>
              <Typography variant="subtitle2">
                Track gaps as POA&amp;Ms
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {program
                  ? `Creates one POA&M per gap clause in "${program.name}". Each row links back to this evaluation. Already-tracked gaps are skipped.`
                  : 'No compliance program found — POA&M creation is unavailable.'}
              </Typography>
            </Box>
            <Button
              variant="outlined"
              disabled={!program || creatingPoams}
              startIcon={creatingPoams ? <CircularProgress size={18} /> : <PendingIcon />}
              onClick={() => setPoamDialogOpen(true)}
            >
              {creatingPoams ? 'Creating…' : `Create ${summary.gaps} POA&M${summary.gaps === 1 ? '' : 's'} from gaps`}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Confirm dialog for bulk POA&M creation. Gate prevents accidental
          mass creation; the dedup safety net on the BE makes re-running a
          no-op, but a 100-gap eval still deserves a "you sure?" beat. */}
      <Dialog open={poamDialogOpen} onClose={() => !creatingPoams && setPoamDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create POA&amp;Ms from gaps</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will create one POA&amp;M in <strong>{program?.name ?? 'your program'}</strong>{' '}
            for each of the <strong>{summary.gaps}</strong> gap clause{summary.gaps === 1 ? '' : 's'} in
            this evaluation. Each POA&amp;M will:
          </DialogContentText>
          <Box component="ul" sx={{ pl: 3, my: 1.5 }}>
            <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
              Carry a link back to the source clause for traceability.
            </Typography>
            <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
              Start in <em>Open</em> status with a default remediation timeline
              based on the clause's risk level (LOW=60d, MEDIUM=30d, HIGH=14d).
            </Typography>
            <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
              Need a remediation plan filled in before progressing.
            </Typography>
          </Box>
          <DialogContentText sx={{ fontSize: '0.85rem' }} color="text.secondary">
            Re-running for this evaluation is safe — gaps that already have a
            POA&amp;M are skipped, so no duplicates will be created.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPoamDialogOpen(false)} disabled={creatingPoams}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreatePoams}
            disabled={creatingPoams}
            startIcon={creatingPoams ? <CircularProgress size={18} /> : undefined}
          >
            {creatingPoams ? 'Creating…' : 'Create POA&Ms'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Clause list */}
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        Category groups citations as <strong>Compliance</strong> (the headline
        set — clauses that obligate a control or program activity),{' '}
        <strong>Procurement</strong> (contract-mechanics like cost accounting,
        invoicing, FAR 52.215-1), or <strong>Informational</strong> (reference
        material, defined terms). Compliance rows surface first; procurement
        and informational remain in the table for context. Scope marks whether
        each detected clause is already in your program or a new requirement.
        Completion is the live progress of the framework that clause belongs
        to — a dash means the clause maps to no tracked framework.
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
                <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Clause</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Title</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Confidence</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Scope</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Completion</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {clauses.map(c => {
                const cat = effectiveCategory(c);
                const badge = CATEGORY_BADGE[cat];
                return (
                <TableRow key={c.id} hover selected={selected.has(c.id)}>
                  <TableCell padding="checkbox">
                    <Checkbox checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={badge.label}
                      color={badge.color}
                      variant={cat === 'compliance' ? 'filled' : 'outlined'}
                    />
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
                  <TableCell sx={{ maxWidth: 480 }}>
                    <Typography variant="body2">{c.title || '—'}</Typography>
                    {c.supportingContext && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: 'block',
                          mt: 0.5,
                          fontStyle: 'italic',
                          lineHeight: 1.4,
                          // Source-text excerpt; wrap freely so the user can read
                          // what the citation actually obligates.
                          whiteSpace: 'normal',
                        }}
                      >
                        “{c.supportingContext}”
                      </Typography>
                    )}
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
                );
              })}
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
