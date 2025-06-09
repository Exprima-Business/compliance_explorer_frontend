import React from 'react';
import { Box, Typography, CircularProgress, Snackbar, Alert } from '@mui/material';
import { ClauseGraph } from '../components/ClauseGraph';
import { useClauseContext } from '../contexts/ClauseContext';
import type { GraphData, GraphNode, GraphEdge, Clause } from '../types/clause';

export const Home: React.FC = () => {
  const { clauses, loading, error, bookmarkClause } = useClauseContext();
  const [snackbar, setSnackbar] = React.useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success'
  });

  const graphData: GraphData = React.useMemo(() => {
    const nodes: GraphNode[] = clauses.map(clause => ({
      id: clause.id,
      label: clause.title,
      title: clause.description,
      group: clause.family?.name || 'Uncategorized',
      category: clause.category,
      riskLevel: clause.riskClassification,
      isBookmarked: Boolean(clause.isBookmarked)
    }));

    const edges: GraphEdge[] = clauses.flatMap(clause =>
      clause.relationships.map(rel => ({
        from: rel.sourceClauseId,
        to: rel.targetClauseId,
        type: rel.type,
        arrows: 'to',
        smooth: {
          type: 'curvedCW',
          roundness: 0.2
        }
      }))
    );

    return {
      nodes,
      edges,
      clauses
    };
  }, [clauses]);

  const handleNodeClick = async (node: GraphNode) => {
    try {
      await bookmarkClause(node.id);
      setSnackbar({
        open: true,
        message: 'Clause bookmarked successfully',
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to bookmark clause',
        severity: 'error'
      });
    }
  };

  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', width: '100%', position: 'relative' }}>
      <ClauseGraph
        graphData={graphData}
        onNodeClick={handleNodeClick}
      />
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}; 