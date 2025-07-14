import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react'
import * as d3 from 'd3'
import type { GraphData, GraphNode, GraphEdge } from '../types/clause'
import { dlog } from '../utils/debugLog'

// Constants
const NODE_RADIUS = 45
const SIDEBAR_WIDTH = 320
const APPBAR_HEIGHT = 64

interface ClauseGraphD3Props {
  graphData: GraphData
  onNodeClick?: (node: GraphNode) => void
}

// Extend GraphNode with D3 simulation properties
interface D3Node extends GraphNode, d3.SimulationNodeDatum {
  x?: number
  y?: number
  fx?: number | null
  fy?: number | null
}

// Legacy color palette for different families
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
  'FAR': '#FF8C42', // Orange
  'FIPS': '#2ECC71', // Green
  'PRIVACY': '#E74C3C', // Red
  'OMB': '#F39C12', // Orange-Yellow
  'DFARS': '#1ABC9C', // Teal
  'HSPD': '#8E44AD', // Purple
  'Default': '#33b5e5'
}

// Color hash function (fallback)
function hashColor(str: string) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 70%, 50%)`
}

export const ClauseGraphD3: React.FC<ClauseGraphD3Props> = ({ graphData, onNodeClick }) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const simulationRef = useRef<d3.Simulation<D3Node, GraphEdge> | null>(null)
  const [dimensions, setDimensions] = useState<{width: number; height: number}>({width: 800, height: 600})
  const [hoverNode, setHoverNode] = useState<GraphNode | null>(null)
  const dragStartRef = useRef<{x: number, y: number} | null>(null)
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    data: GraphNode | null;
  }>({
    visible: false,
    x: 0,
    y: 0,
    data: null
  })

  // Debug logging for graph data
  useEffect(() => {
    dlog('ClauseGraphD3: Received graph data', {
      nodes: graphData.nodes.length,
      links: graphData.links.length,
      hasSvgRef: !!svgRef.current,
      hasContainerRef: !!containerRef.current
    });
  }, [graphData]);

  // Force re-render when graph data changes significantly
  const graphKey = useMemo(() => {
    return `${graphData.nodes.length}-${graphData.links.length}-${JSON.stringify(graphData.nodes.map(n => n.id).sort())}`
  }, [graphData])

  // Resize observer for container
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    
    const resizeObserver = new ResizeObserver(() => {
      const { width, height } = el.getBoundingClientRect()
      setDimensions({ width, height })
    })
    resizeObserver.observe(el)
    
    // Initial set
    const { width, height } = el.getBoundingClientRect()
    setDimensions({ width, height })
    
    return () => resizeObserver.disconnect()
  }, [])

  // Transform data (deduplicate nodes)
  const transformedData = useMemo<{nodes: D3Node[], links: GraphEdge[]}>(() => {
    const nodeMap = new Map<string, D3Node>()
    graphData.nodes.forEach(n => {
      if (!nodeMap.has(n.id)) nodeMap.set(n.id, { ...n } as D3Node)
    })
    const links: GraphEdge[] = graphData.links ?? [];
    return { nodes: Array.from(nodeMap.values()), links }
  }, [graphData])

  // Color function
  const getNodeColor = (node: GraphNode): string => {
    // Use family color if available, otherwise fallback to default
    const fam = node.family;
    if (fam) {
      const color = familyColors[fam.name];
      if (color) return color;
    }
    return '#6366f1'; // Default color
  };

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

  // D3 Graph Rendering
  useEffect(() => {
    if (!svgRef.current || !transformedData.nodes.length) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove() // Clear previous content

    // Add zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
      })

    svg.call(zoom as any)

    // Create main group for all content
    const g = svg.append('g')

    // Add SVG definitions for gradients and filters
    const defs = svg.append('defs')
    
    // Add glow filter for nodes
    const glowFilter = defs.append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%')
    
    glowFilter.append('feGaussianBlur')
      .attr('stdDeviation', '3')
      .attr('result', 'coloredBlur')
    
    const feMerge = glowFilter.append('feMerge')
    feMerge.append('feMergeNode').attr('in', 'coloredBlur')
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic')

    // Add pulse filter for animated effects
    const pulseFilter = defs.append('filter')
      .attr('id', 'pulse')
      .attr('x', '-100%')
      .attr('y', '-100%')
      .attr('width', '300%')
      .attr('height', '300%')
    
    pulseFilter.append('feGaussianBlur')
      .attr('stdDeviation', '2')
      .attr('result', 'pulseBlur')
    
    const pulseMerge = pulseFilter.append('feMerge')
    pulseMerge.append('feMergeNode').attr('in', 'pulseBlur')
    pulseMerge.append('feMergeNode').attr('in', 'SourceGraphic')

    // Add gradient definitions for each family with futuristic styling
    Object.entries(familyColors).forEach(([family, color]) => {
      // Main node gradient - fades from family color at edge to white in center
      const gradient = defs.append('radialGradient')
        .attr('id', `gradient-${family}`)
        .attr('cx', '50%')
        .attr('cy', '50%')
        .attr('r', '50%')
      
      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', '#ffffff')
        .attr('stop-opacity', 1)
      
      gradient.append('stop')
        .attr('offset', '33%')
        .attr('stop-color', '#ffffff')
        .attr('stop-opacity', 1)
      
      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', color)
        .attr('stop-opacity', 1)
    })

    // Create gradients for any additional family values found in the data
    const dataFamilies = new Set<string>()
    transformedData.nodes.forEach(node => {
      // Use same logic as getNodeColor
      const family1 = (node as any).family?.name
      const family2 = (node as any).family?.id
      const family3 = (node as any).family
      const family4 = (node as any).familyName
      
      const family = family1 || family2 || family3 || family4 || 'Default'
      dataFamilies.add(family)
    })
    
    dataFamilies.forEach(family => {
      if (!familyColors[family]) {
        // Create gradient for unknown family using hash color
        const color = hashColor(family)
        const gradient = defs.append('radialGradient')
          .attr('id', `gradient-${family}`)
          .attr('cx', '30%')
          .attr('cy', '30%')
          .attr('r', '70%')
        
        gradient.append('stop')
          .attr('offset', '0%')
          .attr('stop-color', color)
          .attr('stop-opacity', 1)
        
        gradient.append('stop')
          .attr('offset', '100%')
          .attr('stop-color', d3.color(color)?.darker(0.3).toString() || color)
          .attr('stop-opacity', 0.8)
      }
    })

    // Add subtle background pattern
    const pattern = defs.append('pattern')
      .attr('id', 'grid')
      .attr('width', 20)
      .attr('height', 20)
      .attr('patternUnits', 'userSpaceOnUse')
    
    pattern.append('path')
      .attr('d', 'M 20 0 L 0 0 0 20')
      .attr('fill', 'none')
      .attr('stroke', 'rgba(255, 255, 255, 0.1)')
      .attr('stroke-width', 0.5)

    // Add background with pattern
    g.append('rect')
      .attr('width', dimensions.width)
      .attr('height', dimensions.height)
      .attr('fill', 'url(#grid)')
      .style('pointer-events', 'none')

    // ---------------------------------------
    // Force-directed simulation
    // ---------------------------------------

    const simulation = d3
      .forceSimulation<D3Node>(transformedData.nodes)
      .force(
        'link',
        d3
          .forceLink<D3Node, GraphEdge>(transformedData.links)
          .id((d: D3Node) => d.id)
          .distance(60)
      )
      .force(
        'charge',
        d3
          .forceManyBody<D3Node>()
          .strength(-80)                     // user-requested repulsion strength
          .distanceMax(Math.min(dimensions.width, dimensions.height) / 2) // no repulsion past half the viewport
      )
      .force('center', d3.forceCenter(dimensions.width / 2, dimensions.height / 2))
      .force('attractX', d3.forceX<D3Node>(dimensions.width / 2).strength(0.03))
      .force('attractY', d3.forceY<D3Node>(dimensions.height / 2).strength(0.03))
      .force('collision', d3.forceCollide(NODE_RADIUS * 1.6))
      .alphaDecay(0.02) // Slower decay for more stability
      .velocityDecay(0.4) // Higher velocity decay for less bouncing

    // Store simulation reference
    simulationRef.current = simulation

    // --------------------------------------------------
    // DEBUG: Log link data before rendering
    // --------------------------------------------------
    if (process.env.NODE_ENV !== 'production') {
      dlog('D3-LINKS', transformedData.links.length, transformedData.links.slice(0, 10));
    }

    // Create links with enhanced styling
    const links = g.append('g')
      .selectAll('line')
      .data(transformedData.links)
      .enter()
      .append('line')
      .attr('stroke', (d: any) => {
        const rel = ((d as any).relationshipType || 'sibling').toLowerCase();
        // Distinct colors help users spot different relationship kinds
        if (rel === 'parent') return '#6366f1'; // Primary blue for parent edges
        if (rel === 'child') return '#0ea5e9'; // Lighter blue for child (if present)
        return '#94a3b8'; // Grayish for sibling
      })
      .attr('stroke-width', (d: any) => {
        // Make parent/child relationships bolder than sibling
        const rel = ((d as any).relationshipType || 'sibling').toLowerCase();
        return rel === 'parent' || rel === 'child' ? 3 : 2;
      })
      .attr('opacity', 0.9)
      .style('filter', 'drop-shadow(0 0 2px rgba(153, 153, 153, 0.3))')

    // Create nodes with clean design
    const nodes = g.append('g')
      .selectAll('g')
      .data(transformedData.nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .call(d3.drag<any, GraphNode>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended))

    // Add main circle with gradient
    const circles = nodes.append('circle')
      .attr('r', NODE_RADIUS)
      .attr('fill', (d: GraphNode) => {
        const family = (d as any).family?.name || (d as any).family?.id || (d as any).family || 'Default'
        return `url(#gradient-${family})`
      })
      .attr('stroke', (d: GraphNode) => (d as any).isBookmarked ? '#FFD700' : 'none')
      .attr('stroke-width', (d: GraphNode) => (d as any).isBookmarked ? 3 : 0)
      .style('cursor', 'pointer')
      .style('filter', 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))')
      .style('transition', 'all 0.3s ease')

    // Add labels to nodes
    const labels = nodes.append('text')
      .text((d: GraphNode) => (d as any).clauseCode || (d as any).clauseId || d.name)
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .attr('font-size', '14px')
      .attr('fill', '#000')
      .attr('font-weight', '600')
      .style('pointer-events', 'none')
      .style('text-shadow', '0 1px 2px rgba(255, 255, 255, 0.8)')

    // Hover effects with subtle styling
    nodes.on('mouseenter', function(event, d) {
      // Set the hover node state
      setHoverNode(d)
      
      // Show tooltip
      setTooltip({
        visible: true,
        x: event.pageX + 10,
        y: event.pageY - 10,
        data: d
      })
      
      const node = d3.select(this)
      const circle = node.select('circle')
      const label = node.select('text')
      
      // Add subtle glow effect and slight scale to hovered node
      circle.style('filter', 'drop-shadow(0 0 12px rgba(255, 255, 255, 0.6))')
        .style('transform', 'scale(1.1)')
      
      // Show tooltip
      label.style('font-size', '16px')
        .style('font-weight', '700')
        .style('text-shadow', '0 0 8px rgba(255, 255, 255, 0.8)')
    })
    .on('mouseleave', function(event, d) {
      // Clear the hover node state
      setHoverNode(null)
      
      // Hide tooltip
      setTooltip(prev => ({ ...prev, visible: false }))
      
      const node = d3.select(this)
      const circle = node.select('circle')
      const label = node.select('text')
      
      // Remove glow effect from hovered node
      circle.style('filter', 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))')
        .style('transform', 'scale(1)')
      
      // Reset label
      label.style('font-size', '14px')
        .style('font-weight', '600')
        .style('text-shadow', '0 1px 2px rgba(255, 255, 255, 0.8)')
    })
    .on('click', (event, d) => {
      // Only fire click if there wasn't a significant drag
      if (dragStartRef.current) {
        const dragDistance = Math.sqrt(
          Math.pow(event.x - dragStartRef.current.x, 2) + 
          Math.pow(event.y - dragStartRef.current.y, 2)
        )
        if (dragDistance > 5) {
          // This was a drag, not a click
          return
        }
      }
      
      if (onNodeClick) {
        onNodeClick(d)
      }
    })

    // Drag functions with stable simulation
    function dragstarted(event: any, d: D3Node) {
      // Clear hover state when dragging starts
      setHoverNode(null)
      
      // Track drag start position
      dragStartRef.current = { x: event.x, y: event.y }
      
      // Fix the node position for dragging
      d.fx = d.x
      d.fy = d.y
      // Gently heat up the simulation without restarting
      if (simulationRef.current) {
        simulationRef.current.alphaTarget(0.1)
      }
    }

    function dragged(event: any, d: D3Node) {
      // Update the fixed position as we drag
      d.fx = event.x
      d.fy = event.y
    }

    function dragended(event: any, d: D3Node) {
      // Release the fixed position and cool down the simulation
      d.fx = null
      d.fy = null
      if (simulationRef.current) {
        simulationRef.current.alphaTarget(0)
      }
      
      // Clear drag start reference
      dragStartRef.current = null
    }

    // Update positions on simulation tick
    simulation.on('tick', () => {
      links
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y)

      nodes.attr('transform', (d: any) => `translate(${d.x},${d.y})`)
    })

    // Cleanup function
    return () => {
      simulation.stop()
    }
  }, [transformedData.nodes.length, transformedData.links.length, dimensions.width, dimensions.height])

  // Update hover effects
  useEffect(() => {
    if (!svgRef.current) return

    const svg = d3.select(svgRef.current)
    
    // Update node opacity and styling based on hover
    svg.selectAll('.node circle')
      .style('opacity', (d: any) => {
        if (!hoverNode) return 1
        return relatedNodeIds.has(d.id) ? 1 : 0.4
      })
      .style('filter', (d: any) => {
        if (!hoverNode) return 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))'
        if (d.id === hoverNode.id) return 'drop-shadow(0 0 12px rgba(255, 255, 255, 0.6))'
        if (relatedNodeIds.has(d.id)) return 'drop-shadow(0 0 6px rgba(255, 255, 255, 0.4))'
        return 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))'
      })
      .style('transform', (d: any) => {
        if (!hoverNode) return 'scale(1)'
        if (d.id === hoverNode.id) return 'scale(1.1)'
        if (relatedNodeIds.has(d.id)) return 'scale(1.02)'
        return 'scale(1)'
      })

    // Update node labels
    svg.selectAll('.node text')
      .style('opacity', (d: any) => {
        if (!hoverNode) return 1
        return relatedNodeIds.has(d.id) ? 1 : 0.4
      })
      .style('font-size', (d: any) => {
        if (!hoverNode) return '14px'
        if (d.id === hoverNode.id) return '16px'
        if (relatedNodeIds.has(d.id)) return '15px'
        return '14px'
      })
      .style('font-weight', (d: any) => {
        if (!hoverNode) return '600'
        if (d.id === hoverNode.id) return '700'
        if (relatedNodeIds.has(d.id)) return '700'
        return '600'
      })

    // Update link opacity and styling based on hover
    svg.selectAll('line')
      .style('opacity', (d: any) => {
        if (!hoverNode) return 0.6
        return d.source.id === hoverNode.id || d.target.id === hoverNode.id ? 1 : 0.2
      })
      .style('stroke', (d: any) => {
        if (!hoverNode) return '#999'
        return d.source.id === hoverNode.id || d.target.id === hoverNode.id ? '#fff' : '#999'
      })
      .style('stroke-width', (d: any) => {
        const relationshipType = (d as any).relationshipType || 'SIBLING'
        const baseWidth = relationshipType === 'PARENT' ? 4 : 2
        
        if (!hoverNode) return baseWidth
        if (d.source.id === hoverNode.id || d.target.id === hoverNode.id) {
          return relationshipType === 'PARENT' ? 6 : 3
        }
        return baseWidth
      })
  }, [hoverNode, relatedNodeIds])

  return (
    <div 
      ref={containerRef} 
      key={graphKey}
      style={{ width: '100%', height: '100%', position: 'relative' }}
    >
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        style={{ display: 'block' }}
      />
      
      {/* Tooltip */}
      {tooltip.visible && tooltip.data && (
        <div
          style={{
            position: 'fixed',
            left: tooltip.x,
            top: tooltip.y,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            color: '#1f2937',
            padding: '16px',
            borderRadius: '12px',
            fontSize: '14px',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
            zIndex: 1000,
            pointerEvents: 'none',
            boxShadow: '0 8px 32px 0 rgba(0,184,217,0.13), 0 16px 48px 0 rgba(127,57,251,0.13)',
            border: '1px solid rgba(0,184,217,0.1)',
            maxWidth: '320px',
            backdropFilter: 'blur(8px)'
          }}
        >
          {(() => {
            return (
              <>
                <div style={{ 
                  marginBottom: '8px', 
                  fontWeight: '800',
                  color: '#6366f1',
                  fontSize: '16px',
                  letterSpacing: '-0.02em'
                }}>
                  {(tooltip.data as any).clauseCode || (tooltip.data as any).clauseId || 'No ID'}
                </div>
                <div style={{ 
                  marginBottom: '12px', 
                  fontWeight: '600',
                  color: '#1f2937',
                  fontSize: '14px',
                  lineHeight: '1.4'
                }}>
                  {(tooltip.data as any).title || 'No Title'}
                </div>
                <div style={{ 
                  display: 'flex', 
                  gap: '16px',
                  fontSize: '12px',
                  color: '#6b7280'
                }}>
                  <div>
                    <strong style={{ color: '#6366f1' }}>Risk:</strong> {(tooltip.data as any).riskClassification || 'Unknown'}
                  </div>
                  <div>
                    <strong style={{ color: '#6366f1' }}>Family:</strong> {(tooltip.data as any).family?.name || 'Unknown'}
                  </div>
                </div>
              </>
            )
          })()}
        </div>
      )}
    </div>
  )
} 