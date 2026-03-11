import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  useMediaQuery,
  useTheme,
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
} from '@mui/icons-material';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../hooks/useAuth';
import {
  fetchFrameworks,
  fetchFrameworkWithStatus,
  fetchReciprocity,
  updateControlStatus,
  type ControlFramework,
  type FrameworkWithFamilies,
  type FamilyWithControls,
  type ControlWithStatus,
  type ControlStatus,
  type ReciprocityResult,
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

const ControlRow: React.FC<{
  control: ControlWithStatus;
  isMobile: boolean;
  onStatusChange: (controlId: string, status: ControlStatus) => void;
}> = ({ control, isMobile, onStatusChange }) => {
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState(control.evidence_notes || '');
  const statusCfg = STATUS_CONFIG[control.status];

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
        </Box>

        <ToggleButtonGroup
          value={control.status}
          exclusive
          size="small"
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
      <Typography
        variant="body2"
        sx={{ mt: 1, color: 'text.primary', lineHeight: 1.5 }}
      >
        {control.requirement_text}
      </Typography>

      {/* Discussion (expandable) */}
      {control.discussion_text && (
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
          <Typography variant={isMobile ? 'h6' : 'h5'} sx={{ fontWeight: 700 }}>
            {activeFramework.name}
          </Typography>
          <Chip label={activeFramework.version} size="small" variant="outlined" />
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
