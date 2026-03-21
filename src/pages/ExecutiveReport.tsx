import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Button,
  IconButton,
  Divider,
  LinearProgress,
  Chip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Print as PrintIcon,
  Shield as ShieldIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingIcon,
  ArrowBack as BackIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../hooks/useAuth';
import { useBookmarks } from '../contexts/BookmarkContext';
import { useClause } from '../contexts/ClauseContext';
import {
  fetchActivatedFrameworks,
  fetchFrameworks,
  fetchFrameworkWithStatus,
  fetchReciprocity,
  type FrameworkWithFamilies,
  type ReciprocityResult,
} from '../services/controlService';

// ─────────────────────────────────────────────────────────────────────────────
// Executive Report — single-page compliance snapshot for leadership
// ─────────────────────────────────────────────────────────────────────────────

const ExecutiveReport: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const { currentProject } = useProject();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { bookmarks } = useBookmarks();
  const { clauses } = useClause();

  const [framework, setFramework] = useState<FrameworkWithFamilies | null>(null);
  const [reciprocity, setReciprocity] = useState<ReciprocityResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || authLoading) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);

        // Prefer activated frameworks (project-specific); fall back to all.
        let targetId: string | null = null;
        const activated = await fetchActivatedFrameworks();
        if (activated.length > 0) {
          targetId = activated[0].id;
        } else {
          const fws = await fetchFrameworks();
          if (fws.length > 0) targetId = fws[0].id;
        }
        if (cancelled || !targetId) return;

        const detail = await fetchFrameworkWithStatus(targetId);
        if (cancelled) return;
        setFramework(detail);

        const recip = await fetchReciprocity(targetId);
        if (!cancelled) setReciprocity(recip);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated, authLoading, currentProject]);

  const stats = useMemo(() => {
    if (!framework) return null;
    const all = framework.families.flatMap(f => f.controls);
    const implemented = all.filter(c => c.status === 'IMPLEMENTED').length;
    const inProgress = all.filter(c => c.status === 'IN_PROGRESS').length;
    const total = all.length;
    const notStarted = total - implemented - inProgress;
    const pct = total > 0 ? Math.round((implemented / total) * 100) : 0;

    // Risk assessment
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    if (pct >= 80) riskLevel = 'LOW';
    else if (pct >= 60) riskLevel = 'MEDIUM';
    else if (pct >= 30) riskLevel = 'HIGH';
    else riskLevel = 'CRITICAL';

    // Top gaps — families with lowest implementation
    const familyGaps = framework.families
      .map(f => ({
        name: f.name,
        identifier: f.identifier,
        total: f.controls.length,
        implemented: f.implemented_count,
        pct: f.controls.length > 0 ? Math.round((f.implemented_count / f.controls.length) * 100) : 0,
      }))
      .sort((a, b) => a.pct - b.pct)
      .slice(0, 5);

    return { total, implemented, inProgress, notStarted, pct, riskLevel, familyGaps };
  }, [framework]);

  const riskColors: Record<string, string> = {
    LOW: '#22c55e',
    MEDIUM: '#f59e0b',
    HIGH: '#f97316',
    CRITICAL: '#ef4444',
  };

  if (authLoading || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!framework || !stats) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">No compliance data available. Configure control frameworks first.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: isMobile ? 1.5 : 3, maxWidth: 900, mx: 'auto' }}>
      {/* Floating close button — mobile-friendly, hidden when printing */}
      <IconButton
        onClick={() => navigate(-1 as any)}
        sx={{
          position: 'fixed',
          top: isMobile ? 62 : 72,
          right: 12,
          zIndex: 10,
          bgcolor: 'rgba(255,255,255,0.9)',
          backdropFilter: 'blur(8px)',
          boxShadow: 2,
          '&:hover': { bgcolor: 'rgba(255,255,255,1)' },
          width: 40,
          height: 40,
          '@media print': { display: 'none' },
        }}
      >
        <CloseIcon />
      </IconButton>

      {/* Action buttons — hidden when printing */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, '@media print': { display: 'none' } }}>
        <Button
          variant="outlined"
          startIcon={<BackIcon />}
          onClick={() => navigate('/controls')}
          sx={{ textTransform: 'none' }}
        >
          Back to Controls
        </Button>
        <Button
          variant="contained"
          startIcon={<PrintIcon />}
          onClick={() => window.print()}
        >
          Print / Save PDF
        </Button>
      </Box>

      {/* ── Report Header ───────────────────────────────────────────── */}
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Box component="img" src="/ClauseAtlasLogoSM.png" alt="ClauseAtlas" sx={{ height: 40, mb: 1 }} />
        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          Compliance Executive Summary
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {currentProject?.name || 'Project'} — Generated {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </Typography>
      </Box>

      {/* ── Risk & Score Row ────────────────────────────────────────── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 2, mb: 3 }}>
        {/* Overall Score */}
        <Card variant="outlined" sx={{ textAlign: 'center' }}>
          <CardContent>
            <Typography variant="overline" color="text.secondary">Overall Compliance</Typography>
            <Typography variant="h2" sx={{ fontWeight: 800, color: riskColors[stats.riskLevel] }}>
              {stats.pct}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {stats.implemented} of {stats.total} controls
            </Typography>
          </CardContent>
        </Card>

        {/* Risk Level */}
        <Card variant="outlined" sx={{ textAlign: 'center', borderColor: riskColors[stats.riskLevel] }}>
          <CardContent>
            <Typography variant="overline" color="text.secondary">Risk Level</Typography>
            <Typography variant="h3" sx={{ fontWeight: 800, color: riskColors[stats.riskLevel] }}>
              {stats.riskLevel}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {stats.riskLevel === 'LOW' ? 'Strong compliance posture' :
               stats.riskLevel === 'MEDIUM' ? 'Gaps need attention' :
               stats.riskLevel === 'HIGH' ? 'Significant gaps exist' :
               'Immediate action required'}
            </Typography>
          </CardContent>
        </Card>

        {/* Status Breakdown */}
        <Card variant="outlined" sx={{ textAlign: 'center' }}>
          <CardContent>
            <Typography variant="overline" color="text.secondary">Control Status</Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 1 }}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#22c55e' }}>{stats.implemented}</Typography>
                <Typography variant="caption">Done</Typography>
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#f59e0b' }}>{stats.inProgress}</Typography>
                <Typography variant="caption">Active</Typography>
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#94a3b8' }}>{stats.notStarted}</Typography>
                <Typography variant="caption">Open</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* ── Framework Compliance Bar ────────────────────────────────── */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <ShieldIcon fontSize="small" sx={{ color: 'primary.main' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {framework.name} ({framework.version})
            </Typography>
          </Box>

          {/* Stacked bar showing all families */}
          {framework.families.map(fam => {
            const famPct = fam.controls.length > 0 ? Math.round((fam.implemented_count / fam.controls.length) * 100) : 0;
            return (
              <Box key={fam.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography variant="caption" sx={{ minWidth: 30, fontFamily: 'monospace', fontWeight: 600 }}>
                  {fam.identifier}
                </Typography>
                <Box sx={{ flex: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={famPct}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: 'rgba(148,163,184,0.15)',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 4,
                        bgcolor: famPct >= 80 ? '#22c55e' : famPct >= 40 ? '#f59e0b' : '#ef4444',
                      },
                    }}
                  />
                </Box>
                <Typography variant="caption" sx={{ minWidth: 32, textAlign: 'right', fontWeight: 600 }}>
                  {famPct}%
                </Typography>
              </Box>
            );
          })}
        </CardContent>
      </Card>

      {/* ── Regulatory Reciprocity ──────────────────────────────────── */}
      {reciprocity.length > 0 && (
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <TrendingIcon fontSize="small" sx={{ color: 'primary.main' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Regulatory Crosswalk
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
              Control implementation automatically satisfies requirements in these regulations
            </Typography>

            {reciprocity.map(r => (
              <Box key={r.clause_id + r.mapping_type} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <Box sx={{ minWidth: isMobile ? 100 : 180 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.clause_code}</Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>{r.clause_title}</Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={r.compliance_pct}
                    sx={{
                      height: 10,
                      borderRadius: 5,
                      bgcolor: 'rgba(148,163,184,0.15)',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 5,
                        bgcolor: r.compliance_pct >= 80 ? '#22c55e' : r.compliance_pct >= 40 ? '#f59e0b' : '#ef4444',
                      },
                    }}
                  />
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 40, textAlign: 'right', color: r.compliance_pct >= 80 ? '#22c55e' : r.compliance_pct >= 40 ? '#f59e0b' : '#ef4444' }}>
                  {r.compliance_pct}%
                </Typography>
              </Box>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── Top Gaps ─────────────────────────────────────────────────── */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <WarningIcon fontSize="small" sx={{ color: '#f97316' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Top Compliance Gaps (Priority Areas)
            </Typography>
          </Box>

          {stats.familyGaps.map((gap, i) => (
            <Box key={gap.identifier} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, py: 0.5, borderBottom: i < stats.familyGaps.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
              <Chip
                label={`#${i + 1}`}
                size="small"
                sx={{
                  fontWeight: 700,
                  bgcolor: i === 0 ? '#ef4444' : i === 1 ? '#f97316' : '#f59e0b',
                  color: '#fff',
                  width: 36,
                  height: 24,
                }}
              />
              <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 40, fontFamily: 'monospace' }}>
                {gap.identifier}
              </Typography>
              <Typography variant="body2" sx={{ flex: 1 }}>
                {gap.name}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: gap.pct >= 50 ? '#f59e0b' : '#ef4444' }}>
                {gap.implemented}/{gap.total} ({gap.pct}%)
              </Typography>
            </Box>
          ))}
        </CardContent>
      </Card>

      {/* ── Project Clauses Summary ──────────────────────────────────── */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <CheckIcon fontSize="small" sx={{ color: '#22c55e' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Project Clause Coverage
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 3 }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>{bookmarks.length}</Typography>
              <Typography variant="caption" color="text.secondary">Tracked Clauses</Typography>
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>{clauses.length}</Typography>
              <Typography variant="caption" color="text.secondary">Total in Database</Typography>
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {new Set(bookmarks.map(b => {
                  const clause = clauses.find(c => c.id === b.clauseId);
                  return clause?.family?.name || 'Unknown';
                })).size}
              </Typography>
              <Typography variant="caption" color="text.secondary">Clause Families</Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <Divider sx={{ mb: 2 }} />
      <Box sx={{ textAlign: 'center', pb: 2 }}>
        <Typography variant="caption" color="text.secondary">
          Generated by ClauseAtlas — Federal Compliance Intelligence Platform
        </Typography>
        <br />
        <Typography variant="caption" color="text.secondary">
          clauseatlas.com | {new Date().toISOString().split('T')[0]}
        </Typography>
      </Box>

      {/* Print styles */}
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { margin: 0.5in; size: letter; }
        }
      `}</style>
    </Box>
  );
};

export default ExecutiveReport;
