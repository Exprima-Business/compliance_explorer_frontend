import React from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import { ClauseGraphD3 as ClauseGraph } from '../components/ClauseGraphD3';
import { FloatingPanel } from '../components/FloatingPanel';
import { useClause } from '../contexts/ClauseContext';
import { useBookmarks } from '../contexts/BookmarkContext';
import { useAuth } from '../hooks/useAuth';
import { clauseService } from '../services/clauseService';
import type { GraphData, GraphNode, GraphEdge, Clause, ClauseFamily } from '../types/clause';
import { dlog } from '../utils/debugLog';

const Home: React.FC = () => {
  const { clauses, searchQuery, loading, error } = useClause();
  const { bookmarks, toggleBookmark } = useBookmarks();
  const { isAuthenticated, loading: authLoading } = useAuth();
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

  // Auth state stabilization - only proceed when auth is fully loaded
  const authStable = React.useMemo(() => {
    return !authLoading && isAuthenticated;
  }, [authLoading, isAuthenticated]);

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
  // Fetch relationship links with stable authentication check
  // ------------------------------------------------------------------
  const [remoteLinks, setRemoteLinks] = React.useState<GraphEdge[]>([]);
  const [linksLoading, setLinksLoading] = React.useState(true);

  React.useEffect(() => {
    if (!authStable) {
      setLinksLoading(false);
      return;
    }

    setLinksLoading(true);
    (async () => {
      try {
        const resp = await clauseService.getGraphData();
        if (!resp.error && resp.data && Array.isArray(resp.data.links)) {
          setRemoteLinks(resp.data.links);
          dlog('Graph links loaded successfully', { count: resp.data.links.length });
        } else {
          console.warn('graphData fetch error', resp.error);
          setRemoteLinks([]);
        }
      } catch (err) {
        console.error('Failed to fetch graph links', err);
        setRemoteLinks([]);
      } finally {
        setLinksLoading(false);
      }
    })();
  }, [authStable]); // Only re-fetch when auth is stable

  const graphData: GraphData = React.useMemo(() => {
    if (!authStable || linksLoading) {
      return { nodes: [], links: [] };
    }

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

    // Filter links to only include those where both source and target nodes exist
    const nodeIds = new Set<string>(nodes.map((n: GraphNode) => n.id));
    const validLinks: GraphEdge[] = remoteLinks.filter((link: GraphEdge) => {
      return link.source && link.target && nodeIds.has(link.source) && nodeIds.has(link.target);
    });

    return { nodes, links: validLinks };
  }, [filtered, bookmarkedSet, remoteLinks, authStable, linksLoading]);

  // ------------------------------------------------------------------
  // DEBUG: Log the graph data size and a sample of the links
  // ------------------------------------------------------------------
  React.useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      dlog(
        'GRAPH-DEBUG',
        { 
          nodes: graphData.nodes.length, 
          links: graphData.links.length,
          authenticated: isAuthenticated,
          authLoading,
          authStable,
          linksLoading
        },
        graphData.links.slice(0, 5)
      );
    }
  }, [graphData, isAuthenticated, authLoading, authStable, linksLoading]);

  const handleNodeClick = (node: GraphNode) => {
    const clause = clauses.find(c => c.id === node.id);
    if (clause) {
      setActiveClause(clause);
    }
  };

  // Show loading state while auth is loading or graph data is loading
  if (loading || authLoading || linksLoading) {
    dlog('Home: Showing loading state', { loading, authLoading, linksLoading });
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: 'calc(100vh - 64px)',
        gap: 2
      }}>
        <CircularProgress size={60} />
        <Typography variant="h6" color="text.secondary">
          {authLoading ? 'Initializing...' : linksLoading ? 'Loading graph data...' : 'Loading...'}
        </Typography>
      </Box>
    );
  }

  if (error) {
    dlog('Home: Showing error state', { error });
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  // Show empty state if not authenticated
  if (!authStable) {
    dlog('Home: Showing not authenticated state', { authStable, isAuthenticated, authLoading });
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: 'calc(100vh - 64px)' 
      }}>
        <Typography variant="h6" color="text.secondary">
          Please log in to view the graph
        </Typography>
      </Box>
    );
  }

  dlog('Home: Rendering graph', { 
    nodes: graphData.nodes.length, 
    links: graphData.links.length,
    authStable,
    isAuthenticated,
    authLoading,
    linksLoading
  });

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