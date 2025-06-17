import React, { useCallback, useMemo } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import type { GraphData, GraphNode, GraphEdge } from '../types/clause'

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

// Shape expected by react-force-graph
interface ForceGraphLink {
  source: string;
  target: string;
  value: number;
}

interface ForceGraphData {
  nodes: GraphNode[];
  links: ForceGraphLink[];
}

export const ClauseGraph: React.FC<ClauseGraphProps> = ({ graphData, onNodeClick }) => {
  const handleNodeClick = useCallback((node: GraphNode) => {
    if (onNodeClick) {
      onNodeClick(node)
    }
  }, [onNodeClick])

  const transformedData: ForceGraphData = useMemo(() => ({
    nodes: graphData.nodes,
    links: graphData.edges.map((edge: GraphEdge): ForceGraphLink => ({
      source: edge.source,
      target: edge.target,
      value: edge.value
    }))
  }), [graphData])

  // Expose graph data for debugging only in development builds
  if (import.meta.env.DEV) {
    (window as any).__graphData = graphData;
  }

  return (
    <ForceGraph2D
      graphData={transformedData}
      nodeLabel="name"
      nodeColor={(node: GraphNode) => {
        if (node.color) return node.color;
        const familyName = node.family?.name ?? 'Default';
        return familyColors[familyName] ?? familyColors['Default'];
      }}
      linkColor={() => '#999'}
      linkWidth={1}
      linkDirectionalParticles={2}
      onNodeClick={handleNodeClick}
      cooldownTicks={100}
      onEngineStop={() => console.log('Graph layout complete')}
    />
  )
} 