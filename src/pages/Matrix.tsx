import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Alert, Button, Card, CardContent, Tabs, Tab } from '@mui/material';
import { ComplianceMatrix } from '../components/ComplianceMatrix';
import { VirtualMatrixTable } from '../components/Matrix/VirtualMatrixTable';
import { useClause } from '../contexts/ClauseContext';
import { useBookmarks } from '../contexts/BookmarkContext';
import { useParams } from 'react-router-dom';
import { apiCall } from '../services/api';
import type { Clause, MatrixRow } from '../types/clause';
import type { Project } from '../types/projectCreation';

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

  const loadProjectData = async (id: string) => {
    try {
      setProjectLoading(true);
      setProjectError(null);

      const resp = await apiCall<Project>(`/api/projects/${id}`);
      if (resp.error) {
        const msg = typeof resp.error === 'string'
          ? resp.error
          : (resp.error as any).message ?? 'Failed to load project';
        throw new Error(msg);
      }
      setCurrentProject(resp.data!);

    } catch (error) {
      console.error('Failed to load project:', error);
      setProjectError((error as Error).message);
    } finally {
      setProjectLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleClauseSelect = (clause: any) => {
    console.log('Clause selected:', clause);
    // Implement clause selection logic
  };

  const handleClauseDeselect = (clauseId: string) => {
    console.log('Clause deselected:', clauseId);
    // Implement clause deselection logic
  };

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

  // Helper function to find parent clauses
  const findParentClauses = (clause: Clause): Clause[] => {
    if (!clause.relationships || !Array.isArray(clause.relationships)) return [];

    const parentClauses: Clause[] = [];
    
    clause.relationships.forEach(relationship => {
      if (relationship.type === 'PARENT') {
        const parentClause = clauses.find(c => c.id === relationship.targetClauseId);
        if (parentClause) {
          parentClauses.push(parentClause);
        }
      }
    });

    return parentClauses;
  };

  // Get all bookmarked clauses and their parent clauses
  const bookmarkedClauses = bookmarks
    .map(b => clauses.find(c => c.id === b.clauseId))
    .filter((c): c is Clause => Boolean(c));

  if (bookmarkedClauses.length !== bookmarks.length) {
    const missing = bookmarks.filter(b => !bookmarkedClauses.some(c => c.id === b.clauseId));
    console.warn('Matrix: some bookmarked clause IDs missing from current clause list', missing);
  }

  const parentClauses = new Set<string>();
  
  // Add parent clauses of bookmarked clauses
  bookmarkedClauses.forEach(clause => {
    const parents = findParentClauses(clause);
    parents.forEach(parent => {
      parentClauses.add(parent.id);
    });
  });

  // Combine bookmarked clauses with their parent clauses
  const matrixClauses = clauses.filter((clause: Clause) => 
    bookmarks.some(b=>b.clauseId===clause.id) || parentClauses.has(clause.id)
  );

  const matrixData = matrixClauses.map((clause: Clause) => ({
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
  }));

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
            // Project Matrix Tab
            <VirtualMatrixTable
              projectId={currentProject.id}
              onClauseSelect={handleClauseSelect}
              onClauseDeselect={handleClauseDeselect}
            />
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