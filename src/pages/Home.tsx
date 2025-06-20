import React from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import { ClauseGraphD3 as ClauseGraph } from '../components/ClauseGraphD3';
import { FloatingPanel } from '../components/FloatingPanel';
import { useClause } from '../contexts/ClauseContext';
import { useBookmarks } from '../contexts/BookmarkContext';
import type { GraphData, GraphNode, GraphEdge, Clause, ClauseRelationship, ClauseFamily } from '../types/clause';

const Home: React.FC = () => {
  const { clauses, searchQuery, loading, error } = useClause();
  const { bookmarks, toggleBookmark } = useBookmarks();
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

  const bookmarkedSet = React.useMemo(() => new Set(bookmarks.map(b=>b.clauseId)), [bookmarks]);

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
        isBookmarked: bookmarkedSet.has(clause.id),
        color: bookmarkedSet.has(clause.id) ? '#FFD700' : undefined
      } as GraphNode & {
        title: string;
        riskClassification: string;
        category: string;
      }));

    const links: GraphEdge[] = filtered
      .flatMap((clause: Clause) => {
        return (clause.relationships || [])
          .filter((rel): rel is ClauseRelationship => {
            // Handle both possible relationship structures
            return (
              rel !== null && 
              rel !== undefined && 
              (
                (typeof (rel as any).sourceClauseId === 'string' && typeof (rel as any).targetClauseId === 'string') ||
                (typeof (rel as any).clauseId === 'string')
              )
            );
          })
          .map((rel: ClauseRelationship) => {
            // Handle both possible relationship structures
            const source = (rel as any).sourceClauseId || clause.clauseId;
            const target = (rel as any).targetClauseId || (rel as any).clauseId;
            return {
              source,
              target,
              value: 1
            };
          });
      });

    return { nodes, links };
  }, [filtered, bookmarkedSet]);

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
        isBookmarked={activeClause ? bookmarkedSet.has(activeClause.id) : false}
        onBookmarkToggle={async () => {
          if (!activeClause) return;
          await toggleBookmark(activeClause.id);
        }}
      />
    </Box>
  );
};

export default Home; 