import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import * as d3 from 'd3'
import type { GraphData, GraphNode, GraphEdge } from '../types/clause'

interface ClauseGraph2Props {
  graphData: GraphData
  onNodeClick?: (node: GraphNode) => void
}

const NODE_SIZE = 12 // base radius in px
const SIDEBAR_WIDTH = 320
const APPBAR_HEIGHT = 64

// Palette fallback if a family doesn't have a predefined colour
function hashColor(str: string) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const c = (hash & 0x00ffffff).toString(16).toUpperCase()
  return '#' + '00000'.substring(0, 6 - c.length) + c
}

export const ClauseGraph2: React.FC<ClauseGraph2Props> = ({ graphData, onNodeClick }) => {
  const fgRef = useRef<any>(null)
  // Hovered node for highlight
  const [hoverNode, setHoverNode] = useState<GraphNode | null>(null)
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Observe container size
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const resizeObserver = new ResizeObserver(() => {
      const { width, height } = el.getBoundingClientRect();
      setDimensions({ width, height });
      console.log('[ClauseGraph2] container size', width, height);
    });
    resizeObserver.observe(el);
    // initial set
    const { width, height } = el.getBoundingClientRect();
    setDimensions({ width, height });
    return () => resizeObserver.disconnect();
  }, []);

  // Build quick lookup by id for links and to ensure uniqueness
  const transformedData = useMemo<GraphData>(() => {
    // GO BACK TO ORIGINAL DATA TO TEST BROWSER COMPATIBILITY
    console.log('[ClauseGraph2] Testing with original data for browser compatibility');
    return graphData;
    
    // MINIMAL TEST CASE (commented out for testing)
    // console.log('[ClauseGraph2] Testing with minimal 3-node case');
    // const testNodes = [
    //   { id: 'node1', name: 'Node 1', val: 1 },
    //   { id: 'node2', name: 'Node 2', val: 1 },
    //   { id: 'node3', name: 'Node 3', val: 1 }
    // ];
    // const testLinks = [
    //   { source: 'node1', target: 'node2', value: 1 },
    //   { source: 'node2', target: 'node3', value: 1 }
    // ];
    
    // console.log('[ClauseGraph2] Minimal test data:', { nodes: testNodes, links: testLinks });
    
    // return { nodes: testNodes, links: testLinks };
    
    // ORIGINAL TEST CODE (commented out for testing)
    // console.log('[ClauseGraph2] Testing with first 10 nodes only');
    // const testNodes = graphData.nodes.slice(0, 10).map((node, index) => ({
    //   ...node,
    //   // FORCE INITIAL POSITIONS TO ENSURE ALL NODES ARE PROCESSED
    //   x: 100 + (index * 50),
    //   y: 100 + (index * 30)
    // }));
    // const testLinks = (graphData.links ?? []).filter(l => {
    //   const sourceId = typeof l.source === 'string' ? l.source : (l.source as any).id;
    //   const targetId = typeof l.target === 'string' ? l.target : (l.target as any).id;
    //   return testNodes.some(n => n.id === sourceId) && testNodes.some(n => n.id === targetId);
    // });
    
    // DETAILED NODE COMPARISON
    // console.log('[ClauseGraph2] Working node (GDPR):', testNodes.find(n => n.id === '97672bfe-ff79-4379-86de-8a59980e93d4'));
    // console.log('[ClauseGraph2] Non-working nodes (first 3):', testNodes.slice(0, 3).map(n => ({
    //   id: n.id,
    //   name: n.name,
    //   val: n.val,
    //   color: n.color,
    //   family: (n as any).family,
    //   // Check for any missing properties
    //   hasId: !!n.id,
    //   hasName: !!n.name,
    //   hasVal: typeof n.val === 'number',
    //   hasColor: !!n.color,
    //   hasFamily: !!(n as any).family,
    //   // Check initial positions
    //   hasX: typeof n.x === 'number',
    //   hasY: typeof n.y === 'number'
    // })));
    
    // return { nodes: testNodes, links: testLinks };
    
    // ORIGINAL BYPASS CODE (commented out for testing)
    // console.log('[ClauseGraph2] Bypassing transformation, using raw data');
    // return graphData;
    
    // ORIGINAL TRANSFORMATION CODE (commented out for testing)
    // const nodeMap = new Map<string, GraphNode>()
    // graphData.nodes.forEach(n => {
    //   if (!nodeMap.has(n.id)) nodeMap.set(n.id, n)
    // })
    // const links: GraphEdge[] = (graphData.links ?? []).filter(l => !!nodeMap.get(l.source as string) && !!nodeMap.get(l.target as string))
    // return { nodes: Array.from(nodeMap.values()), links }
  }, [graphData])

  // Debug: track which nodes get processed
  console.log('[ClauseGraph2] Processing nodes:', transformedData.nodes.map(n => ({ 
    id: n.id, 
    name: n.name,
    val: n.val,
    color: n.color,
    family: (n as any).family?.name || 'unknown'
  })));

  // Debug: log node data differences
  const workingNodeIds = new Set([
    'e5b9886f-5fb9-45ba-8d34-f8f06604557d',
    '4e0b4843-1590-4bb1-9312-5e013d77e283', 
    'bf8b1019-434c-47c4-a42e-60a4879b5918',
    '141450dd-db38-455d-b84c-f21c08e55a19',
    'ee2701c5-467b-42be-92ca-a73ee83046ea',
    '97672bfe-ff79-4379-86de-8a59980e93d4',
    '15467991-e50a-4446-b648-4bc1c272f516'
  ]);

  const workingNodes = transformedData.nodes.filter(n => workingNodeIds.has(n.id));
  const nonWorkingNodes = transformedData.nodes.filter(n => !workingNodeIds.has(n.id));

  console.log('[ClauseGraph2] Working nodes __indexColor:', workingNodes.map(n => ({ id: n.id, color: (n as any).__indexColor })));
  console.log('[ClauseGraph2] Non-working nodes __indexColor:', nonWorkingNodes.map(n => ({ id: n.id, color: (n as any).__indexColor })));
  
  // Debug: Check if nodes have required properties for pointer events
  console.log('[ClauseGraph2] Node property check:', transformedData.nodes.slice(0, 5).map(n => ({
    id: n.id,
    hasX: typeof (n as any).x === 'number',
    hasY: typeof (n as any).y === 'number',
    hasIndexColor: typeof (n as any).__indexColor !== 'undefined',
    indexColor: (n as any).__indexColor
  })));

  // Debug: Check graph data structure
  console.log('[ClauseGraph2] Graph data structure:', {
    nodesCount: transformedData.nodes.length,
    linksCount: transformedData.links.length,
    firstNode: transformedData.nodes[0],
    firstLink: transformedData.links[0]
  });

  // Debug: Check actual graph data from ForceGraph2D component
  useEffect(() => {
    const timer = setTimeout(() => {
      if (fgRef.current && fgRef.current.graphData) {
        const data = fgRef.current.graphData;
        const actualWorkingNodes = data.nodes.filter((n: any) => workingNodeIds.has(n.id));
        const actualNonWorkingNodes = data.nodes.filter((n: any) => !workingNodeIds.has(n.id));
        
        console.log('[ClauseGraph2] Actual working nodes __indexColor:', 
          actualWorkingNodes.map((n: any) => ({ id: n.id, color: n.__indexColor })));
        console.log('[ClauseGraph2] Actual non-working nodes __indexColor:', 
          actualNonWorkingNodes.map((n: any) => ({ id: n.id, color: n.__indexColor })));
        
        // Test: Check if ALL nodes have __indexColor
        const nodesWithIndexColor = data.nodes.filter((n: any) => n.__indexColor);
        console.log('[ClauseGraph2] ALL nodes __indexColor test:', {
          totalNodes: data.nodes.length,
          nodesWithIndexColor: nodesWithIndexColor.length,
          allHaveIndexColor: nodesWithIndexColor.length === data.nodes.length
        });
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [transformedData]);

  // Apply forces on mount + when data changes
  useEffect(() => {
    if (!fgRef.current) return
    // Collision
    fgRef.current.d3Force('collision', d3.forceCollide(NODE_SIZE * 1.4))
    // Charge for clustering
    const charge = fgRef.current.d3Force('charge')
    if (charge) charge.strength(-30)
    
    // FORCE ALL NODES TO BE PROCESSED
    console.log('[ClauseGraph2] Forcing all nodes to be processed by physics simulation');
    const centerX = dimensions.width < 20 ? (window.innerWidth - SIDEBAR_WIDTH) / 2 : dimensions.width / 2;
    const centerY = dimensions.height < 20 ? (window.innerHeight - APPBAR_HEIGHT) / 2 : dimensions.height / 2;
    fgRef.current.d3Force('center', d3.forceCenter(centerX, centerY));
    
    // reheat
    fgRef.current.d3ReheatSimulation()
  }, [transformedData.nodes.length, dimensions])

  // Debug: Check __indexColor after simulation runs
  useEffect(() => {
    const timer = setTimeout(() => {
      if (fgRef.current && fgRef.current.graphData) {
        const data = fgRef.current.graphData;
        console.log('[ClauseGraph2] Post-simulation __indexColor check:', 
          data.nodes.slice(0, 10).map((n: any) => ({
            id: n.id,
            name: n.name,
            hasIndexColor: typeof n.__indexColor !== 'undefined',
            indexColor: n.__indexColor,
            hasX: typeof n.x === 'number',
            hasY: typeof n.y === 'number',
            hasIndex: typeof n.index === 'number'
          }))
        );
        
        // Check if all nodes have required properties
        const nodesWithAllProps = data.nodes.filter((n: any) => 
          n.__indexColor && typeof n.x === 'number' && typeof n.y === 'number' && typeof n.index === 'number'
        );
        console.log('[ClauseGraph2] Nodes with all required properties:', nodesWithAllProps.length, 'out of', data.nodes.length);
        
        if (nodesWithAllProps.length !== data.nodes.length) {
          console.log('[ClauseGraph2] MISSING PROPERTIES - Nodes without all properties:', 
            data.nodes.filter((n: any) => !n.__indexColor || typeof n.x !== 'number' || typeof n.y !== 'number' || typeof n.index !== 'number')
              .map((n: any) => ({ id: n.id, name: n.name }))
          );
        }
      }
    }, 2000); // Wait 2 seconds for simulation to complete
    
    return () => clearTimeout(timer);
  }, [transformedData]);

  // Debug: Check __indexColor immediately after graph mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      if (fgRef.current && fgRef.current.graphData) {
        const data = fgRef.current.graphData;
        console.log('[ClauseGraph2] Immediate __indexColor check:', 
          data.nodes.slice(0, 5).map((n: any) => ({
            id: n.id,
            hasIndexColor: typeof n.__indexColor !== 'undefined',
            indexColor: n.__indexColor
          }))
        );
      }
    }, 100); // Check after 100ms
    
    return () => clearTimeout(timer);
  }, [transformedData]);

  // Force re-registration of nodes in pointer system
  // useEffect(() => {
  //   if (!fgRef.current) return;
  //   // Safety check - ensure graphData exists and is accessible
  //   if (!fgRef.current.graphData) {
  //     console.log('[ClauseGraph2] graphData not available yet, skipping re-registration');
  //     return;
  //   }
    
  //   // Clear and re-set graph data to force pointer system re-registration
  //   const currentData = fgRef.current.graphData;
  //   if (!currentData || !currentData.nodes) {
  //     console.log('[ClauseGraph2] No current data available for re-registration');
  //     return;
  //   }
    
  //   fgRef.current.graphData({ nodes: [], links: [] });
  //   setTimeout(() => {
  //     if (fgRef.current) {
  //       fgRef.current.graphData(currentData);
  //       console.log('[ClauseGraph2] Forced re-registration of', currentData.nodes.length, 'nodes');
  //     }
  //   }, 100);
  // }, [transformedData]);

  // Color by family (if provided) else fallback
  const colorFn = (node: GraphNode) => {
    const fam = (node as any).family?.name || (node as any).family?.id || 'unknown'
    return hashColor(fam)
  }

  // Hover highlighting helpers
  const relatedNodeIds = useMemo(() => {
    if (!hoverNode) return new Set<string>()
    const set = new Set<string>()
    set.add(hoverNode.id)
    transformedData.links.forEach(l => {
      if (l.source === hoverNode.id) set.add(l.target as string)
      if (l.target === hoverNode.id) set.add(l.source as string)
    })
    return set
  }, [hoverNode, transformedData.links])

  const getNodeOpacity = (node: GraphNode) => {
    if (!hoverNode) return 1
    return relatedNodeIds.has(node.id) ? 1 : 0.1
  }

  const getLinkOpacity = (link: GraphEdge) => {
    if (!hoverNode) return 0.6
    return link.source === hoverNode.id || link.target === hoverNode.id ? 0.9 : 0.05
  }

  // Custom node render with label
  const renderNode: any = (node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const n: any = node
    const label = n.name
    const radius = NODE_SIZE
    // Circle
    ctx.beginPath()
    ctx.arc(n.x, n.y, radius, 0, 2 * Math.PI, false)
    ctx.fillStyle = colorFn(node)
    ctx.fill()
    // Border highlight if bookmarked
    if (n.is_bookmarked) {
      ctx.lineWidth = 3
      ctx.strokeStyle = '#FFD700'
      ctx.stroke()
    }
    // Draw text when zoomed in
    const fontSize = 8 / globalScale
    if (fontSize > 4) {
      ctx.font = `${fontSize}px Sans-Serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#000'
      ctx.fillText(label ?? '', n.x, n.y)
    }
  }

  // Debug: track hover events
  const handleNodeHover = useCallback((node: GraphNode | null) => {
    if (node) {
      console.log('[ClauseGraph2] HOVER on node:', node.id, node.name);
    }
    setHoverNode(node)
  }, [])

  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      console.log('[ClauseGraph2] CLICK on node:', node.id, node.name);
      onNodeClick?.(node)
    },
    [onNodeClick]
  )

  const effectiveWidth = dimensions.width < 20 ? window.innerWidth - SIDEBAR_WIDTH : dimensions.width;
  const effectiveHeight = dimensions.height < 20 ? window.innerHeight - APPBAR_HEIGHT : dimensions.height;

  // Debug: log duplicate coordinate stacks after simulation
  const handleEngineStop = () => {
    if (!fgRef.current) return;
    if (typeof fgRef.current.graphData !== 'object') return;
    const data = fgRef.current.graphData;
    if (!data) return;
    const dupes: Record<string, number> = {};
    (data.nodes as any[]).forEach(n => {
      const key = `${Math.round(n.x)}|${Math.round(n.y)}`;
      dupes[key] = (dupes[key] || 0) + 1;
    });
    const stacked = Object.entries(dupes).filter(([, cnt]) => cnt > 1);
    if (stacked.length > 0) {
      console.table(stacked, ['0','1']);
      console.log('[ClauseGraph2] Found', stacked.length, 'coordinate stacks with multiple nodes');
      // Show which nodes are stacked
      stacked.forEach(([coord, count]) => {
        const [x, y] = coord.split('|');
        const nodesAtCoord = (data.nodes as any[]).filter(n => 
          Math.round(n.x) === parseInt(x) && Math.round(n.y) === parseInt(y)
        );
        console.log(`Stack at (${x},${y}) with ${count} nodes:`, 
          nodesAtCoord.map(n => n.name));
      });
    } else {
      console.log('[ClauseGraph2] No coordinate overlaps found');
    }
  };

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', background:'#c7d8ff' }}>
      <ForceGraph2D
        ref={fgRef}
        graphData={transformedData}
        width={effectiveWidth}
        height={effectiveHeight}
        // ESSENTIAL PROPS FOR POINTER EVENTS
        nodeRelSize={6}
        linkWidth={1}
        // CANVAS SETTINGS FOR POINTER EVENTS
        enableNodeDrag={true}
        enableZoomInteraction={true}
        enablePanInteraction={true}
        // BROWSER COMPATIBILITY FIXES FOR BRAVE
        enablePointerInteraction={true}
        // BRAVE-SPECIFIC FIXES
        onEngineStop={() => {
          // Force re-registration of pointer events after simulation
          if (fgRef.current && fgRef.current.graphData) {
            const data = fgRef.current.graphData;
            console.log('[ClauseGraph2] Engine stopped, checking node properties in Brave');
            const nodesWithIndexColor = data.nodes.filter((n: any) => n.__indexColor);
            console.log('[ClauseGraph2] Nodes with __indexColor in Brave:', nodesWithIndexColor.length, 'out of', data.nodes.length);
          }
        }}
        // TEMPORARILY REMOVE ALL CUSTOM PROPS TO TEST
        // nodeCanvasObjectMode={() => 'replace'}
        // nodeCanvasObject={renderNode}
        // linkWidth={1}
        // nodeColor={colorFn}
        // linkColor={() => '#999'}
        onNodeHover={handleNodeHover}
        onNodeClick={handleNodeClick}
        // warmupTicks={60}
        // cooldownTicks={400}
        // onEngineStop={handleEngineStop}
      />
    </div>
  )
} 