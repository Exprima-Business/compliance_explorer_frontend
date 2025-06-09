import React from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import { ComplianceMatrix } from '../components/ComplianceMatrix';
import { useClause } from '../contexts/ClauseContext';
import type { Clause } from '../types/clause';

const Matrix: React.FC = () => {
  const { clauses, loading, error } = useClause();

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

  const matrixData = clauses.map((clause: Clause) => ({
    id: clause.id,
    clauseId: clause.clauseId,
    title: clause.title,
    description: clause.description,
    intent: clause.intent,
    status: clause.status,
    category: clause.category,
    family: clause.family,
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
      <ComplianceMatrix rows={matrixData} />
    </Box>
  );
};

export default Matrix; 