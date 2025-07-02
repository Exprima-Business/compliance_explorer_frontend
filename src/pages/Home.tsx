import React from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import { ClauseGraphD3 as ClauseGraph } from '../components/ClauseGraphD3';
import { FloatingPanel } from '../components/FloatingPanel';
import { useClause } from '../contexts/ClauseContext';
import { useBookmarks } from '../contexts/BookmarkContext';
import { clauseService } from '../services/clauseService';
import type { GraphData, GraphNode, GraphEdge, Clause, ClauseFamily } from '../types/clause';
import { dlog } from '../utils/debugLog';

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
      (clause.clauseCode || '').toLowerCase().includes(searchLower)
    );
  });

  const bookmarkedSet = React.useMemo(() => new Set(bookmarks.map(b=>b.clauseId)), [bookmarks]);

  // ------------------------------------------------------------------
  // Fetch relationship links once (or whenever bookmarks / clauses change)
  // ------------------------------------------------------------------
  const [remoteLinks, setRemoteLinks] = React.useState<GraphEdge[]>([]);

  React.useEffect(() => {
    (async () => {
      try {
        const resp = await clauseService.getGraphData();
        if (!resp.error && resp.data && Array.isArray(resp.data.links)) {
          setRemoteLinks(resp.data.links);
        } else {
          console.warn('graphData fetch error', resp.error);
        }
      } catch (err) {
        console.error('Failed to fetch graph links', err);
      }
    })();
  }, []); // call once at mount

  const graphData: GraphData = React.useMemo(() => {
    // Build nodes from currently filtered clauses
    const nodes: GraphNode[] = filtered.map((clause: Clause) => ({
      id: clause.id || '',
      name: clause.title || 'Untitled Clause',
      clauseId: clause.clauseCode || '',
      title: clause.title || '',
      riskClassification: clause.riskClassification || 'UNKNOWN',
      category: clause.category || '',
      family: clause.family ?? undefined,
      val: 1,
      isBookmarked: bookmarkedSet.has(clause.id),
      color: bookmarkedSet.has(clause.id) ? '#FFD700' : undefined
    }));

    // Links already reference clause UUIDs; D3 will ignore any link whose
    // endpoints are missing from the node set, so we can forward them as-is.
    const links: GraphEdge[] = remoteLinks;

    return { nodes, links };
  }, [filtered, bookmarkedSet, remoteLinks]);

  // ------------------------------------------------------------------
  // DEBUG: Log the graph data size and a sample of the links
  // ------------------------------------------------------------------
  React.useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      // Only log in development to avoid console noise in prod builds
      dlog(
        'GRAPH-DEBUG',
        { nodes: graphData.nodes.length, links: graphData.links.length },
        graphData.links.slice(0, 10)
      );
    }
  }, [graphData]);

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