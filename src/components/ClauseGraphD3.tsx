import React, { useMemo, useRef, useState, useEffect } from 'react'
import { useTheme, useMediaQuery } from '@mui/material'
// Selective imports keep the D3 bundle ~60 KB smaller than `import * as d3 from 'd3'`
import { select } from 'd3-selection'
import type { Selection } from 'd3-selection'
import { zoom as d3Zoom } from 'd3-zoom'
import type { ZoomBehavior } from 'd3-zoom'
import { drag as d3Drag } from 'd3-drag'
import {
  forceSimulation, forceLink, forceManyBody,
  forceCenter, forceX, forceY, forceCollide,
} from 'd3-force'
import type { Simulation, SimulationNodeDatum } from 'd3-force'
import { color as d3Color } from 'd3-color'
import type { GraphData, GraphNode, GraphEdge } from '../types/clause'
import { useBookmarks } from '../contexts/BookmarkContext'
import { dlog } from '../utils/debugLog'

const NODE_RADIUS_DESKTOP = 45
const NODE_RADIUS_MOBILE = 38

interface ClauseGraphD3Props {
  graphData: GraphData
  onNodeClick?: (node: GraphNode) => void
}

// Extend GraphNode with D3 simulation properties
interface D3Node extends GraphNode, SimulationNodeDatum {
  x?: number
  y?: number
  fx?: number | null
  fy?: number | null
}

// Color palette for known families
const familyColors: { [key: string]: string } = {
  'Uncategorized': '#999999',
  'GDPR':     '#FF6B6B',
  'CCPA':     '#4ECDC4',
  'HIPAA':    '#45B7D1',
  'ISO27001': '#96CEB4',
  'SOC2':     '#FFEEAD',
  'PCI DSS':  '#D4A5A5',
  'NIST':     '#9B59B6',
  'COBIT':    '#3498DB',
  'FAR':      '#FF8C42',
  'FIPS':     '#2ECC71',
  'PRIVACY':  '#E74C3C',
  'OMB':      '#F39C12',
  'DFARS':    '#1ABC9C',
  'HSPD':     '#8E44AD',
  'Default':  '#33b5e5',
}

function hashColor(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return `hsl(${Math.abs(hash) % 360}, 70%, 50%)`
}

export const ClauseGraphD3: React.FC<ClauseGraphD3Props> = ({ graphData, onNodeClick }) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const NODE_RADIUS = isMobile ? NODE_RADIUS_MOBILE : NODE_RADIUS_DESKTOP

  const { isClauseBookmarked } = useBookmarks()
  const svgRef       = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Simulation reference shared across effects
  const simulationRef = useRef<Simulation<D3Node, GraphEdge> | null>(null)

  // D3 selection refs — persist between effect runs so tick always has latest selections
  const allLinksRef = useRef<Selection<SVGLineElement, GraphEdge, SVGGElement, unknown> | null>(null)
  const allNodesRef = useRef<Selection<SVGGElement, D3Node, SVGGElement, unknown> | null>(null)

  // SVG sub-group refs created once in the init effect
  const gRef      = useRef<Selection<SVGGElement, unknown, null, undefined> | null>(null)
  const linksGRef = useRef<Selection<SVGGElement, unknown, null, undefined> | null>(null)
  const nodesGRef = useRef<Selection<SVGGElement, unknown, null, undefined> | null>(null)

  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 800, height: 600 })
  const [hoverNode, setHoverNode]   = useState<GraphNode | null>(null)
  const dragStartRef = useRef<{ x: number; y: number } | null>(null)
  const [tooltip, setTooltip] = useState<{
    visible: boolean; x: number; y: number; data: GraphNode | null
  }>({ visible: false, x: 0, y: 0, data: null })

  // Stable ref so D3 click listeners never close over a stale onNodeClick
  const onNodeClickRef = useRef(onNodeClick)
  useEffect(() => { onNodeClickRef.current = onNodeClick }, [onNodeClick])

  // ─────────────────────────────────────────────────────────────
  // Resize observer
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const { width, height } = el.getBoundingClientRect()
      setDimensions({ width, height })
    })
    ro.observe(el)
    const { width, height } = el.getBoundingClientRect()
    setDimensions({ width, height })
    return () => ro.disconnect()
  }, [])

  // Deduplicate incoming nodes
  const transformedData = useMemo<{ nodes: D3Node[]; links: GraphEdge[] }>(() => {
    const nodeMap = new Map<string, D3Node>()
    graphData.nodes.forEach(n => {
      if (!nodeMap.has(n.id)) nodeMap.set(n.id, { ...n } as D3Node)
    })
    return { nodes: Array.from(nodeMap.values()), links: graphData.links ?? [] }
  }, [graphData])

  // Related node IDs for hover highlighting
  const relatedNodeIds = useMemo(() => {
    if (!hoverNode) return new Set<string>()
    const set = new Set<string>([hoverNode.id])
    transformedData.links.forEach(l => {
      if (l.source === hoverNode.id) set.add(l.target as string)
      if (l.target === hoverNode.id) set.add(l.source as string)
    })
    return set
  }, [hoverNode, transformedData.links])

  // ─────────────────────────────────────────────────────────────
  // Effect 1 — SVG Init  (runs once on mount)
  // Creates permanent SVG skeleton: defs, zoom, g groups.
  // Nothing depends on data — never needs to re-run.
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!svgRef.current) return
    const svg = select(svgRef.current)

    // Zoom
    const zoom: ZoomBehavior<SVGSVGElement, unknown> = d3Zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', event => { gRef.current?.attr('transform', event.transform) })
    svg.call(zoom)

    // Main group
    const g = svg.append<SVGGElement>('g')
    gRef.current = g as unknown as Selection<SVGGElement, unknown, null, undefined>

    // Defs
    const defs = svg.append('defs')

    // Glow filter
    const glow = defs.append('filter')
      .attr('id', 'glow').attr('x', '-50%').attr('y', '-50%')
      .attr('width', '200%').attr('height', '200%')
    glow.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur')
    const glowMerge = glow.append('feMerge')
    glowMerge.append('feMergeNode').attr('in', 'coloredBlur')
    glowMerge.append('feMergeNode').attr('in', 'SourceGraphic')

    // Pulse filter
    const pulse = defs.append('filter')
      .attr('id', 'pulse').attr('x', '-100%').attr('y', '-100%')
      .attr('width', '300%').attr('height', '300%')
    pulse.append('feGaussianBlur').attr('stdDeviation', '2').attr('result', 'pulseBlur')
    const pulseMerge = pulse.append('feMerge')
    pulseMerge.append('feMergeNode').attr('in', 'pulseBlur')
    pulseMerge.append('feMergeNode').attr('in', 'SourceGraphic')

    // Grid pattern
    const pat = defs.append('pattern')
      .attr('id', 'grid').attr('width', 20).attr('height', 20)
      .attr('patternUnits', 'userSpaceOnUse')
    pat.append('path')
      .attr('d', 'M 20 0 L 0 0 0 20').attr('fill', 'none')
      .attr('stroke', 'rgba(255,255,255,0.1)').attr('stroke-width', 0.5)

    // Gradients for all known families (created once — never recreated)
    // Consistent style: white core → soft transition → family color edge
    Object.entries(familyColors).forEach(([family, color]) => {
      const grad = defs.append('radialGradient')
        .attr('id', `gradient-${family}`)
        .attr('cx', '35%').attr('cy', '35%').attr('r', '65%')
      grad.append('stop').attr('offset', '0%').attr('stop-color', '#fff').attr('stop-opacity', 0.95)
      grad.append('stop').attr('offset', '40%').attr('stop-color', color).attr('stop-opacity', 0.4)
      grad.append('stop').attr('offset', '100%').attr('stop-color', color).attr('stop-opacity', 1)
    })

    // Background rect (width/height set by dimension effect)
    g.append('rect').attr('class', 'bg').attr('fill', 'url(#grid)').style('pointer-events', 'none')

    // Links and nodes sub-groups
    linksGRef.current = g.append('g').attr('class', 'links') as unknown as
      Selection<SVGGElement, unknown, null, undefined>
    nodesGRef.current = g.append('g').attr('class', 'nodes') as unknown as
      Selection<SVGGElement, unknown, null, undefined>

    return () => {
      simulationRef.current?.stop()
      svg.selectAll('*').remove()
      gRef.current = linksGRef.current = nodesGRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────────────────────────
  // Effect 2 — Dynamic gradient registration
  // Appends gradients for families not already in <defs>.
  // Non-destructive — only adds, never removes.
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!svgRef.current) return
    const defs = select(svgRef.current).select('defs')
    if (defs.empty()) return

    const knownIds = new Set(
      (defs.selectAll('radialGradient').nodes() as Element[]).map(n => n.id)
    )

    transformedData.nodes.forEach(node => {
      const familyName = node.family?.name ?? 'Default'
      const gradId = `gradient-${familyName}`
      if (!knownIds.has(gradId)) {
        const color = hashColor(familyName)
        const grad = defs.append('radialGradient')
          .attr('id', gradId).attr('cx', '35%').attr('cy', '35%').attr('r', '65%')
        grad.append('stop').attr('offset', '0%').attr('stop-color', '#fff').attr('stop-opacity', 0.95)
        grad.append('stop').attr('offset', '40%').attr('stop-color', color).attr('stop-opacity', 0.4)
        grad.append('stop').attr('offset', '100%').attr('stop-color', color).attr('stop-opacity', 1)
        knownIds.add(gradId)
      }
    })
  }, [transformedData.nodes])

  // ─────────────────────────────────────────────────────────────
  // Effect 3 — Simulation & node/link data update
  // Uses D3 join (enter/exit) — no SVG wipe.
  // Restores saved positions so existing nodes don't scatter.
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!linksGRef.current || !nodesGRef.current) return
    if (!transformedData.nodes.length) return

    // ── Save current node positions ──────────────────────────
    const positionMap = new Map<string, { x?: number; y?: number }>(
      (simulationRef.current?.nodes() ?? []).map(n => [n.id, { x: n.x, y: n.y }])
    )

    // ── Restore positions on incoming nodes ──────────────────
    transformedData.nodes.forEach(n => {
      const pos = positionMap.get(n.id)
      if (pos) {
        ;(n as D3Node).x = pos.x
        ;(n as D3Node).y = pos.y
      }
    })

    // ── Link join ─────────────────────────────────────────────
    const linksG = linksGRef.current!
    const linkKey = (d: GraphEdge) => {
      const s = typeof d.source === 'object' ? (d.source as D3Node).id : d.source
      const t = typeof d.target === 'object' ? (d.target as D3Node).id : d.target
      return `${s}-${t}`
    }
    const linkSel = linksG.selectAll<SVGLineElement, GraphEdge>('line')
      .data(transformedData.links, linkKey)
    linkSel.exit().remove()
    const linkEnter = linkSel.enter().append('line')
      .attr('stroke', (d: any) => {
        const rel = (d.relationshipType || 'sibling').toLowerCase()
        if (rel === 'parent') return '#6366f1'
        if (rel === 'child')  return '#0ea5e9'
        return '#94a3b8'
      })
      .attr('stroke-width', (d: any) => {
        const rel = (d.relationshipType || 'sibling').toLowerCase()
        return rel === 'parent' || rel === 'child' ? 3 : 2
      })
      .attr('opacity', 0.9)
      .style('filter', 'drop-shadow(0 0 2px rgba(153,153,153,0.3))')
    allLinksRef.current = linkEnter.merge(linkSel) as unknown as
      Selection<SVGLineElement, GraphEdge, SVGGElement, unknown>

    // ── Node join ─────────────────────────────────────────────
    const nodesG = nodesGRef.current!
    const nodeSel = nodesG.selectAll<SVGGElement, D3Node>('g.node')
      .data(transformedData.nodes, (d: D3Node) => d.id)
    nodeSel.exit().remove()

    const dragBehavior = d3Drag<SVGGElement, D3Node>()
      .on('start', (event, d) => {
        setHoverNode(null)
        dragStartRef.current = { x: event.x, y: event.y }
        d.fx = d.x; d.fy = d.y
        simulationRef.current?.alphaTarget(0.1)
      })
      .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y })
      .on('end', (_, d) => {
        d.fx = null; d.fy = null
        simulationRef.current?.alphaTarget(0)
        dragStartRef.current = null
      })

    const nodeEnter = nodeSel.enter().append('g')
      .attr('class', 'node')
      .call(dragBehavior as any)

    nodeEnter.append('circle')
      .attr('r', NODE_RADIUS)
      .attr('fill', (d: D3Node) => `url(#gradient-${d.family?.name ?? 'Default'})`)
      .attr('stroke', (d: D3Node) => {
        if (isClauseBookmarked(d.id)) return '#FFD700'
        // All nodes get a subtle colored border matching their family
        const familyName = d.family?.name ?? 'Default'
        return familyColors[familyName] || hashColor(familyName)
      })
      .attr('stroke-width', (d: D3Node) => isClauseBookmarked(d.id) ? 3 : 2)
      .attr('stroke-opacity', (d: D3Node) => isClauseBookmarked(d.id) ? 1 : 0.6)
      .style('cursor', 'pointer')
      .style('filter', 'drop-shadow(0 4px 8px rgba(0,0,0,0.25))')
      .style('transition', 'all 0.3s ease')

    nodeEnter.append('text')
      .text((d: D3Node) => d.clauseCode || d.clauseId || d.name)
      .attr('text-anchor', 'middle').attr('dy', '.35em')
      .attr('font-size', isMobile ? '11px' : '14px')
      .attr('fill', '#000').attr('font-weight', '600')
      .style('pointer-events', 'none')
      .style('text-shadow', '0 1px 2px rgba(255,255,255,0.8)')

    nodeEnter
      .on('mouseenter', function(this: SVGGElement, event: MouseEvent, d: D3Node) {
        setHoverNode(d)
        setTooltip({ visible: true, x: event.pageX + 10, y: event.pageY - 10, data: d })
        const node = select<SVGGElement, D3Node>(this)
        node.select('circle')
          .style('filter', 'drop-shadow(0 0 12px rgba(255,255,255,0.6))')
          .style('transform', 'scale(1.1)')
        node.select('text')
          .style('font-size', '16px').style('font-weight', '700')
          .style('text-shadow', '0 0 8px rgba(255,255,255,0.8)')
      })
      .on('mouseleave', function(this: SVGGElement) {
        setHoverNode(null)
        setTooltip(prev => ({ ...prev, visible: false }))
        const node = select<SVGGElement, D3Node>(this)
        node.select('circle')
          .style('filter', 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))')
          .style('transform', 'scale(1)')
        node.select('text')
          .style('font-size', '14px').style('font-weight', '600')
          .style('text-shadow', '0 1px 2px rgba(255,255,255,0.8)')
      })
      .on('click', (event: MouseEvent, d: D3Node) => {
        if (dragStartRef.current) {
          const dist = Math.hypot(
            event.x - dragStartRef.current.x,
            event.y - dragStartRef.current.y
          )
          if (dist > 5) return
        }
        onNodeClickRef.current?.(d)
      })

    allNodesRef.current = nodeEnter.merge(nodeSel) as unknown as
      Selection<SVGGElement, D3Node, SVGGElement, unknown>

    // ── Create or update simulation ───────────────────────────
    if (simulationRef.current) {
      simulationRef.current
        .nodes(transformedData.nodes)
        .force('link',
          forceLink<D3Node, GraphEdge>(transformedData.links)
            .id(d => d.id).distance(60)
        )
        .alpha(0.3).restart()
    } else {
      simulationRef.current = forceSimulation<D3Node>(transformedData.nodes)
        .force('link',
          forceLink<D3Node, GraphEdge>(transformedData.links)
            .id(d => d.id).distance(60)
        )
        .force('charge',
          forceManyBody<D3Node>()
            .strength(-80)
            .distanceMax(Math.min(dimensions.width, dimensions.height) / 2)
        )
        .force('center', forceCenter(dimensions.width / 2, dimensions.height / 2))
        .force('attractX', forceX<D3Node>(dimensions.width / 2).strength(0.03))
        .force('attractY', forceY<D3Node>(dimensions.height / 2).strength(0.03))
        .force('collision', forceCollide(NODE_RADIUS * 1.6))
        .alphaDecay(0.02)
        .velocityDecay(0.4)
    }

    simulationRef.current.on('tick', () => {
      allLinksRef.current
        ?.attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y)
      allNodesRef.current
        ?.attr('transform', (d: any) => `translate(${d.x},${d.y})`)
    })

    dlog('ClauseGraphD3: data updated', {
      nodes: transformedData.nodes.length,
      links: transformedData.links.length,
      restoredPositions: positionMap.size,
    })
  }, [transformedData.nodes, transformedData.links]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────────────────────────
  // Effect 4 — Dimension update
  // Adjusts forces & background rect only — never rebuilds.
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!simulationRef.current || !gRef.current) return
    simulationRef.current
      .force('center', forceCenter(dimensions.width / 2, dimensions.height / 2))
      .force('attractX', forceX<D3Node>(dimensions.width / 2).strength(0.03))
      .force('attractY', forceY<D3Node>(dimensions.height / 2).strength(0.03))
      .alpha(0.1).restart()
    ;(gRef.current as any).select('rect.bg')
      .attr('width', dimensions.width)
      .attr('height', dimensions.height)
  }, [dimensions.width, dimensions.height])

  // ─────────────────────────────────────────────────────────────
  // Hover highlight effect
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!svgRef.current) return
    const svg = select(svgRef.current)

    svg.selectAll('.node circle')
      .style('opacity', (d: any) => (!hoverNode ? 1 : relatedNodeIds.has(d.id) ? 1 : 0.4))
      .style('filter', (d: any) => {
        if (!hoverNode) return 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))'
        if (d.id === hoverNode.id) return 'drop-shadow(0 0 12px rgba(255,255,255,0.6))'
        if (relatedNodeIds.has(d.id)) return 'drop-shadow(0 0 6px rgba(255,255,255,0.4))'
        return 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
      })
      .style('transform', (d: any) => {
        if (!hoverNode) return 'scale(1)'
        if (d.id === hoverNode.id) return 'scale(1.1)'
        if (relatedNodeIds.has(d.id)) return 'scale(1.02)'
        return 'scale(1)'
      })

    svg.selectAll('.node text')
      .style('opacity', (d: any) => (!hoverNode ? 1 : relatedNodeIds.has(d.id) ? 1 : 0.4))
      .style('font-size', (d: any) => {
        if (!hoverNode) return '14px'
        if (d.id === hoverNode.id) return '16px'
        if (relatedNodeIds.has(d.id)) return '15px'
        return '14px'
      })
      .style('font-weight', (d: any) => (!hoverNode || !relatedNodeIds.has(d.id) ? '600' : '700'))

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
        const rel = (d.relationshipType || 'SIBLING').toUpperCase()
        const base = rel === 'PARENT' ? 4 : 2
        if (!hoverNode) return base
        if (d.source.id === hoverNode.id || d.target.id === hoverNode.id)
          return rel === 'PARENT' ? 6 : 3
        return base
      })
  }, [hoverNode, relatedNodeIds])

  // ─────────────────────────────────────────────────────────────
  // Bookmark ring update (no simulation rebuild)
  // isClauseBookmarked is useCallback([bookmarks]) — its reference
  // changes whenever bookmarks change, making it a perfect dep.
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!svgRef.current) return
    select(svgRef.current)
      .selectAll<SVGCircleElement, D3Node>('.node circle')
      .attr('stroke', d => {
        if (isClauseBookmarked(d.id)) return '#FFD700'
        const familyName = d.family?.name ?? 'Default'
        return familyColors[familyName] || hashColor(familyName)
      })
      .attr('stroke-width', d => isClauseBookmarked(d.id) ? 3 : 2)
      .attr('stroke-opacity', d => isClauseBookmarked(d.id) ? 1 : 0.6)
  }, [isClauseBookmarked])

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      {transformedData.nodes.length === 0 && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          color: '#9ca3af', gap: '12px', pointerEvents: 'none',
        }}>
          <div style={{ fontSize: '18px', fontWeight: 600 }}>No clause data to display</div>
          <div style={{ fontSize: '14px' }}>Import compliance clause data to see the graph</div>
        </div>
      )}
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        style={{ display: 'block' }}
      />

      {tooltip.visible && tooltip.data && !isMobile && (
        <div
          style={{
            position: 'fixed',
            left: tooltip.x,
            top: tooltip.y,
            backgroundColor: 'rgba(255,255,255,0.95)',
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
            backdropFilter: 'blur(8px)',
          }}
        >
          <div style={{ marginBottom: '8px', fontWeight: '800', color: '#6366f1', fontSize: '16px', letterSpacing: '-0.02em' }}>
            {tooltip.data.clauseCode || tooltip.data.clauseId || 'No ID'}
          </div>
          <div style={{ marginBottom: '12px', fontWeight: '600', color: '#1f2937', fontSize: '14px', lineHeight: '1.4' }}>
            {tooltip.data.title || 'No Title'}
          </div>
          <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#6b7280' }}>
            <div><strong style={{ color: '#6366f1' }}>Risk:</strong> {tooltip.data.riskClassification || 'Unknown'}</div>
            <div><strong style={{ color: '#6366f1' }}>Family:</strong> {tooltip.data.family?.name || 'Unknown'}</div>
          </div>
        </div>
      )}
    </div>
  )
}
