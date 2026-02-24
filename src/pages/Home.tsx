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
  const { bookmarks, toggleBookmark, isClauseBookmarked } = useBookmarks();
  const { isAuthenticated, loading: authLoading } = useAuth();
  
  // Track render count for debugging
  const renderCountRef = React.useRef(0);
  renderCountRef.current += 1;
  
  dlog('Home: Component render count', {
    component: 'Home',
    renderCount: renderCountRef.current,
    timestamp: Date.now(),
    clausesLength: clauses.length,
    isAuthenticated,
    authLoading
  });

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
  const hasFetchedRef = React.useRef(false);
  const persistedLinksRef = React.useRef<GraphEdge[]>([]);

  // Persist links in ref to prevent loss during re-renders
  React.useEffect(() => {
    if (remoteLinks.length > 0) {
      persistedLinksRef.current = remoteLinks;
      dlog('Home: Links persisted to ref', { count: remoteLinks.length });
    }
  }, [remoteLinks]);

  // Use persisted links if current links are empty but we have persisted data
  const effectiveLinks = remoteLinks.length > 0 ? remoteLinks : persistedLinksRef.current;

  React.useEffect(() => {
    if (!authStable) {
      setLinksLoading(false);
      return;
    }

    // Only fetch once when auth becomes stable
    if (hasFetchedRef.current) {
      dlog('Home: Skipping graph links fetch - already fetched', { hasFetched: hasFetchedRef.current });
      return;
    }

    hasFetchedRef.current = true;
    setLinksLoading(true);
    dlog('Home: Starting graph links fetch', { authStable, hasFetched: hasFetchedRef.current });
    
    (async () => {
      try {
        const resp = await clauseService.getGraphData();
        dlog('Home: Graph links API response received', {
          hasError: !!resp.error,
          hasData: !!resp.data,
          linksLength: resp.data?.links?.length || 0,
          sampleLinks: resp.data?.links?.slice(0, 3) || []
        });
        
        if (!resp.error && resp.data && Array.isArray(resp.data.links)) {
          setRemoteLinks(resp.data.links);
          dlog('Home: Graph links loaded successfully', { count: resp.data.links.length });
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

  // Debug remoteLinks state changes
  React.useEffect(() => {
    dlog('Home: remoteLinks state changed', {
      linksLength: remoteLinks.length,
      sampleLinks: remoteLinks.slice(0, 3),
      timestamp: Date.now()
    });
  }, [remoteLinks]);

  // Reset fetch flag when auth becomes unstable
  React.useEffect(() => {
    if (!authStable) {
      hasFetchedRef.current = false;
    }
  }, [authStable]);

  // Debug: Track component re-render triggers
  React.useEffect(() => {
    dlog('Home: Component re-render triggered', {
      filteredLength: filtered.length,
      effectiveLinksLength: effectiveLinks.length,
      authStable,
      linksLoading,
      stack: new Error().stack?.split('\n').slice(1, 4).join('\n')
    });
  }, [filtered, effectiveLinks, authStable, linksLoading]);

  const graphData: GraphData = React.useMemo(() => {
    if (!authStable || linksLoading) {
      dlog('Home: Returning empty graph data', { authStable, linksLoading });
      return { nodes: [], links: [] };
    }

    // Don't create graph data if we have no clauses (nodes)
    if (filtered.length === 0) {
      dlog('Home: No clauses available for graph data', { filteredLength: filtered.length });
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
      isBookmarked: isClauseBookmarked(clause.id),
      color: bookmarkedSet.has(clause.id) ? '#FFD700' : undefined
    }));

    // Debug: Log sample node IDs and link IDs to identify mismatch
    const nodeIds = new Set<string>(nodes.map((n: GraphNode) => n.id));
    const sampleNodeIds = Array.from(nodeIds).slice(0, 3);
    const sampleLinkIds = effectiveLinks.slice(0, 3).map(link => ({
      source: link.source,
      target: link.target
    }));
    
    dlog('Home: ID format analysis', {
      nodeIdsCount: nodeIds.size,
      sampleNodeIds,
      sampleLinkIds,
      nodeIdType: typeof sampleNodeIds[0],
      linkSourceType: typeof sampleLinkIds[0]?.source
    });

    // Filter links to only include those where both source and target nodes exist
    const validLinks: GraphEdge[] = effectiveLinks.filter((link: GraphEdge) => {
      // Handle D3.js object transformation - source/target can be objects or strings
      const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
      const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;
      
      const isValid = sourceId && targetId && nodeIds.has(sourceId) && nodeIds.has(targetId);
      
      if (!isValid) {
        dlog('Home: Filtering out invalid link', {
          link,
          sourceId,
          targetId,
          hasSource: !!sourceId,
          hasTarget: !!targetId,
          sourceInNodes: nodeIds.has(sourceId),
          targetInNodes: nodeIds.has(targetId),
          sourceType: typeof link.source,
          targetType: typeof link.target,
          nodeIds: Array.from(nodeIds)
        });
      }
      return isValid;
    });

    dlog('Home: Graph data created', {
      nodesLength: nodes.length,
      remoteLinksLength: effectiveLinks.length,
      validLinksLength: validLinks.length,
      filteredOut: effectiveLinks.length - validLinks.length,
      nodeIds: Array.from(nodeIds),
      sampleLinks: effectiveLinks.slice(0, 3)
    });

    return { nodes, links: validLinks };
  }, [filtered, bookmarkedSet, effectiveLinks, authStable, linksLoading]);

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
  if (authLoading || linksLoading) {
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

  // Show loading only for initial clause loading, not for graph data
  if (loading && clauses.length === 0) {
    dlog('Home: Showing initial loading state', { loading, clausesLength: clauses.length });
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
          Loading clauses...
        </Typography>
      </Box>
    );
  }

  // Show empty state when clauses have loaded but the DB has no data yet
  if (!loading && clauses.length === 0) {
    return (
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: 'calc(100vh - 64px)',
        gap: 2,
        textAlign: 'center',
        px: 3
      }}>
        <Typography variant="h5" color="text.secondary" gutterBottom>
          No clause data available
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Import compliance clause data to populate the visualization.
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
    linksLoading,
    loading,
    clausesLength: clauses.length
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
        onBookmarkToggle={async () => {
          if (!activeClause) return;
          await toggleBookmark(activeClause.id);
        }}
      />
    </Box>
  );
};

export default Home; 