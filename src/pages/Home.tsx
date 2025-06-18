import React from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import { ClauseGraphD3 as ClauseGraph } from '../components/ClauseGraphD3';
import { FloatingPanel } from '../components/FloatingPanel';
import { useClause } from '../contexts/ClauseContext';
import type { GraphData, GraphNode, GraphEdge, Clause, ClauseRelationship, ClauseFamily } from '../types/clause';

const Home: React.FC = () => {
  const { clauses, searchQuery, loading, error, bookmarkClause } = useClause();
  const [snackbar, setSnackbar] = React.useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success'
  });

  const [activeClause, setActiveClause] = React.useState<Clause | null>(null);

  const searchLower = searchQuery.toLowerCase();

  const filtered = clauses.filter((clause): clause is Clause => {
    if (!clause) return false;
    if (!searchLower) return true;
    return (
      clause.title?.toLowerCase().includes(searchLower) ||
      clause.clauseId?.toLowerCase().includes(searchLower)
    );
  });

  const graphData: GraphData = React.useMemo(() => {
    if (!filtered || !Array.isArray(filtered)) {
      console.warn('No valid clauses data available');
      return { nodes: [], links: [] };
    }

    const nodes: GraphNode[] = filtered
      .map((clause: Clause) => ({
        id: clause.id || '',
        name: clause.title || 'Untitled Clause',
        clauseId: clause.clauseId || '',
        title: clause.title || '',
        riskClassification: clause.riskClassification || 'UNKNOWN',
        category: clause.category || '',
        family: clause.family,
        val: 1,
        color: clause.is_bookmarked ? '#FFD700' : undefined
      } as GraphNode & {
        title: string;
        riskClassification: string;
        category: string;
      }));

    const links: GraphEdge[] = filtered
      .flatMap((clause: Clause) => {
        // console.debug('Processing relationships for clause', clause.id);
        return (clause.relationships || [])
          .filter((rel): rel is ClauseRelationship => {
            // console.debug('Checking relationship', rel);
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

    return { nodes, links };
  }, [filtered]);

  const handleNodeClick = (node: GraphNode) => {
    const clause = clauses.find(c => c.id === node.id);
    if (clause) {
      setActiveClause(clause);
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

      <FloatingPanel
        clause={activeClause}
        onClose={() => setActiveClause(null)}
        isBookmarked={activeClause?.is_bookmarked}
        onBookmarkToggle={async () => {
          if (!activeClause) return;
          try {
            await bookmarkClause(activeClause.id);
            setActiveClause({ ...activeClause, is_bookmarked: !activeClause.is_bookmarked });
          } catch {}
        }}
      />
    </Box>
  );
};

export default Home; 