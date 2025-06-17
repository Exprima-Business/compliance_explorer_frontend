import React from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import { ClauseGraph } from '../components/ClauseGraph';
import { ErrorFallbackBoundary } from '../components/ErrorFallbackBoundary';
import { useClause } from '../contexts/ClauseContext';
import { useGraph } from '../hooks/useGraph';
import type { GraphData, GraphNode, GraphEdge, Clause, ClauseRelationship } from '../types/clause';

const Home: React.FC = () => {
  const useGraphApi = import.meta.env.VITE_USE_GRAPH === '1';

  const { data: graphApiData, isLoading: graphLoading, isError: graphError } = useGraphApi ? useGraph() : { data: null, isLoading: false, isError: false } as any;

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
    if (useGraphApi && graphApiData) {
      return graphApiData;
    }

    if (!clauses || !Array.isArray(clauses)) {
      console.warn('No valid clauses data available');
      return { nodes: [], edges: [] };
    }

    // ---- DEBUG: inspect raw first clause before mapping ----
    if (clauses.length > 0) {
      console.log('🔍 raw clause[0]:', clauses[0]);
    }

    // Build nodes, ensuring uniqueness by clause id
    const nodeMap = new Map<string, GraphNode>();

    clauses
      .filter((clause): clause is Clause => clause !== null && clause !== undefined)
      .forEach((clause: Clause) => {
        const id = clause.id || '';
        if (!nodeMap.has(id)) {
          nodeMap.set(id, {
            id,
            name: clause.title || 'Untitled Clause',
            val: 1,
            color: clause.is_bookmarked ? '#FFD700' : undefined,
            family: clause.family
          });
        }
      });

    const nodes: GraphNode[] = Array.from(nodeMap.values());

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

    // Trim edges whose nodes are missing
    const nodeSet = new Set(nodes.map(n => n.id));
    const safeEdges = edges.filter(e => nodeSet.has(e.source) && nodeSet.has(e.target));

    // ---- DEBUG: dump final graph ----
    console.log('🧩 final graph nodes:', nodes);
    console.log('🧩 final graph edges:', safeEdges);

    return { nodes, edges: safeEdges };
  }, [clauses, useGraphApi, graphApiData]);

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
      <ErrorFallbackBoundary>
        <ClauseGraph
          graphData={graphData}
          onNodeClick={handleNodeClick}
        />
      </ErrorFallbackBoundary>
    </Box>
  );
};

export default Home; 