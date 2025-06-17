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
    if (!clauses || !Array.isArray(clauses)) {
      console.warn('No valid clauses data available');
      return { nodes: [], edges: [] };
    }

    const nodes: GraphNode[] = clauses
      .filter((clause): clause is Clause => clause !== null && clause !== undefined)
      .map((clause: Clause) => ({
        id: clause.id || '',
        name: clause.title || 'Untitled Clause',
        val: 1,
        color: clause.is_bookmarked ? '#FFD700' : undefined,
        family: clause.family
      }));

    const edges: GraphEdge[] = clauses
      .filter((clause): clause is Clause => clause !== null && clause !== undefined)
      .flatMap((clause: Clause) => {
        console.log('Processing relationships for clause:', {
          clauseId: clause.id,
          relationships: clause.relationships
        });
        return (clause.relationships || [])
          .filter((rel): rel is ClauseRelationship => {
            console.log('Checking relationship:', rel);
            return rel !== null && 
              rel !== undefined && 
              typeof rel.sourceClauseId === 'string' && 
              typeof rel.targetClauseId === 'string';
          })
          .map((rel: ClauseRelationship) => ({
            source: rel.sourceClauseId,
            target: rel.targetClauseId,
            value: 1
          }));
      });

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