import React from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import { ClauseGraph } from '../components/ClauseGraph';
import { useClause } from '../contexts/ClauseContext';
import type { GraphData, GraphNode, GraphEdge, Clause, ClauseRelationship } from '../types/clause';

const Home: React.FC = () => {
  const { clauses, loading, error, bookmarkClause } = useClause();
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
    const nodes: GraphNode[] = clauses.map((clause: Clause) => ({
      id: clause.id,
      name: clause.title,
      val: 1,
      color: clause.is_bookmarked ? '#FFD700' : undefined
    }));

    const edges: GraphEdge[] = clauses.flatMap((clause: Clause) =>
      clause.relationships.map((rel: ClauseRelationship) => ({
        source: rel.sourceClauseId,
        target: rel.targetClauseId,
        value: 1
      }))
    );

    return { nodes, edges };
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

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', position: 'relative' }}>
      <ClauseGraph
        graphData={graphData}
        onNodeClick={handleNodeClick}
      />
    </Box>
  );
};

export default Home; 