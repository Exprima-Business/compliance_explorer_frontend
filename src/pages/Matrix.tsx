import React from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import { ComplianceMatrix } from '../components/ComplianceMatrix';
import { useClause } from '../contexts/ClauseContext';
import { useBookmarks } from '../contexts/BookmarkContext';
import type { Clause, MatrixRow } from '../types/clause';

const Matrix: React.FC = () => {
  const { clauses, loading, error } = useClause();
  const { bookmarks } = useBookmarks();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
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
            No bookmarked clauses yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Bookmark clauses from the Clauses tab to see them appear in the matrix
          </Typography>
        </Box>
      ) : (
        <ComplianceMatrix rows={matrixData} />
      )}
    </Box>
  );
};

export default Matrix; 