import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import type { GraphData, GraphNode, GraphEdge } from '../types/clause'
import * as d3 from 'd3'

// Define a color palette for different families
const familyColors: { [key: string]: string } = {
  'Uncategorized': '#999999',
  'GDPR': '#FF6B6B',
  'CCPA': '#4ECDC4',
  'HIPAA': '#45B7D1',
  'ISO27001': '#96CEB4',
  'SOC2': '#FFEEAD',
  'PCI DSS': '#D4A5A5',
  'NIST': '#9B59B6',
  'COBIT': '#3498DB',
  'Default': '#33b5e5'
}

interface ClauseGraphProps {
  graphData: GraphData
  onNodeClick?: (node: GraphNode) => void
}

export const ClauseGraph: React.FC<ClauseGraphProps> = ({ graphData, onNodeClick }) => {
  const fgRef = useRef<any>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [dimensions, setDimensions] = useState<{width:number; height:number}>({width: window.innerWidth - 320, height: window.innerHeight - 64});

  // Desired visual constants
  const NODE_SIZE = 25; // relative size passed to ForceGraph (roughly radius in px)

  // Apply custom forces (run once on mount & whenever graph size changes)
  useEffect(() => {
    if (!fgRef.current) return;

    // Collision force to avoid node overlap
    fgRef.current.d3Force('collision', d3.forceCollide(NODE_SIZE * 2));

    // Tweak charge force for tighter clustering (less repulsion)
    const chargeForce = fgRef.current.d3Force('charge');
    if (chargeForce) {
      chargeForce.strength(-10); // relaxed repulsion for tighter cluster
    }

    // Re-heat the simulation so forces take effect
    fgRef.current.d3ReheatSimulation();
  }, [graphData.nodes.length]);

  // Window resize listener to update canvas size responsively
  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth - 320, height: window.innerHeight - 64 });
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleNodeClick = useCallback((node: GraphNode) => {
    if (onNodeClick) {
      onNodeClick(node)
    }
  }, [onNodeClick])

  const transformedData = useMemo(() => {
    // Build a quick lookup map for node objects by id to ensure link.source/target
    // are concrete node references (objects), not just string ids. This helps
    // react-force-graph avoid cases where it tries to read properties (e.g., `id`)
    // from an unresolved string.
    const nodeById = new Map(graphData.nodes.map(node => [node.id, node]))

    const links = (graphData.links ?? []).map((link): GraphEdge | null => {
      const sourceNode = nodeById.get(link.source as string)
      const targetNode = nodeById.get(link.target as string)

      if (!sourceNode || !targetNode) {
        console.warn('[ClauseGraph] Dropping link with missing nodes', link)
        return null as unknown as GraphEdge // filtered out later
      }

      return {
        source: sourceNode.id,
        target: targetNode.id,
        value: link.value ?? 1
      }
    }).filter((l): l is GraphEdge => l !== null)

    return {
      nodes: Array.from(nodeById.values()), // ensures unique nodes by id
      links
    }
  }, [graphData])

  // Update cursor style by toggling it on a wrapper div instead of accessing the (now private) canvas element

  // ─── TEMP DEBUG – verify every node / link has an id ───────────────
  console.group('[DBG] ClauseGraph sanity-check')
  console.log('nodes.length =', graphData.nodes.length)
  graphData.nodes.forEach((n, i) => {
    if (!n || typeof (n as any).id !== 'string') {
      console.error('BAD NODE ➜ index', i, n)
    }
  })
  graphData.links.forEach((l, i) => {
    if (!l || typeof (l as any).source !== 'string' || typeof (l as any).target !== 'string') {
      console.error('BAD LINK ➜ index', i, l)
    }
  })
  console.groupEnd()
  // ───────────────────────────────────────────────────────────────────

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', cursor: hovered ? 'pointer' : 'default' }}>
      {dimensions.width > 0 && dimensions.height > 0 && (
        <ForceGraph2D
          ref={fgRef}
          graphData={transformedData}
          nodeLabel="name"
          nodeRelSize={NODE_SIZE}
          nodeColor={(node: GraphNode) => node.color || '#33b5e5'}
          linkColor={() => '#999'}
          linkWidth={1}
          linkDirectionalParticles={2}
          width={dimensions.width}
          height={dimensions.height}
          onNodeClick={handleNodeClick}
          onNodeHover={(node, prev) => {
            if (node && node !== prev) {
              console.info('[Hover] node', node.id, node.name);
            }
            setHovered(!!node);
          }}
          warmupTicks={50}
          cooldownTicks={600}
        />
      )}
    </div>
  )
} 