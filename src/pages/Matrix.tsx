import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Box, Typography, CircularProgress, Alert, Card, CardContent,
  useMediaQuery, useTheme, Button, Chip, Snackbar, Tooltip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { ComplianceMatrix } from '../components/ComplianceMatrix';
import { useClause } from '../contexts/ClauseContext';
import { useBookmarks } from '../contexts/BookmarkContext';
import { useProject } from '../contexts/ProjectContext';
import { useParams, useNavigate } from 'react-router-dom';
import type { Clause } from '../types/clause';
import {
  fetchRecommendedFrameworks, fetchActivatedFrameworks,
  activateFramework, type FrameworkRecommendation, type ControlFramework
} from '../services/controlService';
import { apiCall } from '../services/api';

// Heatmap types
interface FamilyHeatmapData {
  identifier: string;
  name: string;
  total: number;
  implemented: number;
  inProgress: number;
  notStarted: number;
  completionPct: number;
}
interface FrameworkHeatmapData {
  id: string;
  name: string;
  families: FamilyHeatmapData[];
  completionPct: number;
}

function heatColor(pct: number): string {
  if (pct >= 80) return '#22c55e';
  if (pct >= 60) return '#4ade80';
  if (pct >= 40) return '#fbbf24';
  if (pct >= 20) return '#fb923c';
  if (pct > 0) return '#f87171';
  return '#e2e8f0';
}
function heatBg(pct: number): string {
  if (pct >= 80) return 'rgba(34,197,94,0.18)';
  if (pct >= 60) return 'rgba(74,222,128,0.15)';
  if (pct >= 40) return 'rgba(251,191,36,0.15)';
  if (pct >= 20) return 'rgba(251,146,60,0.15)';
  if (pct > 0) return 'rgba(248,113,113,0.15)';
  return 'rgba(226,232,240,0.3)';
}

const Matrix: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();

  const { clauses, loading, error } = useClause();
  const { bookmarks, loading: bookmarkLoading } = useBookmarks();
  const { currentProject } = useProject();
  const { projectId } = useParams<{ projectId?: string }>();

  // Framework activation state
  const [recommendations, setRecommendations] = useState<FrameworkRecommendation[]>([]);
  const [activatedFrameworks, setActivatedFrameworks] = useState<ControlFramework[]>([]);
  const [activating, setActivating] = useState<string | null>(null);
  const [snackMsg, setSnackMsg] = useState<string | null>(null);
  const [heatmapData, setHeatmapData] = useState<FrameworkHeatmapData[]>([]);
  const [scanDetectedClauses, setScanDetectedClauses] = useState<Array<{
    id: string;
    clauseCode: string;
    title: string;
    description: string;
    confidence: number;
    status: string;
  }>>([]);

  // If the URL contains a projectId, persist it to localStorage so that
  // ProjectContext picks it up on its next refresh cycle. This allows
  // direct links like /matrix/:projectId to work correctly.
  useEffect(() => {
    if (projectId) {
      localStorage.setItem('projectId', projectId);
    }
  }, [projectId]);

  // Load framework recommendations and activation status
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [recs, activated] = await Promise.all([
          fetchRecommendedFrameworks(),
          fetchActivatedFrameworks(),
        ]);
        if (!cancelled) {
          setRecommendations(recs);
          setActivatedFrameworks(activated);
        }
      } catch {
        // Non-fatal — banner just won't show
      }

      // Fetch heatmap data from project-summary
      try {
        const res = await apiCall<{
          frameworks: FrameworkHeatmapData[];
        }>('/api/controls/project-summary', { requireAuth: true });
        if (!cancelled && res.data?.frameworks) {
          setHeatmapData(res.data.frameworks);
        }
      } catch {
        // Non-fatal
      }
    })();
    return () => { cancelled = true; };
  }, [currentProject?.id]);

  // Fetch scan-detected clauses from project_matrix_data
  useEffect(() => {
    if (!currentProject?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await apiCall<{
          clauses: Array<{
            id: string;
            clauseId: string;
            clauseCode?: string;
            sourceType?: string;
            title: string;
            description: string;
            confidence: number;
            status: string;
          }>;
        }>(`/api/projects/${currentProject.id}/matrix-data?limit=500`, { requireAuth: true });

        if (!cancelled && res.data?.clauses) {
          const detected = res.data.clauses
            .filter(c => c.sourceType === 'scan-detected')
            .map(c => ({
              id: c.id,
              clauseCode: c.clauseCode || c.clauseId || 'Unknown',
              title: c.title,
              description: c.description || '',
              confidence: c.confidence,
              status: c.status,
            }));
          setScanDetectedClauses(detected);
        }
      } catch {
        // Non-fatal
      }
    })();
    return () => { cancelled = true; };
  }, [currentProject?.id]);

  const handleActivateFramework = useCallback(async (frameworkId: string) => {
    setActivating(frameworkId);
    try {
      await activateFramework(frameworkId);
      const activated = await fetchActivatedFrameworks();
      setActivatedFrameworks(activated);
      setRecommendations(prev => prev.map(r =>
        r.framework.id === frameworkId ? { ...r, activated: true } : r
      ));
      setSnackMsg('Framework activated! View controls to begin compliance tracking.');
    } catch {
      setSnackMsg('Failed to activate framework. Please try again.');
    } finally {
      setActivating(null);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // ALL useMemo hooks MUST be above any early returns to avoid React Error #300
  // ("Rendered fewer hooks than expected"). React requires the same number of
  // hooks on every render — placing them after a conditional `return` meant
  // they were skipped during loading/error states, changing the hook count.
  // ---------------------------------------------------------------------------

  // Helper: find parent clauses for a given clause
  const findParentClauses = (clause: Clause): Clause[] => {
    if (!clause.relationships || !Array.isArray(clause.relationships)) return [];
    const parentClauses: Clause[] = [];
    clause.relationships.forEach(relationship => {
      if (relationship.type === 'PARENT') {
        const parentClause = clauses.find(c => c.id === relationship.targetClauseId);
        if (parentClause) parentClauses.push(parentClause);
      }
    });
    return parentClauses;
  };

  // Memoize all derived data — these are expensive array scans that should not
  // re-run on every render if bookmarks and clauses haven't changed.
  const bookmarkedClauses = useMemo(
    () => bookmarks
      .map(b => clauses.find(c => c.id === b.clauseId))
      .filter((c): c is Clause => Boolean(c)),
    [bookmarks, clauses]
  );

  const parentClauseIds = useMemo(() => {
    const ids = new Set<string>();
    bookmarkedClauses.forEach(clause => {
      findParentClauses(clause).forEach(parent => ids.add(parent.id));
    });
    return ids;
  }, [bookmarkedClauses]);

  const matrixClauses = useMemo(
    () => clauses.filter((clause: Clause) =>
      bookmarks.some(b => b.clauseId === clause.id) || parentClauseIds.has(clause.id)
    ),
    [clauses, bookmarks, parentClauseIds]
  );

  const matrixData = useMemo(
    () => matrixClauses.map((clause: Clause) => ({
      id: clause.id,
      clauseId: clause.clauseCode,
      title: clause.title,
      description: clause.description,
      intent: clause.intent,
      status: clause.status,
      category: clause.category,
      family: clause.family ?? { id: 'unknown', name: 'Uncategorized' },
      conditions: clause.conditions,
      implementationGuidance: clause.implementationGuidance,
      assessmentMethod: clause.assessmentMethod,
      riskClassification: clause.riskClassification,
      referenceUrl: clause.referenceUrl
    })),
    [matrixClauses]
  );

  // -- Early returns (AFTER all hooks) ----------------------------------------

  if (loading || bookmarkLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <Typography variant={isMobile ? 'h5' : 'h4'} gutterBottom>
        Compliance Matrix
      </Typography>

      {/* Project Info Card */}
      {currentProject && (
        <Card sx={{ mb: { xs: 1.5, md: 3 } }}>
          <CardContent sx={{ p: { xs: 1.5, md: 2 }, '&:last-child': { pb: { xs: 1.5, md: 2 } } }}>
            <Typography variant={isMobile ? 'subtitle1' : 'h6'} gutterBottom>
              {currentProject.name}
            </Typography>
            {currentProject.description && (
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {currentProject.description}
              </Typography>
            )}
            {!isMobile && (
              <Typography variant="caption" color="text.secondary">
                Project ID: {currentProject.id} | Created: {new Date(currentProject.createdAt).toLocaleDateString()}
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      {/* Framework Activation Banners */}
      {recommendations.filter(r => !r.activated).map(rec => (
        <Card key={rec.framework.id} sx={{
          mb: 2, border: '2px solid', borderColor: 'warning.main',
          background: theme.palette.mode === 'dark'
            ? 'rgba(255,167,38,0.08)' : 'rgba(255,167,38,0.05)'
        }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <SecurityIcon color="warning" sx={{ fontSize: 36 }} />
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                Compliance Framework Required
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Your project clauses ({rec.triggeringClauses.map(c => c.clauseCode).join(', ')}) require{' '}
                <strong>{rec.framework.name} {rec.framework.version}</strong> compliance.
              </Typography>
              <Box sx={{ mt: 0.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {rec.triggeringClauses.map(c => (
                  <Chip key={c.clauseId} label={c.clauseCode} size="small" variant="outlined" />
                ))}
              </Box>
            </Box>
            <Button
              variant="contained"
              color="warning"
              startIcon={<SecurityIcon />}
              disabled={activating === rec.framework.id}
              onClick={() => handleActivateFramework(rec.framework.id)}
              sx={{ whiteSpace: 'nowrap' }}
            >
              {activating === rec.framework.id ? 'Activating…' : 'Activate Framework'}
            </Button>
          </CardContent>
        </Card>
      ))}

      {/* Activated framework banners */}
      {activatedFrameworks.map(fw => (
        <Card key={fw.id} sx={{
          mb: 2, border: '2px solid', borderColor: 'success.main',
          background: theme.palette.mode === 'dark'
            ? 'rgba(76,175,80,0.08)' : 'rgba(76,175,80,0.05)'
        }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <CheckCircleIcon color="success" sx={{ fontSize: 36 }} />
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                {fw.name} {fw.version}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Framework activated — {fw.total_controls} controls ready for compliance tracking.
              </Typography>
            </Box>
            <Button
              variant="outlined"
              color="success"
              endIcon={<ArrowForwardIcon />}
              onClick={() => navigate('/controls')}
            >
              View Controls
            </Button>
          </CardContent>
        </Card>
      ))}

      {/* ── Crosswalk Heatmap ─────────────────────────────────── */}
      {heatmapData.length > 0 && (
        <Card sx={{ mb: { xs: 1.5, md: 3 } }}>
          <CardContent sx={{ p: { xs: 1, md: 2 } }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
              Control Family Compliance Heatmap
            </Typography>
            {heatmapData.map(fw => (
              <Box key={fw.id} sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  {fw.name} — {fw.completionPct}% overall
                </Typography>
                <Box sx={{
                  display: 'grid',
                  gridTemplateColumns: isMobile
                    ? 'repeat(auto-fill, minmax(80px, 1fr))'
                    : 'repeat(auto-fill, minmax(110px, 1fr))',
                  gap: 0.75,
                }}>
                  {fw.families.map(fam => (
                    <Tooltip
                      key={fam.identifier}
                      title={
                        `${fam.name}\n${fam.implemented}/${fam.total} implemented` +
                        (fam.inProgress > 0 ? `, ${fam.inProgress} in progress` : '') +
                        (fam.notStarted > 0 ? `, ${fam.notStarted} not started` : '')
                      }
                      arrow
                    >
                      <Box sx={{
                        p: 1,
                        borderRadius: 1,
                        bgcolor: heatBg(fam.completionPct),
                        border: '1px solid',
                        borderColor: heatColor(fam.completionPct),
                        textAlign: 'center',
                        cursor: 'default',
                        transition: 'transform 0.15s',
                        '&:hover': { transform: 'scale(1.04)', boxShadow: 2 },
                      }}>
                        <Typography variant="caption" sx={{
                          fontWeight: 700, display: 'block', lineHeight: 1.2,
                          color: fam.completionPct > 0 ? heatColor(fam.completionPct) : '#94a3b8',
                        }}>
                          {fam.identifier}
                        </Typography>
                        <Typography sx={{
                          fontSize: '1.1rem', fontWeight: 800, lineHeight: 1.3,
                          color: fam.completionPct > 0 ? heatColor(fam.completionPct) : '#cbd5e1',
                        }}>
                          {fam.completionPct}%
                        </Typography>
                        <Typography variant="caption" sx={{
                          display: 'block', fontSize: '0.6rem', color: 'text.secondary',
                          lineHeight: 1.1, mt: 0.25,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {fam.name}
                        </Typography>
                      </Box>
                    </Tooltip>
                  ))}
                </Box>
                {/* Color scale legend */}
                <Box sx={{ display: 'flex', gap: 1, mt: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>Coverage:</Typography>
                  {[0, 20, 40, 60, 80, 100].map(v => (
                    <Box key={v} sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                      <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: heatColor(v), border: '1px solid', borderColor: 'divider' }} />
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>{v}%</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Single Compliance Matrix */}
      <Card>
        <Box sx={{ p: { xs: 0.5, sm: 1.5, md: 3 } }}>
          {matrixData.length === 0 ? (
            <Box sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 8,
              textAlign: 'center'
            }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No clauses in this project yet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Use the Document Scanner to scan a document and save matching clauses to this project.
              </Typography>
            </Box>
          ) : (
            <ComplianceMatrix rows={matrixData} />
          )}
        </Box>
      </Card>

      {/* Scan-Detected Clauses (not in reference database) */}
      {scanDetectedClauses.length > 0 && (
        <Card sx={{ mt: { xs: 1.5, md: 3 }, border: '1px solid', borderColor: 'warning.light' }}>
          <CardContent sx={{ p: { xs: 1, md: 2 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <WarningAmberIcon sx={{ color: '#b45309' }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#b45309' }}>
                Scan-Detected Clauses ({scanDetectedClauses.length})
              </Typography>
              <Chip
                label="Not in Reference Database"
                size="small"
                sx={{ bgcolor: '#fef3c7', color: '#b45309', fontWeight: 600, fontSize: '0.7rem' }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              These clauses were identified by the document scanner but do not match any entries in the curated reference database. They may require manual review or addition to the database.
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Clause Code</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Title</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Confidence</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {scanDetectedClauses.map(clause => (
                    <TableRow key={clause.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {clause.clauseCode}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{clause.title}</Typography>
                        {clause.description && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            {clause.description}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`${Math.round(clause.confidence * 100)}%`}
                          size="small"
                          variant="outlined"
                          color={clause.confidence >= 0.8 ? 'success' : clause.confidence >= 0.5 ? 'warning' : 'error'}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip label={clause.status} size="small" color="warning" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      <Snackbar
        open={!!snackMsg}
        autoHideDuration={4000}
        onClose={() => setSnackMsg(null)}
        message={snackMsg}
      />
    </Box>
  );
};

export default Matrix;
