import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography, CircularProgress, Alert, Button, Card, CardContent, Tabs, Tab } from '@mui/material';
import { ComplianceMatrix } from '../components/ComplianceMatrix';
import { useClause } from '../contexts/ClauseContext';
import { useBookmarks } from '../contexts/BookmarkContext';
import { useParams } from 'react-router-dom';
import { apiCall } from '../services/api';
import type { Clause, MatrixRow } from '../types/clause';
import type { Project } from '../types/projectCreation';
import { extractErrorMessage } from '../utils/errorUtils';

const Matrix: React.FC = () => {
  const { clauses, loading, error } = useClause();
  const { bookmarks } = useBookmarks();
  const { projectId } = useParams<{ projectId?: string }>();
  
  // State for matrix mode
  const [activeTab, setActiveTab] = useState(0);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projectLoading, setProjectLoading] = useState(false);
  const [projectError, setProjectError] = useState<string | null>(null);

  // Load project data if projectId is provided
  useEffect(() => {
    if (projectId) {
      loadProjectData(projectId);
      setActiveTab(1); // Switch to project matrix tab
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

  // -- Callbacks (not hooks, but kept near the hooks section for clarity) -----

  const loadProjectData = async (id: string) => {
    try {
      setProjectLoading(true);
      setProjectError(null);

      const resp = await apiCall<Project>(`/api/projects/${id}`);
      if (resp.error) {
        throw new Error(extractErrorMessage(resp.error, 'Failed to load project'));
      }
      setCurrentProject(resp.data!);

    } catch (error) {
      setProjectError((error as Error).message);
    } finally {
      setProjectLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // -- Early returns (AFTER all hooks) ----------------------------------------

  if (loading || projectLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || projectError) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          {error || projectError}
          {projectError && (
            <Button
              onClick={() => projectId && loadProjectData(projectId)}
              variant="outlined"
              size="small"
              sx={{ mt: 1 }}
            >
              Retry
            </Button>
          )}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Compliance Matrix
      </Typography>
      
      {/* Project Info Card */}
      {currentProject && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {currentProject.name}
            </Typography>
            {currentProject.description && (
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {currentProject.description}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary">
              Project ID: {currentProject.id} | Created: {new Date(currentProject.createdAt).toLocaleDateString()}
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Matrix Tabs */}
      <Card>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange} 
          aria-label="matrix tabs"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Bookmark Matrix" />
          <Tab 
            label="Project Matrix" 
            disabled={!currentProject}
          />
        </Tabs>
        
        <Box sx={{ p: 3 }}>
          {activeTab === 0 && (
            // Bookmark Matrix Tab
            matrixData.length === 0 ? (
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                py: 8,
                textAlign: 'center'
              }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No bookmarked clauses yet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Bookmark clauses from the Clauses tab to see them appear in the matrix
                </Typography>
              </Box>
            ) : (
              <ComplianceMatrix rows={matrixData} />
            )
          )}
          
          {activeTab === 1 && currentProject && (
            // Project Matrix Tab — reuses ComplianceMatrix so the layout
            // matches the Bookmark Matrix. The same matrixData is used
            // because bookmarks created by create-from-scan are loaded
            // through BookmarkContext for the current project.
            matrixData.length === 0 ? (
              <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: 8,
                textAlign: 'center'
              }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No matched clauses found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Scan results are cross-referenced against the clauses database.
                  Only clauses that match an existing entry are displayed here.
                </Typography>
              </Box>
            ) : (
              <ComplianceMatrix rows={matrixData} />
            )
          )}
          
          {activeTab === 1 && !currentProject && (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              py: 8,
              textAlign: 'center'
            }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No project selected
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Create a project from scan results to view project matrix data
              </Typography>
            </Box>
          )}
        </Box>
      </Card>
    </Box>
  );
};

export default Matrix; 