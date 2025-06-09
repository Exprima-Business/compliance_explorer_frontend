import React, { useCallback, useMemo } from 'react'
import { ForceGraph2D } from 'react-force-graph'
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
  onNodeClick: (node: GraphNode) => void
}

export const ClauseGraph: React.FC<ClauseGraphProps> = ({ graphData, onNodeClick }) => {
  const handleNodeClick = useCallback((node: GraphNode) => {
    onNodeClick(node)
  }, [onNodeClick])

  const graphDataMemo = useMemo(() => ({
    nodes: graphData.nodes.map(node => ({
      ...node,
      x: Math.random() * 1000,
      y: Math.random() * 1000,
      fx: undefined,
      fy: undefined
    })),
    links: graphData.edges.map(edge => ({
      source: edge.from,
      target: edge.to,
      type: edge.type,
      arrows: edge.arrows,
      smooth: edge.smooth
    }))
  }), [graphData])

  return (
    <ForceGraph2D
      graphData={graphDataMemo}
      nodeLabel="title"
      nodeColor={node => {
        if (node.isBookmarked) return '#ffd700';
        switch (node.group) {
          case 'DFARS': return '#1976D2';
          case 'FIPS': return '#D32F2F';
          case 'PRIVACY': return '#F57C00';
          case 'FAR': return '#FBC02D';
          case 'OMB': return '#0288D1';
          case 'HSPD': return '#7B1FA2';
          case 'NIST': return '#388E3C';
          default: return '#33b5e5';
        }
      }}
      nodeRelSize={6}
      linkColor={() => '#999'}
      linkWidth={1}
      linkDirectionalParticles={2}
      linkDirectionalParticleSpeed={0.005}
      onNodeClick={handleNodeClick}
      cooldownTicks={100}
      onEngineStop={() => {
        // Optional: Add any cleanup or final positioning logic here
      }}
    />
  )
} 