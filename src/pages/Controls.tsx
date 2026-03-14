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
  type ControlFramework,
  type FrameworkWithFamilies,
  type FamilyWithControls,
  type ControlWithStatus,
  type ControlStatus,
  type ReciprocityResult,
  type SSPParseResult,
} from '../services/controlService';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ControlStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  IMPLEMENTED: {
    label: 'Implemented',
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.08)',
    icon: <CheckCircleIcon fontSize="small" sx={{ color: '#22c55e' }} />,
  },
  IN_PROGRESS: {
    label: 'In Progress',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.08)',
    icon: <InProgressIcon fontSize="small" sx={{ color: '#f59e0b' }} />,
  },
  NOT_STARTED: {
    label: 'Not Started',
    color: '#94a3b8',
    bg: 'rgba(148,163,184,0.08)',
    icon: <NotStartedIcon fontSize="small" sx={{ color: '#94a3b8' }} />,
  },
};

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

const ObjectivesList: React.FC<{
  objectives: ParsedObjective[];
  isMobile: boolean;
}> = ({ objectives, isMobile }) => (
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
    <Typography
      variant="caption"
      sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', pt: 1, pb: 0.5 }}
    >
      Assessment Objectives ({objectives.length})
    </Typography>
    {objectives.map((obj, idx) => (
      <Box
        key={obj.id}
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 1,
          py: 0.75,
          borderBottom: idx < objectives.length - 1 ? '1px solid' : 'none',
          borderColor: 'divider',
        }}
      >
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
            borderColor: 'primary.light',
            color: 'primary.main',
          }}
        />
        <Typography
          variant="caption"
          sx={{ color: 'text.secondary', lineHeight: 1.5, fontSize: '0.75rem' }}
        >
          {obj.text}
        </Typography>
      </Box>
    ))}
  </Box>
);

const ControlRow: React.FC<{
  control: ControlWithStatus;
  isMobile: boolean;
  onStatusChange: (controlId: string, status: ControlStatus) => void;
}> = ({ control, isMobile, onStatusChange }) => {
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState(control.evidence_notes || '');
  const [objectivesOpen, setObjectivesOpen] = useState(false);
  const statusCfg = STATUS_CONFIG[control.status];

  // Use real objectives from API if available, fall back to text parsing
  const objectives = useMemo(() => {
    if (control.objectives && control.objectives.length > 0) {
      return control.objectives.map(o => ({ id: o.identifier, text: o.description }));
    }
    return parseObjectives(control.identifier, control.discussion_text);
  }, [control.objectives, control.identifier, control.discussion_text]);

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
          {/* Objectives expand button */}
          {objectives.length > 0 && (
            <IconButton
              size="small"
              onClick={() => setObjectivesOpen(prev => !prev)}
              sx={{
                p: 0.25,
                transition: 'transform 0.2s',
                transform: objectivesOpen ? 'rotate(90deg)' : 'rotate(0deg)',
              }}
            >
              <Badge
                badgeContent={objectives.length}
                color="primary"
                sx={{
                  '& .MuiBadge-badge': {
                    fontSize: '0.6rem',
                    height: 16,
                    minWidth: 16,
                  },
                }}
              >
                <CollapseIcon fontSize="small" />
              </Badge>
            </IconButton>
          )}
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
              label={control.requirement_type}
              size="small"
              variant="outlined"
              sx={{
                fontSize: '0.65rem',
                height: 20,
                color: control.requirement_type === 'basic' ? '#3b82f6' : '#8b5cf6',
                borderColor: control.requirement_type === 'basic' ? '#3b82f6' : '#8b5cf6',
              }}
            />
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
          {(Object.keys(STATUS_CONFIG) as ControlStatus[]).map(st => {
            const cfg = STATUS_CONFIG[st];
            const isActive = control.status === st;
            return (
              <ToggleButton
                key={st}
                value={st}
                sx={{
                  px: isMobile ? 0.8 : 1.2,
                  py: 0.3,
                  fontSize: '0.7rem',
                  textTransform: 'none',
                  color: isActive ? cfg.color : 'text.disabled',
                  bgcolor: isActive ? cfg.bg : 'transparent',
                  borderColor: isActive ? cfg.color : undefined,
                  '&.Mui-selected': { color: cfg.color, bgcolor: cfg.bg, borderColor: cfg.color },
                  '&.Mui-selected:hover': { bgcolor: cfg.bg },
                }}
              >
                {isMobile ? cfg.label.charAt(0) : cfg.label}
              </ToggleButton>
            );
          })}
        </ToggleButtonGroup>
      </Box>

      {/* Requirement text */}
      {control.requirement_text && !control.is_withdrawn && (
        <Typography
          variant="body2"
          sx={{ mt: 1, color: 'text.primary', lineHeight: 1.5 }}
        >
          {control.requirement_text}
        </Typography>
      )}
      {control.is_withdrawn && (
        <Typography variant="caption" sx={{ mt: 0.5, display: 'block', color: 'text.disabled', fontStyle: 'italic' }}>
          This control has been withdrawn in NIST SP 800-171 Rev 3.
        </Typography>
      )}

      {/* Discussion text (shown when objectives are collapsed) */}
      {control.discussion_text && !objectivesOpen && (
        <Typography
          variant="caption"
          sx={{
            mt: 0.5,
            display: 'block',
            color: 'text.secondary',
            fontStyle: 'italic',
            lineHeight: 1.4,
          }}
        >
          {control.discussion_text}
        </Typography>
      )}

      {/* Objectives drill-down */}
      <Collapse in={objectivesOpen} timeout="auto" unmountOnExit>
        <ObjectivesList objectives={objectives} isMobile={isMobile} />
      </Collapse>
    </Box>
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

  // SSP Parser state
  const [sspDialogOpen, setSspDialogOpen] = useState(false);
  const [sspFile, setSspFile] = useState<File | null>(null);
  const [sspParsing, setSspParsing] = useState(false);
  const [sspResult, setSspResult] = useState<SSPParseResult | null>(null);
  const [sspError, setSspError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Load frameworks list ─────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || authLoading) return;

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const fws = await fetchFrameworks();
        if (cancelled) return;
        setFrameworks(fws);

        // Auto-select first framework
        if (fws.length > 0) {
          const detail = await fetchFrameworkWithStatus(fws[0].id);
          if (cancelled) return;
          setActiveFramework(detail);

          const recip = await fetchReciprocity(fws[0].id);
          if (cancelled) return;
          setReciprocity(recip);
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Failed to load control frameworks');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated, authLoading, currentProject]);

  // ── Status change handler ────────────────────────────────────────
  const handleStatusChange = useCallback(async (controlId: string, newStatus: ControlStatus) => {
    if (!activeFramework) return;

    // Optimistic update
    setActiveFramework(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        families: prev.families.map(fam => ({
          ...fam,
          controls: fam.controls.map(c =>
            c.id === controlId ? { ...c, status: newStatus } : c
          ),
          implemented_count: fam.controls.reduce((n, c) =>
            n + ((c.id === controlId ? newStatus : c.status) === 'IMPLEMENTED' ? 1 : 0), 0),
          in_progress_count: fam.controls.reduce((n, c) =>
            n + ((c.id === controlId ? newStatus : c.status) === 'IN_PROGRESS' ? 1 : 0), 0),
          not_started_count: fam.controls.reduce((n, c) =>
            n + ((c.id === controlId ? newStatus : c.status) === 'NOT_STARTED' ? 1 : 0), 0),
        })),
      };
    });

    try {
      await updateControlStatus(controlId, newStatus);
      // Refresh reciprocity after status change
      if (activeFramework) {
        const recip = await fetchReciprocity(activeFramework.id);
        setReciprocity(recip);
      }
    } catch (err: any) {
      // Revert on failure
      setError('Failed to save status change. Please try again.');
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
          c.requirement_text.toLowerCase().includes(term) ||
          c.discussion_text?.toLowerCase().includes(term)
        ),
      }))
      .filter(fam => fam.controls.length > 0 || fam.name.toLowerCase().includes(term));
  }, [activeFramework, searchTerm]);

  // ── Summary stats ────────────────────────────────────────────────
  const summary = useMemo(() => {
    if (!activeFramework) return { total: 0, implemented: 0, inProgress: 0, notStarted: 0, pct: 0 };
    const all = activeFramework.families.flatMap(f => f.controls);
    const implemented = all.filter(c => c.status === 'IMPLEMENTED').length;
    const inProgress = all.filter(c => c.status === 'IN_PROGRESS').length;
    const total = all.length;
    return {
      total,
      implemented,
      inProgress,
      notStarted: total - implemented - inProgress,
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
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">No control frameworks available. Run the NIST 800-171 seed script to get started.</Alert>
      </Box>
    );
  }

  // ── Render ───────────────────────────────────────────────────────
  return (
    <Box sx={{ p: isMobile ? 1.5 : 3, maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <ShieldIcon sx={{ color: 'primary.main' }} />
          <Typography variant={isMobile ? 'h6' : 'h5'} sx={{ fontWeight: 700, flex: 1 }}>
            {activeFramework.name}
          </Typography>
          <Chip label={activeFramework.version} size="small" variant="outlined" />
          <Button
            variant="outlined"
            size="small"
            onClick={() => navigate('/report')}
            sx={{ whiteSpace: 'nowrap' }}
          >
            Executive Report
          </Button>
        </Box>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {activeFramework.description}
        </Typography>
      </Box>

      {/* Summary cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 2, mb: 3 }}>
        <Card variant="outlined">
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 }, textAlign: 'center' }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
              {summary.total}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>Total Controls</Typography>
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

      {/* SSP Upload Button */}
      <Card variant="outlined" sx={{ mb: 3, bgcolor: 'rgba(99,102,241,0.04)', borderColor: 'primary.light' }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, display: 'flex', alignItems: isMobile ? 'stretch' : 'center', gap: 2, flexDirection: isMobile ? 'column' : 'row' }}>
          <DocumentIcon sx={{ color: 'primary.main', fontSize: 32, display: isMobile ? 'none' : 'block' }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Upload System Security Plan (SSP)
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Upload your SSP or POA&M document to auto-assess control implementation status
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<UploadFileIcon />}
            onClick={() => setSspDialogOpen(true)}
            sx={{ whiteSpace: 'nowrap' }}
          >
            Upload SSP
          </Button>
        </CardContent>
      </Card>

      {/* SSP Upload Dialog */}
      <Dialog open={sspDialogOpen} onClose={() => { if (!sspParsing) { setSspDialogOpen(false); setSspFile(null); setSspResult(null); setSspError(null); } }} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle>Upload System Security Plan</DialogTitle>
        <DialogContent>
          {!sspResult ? (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Upload your SSP or POA&M document (PDF, DOCX, or TXT). The AI will analyze it and
                map implementation statements to NIST 800-171 controls.
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
      {reciprocity.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <LinkIcon fontSize="small" />
            Clause Reciprocity
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mb: 2 }}>
            Implementing NIST 800-171 controls automatically satisfies these regulatory clauses
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 2 }}>
            {reciprocity.map(r => (
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
                  onStatusChange={handleStatusChange}
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
          No control families match your search for "{searchTerm}"
        </Alert>
      )}
    </Box>
  );
};

export default Controls;
