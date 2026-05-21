import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
  Alert,
  Tooltip,
  Divider,
  TextField,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useMediaQuery,
  useTheme,
  Collapse,
  Badge,
  Snackbar,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  HourglassEmpty as InProgressIcon,
  RadioButtonUnchecked as NotStartedIcon,
  Shield as ShieldIcon,
  Link as LinkIcon,
  Search as SearchIcon,
  Save as SaveIcon,
  KeyboardArrowRight as CollapseIcon,
  UploadFile as UploadFileIcon,
  Description as DocumentIcon,
  Flag as FlagIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../hooks/useAuth';
import {
  fetchFrameworks,
  fetchFrameworkWithStatus,
  fetchReciprocity,
  updateControlStatus,
  parseSSPDocument,
  fetchActivatedFrameworks,
  fetchRecommendedFrameworks,
  activateFramework as activateFrameworkAPI,
  fetchObjectiveStatuses,
  updateObjectiveStatus,
  type ControlFramework,
  type FrameworkWithFamilies,
  type FrameworkStatusOption,
  type FamilyWithControls,
  type ControlWithStatus,
  type ControlStatus,
  type ReciprocityResult,
  type SSPParseResult,
  type FrameworkRecommendation,
  type ObjectiveStatusEntry,
  type ObjectiveStatusMap,
  importAssessment,
  type AssessmentImportResult,
  fetchSPRSScore,
  fetchFARDetail,
  deactivateFramework as deactivateFrameworkAPI,
  fetchScoping,
  type ProgramScoping,
  type ScopingApplyResult,
  type SPRSScore,
  type FARDetail,
  type FARRequirement,
  type ControlOdp,
} from '../services/controlService';
import { Section508Wizard } from '../components/Section508Wizard';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps abstract palette names (returned by framework_status_config.display_color)
 * to concrete hex + icon. The BE seeds 'red' / 'amber' / 'green' / 'grey' across
 * every framework's status enum — this is the only place we materialise them.
 */
const STATUS_COLOR_PALETTE: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
  green: { color: '#22c55e', bg: 'rgba(34,197,94,0.08)',  icon: <CheckCircleIcon fontSize="small" sx={{ color: '#22c55e' }} /> },
  amber: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', icon: <InProgressIcon  fontSize="small" sx={{ color: '#f59e0b' }} /> },
  red:   { color: '#ef4444', bg: 'rgba(239,68,68,0.08)',  icon: <NotStartedIcon  fontSize="small" sx={{ color: '#ef4444' }} /> },
  grey:  { color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', icon: <NotStartedIcon fontSize="small" sx={{ color: '#94a3b8' }} /> },
};

/**
 * Legacy hardcoded NIST mapping. Kept as a fallback for callsites that don't
 * yet have framework.status_config available (e.g. first render before the
 * framework loads). New code should prefer `resolveStatusVisuals(option)`.
 */
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  IMPLEMENTED: { label: 'Implemented', ...STATUS_COLOR_PALETTE.green },
  IN_PROGRESS: { label: 'In Progress', ...STATUS_COLOR_PALETTE.amber },
  NOT_STARTED: { label: 'Not Started', ...STATUS_COLOR_PALETTE.grey },
  WITHDRAWN: {
    label: 'Withdrawn',
    color: '#64748b',
    bg: 'rgba(100,116,139,0.06)',
    icon: <NotStartedIcon fontSize="small" sx={{ color: '#64748b', textDecoration: 'line-through' }} />,
  },
};

/** Find a status_config entry by value, returning undefined if not present. */
function findStatusOption(
  statusConfig: FrameworkStatusOption[] | undefined,
  value: string,
): FrameworkStatusOption | undefined {
  return statusConfig?.find(s => s.status_value === value);
}

/**
 * Resolve a framework-aware status into label/color/bg/icon. Falls back to the
 * legacy STATUS_CONFIG when the option is missing (e.g. WITHDRAWN, or first
 * paint before status_config loads).
 */
function resolveStatusVisuals(
  option: FrameworkStatusOption | undefined,
  fallbackStatus: string,
): { label: string; color: string; bg: string; icon: React.ReactNode } {
  if (!option) return STATUS_CONFIG[fallbackStatus] ?? STATUS_CONFIG.NOT_STARTED;
  const palette = STATUS_COLOR_PALETTE[option.display_color ?? 'grey'] ?? STATUS_COLOR_PALETTE.grey;
  return { label: option.display_label, ...palette };
}

/** Whether a given status counts as "satisfied" for the framework (is_completed=true). */
function isCompletedStatus(
  statusConfig: FrameworkStatusOption[] | undefined,
  status: string,
): boolean {
  if (!statusConfig || statusConfig.length === 0) return status === 'IMPLEMENTED'; // legacy NIST fallback
  return findStatusOption(statusConfig, status)?.is_completed ?? false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

const FamilyProgress: React.FC<{ family: FamilyWithControls }> = ({ family }) => {
  const total = family.control_count;
  const implPct = total > 0 ? (family.implemented_count / total) * 100 : 0;
  const progPct = total > 0 ? (family.in_progress_count / total) * 100 : 0;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
      <Box sx={{ flex: 1, position: 'relative', height: 8, borderRadius: 4, bgcolor: 'rgba(148,163,184,0.15)' }}>
        {/* Implemented (green) */}
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: `${implPct}%`,
            bgcolor: '#22c55e',
            borderRadius: 4,
            transition: 'width 0.3s ease',
          }}
        />
        {/* In Progress (amber) stacked after implemented */}
        <Box
          sx={{
            position: 'absolute',
            left: `${implPct}%`,
            top: 0,
            height: '100%',
            width: `${progPct}%`,
            bgcolor: '#f59e0b',
            borderRadius: implPct === 0 ? 4 : '0 4px 4px 0',
            transition: 'width 0.3s ease, left 0.3s ease',
          }}
        />
      </Box>
      <Typography variant="caption" sx={{ minWidth: 40, textAlign: 'right', color: 'text.secondary' }}>
        {family.implemented_count}/{total}
      </Typography>
    </Box>
  );
};

// ── Objectives parser ───────────────────────────────────────────────────────
interface ParsedObjective {
  id: string;
  text: string;
}

function parseObjectives(controlIdentifier: string, discussionText: string | null | undefined): ParsedObjective[] {
  if (!discussionText) return [];

  // Match patterns like [a], [b], [c], [a.], [b.], etc.
  const bracketPattern = /\[([a-z](?:\.\d+)?)\]/g;
  const matches = Array.from(discussionText.matchAll(bracketPattern));

  if (matches.length >= 2) {
    const objectives: ParsedObjective[] = [];
    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].index! + matches[i][0].length;
      const end = i + 1 < matches.length ? matches[i + 1].index! : discussionText.length;
      const text = discussionText.slice(start, end).trim().replace(/;$/, '').trim();
      if (text) {
        objectives.push({
          id: `${controlIdentifier}[${matches[i][1]}]`,
          text,
        });
      }
    }
    if (objectives.length > 0) return objectives;
  }

  // Fallback: split on sentence boundaries if text is long enough
  if (discussionText.length > 120) {
    const sentences = discussionText.split(/(?<=[.;])\s+/).filter(s => s.trim().length > 10);
    if (sentences.length >= 2) {
      return sentences.map((s, i) => ({
        id: `${controlIdentifier}[${String.fromCharCode(97 + i)}]`,
        text: s.trim(),
      }));
    }
  }

  // Single objective — full text
  return [{
    id: `${controlIdentifier}[a]`,
    text: discussionText.trim(),
  }];
}

/** Detail dialog for a single objective — shows gap info + manual status toggle */
const ObjectiveDetailDialog: React.FC<{
  open: boolean;
  objective: ParsedObjective | null;
  statusEntry: ObjectiveStatusEntry | null;
  onClose: () => void;
  onStatusChange: (objectiveId: string, newStatus: ControlStatus, fields?: Record<string, string | null>) => void;
}> = ({ open, objective, statusEntry, onClose, onStatusChange }) => {
  const [localStatus, setLocalStatus] = useState<ControlStatus>(statusEntry?.status || 'NOT_STARTED');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocalStatus(statusEntry?.status || 'NOT_STARTED');
  }, [statusEntry]);

  if (!objective) return null;

  const handleSave = async () => {
    if (!statusEntry?.objective_id) return;
    setSaving(true);
    try {
      await onStatusChange(statusEntry.objective_id, localStatus);
    } finally {
      setSaving(false);
    }
  };

  const statusChanged = localStatus !== (statusEntry?.status || 'NOT_STARTED');

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <Chip
          label={objective.id}
          size="small"
          sx={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.75rem' }}
        />
        <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1 }}>
          Objective Detail
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        {/* Status toggle */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 0.5 }}>
            Status
          </Typography>
          <ToggleButtonGroup
            value={localStatus}
            exclusive
            size="small"
            onChange={(_e, val) => { if (val) setLocalStatus(val as ControlStatus); }}
            sx={{ width: '100%' }}
          >
            {(Object.keys(STATUS_CONFIG) as ControlStatus[]).filter(st => st !== 'WITHDRAWN').map(st => {
              const cfg = STATUS_CONFIG[st];
              const isActive = localStatus === st;
              return (
                <ToggleButton
                  key={st}
                  value={st}
                  sx={{
                    flex: 1,
                    py: 0.75,
                    fontSize: '0.75rem',
                    textTransform: 'none',
                    gap: 0.5,
                    color: isActive ? cfg.color : 'text.disabled',
                    bgcolor: isActive ? cfg.bg : 'transparent',
                    borderColor: isActive ? cfg.color : undefined,
                    '&.Mui-selected': { color: cfg.color, bgcolor: cfg.bg, borderColor: cfg.color },
                    '&.Mui-selected:hover': { bgcolor: cfg.bg },
                  }}
                >
                  {cfg.icon} {cfg.label}
                </ToggleButton>
              );
            })}
          </ToggleButtonGroup>
        </Box>

        {/* Description */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 0.5 }}>
            Description
          </Typography>
          <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
            {objective.text}
          </Typography>
        </Box>

        {/* Gap details (from xlsx import) */}
        {statusEntry?.gap_type && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 0.5 }}>
              Gap Type
            </Typography>
            <Chip
              label={statusEntry.gap_type}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.75rem' }}
            />
          </Box>
        )}

        {statusEntry?.justification && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 0.5 }}>
              Justification / Required Fix
            </Typography>
            <Box sx={{ bgcolor: 'action.hover', p: 1.5, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2" sx={{ lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                {statusEntry.justification}
              </Typography>
            </Box>
          </Box>
        )}

        {statusEntry?.remaining_gaps && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 0.5 }}>
              Remaining Gaps
            </Typography>
            <Box sx={{ bgcolor: 'rgba(239,68,68,0.04)', p: 1.5, borderRadius: 1, border: '1px solid', borderColor: 'error.light' }}>
              <Typography variant="body2" sx={{ lineHeight: 1.6, whiteSpace: 'pre-line', color: 'error.dark' }}>
                {statusEntry.remaining_gaps}
              </Typography>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        {statusChanged && (
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
          >
            {saving ? 'Saving...' : 'Save Status'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

const ObjectivesList: React.FC<{
  objectives: ParsedObjective[];
  objectiveStatuses: ObjectiveStatusEntry[];
  odps?: ControlOdp[];
  isMobile: boolean;
  onObjectiveClick: (obj: ParsedObjective, statusEntry: ObjectiveStatusEntry | null) => void;
}> = ({ objectives, objectiveStatuses, odps, isMobile, onObjectiveClick }) => {
  // Build a lookup: identifier → status entry
  const statusMap = useMemo(() => {
    const m = new Map<string, ObjectiveStatusEntry>();
    for (const s of objectiveStatuses) {
      m.set(s.identifier, s);
    }
    return m;
  }, [objectiveStatuses]);

  // Place each DoD ODP next to its NIST OSCAL "defining" assessment objective —
  // those are the rows whose id ends in `ODP[NN]` and whose text reads
  // "the [thing] is defined." That is the conceptual home for a DoD baseline:
  // NIST asks "is the value defined?" and the answer is "yes, at the DoD
  // baseline (meet or exceed)." The other objectives ("use" objectives like
  // `a`, `b[01]`, `c`) reference the defining one via the
  // <A.X.X.X.ODP[NN]: name> placeholder in their own text, so the link is
  // visible inline without us having to render the baseline twice.
  //
  // Pairing: DoD ODPs sorted numerically (b.01 < b.02 < c) zip 1:1 against
  // defining objectives sorted by NN. This is the 800-171 Rev 3 reality —
  // every DoD ODP corresponds to exactly one defining objective in OSCAL.
  // When counts don't align (other frameworks, edge cases) we fall back to
  // a tolerant suffix matcher that normalises bracket notation (`b[01]` ->
  // `b.01`) and zero-padding (`b.02` -> `b.2`).
  const { byObjective, controlWide } = useMemo(() => {
    const byObj = new Map<string, ControlOdp[]>();
    const wide: ControlOdp[] = [];
    if (!odps || odps.length === 0) return { byObjective: byObj, controlWide: wide };

    const sortedOdps = [...odps].sort((a, b) =>
      a.odp_identifier.localeCompare(b.odp_identifier, undefined, { numeric: true }),
    );

    // Defining objectives — id ends in ODP[NN] / ODP.NN / ODP-NN / ODPNN.
    const defObjs = objectives
      .map(o => {
        const m = o.id.match(/ODP[\[._-]?(\d+)\]?$/i);
        return m ? { obj: o, n: parseInt(m[1], 10) } : null;
      })
      .filter((x): x is { obj: ParsedObjective; n: number } => x !== null)
      .sort((a, b) => a.n - b.n);

    const placed = new Set<string>();
    if (sortedOdps.length > 0 && sortedOdps.length === defObjs.length) {
      for (let i = 0; i < sortedOdps.length; i++) {
        const list = byObj.get(defObjs[i].obj.id) || [];
        list.push(sortedOdps[i]);
        byObj.set(defObjs[i].obj.id, list);
        placed.add(sortedOdps[i].id);
      }
    }

    // Fallback for any ODP not placed sequentially: tolerant suffix match
    // with bracket-notation and zero-padding normalisation.
    for (const odp of sortedOdps) {
      if (placed.has(odp.id)) continue;
      const parts = odp.odp_identifier.split('.');
      if (parts.length < 4) { wide.push(odp); continue; }
      const tail = parts.slice(3).join('.');
      const tailNorm = tail.replace(/(^|\.)0+(\d)/g, '$1$2').toLowerCase();
      let match: ParsedObjective | undefined;
      for (const obj of objectives) {
        const norm = obj.id.toLowerCase()
          .replace(/^a\./, '')                  // strip "A." prefix
          .replace(/\[(\d+)\]/g, '.$1')         // b[01] -> b.01
          .replace(/(\.|^)0+(\d)/g, '$1$2');    // .01   -> .1
        if (norm === tailNorm || norm.endsWith('.' + tailNorm) || norm.endsWith(tailNorm)) {
          match = obj; break;
        }
      }
      if (match) {
        const list = byObj.get(match.id) || [];
        list.push(odp);
        byObj.set(match.id, list);
      } else {
        wide.push(odp);
      }
    }
    return { byObjective: byObj, controlWide: wide };
  }, [odps, objectives]);

  // Summary counts
  const counts = useMemo(() => {
    let impl = 0, prog = 0, notSt = 0;
    for (const obj of objectives) {
      const st = statusMap.get(obj.id)?.status || 'NOT_STARTED';
      if (st === 'IMPLEMENTED') impl++;
      else if (st === 'IN_PROGRESS') prog++;
      else notSt++;
    }
    return { impl, prog, notSt };
  }, [objectives, statusMap]);

  return (
    <Box
      sx={{
        ml: isMobile ? 1 : 3,
        mt: 1,
        mb: 1,
        pl: 2,
        borderLeft: '3px solid',
        borderColor: 'primary.light',
        bgcolor: 'action.hover',
        borderRadius: '0 8px 8px 0',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pt: 1, pb: 0.5 }}>
        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
          Assessment Objectives ({objectives.length})
        </Typography>
        {counts.impl > 0 && (
          <Chip icon={<CheckCircleIcon sx={{ fontSize: 12, color: '#22c55e !important' }} />} label={counts.impl} size="small" sx={{ height: 20, fontSize: '0.65rem' }} />
        )}
        {counts.prog > 0 && (
          <Chip icon={<InProgressIcon sx={{ fontSize: 12, color: '#f59e0b !important' }} />} label={counts.prog} size="small" sx={{ height: 20, fontSize: '0.65rem' }} />
        )}
        {counts.notSt > 0 && (
          <Chip icon={<NotStartedIcon sx={{ fontSize: 12, color: '#94a3b8 !important' }} />} label={counts.notSt} size="small" sx={{ height: 20, fontSize: '0.65rem' }} />
        )}
      </Box>
      {controlWide.length > 0 && (
        <Box
          sx={{
            mb: 1,
            mt: 0.5,
            p: 1,
            bgcolor: 'rgba(2,132,199,0.04)',
            borderLeft: '3px solid',
            borderColor: 'info.main',
            borderRadius: 0.5,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700, color: 'info.main', display: 'block', mb: 0.5,
              textTransform: 'uppercase', letterSpacing: 0.4, fontSize: '0.6rem',
            }}
          >
            Control-wide DoD baseline — meet or exceed
          </Typography>
          {controlWide.map(odp => (
            <Box key={odp.id} sx={{ mb: 0.5, '&:last-child': { mb: 0 } }}>
              <Typography variant="caption" sx={{
                display: 'block', color: 'text.secondary',
                fontFamily: 'monospace', fontSize: '0.65rem',
              }}>
                {odp.odp_identifier}{odp.assignment_text ? ` · ${odp.assignment_text}` : ''}
              </Typography>
              <Typography variant="body2" sx={{
                color: odp.odp_type === 'guidance' ? 'text.secondary' : 'text.primary',
                fontStyle: odp.odp_type === 'guidance' ? 'italic' : 'normal',
                fontWeight: odp.odp_type === 'guidance' ? 400 : 600,
                lineHeight: 1.5, fontSize: '0.8rem', whiteSpace: 'pre-line',
              }}>
                {odp.dod_baseline_value}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
      {objectives.map((obj, idx) => {
        const statusEntry = statusMap.get(obj.id) || null;
        const status = statusEntry?.status || 'NOT_STARTED';
        const cfg = STATUS_CONFIG[status];
        const matchedOdps = byObjective.get(obj.id) || [];

        return (
          <Box
            key={obj.id}
            onClick={() => onObjectiveClick(obj, statusEntry)}
            sx={{
              py: 0.75,
              px: 0.5,
              borderBottom: idx < objectives.length - 1 ? '1px solid' : 'none',
              borderColor: 'divider',
              cursor: 'pointer',
              borderRadius: 0.5,
              '&:hover': { bgcolor: 'rgba(99,102,241,0.06)' },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              {/* Status icon */}
              <Box sx={{ mt: 0.25, flexShrink: 0 }}>
                {cfg.icon}
              </Box>
              <Chip
                label={obj.id}
                size="small"
                variant="outlined"
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '0.65rem',
                  height: 22,
                  flexShrink: 0,
                  mt: 0.25,
                  borderColor: cfg.color,
                  color: cfg.color,
                }}
              />
              <Typography
                variant="caption"
                sx={{ color: 'text.secondary', lineHeight: 1.5, fontSize: '0.75rem', flex: 1 }}
              >
                {obj.text}
              </Typography>
              {/* Status label chip */}
              <Chip
                label={cfg.label}
                size="small"
                sx={{
                  fontSize: '0.6rem',
                  height: 18,
                  bgcolor: cfg.bg,
                  color: cfg.color,
                  fontWeight: 600,
                  flexShrink: 0,
                  mt: 0.25,
                }}
              />
            </Box>
            {matchedOdps.length > 0 && (
              <Box sx={{
                mt: 0.75, ml: 4, pl: 1.5,
                borderLeft: '2px solid', borderColor: 'info.main',
              }}>
                {matchedOdps.map(odp => (
                  <Box key={odp.id} sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, py: 0.25 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'info.main', fontWeight: 700, fontSize: '0.6rem',
                        textTransform: 'uppercase', letterSpacing: 0.3, flexShrink: 0,
                      }}
                    >
                      DoD baseline
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: odp.odp_type === 'guidance' ? 'text.secondary' : 'text.primary',
                        fontStyle: odp.odp_type === 'guidance' ? 'italic' : 'normal',
                        fontWeight: odp.odp_type === 'guidance' ? 400 : 600,
                        fontSize: '0.75rem',
                        lineHeight: 1.4,
                      }}
                    >
                      {odp.dod_baseline_value}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
};

const ControlRow: React.FC<{
  control: ControlWithStatus;
  isMobile: boolean;
  objectiveStatuses: ObjectiveStatusEntry[];
  statusConfig: FrameworkStatusOption[];
  onStatusChange: (controlId: string, status: ControlStatus) => void;
  onObjectiveStatusChange: (objectiveId: string, newStatus: ControlStatus) => void;
}> = ({ control, isMobile, objectiveStatuses, statusConfig, onStatusChange, onObjectiveStatusChange }) => {
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState(control.evidence_notes || '');
  const [objectivesOpen, setObjectivesOpen] = useState(false);
  const [detailObj, setDetailObj] = useState<ParsedObjective | null>(null);
  const [detailStatus, setDetailStatus] = useState<ObjectiveStatusEntry | null>(null);
  const statusCfg = resolveStatusVisuals(findStatusOption(statusConfig, control.status), control.status);
  const navigate = useNavigate();

  // Show "Open POA&M" for any unfinished, non-withdrawn control — i.e. anything
  // whose framework status is neither "completed" (rolls up as satisfied) nor
  // WITHDRAWN. Works across NIST, CMMC, HIPAA, and Section 508 vocabularies.
  const canOpenPoam =
    !control.is_withdrawn && !isCompletedStatus(statusConfig, control.status);

  // Use real objectives from API if available, fall back to text parsing
  const objectives = useMemo(() => {
    if (control.objectives && control.objectives.length > 0) {
      return control.objectives.map(o => ({ id: o.identifier, text: o.description }));
    }
    return parseObjectives(control.identifier, control.discussion_text);
  }, [control.objectives, control.identifier, control.discussion_text]);

  // Count objective statuses for the badge
  const objStatusSummary = useMemo(() => {
    if (objectiveStatuses.length === 0) return null;
    const impl = objectiveStatuses.filter(s => s.status === 'IMPLEMENTED').length;
    const prog = objectiveStatuses.filter(s => s.status === 'IN_PROGRESS').length;
    const total = objectiveStatuses.length;
    return { impl, prog, total };
  }, [objectiveStatuses]);

  return (
    <Box
      sx={{
        p: isMobile ? 1.5 : 2,
        borderBottom: '1px solid',
        borderColor: 'divider',
        '&:last-child': { borderBottom: 'none' },
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      {/* Header row */}
      <Box sx={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', gap: 1, flexDirection: isMobile ? 'column' : 'row' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
          <Chip
            label={control.identifier}
            size="small"
            sx={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.75rem' }}
          />
          {control.is_withdrawn ? (
            <Chip
              label="Withdrawn"
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.65rem', height: 20, color: '#94a3b8', borderColor: '#94a3b8', textDecoration: 'line-through' }}
            />
          ) : (
            <Chip
              label="active"
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.65rem', height: 20, color: '#22c55e', borderColor: '#22c55e' }}
            />
          )}
          {control.crosswalk_satisfied && (
            <Tooltip title="Credited via the NIST 800-53 crosswalk — every 800-53 control this requirement derives from is implemented.">
              <Chip
                label="via 800-53"
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.65rem', height: 20, color: '#0ea5e9', borderColor: '#0ea5e9' }}
              />
            </Tooltip>
          )}
          {control.title && (
            <Typography variant="body2" sx={{ fontWeight: 500, color: control.is_withdrawn ? 'text.disabled' : 'text.primary' }}>
              {control.title}
            </Typography>
          )}
        </Box>

        <ToggleButtonGroup
          value={control.status}
          exclusive
          size="small"
          disabled={control.is_withdrawn}
          onChange={(_e, val) => {
            if (val) onStatusChange(control.id, val as ControlStatus);
          }}
          sx={{ flexShrink: 0 }}
        >
          {/* Render buttons from the framework's seeded status vocabulary —
              NIST shows NOT_STARTED/IN_PROGRESS/IMPLEMENTED, Section 508
              shows SUPPORTS/PARTIALLY_SUPPORTS/DOES_NOT_SUPPORT/NOT_APPLICABLE,
              CMMC adds MET, HIPAA adds ALTERNATIVE_IMPLEMENTED. */}
          {statusConfig.map(option => {
            const cfg = resolveStatusVisuals(option, option.status_value);
            const isActive = control.status === option.status_value;
            return (
              <ToggleButton
                key={option.status_value}
                value={option.status_value}
                sx={{
                  px: isMobile ? 1.2 : 1.5,
                  py: isMobile ? 0.75 : 0.5,
                  fontSize: isMobile ? '0.75rem' : '0.7rem',
                  minHeight: 40,
                  textTransform: 'none',
                  color: isActive ? cfg.color : 'text.disabled',
                  bgcolor: isActive ? cfg.bg : 'transparent',
                  borderColor: isActive ? cfg.color : undefined,
                  '&.Mui-selected': { color: cfg.color, bgcolor: cfg.bg, borderColor: cfg.color },
                  '&.Mui-selected:hover': { bgcolor: cfg.bg },
                }}
              >
                {isMobile ? cfg.label.slice(0, 3) : cfg.label}
              </ToggleButton>
            );
          })}
        </ToggleButtonGroup>

        {canOpenPoam && (
          <Tooltip title="Open a POA&M item for this control">
            <IconButton
              size="small"
              onClick={() =>
                navigate(`/poam?controlId=${encodeURIComponent(control.id)}&controlIdentifier=${encodeURIComponent(control.identifier)}&action=create`)
              }
              sx={{ flexShrink: 0, color: 'warning.main' }}
              aria-label={`Open POA&M for ${control.identifier}`}
            >
              <FlagIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Requirement text — the lettered sub-sections (a., b., c., d.) */}
      {control.requirement_text && !control.is_withdrawn && (
        <Typography
          variant="body2"
          component="div"
          sx={{ mt: 1, color: 'text.primary', lineHeight: 1.6, whiteSpace: 'pre-line' }}
        >
          {control.requirement_text}
        </Typography>
      )}
      {control.is_withdrawn && (
        <Typography variant="caption" sx={{ mt: 0.5, display: 'block', color: 'text.disabled', fontStyle: 'italic' }}>
          This control has been withdrawn in the current revision.
        </Typography>
      )}

      {/* Discussion text — always visible, italic */}
      {control.discussion_text && !control.is_withdrawn && (
        <Typography
          variant="caption"
          sx={{
            mt: 1,
            display: 'block',
            color: 'text.secondary',
            fontStyle: 'italic',
            lineHeight: 1.5,
            whiteSpace: 'pre-line',
          }}
        >
          {control.discussion_text}
        </Typography>
      )}

      {/* Objectives expand button — prominent placement.
          ODPs are rendered INSIDE the objectives list (inline with the
          objective each applies to, plus a control-wide block for the
          control-level ones). See ObjectivesList above. */}
      {objectives.length > 0 && !control.is_withdrawn && (
        <Box
          onClick={() => setObjectivesOpen(prev => !prev)}
          sx={{
            mt: 1.5,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.75,
            cursor: 'pointer',
            px: 1.5,
            py: 0.75,
            borderRadius: 1,
            border: '1px solid',
            borderColor: objectivesOpen ? 'primary.main' : 'divider',
            bgcolor: objectivesOpen ? 'primary.50' : 'transparent',
            transition: 'all 0.2s',
            '&:hover': {
              borderColor: 'primary.main',
              bgcolor: 'action.hover',
            },
          }}
        >
          <CollapseIcon
            fontSize="small"
            sx={{
              transition: 'transform 0.2s',
              transform: objectivesOpen ? 'rotate(90deg)' : 'rotate(0deg)',
              color: 'primary.main',
            }}
          />
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.8rem' }}>
            {objectivesOpen ? 'Hide' : 'View'} Assessment Objectives ({objectives.length})
          </Typography>
          {!objectivesOpen && objStatusSummary && objStatusSummary.impl > 0 && (
            <Chip
              icon={<CheckCircleIcon sx={{ fontSize: 12, color: '#22c55e !important' }} />}
              label={`${objStatusSummary.impl}/${objStatusSummary.total}`}
              size="small"
              sx={{ height: 20, fontSize: '0.65rem', ml: 0.5 }}
            />
          )}
        </Box>
      )}

      {/* Objectives drill-down */}
      <Collapse in={objectivesOpen} timeout="auto" unmountOnExit>
        <ObjectivesList
          objectives={objectives}
          objectiveStatuses={objectiveStatuses}
          odps={control.odps}
          isMobile={isMobile}
          onObjectiveClick={(obj, st) => { setDetailObj(obj); setDetailStatus(st); }}
        />
      </Collapse>

      {/* Objective detail dialog */}
      <ObjectiveDetailDialog
        open={!!detailObj}
        objective={detailObj}
        statusEntry={detailStatus}
        onClose={() => { setDetailObj(null); setDetailStatus(null); }}
        onStatusChange={(objId, newStatus) => {
          onObjectiveStatusChange(objId, newStatus);
          setDetailObj(null);
          setDetailStatus(null);
        }}
      />
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SPRS Score Card
// ─────────────────────────────────────────────────────────────────────────────

const SPRSScoreCard: React.FC<{ sprs: SPRSScore }> = ({ sprs }) => {
  const scoreColor = sprs.score >= 88 ? '#22c55e' : sprs.score >= 50 ? '#f59e0b' : '#ef4444';
  const scorePct = Math.max(0, Math.round(((sprs.score + 203) / 313) * 100)); // -203 to 110 range

  return (
    <Card variant="outlined" sx={{ borderColor: scoreColor, borderWidth: 2, mb: 3 }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Box sx={{ textAlign: 'center', minWidth: 80 }}>
            <Typography variant="h3" sx={{ fontWeight: 800, color: scoreColor, lineHeight: 1 }}>
              {sprs.score}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
              of {sprs.maxScore}
            </Typography>
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              SPRS Score
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
              Supplier Performance Risk System — DoD Assessment Methodology
            </Typography>
            {sprs.conditionalCertEligible ? (
              <Chip label="CMMC Conditional Certification Eligible" size="small" sx={{ bgcolor: '#22c55e', color: '#fff', fontWeight: 600, fontSize: '0.7rem' }} />
            ) : (
              <Chip label="Not eligible for conditional certification" size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
            )}
          </Box>
        </Box>

        {/* Score bar */}
        <Box sx={{ mb: 2 }}>
          <LinearProgress
            variant="determinate"
            value={scorePct}
            sx={{
              height: 10, borderRadius: 5, bgcolor: 'rgba(148,163,184,0.15)',
              '& .MuiLinearProgress-bar': { borderRadius: 5, bgcolor: scoreColor },
            }}
          />
        </Box>

        {/* Weight tier breakdown */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5 }}>
          <Box sx={{ textAlign: 'center', p: 1, borderRadius: 1, bgcolor: 'rgba(239,68,68,0.06)' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#ef4444' }}>
              {sprs.weight5Met}/{sprs.weight5Total}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
              Weight 5 (Critical)
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center', p: 1, borderRadius: 1, bgcolor: 'rgba(245,158,11,0.06)' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#f59e0b' }}>
              {sprs.weight3Met}/{sprs.weight3Total}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
              Weight 3 (Important)
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center', p: 1, borderRadius: 1, bgcolor: 'rgba(148,163,184,0.06)' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#64748b' }}>
              {sprs.weight1Met}/{sprs.weight1Total}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
              Weight 1 (Baseline)
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// FAR 52.204-21 Detail Card
// ─────────────────────────────────────────────────────────────────────────────

const FARDetailCard: React.FC<{ farDetail: FARDetail }> = ({ farDetail }) => {
  const [expanded, setExpanded] = React.useState(false);
  const pct = farDetail.summary.total > 0
    ? Math.round((farDetail.summary.met / farDetail.summary.total) * 100)
    : 0;
  const pctColor = pct >= 80 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <Card variant="outlined" sx={{ borderColor: pctColor, borderWidth: 2 }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <ShieldIcon fontSize="small" sx={{ color: pctColor }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
            FAR 52.204-21
          </Typography>
          <Chip label="15 Basic" size="small" sx={{ ml: 'auto', fontSize: '0.65rem', height: 20 }} />
        </Box>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1.5 }}>
          Basic Safeguarding of Covered Contractor Information Systems
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <Box sx={{ flex: 1, height: 10, borderRadius: 5, bgcolor: 'rgba(148,163,184,0.15)', position: 'relative' }}>
            <Box sx={{
              position: 'absolute', left: 0, top: 0, height: '100%',
              width: `${pct}%`, bgcolor: pctColor, borderRadius: 5, transition: 'width 0.5s ease',
            }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: pctColor, minWidth: 48, textAlign: 'right' }}>
            {pct}%
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
          <Typography variant="caption" sx={{ color: '#22c55e' }}>{farDetail.summary.met} met</Typography>
          <Typography variant="caption" sx={{ color: '#ef4444' }}>{farDetail.summary.notMet} not met</Typography>
        </Box>

        <Button
          size="small"
          onClick={() => setExpanded(!expanded)}
          sx={{ fontSize: '0.7rem', p: 0, minWidth: 0 }}
        >
          {expanded ? 'Hide' : 'Show'} {farDetail.summary.total} requirements
        </Button>

        <Collapse in={expanded}>
          <Box sx={{ mt: 1.5, maxHeight: 300, overflow: 'auto' }}>
            {farDetail.requirements.map((req, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, py: 0.75, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Chip
                  label={req.farSubsection}
                  size="small"
                  sx={{ fontFamily: 'monospace', fontSize: '0.65rem', minWidth: 36, mt: 0.25 }}
                />
                <Chip
                  label={req.controlIdentifier}
                  size="small"
                  sx={{ fontFamily: 'monospace', fontSize: '0.65rem', minWidth: 60, mt: 0.25 }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }} noWrap>
                    {req.farRequirement}
                  </Typography>
                </Box>
                <Chip
                  label={req.status === 'IMPLEMENTED' ? 'Met' : 'Not Met'}
                  size="small"
                  sx={{
                    fontSize: '0.6rem', height: 20, mt: 0.25,
                    bgcolor: req.status === 'IMPLEMENTED' ? '#22c55e' : '#ef4444',
                    color: '#fff',
                  }}
                />
              </Box>
            ))}
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
};

const ReciprocityCard: React.FC<{ result: ReciprocityResult }> = ({ result }) => {
  const pct = result.compliance_pct;
  const pctColor = pct >= 80 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <Card
      variant="outlined"
      sx={{
        borderColor: pctColor,
        borderWidth: 2,
        bgcolor: pct >= 80 ? 'rgba(34,197,94,0.04)' : pct >= 40 ? 'rgba(245,158,11,0.04)' : 'rgba(239,68,68,0.04)',
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <LinkIcon fontSize="small" sx={{ color: pctColor }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
            {result.clause_code}
          </Typography>
          <Chip
            label={result.mapping_type === 'basic' ? '31 Basic' : 'All 110'}
            size="small"
            sx={{ ml: 'auto', fontSize: '0.65rem', height: 20 }}
          />
        </Box>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1.5 }}>
          {result.clause_title}
        </Typography>

        {/* Compliance bar */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ flex: 1, height: 10, borderRadius: 5, bgcolor: 'rgba(148,163,184,0.15)', position: 'relative' }}>
            <Box
              sx={{
                position: 'absolute',
                left: 0,
                top: 0,
                height: '100%',
                width: `${pct}%`,
                bgcolor: pctColor,
                borderRadius: 5,
                transition: 'width 0.5s ease',
              }}
            />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: pctColor, minWidth: 48, textAlign: 'right' }}>
            {pct}%
          </Typography>
        </Box>

        {/* Breakdown */}
        <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
          <Typography variant="caption" sx={{ color: '#22c55e' }}>
            {result.implemented} implemented
          </Typography>
          <Typography variant="caption" sx={{ color: '#f59e0b' }}>
            {result.in_progress} in progress
          </Typography>
          <Typography variant="caption" sx={{ color: '#94a3b8' }}>
            {result.not_started} remaining
          </Typography>
        </Box>

        {result.mapping_description && (
          <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary', fontStyle: 'italic' }}>
            {result.mapping_description}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

const Controls: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const { currentProject } = useProject();
  const { isAuthenticated, loading: authLoading } = useAuth();

  // State
  const [frameworks, setFrameworks] = useState<ControlFramework[]>([]);
  const [activeFramework, setActiveFramework] = useState<FrameworkWithFamilies | null>(null);
  const [reciprocity, setReciprocity] = useState<ReciprocityResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(new Set());

  // Framework activation state
  const [recommendations, setRecommendations] = useState<FrameworkRecommendation[]>([]);
  const [activatedFrameworks, setActivatedFrameworks] = useState<ControlFramework[]>([]);
  const [activating, setActivating] = useState(false);

  // SSP Parser state
  const [sspDialogOpen, setSspDialogOpen] = useState(false);
  const [sspFile, setSspFile] = useState<File | null>(null);
  const [sspParsing, setSspParsing] = useState(false);
  const [sspResult, setSspResult] = useState<SSPParseResult | null>(null);
  const [sspError, setSspError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Section 508 scoping wizard state. Only meaningful when activeFramework is
  // Section 508 (other frameworks leave applicability_conditions NULL and apply
  // uniformly — no wizard needed).
  const [scoping, setScoping] = useState<ProgramScoping | null>(null);
  const [scopingLoaded, setScopingLoaded] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);

  // Detect Section 508 framework. Match by name so the check is portable across
  // environments that re-seeded with different UUIDs.
  const isSection508 = !!activeFramework && /Section 508/i.test(activeFramework.name);

  // Assessment Import state
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<import('../services/controlService').AssessmentImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  // Objective-level status state
  const [objectiveStatuses, setObjectiveStatuses] = useState<ObjectiveStatusMap>({});

  // SPRS & FAR state
  const [sprsScore, setSprsScore] = useState<SPRSScore | null>(null);
  const [farDetail, setFarDetail] = useState<FARDetail | null>(null);

  // Feedback snackbar
  const [feedbackSnack, setFeedbackSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'info' | 'error' }>({
    open: false, message: '', severity: 'success',
  });

  // Track which framework is selected (by ID) so we can switch
  const [selectedFrameworkId, setSelectedFrameworkId] = useState<string | null>(null);

  // ── Load a specific framework's details ────────────────────────
  const loadFrameworkById = useCallback(async (frameworkId: string) => {
    setLoading(true);
    setActiveFramework(null);
    setObjectiveStatuses({});
    setReciprocity([]);
    setSprsScore(null);
    setFarDetail(null);
    setExpandedFamilies(new Set());
    setSearchTerm('');
    // Close & reset any open dialogs so stale data doesn't linger across frameworks
    setSspDialogOpen(false); setSspFile(null); setSspResult(null); setSspError(null);
    setImportDialogOpen(false); setImportFile(null); setImportResult(null); setImportError(null);

    try {
      const detail = await fetchFrameworkWithStatus(frameworkId);
      setActiveFramework(detail);

      if (detail) {
        const allControlIds = detail.families.flatMap(f => f.controls.filter(c => !c.is_withdrawn).map(c => c.id));
        if (allControlIds.length > 0) {
          try {
            const objStatuses = await fetchObjectiveStatuses(allControlIds);
            setObjectiveStatuses(objStatuses);
          } catch { /* Non-fatal */ }
        }
      }

      const recip = await fetchReciprocity(frameworkId);
      setReciprocity(recip);

      try {
        const [sprs, far] = await Promise.all([fetchSPRSScore(), fetchFARDetail()]);
        setSprsScore(sprs);
        setFarDetail(far);
      } catch {}
    } catch (err: any) {
      setError(err?.message || 'Failed to load framework');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Switch framework handler ───────────────────────────────────
  const handleSwitchFramework = useCallback((frameworkId: string) => {
    if (frameworkId === selectedFrameworkId) return;
    setSelectedFrameworkId(frameworkId);
    loadFrameworkById(frameworkId);
  }, [selectedFrameworkId, loadFrameworkById]);

  // ── Load frameworks — gate on activation ────────────────────────
  useEffect(() => {
    if (!isAuthenticated || authLoading) return;

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setActiveFramework(null);

        // 1. Check which frameworks are activated for this project
        const activated = await fetchActivatedFrameworks();
        if (cancelled) return;
        setActivatedFrameworks(activated);

        if (activated.length > 0) {
          // 2a. Project has activated frameworks — load the first one
          setSelectedFrameworkId(activated[0].id);
          const detail = await fetchFrameworkWithStatus(activated[0].id);
          if (cancelled) return;
          setActiveFramework(detail);

          // 2a-ii. Load objective-level statuses for all controls
          if (detail) {
            const allControlIds = detail.families.flatMap(f => f.controls.filter(c => !c.is_withdrawn).map(c => c.id));
            if (allControlIds.length > 0) {
              try {
                const objStatuses = await fetchObjectiveStatuses(allControlIds);
                if (!cancelled) setObjectiveStatuses(objStatuses);
              } catch (err) {
                // Non-fatal — objectives just won't have status
              }
            }
          }

          const recip = await fetchReciprocity(activated[0].id);
          if (cancelled) return;
          setReciprocity(recip);

          // Load SPRS score and FAR detail
          try {
            const [sprs, far] = await Promise.all([fetchSPRSScore(), fetchFARDetail()]);
            if (!cancelled) {
              setSprsScore(sprs);
              setFarDetail(far);
            }
          } catch {}
        } else {
          // 2b. No activated frameworks — load recommendations
          const recs = await fetchRecommendedFrameworks();
          if (cancelled) return;
          setRecommendations(recs);

          // Also load all frameworks as fallback for manual activation
          if (recs.length === 0) {
            const allFws = await fetchFrameworks();
            if (cancelled) return;
            setFrameworks(allFws);
          }
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Failed to load control frameworks');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated, authLoading, currentProject]);

  // ── Load Section 508 scoping when that framework becomes active ───
  // Only fires for Section 508 — other frameworks apply uniformly and don't
  // need scoping. Scoping load is non-fatal: if the endpoint errors, the
  // page still works (the wizard button just won't show the saved answers).
  useEffect(() => {
    if (!activeFramework || !isSection508) {
      setScoping(null);
      setScopingLoaded(true);
      return;
    }
    let cancelled = false;
    setScopingLoaded(false);
    (async () => {
      try {
        const resp = await fetchScoping(activeFramework.id);
        if (!cancelled) setScoping(resp?.scoping ?? null);
      } catch {
        if (!cancelled) setScoping(null);
      } finally {
        if (!cancelled) setScopingLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [activeFramework, isSection508]);

  // ── Wizard apply handler — reload the framework after status changes ──
  const handleWizardApplied = useCallback(async (result: ScopingApplyResult) => {
    setWizardOpen(false);
    setFeedbackSnack({
      open: true,
      message: result.nowNotApplicable === 0
        ? `Scoping saved — all ${result.totalControls} controls apply to your ICT.`
        : `Scoping applied — ${result.nowNotApplicable} of ${result.totalControls} controls marked Not Applicable${result.statusPreserved > 0 ? ` (${result.statusPreserved} preserved with existing evidence)` : ''}.`,
      severity: 'success',
    });
    // Reload framework so the UI reflects the new N/A statuses + counters.
    if (activeFramework) {
      try {
        const [detail, freshScoping] = await Promise.all([
          fetchFrameworkWithStatus(activeFramework.id),
          fetchScoping(activeFramework.id),
        ]);
        if (detail) setActiveFramework(detail);
        setScoping(freshScoping?.scoping ?? null);
      } catch {
        // Reload failure is non-fatal — user can refresh manually.
      }
    }
  }, [activeFramework]);

  // ── Activate a framework ──────────────────────────────────────────
  const handleActivateFramework = useCallback(async (frameworkId: string) => {
    setActivating(true);
    try {
      await activateFrameworkAPI(frameworkId);

      // Reload — activated frameworks will now include this one
      const activated = await fetchActivatedFrameworks();
      setActivatedFrameworks(activated);

      if (activated.length > 0) {
        // Switch to the NEWLY activated framework (not always [0])
        const targetFw = activated.find(a => a.id === frameworkId) || activated[0];
        setSelectedFrameworkId(targetFw.id);

        const detail = await fetchFrameworkWithStatus(targetFw.id);
        setActiveFramework(detail);
        const recip = await fetchReciprocity(targetFw.id);
        setReciprocity(recip);

        // Load SPRS + FAR + objective statuses
        try {
          const [sprs, far] = await Promise.all([fetchSPRSScore(), fetchFARDetail()]);
          setSprsScore(sprs);
          setFarDetail(far);
        } catch {}

        if (detail) {
          const allControlIds = detail.families.flatMap(f => f.controls.filter(c => !c.is_withdrawn).map(c => c.id));
          if (allControlIds.length > 0) {
            try {
              const objStatuses = await fetchObjectiveStatuses(allControlIds);
              setObjectiveStatuses(objStatuses);
            } catch {}
          }
        }

        // Post-activation feedback
        setFeedbackSnack({
          open: true,
          message: `${targetFw.name} activated — ${detail?.families.flatMap(f => f.controls).filter(c => !c.is_withdrawn).length || 0} controls ready for assessment`,
          severity: 'info',
        });
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to activate framework');
    } finally {
      setActivating(false);
    }
  }, []);

  // ── Status change handler ────────────────────────────────────────
  const handleStatusChange = useCallback(async (controlId: string, newStatus: ControlStatus) => {
    if (!activeFramework) return;

    // Optimistic update
    setActiveFramework(prev => {
      if (!prev) return prev;
      const statusConfig = prev.status_config;
      const inProgressValue = statusConfig?.find(s => !s.is_completed && s.ordinal === 2)?.status_value || 'IN_PROGRESS';
      return {
        ...prev,
        families: prev.families.map(fam => ({
          ...fam,
          controls: fam.controls.map(c =>
            c.id === controlId ? { ...c, status: newStatus } : c
          ),
          implemented_count: fam.controls.filter(c => !c.is_withdrawn).reduce((n, c) => {
            const st = c.id === controlId ? newStatus : c.status;
            return n + (isCompletedStatus(statusConfig, st) || c.crosswalk_satisfied ? 1 : 0);
          }, 0),
          in_progress_count: fam.controls.filter(c => !c.is_withdrawn).reduce((n, c) => {
            const st = c.id === controlId ? newStatus : c.status;
            return n + (st === inProgressValue && !c.crosswalk_satisfied ? 1 : 0);
          }, 0),
          not_started_count: fam.controls.filter(c => !c.is_withdrawn).reduce((n, c) => {
            const st = c.id === controlId ? newStatus : c.status;
            return n + (!isCompletedStatus(statusConfig, st) && st !== inProgressValue && !c.crosswalk_satisfied ? 1 : 0);
          }, 0),
        })),
      };
    });

    try {
      await updateControlStatus(controlId, newStatus);
      const visuals = resolveStatusVisuals(
        findStatusOption(activeFramework?.status_config, newStatus),
        newStatus,
      );
      setFeedbackSnack({ open: true, message: `✓ ${visuals.label}`, severity: 'success' });
      // Refresh reciprocity + SPRS after status change
      if (activeFramework) {
        const [recip, sprs, far] = await Promise.all([
          fetchReciprocity(activeFramework.id),
          fetchSPRSScore(),
          fetchFARDetail(),
        ]);
        setReciprocity(recip);
        setSprsScore(sprs);
        setFarDetail(far);
      }
    } catch (err: any) {
      // Revert on failure
      setFeedbackSnack({ open: true, message: 'Failed to save — please retry', severity: 'error' });
    }
  }, [activeFramework]);

  // ── Objective status change handler ────────────────────────────
  const handleObjectiveStatusChange = useCallback(async (objectiveId: string, newStatus: ControlStatus) => {
    try {
      await updateObjectiveStatus(objectiveId, newStatus);

      // Optimistic update in local state
      setObjectiveStatuses(prev => {
        const next = { ...prev };
        for (const controlId of Object.keys(next)) {
          next[controlId] = next[controlId].map(o =>
            o.objective_id === objectiveId ? { ...o, status: newStatus } : o
          );
        }
        return next;
      });

      // Refresh framework data (control-level rollup happens server-side)
      if (activeFramework) {
        const [detail, recip, sprs, far] = await Promise.all([
          fetchFrameworkWithStatus(activeFramework.id),
          fetchReciprocity(activeFramework.id),
          fetchSPRSScore(),
          fetchFARDetail(),
        ]);
        if (detail) setActiveFramework(detail);
        setReciprocity(recip);
        setSprsScore(sprs);
        setFarDetail(far);
      }
    } catch (err: any) {
      setError('Failed to save objective status. Please try again.');
    }
  }, [activeFramework]);

  // ── SSP Upload handler ──────────────────────────────────────────
  const handleSSPUpload = useCallback(async () => {
    if (!sspFile || !activeFramework) return;

    setSspParsing(true);
    setSspError(null);
    setSspResult(null);

    try {
      const result = await parseSSPDocument(sspFile, true);
      if (!result) {
        setSspError('No results returned from SSP parser');
        return;
      }
      setSspResult(result);

      // Refresh the framework data to show updated statuses
      const detail = await fetchFrameworkWithStatus(activeFramework.id);
      if (detail) setActiveFramework(detail);

      const recip = await fetchReciprocity(activeFramework.id);
      setReciprocity(recip);
    } catch (err: any) {
      setSspError(err?.message || 'Failed to parse SSP document');
    } finally {
      setSspParsing(false);
    }
  }, [sspFile, activeFramework]);

  // ── Search filter ────────────────────────────────────────────────
  const filteredFamilies = useMemo(() => {
    if (!activeFramework) return [];
    if (!searchTerm.trim()) return activeFramework.families;

    const term = searchTerm.toLowerCase();
    return activeFramework.families
      .map(fam => ({
        ...fam,
        controls: fam.controls.filter(c =>
          c.identifier.toLowerCase().includes(term) ||
          c.requirement_text?.toLowerCase().includes(term) ||
          c.discussion_text?.toLowerCase().includes(term)
        ),
      }))
      .filter(fam => fam.controls.length > 0 || fam.name.toLowerCase().includes(term));
  }, [activeFramework, searchTerm]);

  // ── Summary stats ────────────────────────────────────────────────
  const summary = useMemo(() => {
    if (!activeFramework) return { total: 0, implemented: 0, inProgress: 0, notStarted: 0, withdrawn: 0, pct: 0 };
    const all = activeFramework.families.flatMap(f => f.controls);
    const active = all.filter(c => !c.is_withdrawn);
    const withdrawn = all.filter(c => c.is_withdrawn).length;
    const statusConfig = activeFramework.status_config;
    const inProgressValue = statusConfig?.find(s => !s.is_completed && s.ordinal === 2)?.status_value || 'IN_PROGRESS';
    // Crosswalk-satisfied controls count as implemented — matches the heatmap.
    // is_completed honours each framework's own vocabulary (Section 508 SUPPORTS,
    // CMMC MET, HIPAA ALTERNATIVE_IMPLEMENTED, etc.).
    const implemented = active.filter(c => isCompletedStatus(statusConfig, c.status) || c.crosswalk_satisfied).length;
    const inProgress = active.filter(c => c.status === inProgressValue && !c.crosswalk_satisfied).length;
    const total = active.length;
    return {
      total,
      implemented,
      inProgress,
      notStarted: total - implemented - inProgress,
      withdrawn,
      pct: total > 0 ? Math.round((implemented / total) * 100) : 0,
    };
  }, [activeFramework]);

  // ── Loading / error states ───────────────────────────────────────
  if (authLoading || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!activeFramework) {
    // ── Framework Activation UI ────────────────────────────────────
    return (
      <Box sx={{ p: isMobile ? 1.5 : 3, maxWidth: 900, mx: 'auto' }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
          <ShieldIcon sx={{ color: 'primary.main' }} />
          <Typography variant={isMobile ? 'h6' : 'h5'} sx={{ fontWeight: 700 }}>
            Control Frameworks
          </Typography>
        </Box>

        <Card variant="outlined" sx={{ mb: 3, bgcolor: 'rgba(99,102,241,0.04)', borderColor: 'primary.light' }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              No control frameworks activated for this project
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Activate a compliance framework to begin tracking your implementation status against its controls.
            </Typography>
          </CardContent>
        </Card>

        {/* Recommended frameworks based on project clauses */}
        {recommendations.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              Recommended based on your project&apos;s clauses
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 2 }}>
              Your project&apos;s scanned clauses map to the following compliance frameworks
            </Typography>

            {recommendations.map(rec => (
              <Card
                key={rec.framework.id}
                variant="outlined"
                sx={{
                  mb: 2,
                  borderColor: rec.activated ? '#22c55e' : 'primary.main',
                  borderWidth: 2,
                }}
              >
                <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flexDirection: isMobile ? 'column' : 'row' }}>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <ShieldIcon sx={{ color: 'primary.main' }} />
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                          {rec.framework.name}
                        </Typography>
                        <Chip label={rec.framework.version} size="small" variant="outlined" />
                      </Box>
                      {rec.framework.description && (
                        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
                          {rec.framework.description}
                        </Typography>
                      )}
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
                        {rec.framework.total_controls} controls
                      </Typography>

                      {/* Triggering clauses */}
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', mr: 0.5, lineHeight: 2.2 }}>
                          Required by:
                        </Typography>
                        {rec.triggeringClauses.map(c => (
                          <Chip
                            key={c.clauseId}
                            label={c.clauseCode}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem', height: 22, fontFamily: 'monospace' }}
                          />
                        ))}
                      </Box>
                    </Box>

                    <Button
                      variant="contained"
                      size="large"
                      disabled={rec.activated || activating}
                      onClick={() => handleActivateFramework(rec.framework.id)}
                      startIcon={activating ? <CircularProgress size={18} /> : <ShieldIcon />}
                      sx={{ whiteSpace: 'nowrap', minWidth: 180, alignSelf: isMobile ? 'stretch' : 'center' }}
                    >
                      {rec.activated ? 'Already Active' : activating ? 'Activating...' : 'Activate Framework'}
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}

        {/* Fallback: all available frameworks (no recommendations) */}
        {recommendations.length === 0 && frameworks.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              Available Frameworks
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 2 }}>
              No clause-to-framework mappings found for this project. You can activate any available framework manually.
            </Typography>

            {frameworks.map(fw => (
              <Card key={fw.id} variant="outlined" sx={{ mb: 2, borderColor: 'divider' }}>
                <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexDirection: isMobile ? 'column' : 'row' }}>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <ShieldIcon sx={{ color: 'text.secondary' }} />
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{fw.name}</Typography>
                        <Chip label={fw.version} size="small" variant="outlined" />
                      </Box>
                      {fw.description && (
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>{fw.description}</Typography>
                      )}
                    </Box>
                    <Button
                      variant="outlined"
                      disabled={activating}
                      onClick={() => handleActivateFramework(fw.id)}
                      startIcon={activating ? <CircularProgress size={18} /> : <ShieldIcon />}
                      sx={{ whiteSpace: 'nowrap', alignSelf: isMobile ? 'stretch' : 'center' }}
                    >
                      {activating ? 'Activating...' : 'Activate'}
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}

        {/* No frameworks exist at all */}
        {recommendations.length === 0 && frameworks.length === 0 && (
          <Alert severity="info">
            No control frameworks available. Contact your administrator to set up compliance frameworks.
          </Alert>
        )}
      </Box>
    );
  }

  // ── Render ───────────────────────────────────────────────────────
  return (
    <Box sx={{ p: isMobile ? 1.5 : 3, maxWidth: 1200, mx: 'auto' }}>
      {/* Framework switcher — shown when multiple frameworks are activated */}
      {activatedFrameworks.length > 1 && (
        <Box sx={{
          display: 'flex',
          gap: 1,
          mb: 2,
          overflowX: 'auto',
          pb: 0.5,
          '&::-webkit-scrollbar': { display: 'none' },
        }}>
          {activatedFrameworks.map(fw => {
            const isSelected = fw.id === selectedFrameworkId;
            return (
              <Chip
                key={fw.id}
                label={`${fw.name} ${fw.version}`}
                onClick={() => handleSwitchFramework(fw.id)}
                icon={<ShieldIcon sx={{ fontSize: 16 }} />}
                variant={isSelected ? 'filled' : 'outlined'}
                color={isSelected ? 'primary' : 'default'}
                sx={{
                  fontWeight: isSelected ? 700 : 500,
                  fontSize: '0.8rem',
                  height: 36,
                  cursor: 'pointer',
                  flexShrink: 0,
                  ...(isSelected && {
                    boxShadow: '0 2px 8px rgba(99,102,241,0.25)',
                  }),
                }}
              />
            );
          })}
        </Box>
      )}

      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <ShieldIcon sx={{ color: 'primary.main' }} />
          <Typography variant={isMobile ? 'h6' : 'h5'} sx={{ fontWeight: 700, flex: 1 }}>
            {activeFramework.name}
          </Typography>
          <Chip label={activeFramework.version} size="small" variant="outlined" />
          {isSection508 && scopingLoaded && (
            <Button
              variant={scoping ? 'outlined' : 'contained'}
              size="small"
              color="primary"
              onClick={() => setWizardOpen(true)}
              sx={{ whiteSpace: 'nowrap' }}
            >
              {scoping ? 'Re-scope applicability' : 'Scope applicability'}
            </Button>
          )}
          <Button
            variant="outlined"
            size="small"
            onClick={() => navigate('/report')}
            sx={{ whiteSpace: 'nowrap' }}
          >
            Executive Report
          </Button>
          <Button
            variant="outlined"
            size="small"
            color="error"
            onClick={async () => {
              if (!activeFramework) return;
              if (!window.confirm(`Deactivate ${activeFramework.name}? Control statuses will be preserved.`)) return;
              try {
                await deactivateFrameworkAPI(activeFramework.id);
                const activated = await fetchActivatedFrameworks();
                setActivatedFrameworks(activated);
                if (activated.length > 0) {
                  setSelectedFrameworkId(activated[0].id);
                  const detail = await fetchFrameworkWithStatus(activated[0].id);
                  if (detail) setActiveFramework(detail);
                } else {
                  setActiveFramework(null);
                  setSelectedFrameworkId(null);
                }
              } catch {
                setError('Failed to deactivate framework.');
              }
            }}
            sx={{ whiteSpace: 'nowrap' }}
          >
            Deactivate
          </Button>
        </Box>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {activeFramework.description}
        </Typography>
      </Box>

      {/* Section 508 scoping prompt — only shows when no scoping exists yet */}
      {isSection508 && scopingLoaded && !scoping && (
        <Alert
          severity="info"
          sx={{ mb: 3 }}
          action={
            <Button color="primary" size="small" variant="contained" onClick={() => setWizardOpen(true)}>
              Run wizard
            </Button>
          }
        >
          <strong>Tell us about your ICT</strong> so we can show only the
          Section 508 requirements that apply. The 12-question wizard takes
          about a minute and cites the CFR paragraph behind each question.
          Your existing control assessments are preserved.
        </Alert>
      )}

      {/* Summary cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 2, mb: 3 }}>
        <Card variant="outlined">
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 }, textAlign: 'center' }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
              {summary.total}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>Active Controls</Typography>
            {summary.withdrawn > 0 && (
              <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', fontSize: '0.65rem' }}>
                +{summary.withdrawn} withdrawn
              </Typography>
            )}
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ borderColor: '#22c55e' }}>
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 }, textAlign: 'center' }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#22c55e' }}>
              {summary.implemented}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>Implemented</Typography>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ borderColor: '#f59e0b' }}>
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 }, textAlign: 'center' }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#f59e0b' }}>
              {summary.inProgress}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>In Progress</Typography>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ borderColor: '#94a3b8' }}>
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 }, textAlign: 'center' }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#94a3b8' }}>
              {summary.notStarted}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>Not Started</Typography>
          </CardContent>
        </Card>
      </Box>

      {/* SPRS Score — only applicable to NIST 800-171 */}
      {sprsScore && activeFramework?.name?.includes('800-171') && <SPRSScoreCard sprs={sprsScore} />}

      {/* Action buttons — sized to match summary grid cards above */}
      <Box sx={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 2, mb: 3 }}>
        <Card
          variant="outlined"
          onClick={() => setSspDialogOpen(true)}
          sx={{
            cursor: 'pointer',
            borderColor: 'primary.main',
            borderStyle: 'dashed',
            borderWidth: 2,
            transition: 'all 0.2s',
            '&:hover': { boxShadow: 2, borderStyle: 'solid', bgcolor: 'rgba(99,102,241,0.04)' },
          }}
        >
          <CardContent sx={{
            p: isMobile ? 1.5 : 2,
            '&:last-child': { pb: isMobile ? 1.5 : 2 },
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.75,
            minHeight: isMobile ? 80 : 90,
          }}>
            <DocumentIcon sx={{ fontSize: isMobile ? 32 : 36, color: 'primary.main' }} />
            <Typography variant={isMobile ? 'body2' : 'body1'} sx={{ fontWeight: 600, color: 'primary.main' }}>
              Upload SSP
            </Typography>
          </CardContent>
        </Card>
        <Card
          variant="outlined"
          onClick={() => { setImportDialogOpen(true); setImportFile(null); setImportResult(null); setImportError(null); }}
          sx={{
            cursor: 'pointer',
            borderColor: '#22c55e',
            borderStyle: 'dashed',
            borderWidth: 2,
            transition: 'all 0.2s',
            '&:hover': { boxShadow: 2, borderStyle: 'solid', bgcolor: 'rgba(34,197,94,0.04)' },
          }}
        >
          <CardContent sx={{
            p: isMobile ? 1.5 : 2,
            '&:last-child': { pb: isMobile ? 1.5 : 2 },
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.75,
            minHeight: isMobile ? 80 : 90,
          }}>
            <UploadFileIcon sx={{ fontSize: isMobile ? 32 : 36, color: '#22c55e' }} />
            <Typography variant={isMobile ? 'body2' : 'body1'} sx={{ fontWeight: 600, color: '#22c55e' }}>
              Import Assessment
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Assessment Import Dialog */}
      <Dialog
        open={importDialogOpen}
        onClose={() => { if (!importing) { setImportDialogOpen(false); setImportFile(null); setImportResult(null); setImportError(null); } }}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>Import Assessment Tracker</DialogTitle>
        <DialogContent>
          {!importResult ? (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Upload your assessment workbook (.xlsx) with per-objective statuses.
                Each &quot;Results&quot; sheet should have columns: Assessment Objective, Status, Gap Type, Justification, Evidence, Remaining Gaps.
              </Typography>

              <input
                ref={importInputRef}
                type="file"
                accept=".xlsx,.xls"
                style={{ display: 'none' }}
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              />

              <Box
                onClick={() => importInputRef.current?.click()}
                sx={{
                  border: '2px dashed',
                  borderColor: importFile ? 'success.main' : 'divider',
                  borderRadius: 2,
                  p: 3,
                  textAlign: 'center',
                  cursor: 'pointer',
                  '&:hover': { borderColor: 'success.light', bgcolor: 'rgba(34,197,94,0.04)' },
                }}
              >
                {importFile ? (
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{importFile.name}</Typography>
                ) : (
                  <Typography variant="body2" color="text.secondary">Click to select .xlsx file</Typography>
                )}
              </Box>

              {importError && <Alert severity="error" sx={{ mt: 2 }}>{importError}</Alert>}

              {importing && (
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                  <CircularProgress size={24} sx={{ mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">Importing objectives…</Typography>
                </Box>
              )}
            </>
          ) : (
            <Box>
              <Alert severity="success" sx={{ mb: 2 }}>
                Imported {importResult.objectivesImported} objectives across {importResult.controlsUpdated} controls
              </Alert>
              <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                <Chip label={`${importResult.summary.fullyMet} Fully Met`} color="success" variant="outlined" />
                <Chip label={`${importResult.summary.partiallyMet} Partially Met`} sx={{ borderColor: '#f59e0b', color: '#f59e0b' }} variant="outlined" />
                <Chip label={`${importResult.summary.notMet} Not Met`} color="error" variant="outlined" />
              </Box>
              {importResult.unmatchedObjectives.length > 0 && (
                <Alert severity="warning" sx={{ mb: 1 }}>
                  {importResult.unmatchedObjectives.length} objectives could not be matched to database records.
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {!importResult ? (
            <>
              <Button onClick={() => { setImportDialogOpen(false); setImportFile(null); setImportError(null); }}>Cancel</Button>
              <Button
                variant="contained"
                color="success"
                disabled={!importFile || importing}
                onClick={async () => {
                  if (!importFile) return;
                  setImporting(true);
                  setImportError(null);
                  try {
                    const result = await importAssessment(importFile, activeFramework!.id);
                    if (result) {
                      setImportResult(result);
                      // Show import summary toast
                      setFeedbackSnack({
                        open: true,
                        message: `Imported ${result.objectivesImported} objectives — ${result.summary.fullyMet} met, ${result.summary.partiallyMet} partial, ${result.summary.notMet} not met`,
                        severity: 'success',
                      });
                      // Reload framework data + objective statuses to reflect updated statuses
                      if (activeFramework) {
                        const updated = await fetchFrameworkWithStatus(activeFramework.id);
                        if (updated) {
                          setActiveFramework(updated);
                          const allControlIds = updated.families.flatMap(f => f.controls.filter(c => !c.is_withdrawn).map(c => c.id));
                          if (allControlIds.length > 0) {
                            try {
                              const objStatuses = await fetchObjectiveStatuses(allControlIds);
                              setObjectiveStatuses(objStatuses);
                            } catch {}
                          }
                          // Refresh SPRS + FAR + reciprocity after import
                          try {
                            const [recip, sprs, far] = await Promise.all([
                              fetchReciprocity(updated.id),
                              fetchSPRSScore(),
                              fetchFARDetail(),
                            ]);
                            setReciprocity(recip);
                            setSprsScore(sprs);
                            setFarDetail(far);
                          } catch {}
                        }
                      }
                    } else {
                      setImportError('No results returned from import');
                    }
                  } catch (err: any) {
                    setImportError(err.message || 'Import failed');
                  } finally {
                    setImporting(false);
                  }
                }}
              >
                Import
              </Button>
            </>
          ) : (
            <Button onClick={() => { setImportDialogOpen(false); setImportFile(null); setImportResult(null); }}>
              Done
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* SSP Upload Dialog */}
      <Dialog open={sspDialogOpen} onClose={() => { if (!sspParsing) { setSspDialogOpen(false); setSspFile(null); setSspResult(null); setSspError(null); } }} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle>Upload System Security Plan</DialogTitle>
        <DialogContent>
          {!sspResult ? (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Upload your SSP or POA&M document (PDF, DOCX, or TXT). The AI will analyze it and
                map implementation statements to controls.
              </Typography>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.txt"
                style={{ display: 'none' }}
                onChange={(e) => setSspFile(e.target.files?.[0] || null)}
              />

              <Box
                onClick={() => fileInputRef.current?.click()}
                sx={{
                  border: '2px dashed',
                  borderColor: sspFile ? 'primary.main' : 'divider',
                  borderRadius: 2,
                  p: 3,
                  textAlign: 'center',
                  cursor: 'pointer',
                  bgcolor: sspFile ? 'rgba(99,102,241,0.04)' : 'transparent',
                  '&:hover': { borderColor: 'primary.main', bgcolor: 'rgba(99,102,241,0.04)' },
                }}
              >
                {sspFile ? (
                  <>
                    <DocumentIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{sspFile.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {(sspFile.size / 1024 / 1024).toFixed(2)} MB — Click to change
                    </Typography>
                  </>
                ) : (
                  <>
                    <UploadFileIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      Click to select your SSP document
                    </Typography>
                  </>
                )}
              </Box>

              {sspParsing && (
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                  <CircularProgress size={24} sx={{ mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    Analyzing document... This may take 30-60 seconds.
                  </Typography>
                </Box>
              )}

              {sspError && (
                <Alert severity="error" sx={{ mt: 2 }}>{sspError}</Alert>
              )}
            </>
          ) : (
            /* SSP Results View */
            <Box>
              <Alert severity="success" sx={{ mb: 2 }}>
                Successfully analyzed "{sspResult.fileName}" — {sspResult.totalAssessments} controls assessed, {sspResult.appliedToProject} applied to project.
              </Alert>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, mb: 2 }}>
                <Card variant="outlined" sx={{ textAlign: 'center', p: 1 }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#22c55e' }}>{sspResult.summary.implemented}</Typography>
                  <Typography variant="caption">Implemented</Typography>
                </Card>
                <Card variant="outlined" sx={{ textAlign: 'center', p: 1 }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#f59e0b' }}>{sspResult.summary.inProgress}</Typography>
                  <Typography variant="caption">In Progress</Typography>
                </Card>
                <Card variant="outlined" sx={{ textAlign: 'center', p: 1 }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#94a3b8' }}>{sspResult.summary.notStarted}</Typography>
                  <Typography variant="caption">Not Started</Typography>
                </Card>
              </Box>

              {sspResult.unmatchedControls > 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  {sspResult.unmatchedControls} control(s) could not be matched to the database. These may reference controls from a different revision.
                </Alert>
              )}

              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Assessment Details</Typography>
              <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                {sspResult.assessments.map((a, i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Chip
                      label={a.controlIdentifier}
                      size="small"
                      sx={{ fontFamily: 'monospace', fontSize: '0.7rem', minWidth: 60 }}
                    />
                    <Chip
                      label={a.status.replace('_', ' ')}
                      size="small"
                      sx={{
                        fontSize: '0.65rem',
                        height: 20,
                        bgcolor: a.status === 'IMPLEMENTED' ? '#22c55e' : a.status === 'IN_PROGRESS' ? '#f59e0b' : '#94a3b8',
                        color: '#fff',
                      }}
                    />
                    <Typography variant="caption" sx={{ flex: 1, color: 'text.secondary' }} noWrap>
                      {a.evidenceNotes}
                    </Typography>
                    {!a.matched && (
                      <Chip label="unmatched" size="small" color="warning" sx={{ fontSize: '0.6rem', height: 18 }} />
                    )}
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {!sspResult ? (
            <>
              <Button onClick={() => { setSspDialogOpen(false); setSspFile(null); setSspError(null); }} disabled={sspParsing}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSSPUpload}
                disabled={!sspFile || sspParsing}
                startIcon={sspParsing ? <CircularProgress size={18} /> : <UploadFileIcon />}
              >
                {sspParsing ? 'Analyzing...' : 'Analyze SSP'}
              </Button>
            </>
          ) : (
            <Button
              variant="contained"
              onClick={() => {
                setSspDialogOpen(false);
                setSspFile(null);
                setSspResult(null);
                setSspError(null);
              }}
            >
              Done
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Overall progress bar */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Overall Compliance
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, color: summary.pct >= 80 ? '#22c55e' : summary.pct >= 40 ? '#f59e0b' : '#ef4444' }}>
              {summary.pct}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={summary.pct}
            sx={{
              height: 12,
              borderRadius: 6,
              bgcolor: 'rgba(148,163,184,0.15)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 6,
                bgcolor: summary.pct >= 80 ? '#22c55e' : summary.pct >= 40 ? '#f59e0b' : '#ef4444',
              },
            }}
          />
        </CardContent>
      </Card>

      {/* Reciprocity section */}
      {(reciprocity.length > 0 || (farDetail && activeFramework?.name?.includes('800-171'))) && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <LinkIcon fontSize="small" />
            Clause Reciprocity
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mb: 2 }}>
            Implementing these controls automatically satisfies related regulatory clauses — assess once, comply many
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 2 }}>
            {farDetail && activeFramework?.name?.includes('800-171') && <FARDetailCard farDetail={farDetail} />}
            {reciprocity
              .filter(r => !/52[\.\s-]*204[\.\s-]*21/i.test(r.clause_code))
              .map(r => (
                <ReciprocityCard key={r.clause_id + r.mapping_type} result={r} />
              ))}
          </Box>
        </Box>
      )}

      <Divider sx={{ mb: 3 }} />

      {/* Breadcrumb navigation — shows expanded families */}
      {expandedFamilies.size > 0 && (
        <Box sx={{ mb: 2 }}>
          <Breadcrumbs separator=">" sx={{ fontSize: '0.8rem' }}>
            <Typography
              variant="caption"
              sx={{ cursor: 'pointer', color: 'primary.main', fontWeight: 600 }}
              onClick={() => setExpandedFamilies(new Set())}
            >
              {activeFramework.name}
            </Typography>
            {filteredFamilies
              .filter(f => expandedFamilies.has(f.id))
              .map(f => (
                <Typography key={f.id} variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                  {f.identifier} {f.name}
                </Typography>
              ))}
          </Breadcrumbs>
        </Box>
      )}

      {/* Search */}
      <Box sx={{ mb: 2 }}>
        <TextField
          placeholder="Search controls..."
          size="small"
          fullWidth
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.disabled' }} />,
          }}
        />
      </Box>

      {/* Control families accordion */}
      {filteredFamilies.map(family => (
        <Accordion
          key={family.id}
          expanded={expandedFamilies.has(family.id)}
          onChange={() =>
            setExpandedFamilies(prev => {
              const next = new Set(prev);
              if (next.has(family.id)) next.delete(family.id);
              else next.add(family.id);
              return next;
            })
          }
          sx={{
            mb: 1,
            '&:before': { display: 'none' },
            borderRadius: '8px !important',
            border: '1px solid',
            borderColor: 'divider',
            overflow: 'hidden',
          }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%', mr: 1 }}>
              <Chip
                label={family.identifier}
                size="small"
                color="primary"
                sx={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.75rem' }}
              />
              <Typography variant="subtitle2" sx={{ fontWeight: 600, flex: 1, minWidth: 0 }} noWrap>
                {family.name}
              </Typography>
              {!isMobile && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 100 }}>
                  <Tooltip title={`${family.implemented_count} implemented`}>
                    <Chip
                      icon={<CheckCircleIcon sx={{ fontSize: 14, color: '#22c55e !important' }} />}
                      label={family.implemented_count}
                      size="small"
                      sx={{ height: 22, fontSize: '0.7rem' }}
                    />
                  </Tooltip>
                  <Tooltip title={`${family.in_progress_count} in progress`}>
                    <Chip
                      icon={<InProgressIcon sx={{ fontSize: 14, color: '#f59e0b !important' }} />}
                      label={family.in_progress_count}
                      size="small"
                      sx={{ height: 22, fontSize: '0.7rem' }}
                    />
                  </Tooltip>
                </Box>
              )}
              <Box sx={{ width: isMobile ? 100 : 150 }}>
                <FamilyProgress family={family} />
              </Box>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 0 }}>
            <Box sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
              {family.controls.map(control => (
                <ControlRow
                  key={control.id}
                  control={control}
                  isMobile={isMobile}
                  objectiveStatuses={objectiveStatuses[control.id] || []}
                  statusConfig={activeFramework?.status_config || []}
                  onStatusChange={handleStatusChange}
                  onObjectiveStatusChange={handleObjectiveStatusChange}
                />
              ))}
              {family.controls.length === 0 && (
                <Typography variant="body2" sx={{ p: 2, color: 'text.secondary', textAlign: 'center' }}>
                  No controls match your search
                </Typography>
              )}
            </Box>
          </AccordionDetails>
        </Accordion>
      ))}

      {filteredFamilies.length === 0 && (
        <Alert severity="info" sx={{ mt: 2 }}>
          No control families match your search for &quot;{searchTerm}&quot;
        </Alert>
      )}

      {/* Feedback snackbar */}
      <Snackbar
        open={feedbackSnack.open}
        autoHideDuration={2500}
        onClose={() => setFeedbackSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setFeedbackSnack(s => ({ ...s, open: false }))}
          severity={feedbackSnack.severity}
          variant="filled"
          sx={{ width: '100%', fontWeight: 600 }}
        >
          {feedbackSnack.message}
        </Alert>
      </Snackbar>

      {/* Section 508 applicability wizard — only renders when Section 508 is active */}
      {isSection508 && activeFramework && (
        <Section508Wizard
          open={wizardOpen}
          frameworkId={activeFramework.id}
          initialAnswers={scoping?.answers ?? null}
          onClose={() => setWizardOpen(false)}
          onApplied={handleWizardApplied}
        />
      )}
    </Box>
  );
};

export default Controls;
