import React, { useEffect, useMemo } from 'react';
import { Box, Typography, CircularProgress, Alert, Card, CardContent, useMediaQuery, useTheme } from '@mui/material';
import { ComplianceMatrix } from '../components/ComplianceMatrix';
import { useClause } from '../contexts/ClauseContext';
import { useBookmarks } from '../contexts/BookmarkContext';
import { useProject } from '../contexts/ProjectContext';
import { useParams } from 'react-router-dom';
import type { Clause } from '../types/clause';

const Matrix: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const { clauses, loading, error } = useClause();
  const { bookmarks, loading: bookmarkLoading } = useBookmarks();
  const { currentProject } = useProject();
  const { projectId } = useParams<{ projectId?: string }>();

  // If the URL contains a projectId, persist it to localStorage so that
  // ProjectContext picks it up on its next refresh cycle. This allows
  // direct links like /matrix/:projectId to work correctly.
  useEffect(() => {
    if (projectId) {
      localStorage.setItem('projectId', projectId);
    }
  }, [projectId]);

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
    </Box>
  );
};

export default Matrix;
