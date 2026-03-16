import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Box, Typography, CircularProgress, Alert, Card, CardContent,
  useMediaQuery, useTheme, Button, Chip, Snackbar
} from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
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
