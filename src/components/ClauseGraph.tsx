import React, { useEffect, useRef, useMemo, useState } from 'react'
import * as d3 from 'd3'
import { Box, IconButton, Paper, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import type { Clause } from '../types/clause'

interface ClauseGraphProps {
  clauses: Clause[]
  onNodeClick?: (clause: Clause) => void
}

interface NodeDatum extends d3.SimulationNodeDatum {
  id: string
  label: string
  family: string
  clause: Clause
}

interface LinkDatum extends d3.SimulationLinkDatum<NodeDatum> {
  source: string | NodeDatum
  target: string | NodeDatum
}

// Family color mapping and type
const familyColors: Record<string, string> = {
  'DFARS': '#1976d2',
  'FIPS': '#2e7d32',
  'NIST': '#ed6c02',
  'FAR': '#9c27b0',
  'OMB': '#d32f2f',
  'PRIVACY': '#0288d1',
  'HSPD': '#7b1fa2'
};

export const ClauseGraph: React.FC<ClauseGraphProps> = ({ clauses, onNodeClick }) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const simulationRef = useRef<d3.Simulation<NodeDatum, undefined> | null>(null)
  const nodesRef = useRef<NodeDatum[]>([])
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const [legendPosition, setLegendPosition] = useState({ x: 16, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStartPos = useRef({ x: 0, y: 0 })

  // Debug logging - commented out but preserved for future use
  /*
  console.log('ClauseGraph received clauses:', clauses?.length || 0, 'clauses');
  if (clauses?.length > 0) {
    console.log('Sample clause:', JSON.stringify(clauses[0], null, 2));
  }
  */

  // Memoize the nodes and links to prevent unnecessary recalculations
  const { nodes, links } = useMemo(() => {
    if (!clauses || !Array.isArray(clauses)) {
      console.warn('ClauseGraph: clauses is undefined or not an array');
      return { nodes: [], links: [] };
    }

    // Debug logging - commented out but preserved for future use
    /*
    console.log('Calculating nodes and links for', clauses.length, 'clauses');
    */

    const nodes: NodeDatum[] = clauses.map(clause => {
      // Try to find existing node position
      const existingNode = nodesRef.current.find(n => n.id === clause.id);
      return {
        id: clause.id,
        label: clause.clauseId,
        family: clause.family,
        clause,
        x: existingNode?.x,
        y: existingNode?.y,
        fx: existingNode?.fx,
        fy: existingNode?.fy
      };
    });

    const validNodeIds = new Set(nodes.map(node => node.id));
    const links: LinkDatum[] = clauses.flatMap(clause =>
      (clause.relationships || [])
        .filter(rel => validNodeIds.has(rel.clauseId))
        .map(rel => ({
          source: clause.id,
          target: rel.clauseId
        }))
    );

    // Debug logging - commented out but preserved for future use
    /*
    console.log('Generated nodes:', nodes.length);
    console.log('Generated links:', links.length);
    if (nodes.length > 0) {
      console.log('Sample node:', JSON.stringify(nodes[0], null, 2));
    }
    if (links.length > 0) {
      console.log('Sample link:', JSON.stringify(links[0], null, 2));
    }
    */

    nodesRef.current = nodes;
    return { nodes, links };
  }, [clauses]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || nodes.length === 0) {
      console.log('Skipping graph initialization:', {
        hasSvgRef: !!svgRef.current,
        hasContainerRef: !!containerRef.current,
        nodesLength: nodes.length
      });
      return;
    }

    try {
      // Clear previous graph
      d3.select(svgRef.current).selectAll('*').remove();

      // Get container dimensions with fallback
      const width = containerRef.current.clientWidth || window.innerWidth;
      const height = containerRef.current.clientHeight || window.innerHeight * 0.8;

      // Create the SVG container with explicit dimensions
      const svg = d3.select<SVGSVGElement, unknown>(svgRef.current)
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('preserveAspectRatio', 'xMidYMid meet');

      // Define radial gradients for each family
      const defs = svg.append('defs');
      
      // Neon glow filter
      defs.append('filter')
        .attr('id', 'neon-glow')
        .attr('x', '-40%')
        .attr('y', '-40%')
        .attr('width', '180%')
        .attr('height', '180%')
        .html(`
          <feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="#7F39FB" flood-opacity="0.85"/>
          <feDropShadow dx="0" dy="0" stdDeviation="12" flood-color="#00B8D9" flood-opacity="0.45"/>
        `);

      // Create radial gradients for each family
      Object.entries(familyColors).forEach(([family, color]) => {
        const gradient = defs.append('radialGradient')
          .attr('id', `radial-${family}`)
          .attr('cx', '50%')
          .attr('cy', '50%')
          .attr('r', '50%');

        const d3Color = d3.color(color);
        if (d3Color) {
          gradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', d3Color.brighter(0.5).toString());

          gradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', color);
        }
      });

      // Create zoom group first
      const zoomGroup = svg.append('g')
        .attr('class', 'zoom-group');

      // Initialize force simulation
      const simulation = d3.forceSimulation<NodeDatum>(nodes)
        .force('link', d3.forceLink<NodeDatum, LinkDatum>(links).id(d => d.id))
        .force('charge', d3.forceManyBody().strength(-100))
        .force('center', d3.forceCenter(width / 2, height / 2));

      // Run simulation for initial positions
      simulation.tick(100);

      // Create zoom behavior
      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 4])
        .on('zoom', (event) => {
          try {
            zoomGroup.attr('transform', event.transform);
          } catch (error) {
            console.error('Zoom error:', error);
          }
        });

      // Apply zoom behavior to SVG
      svg.call(zoom);
      zoomRef.current = zoom;

      // Add tooltip div
      const tooltip = d3.select('body')
        .append('div')
        .attr('class', 'tooltip')
        .style('opacity', 0)
        .style('position', 'absolute')
        .style('background-color', 'white')
        .style('padding', '16px')
        .style('border-radius', '8px')
        .style('box-shadow', '0 2px 8px rgba(0,0,0,0.15)')
        .style('pointer-events', 'none')
        .style('z-index', 1000)
        .style('font-family', 'system-ui, -apple-system, sans-serif')
        .style('font-size', '14px')
        .style('border', '1px solid #e0e0e0')
        .style('width', '250px')
        .style('word-wrap', 'break-word')
        .style('white-space', 'normal');

      // Draw links within the zoom group
      const link = zoomGroup.append('g')
        .attr('class', 'links')
        .selectAll('line')
        .data(links)
        .join('line')
        .attr('stroke', (d: any) => {
          const sourceId = typeof d.source === 'string' ? d.source : d.source.id;
          const targetId = typeof d.target === 'string' ? d.target : d.target.id;
          const sourceClause = clauses.find(c => c.id === sourceId);
          const targetClause = clauses.find(c => c.id === targetId);
          
          if (sourceClause?.parentClause === targetId || targetClause?.parentClause === sourceId) {
            return '#1976d2';
          }
          return '#bbb';
        })
        .attr('stroke-opacity', 0.7)
        .attr('stroke-width', (d: any) => {
          const sourceId = typeof d.source === 'string' ? d.source : d.source.id;
          const targetId = typeof d.target === 'string' ? d.target : d.target.id;
          const sourceClause = clauses.find(c => c.id === sourceId);
          const targetClause = clauses.find(c => c.id === targetId);
          
          if (sourceClause?.parentClause === targetId || targetClause?.parentClause === sourceId) {
            return 2;
          }
          return 1;
        })
        .attr('stroke-dasharray', (d: any) => {
          const sourceId = typeof d.source === 'string' ? d.source : d.source.id;
          const targetId = typeof d.target === 'string' ? d.target : d.target.id;
          const sourceClause = clauses.find(c => c.id === sourceId);
          const targetClause = clauses.find(c => c.id === targetId);
          
          if (sourceClause?.parentClause === targetId || targetClause?.parentClause === sourceId) {
            return 'none';
          }
          return '5,5';
        });

      // Draw nodes within the zoom group
      const nodeGroup = zoomGroup.append('g')
        .attr('class', 'nodes')
        .selectAll<SVGGElement, NodeDatum>('g')
        .data(nodes)
        .join('g')
        .style('cursor', 'pointer')
        .on('click', (event, d) => {
          event.stopPropagation();
          tooltip.style('opacity', 0);
          
          // Reset node size and style
          d3.select(event.currentTarget)
            .select('circle')
            .transition()
            .duration(200)
            .attr('r', 35)
            .style('stroke-width', 2);

          // Reset all nodes and links
          nodeGroup
            .transition()
            .duration(200)
            .style('opacity', 1)
            .select('circle')
            .style('stroke-width', 2);

          link
            .transition()
            .duration(200)
            .style('opacity', 0.7)
            .style('stroke-width', 1);

          if (onNodeClick) onNodeClick(d.clause);
        })
        .on('mouseover', (event, d) => {
          const [left, top] = d3.pointer(event);
          
          // Show tooltip with updated styling
          tooltip
            .style('opacity', 1)
            .html(`
              <div style="font-weight: 600; font-size: 16px; margin-bottom: 8px; color: #1976d2;">${d.clause.clauseId}</div>
              <div style="color: #666; font-size: 14px; line-height: 1.4; margin-bottom: 12px;">${d.clause.title}</div>
              <div style="display: flex; gap: 8px; align-items: center;">
                <span style="color: #1976d2; font-weight: 500;">${d.clause.family}</span>
                <span style="color: ${d.clause.riskClassification === 'HIGH' ? '#d32f2f' : '#ed6c02'}; font-weight: 500;">
                  ${d.clause.riskClassification}
                </span>
              </div>
            `)
            .style('left', left + 'px')
            .style('top', top + 'px');

          // Find connected nodes and links
          const connectedNodes = new Set();
          const connectedLinks = new Set();

          links.forEach(link => {
            const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
            const targetId = typeof link.target === 'string' ? link.target : link.target.id;
            if (sourceId === d.id || targetId === d.id) {
              connectedLinks.add(link);
              connectedNodes.add(sourceId);
              connectedNodes.add(targetId);
            }
          });

          // Highlight all nodes, with connected nodes at full opacity
          nodeGroup
            .transition()
            .duration(200)
            .style('opacity', nodeDatum => {
              if (nodeDatum.id === d.id) return 1;
              return connectedNodes.has(nodeDatum.id) ? 1 : 0.2;
            })
            .select('circle')
            .attr('r', nodeDatum => nodeDatum.id === d.id ? 40 : 35)
            .style('stroke-width', nodeDatum => nodeDatum.id === d.id ? 4 : 2)
            .style('stroke', nodeDatum => nodeDatum.id === d.id ? '#7F39FB' : '#757575')
            .attr('fill', nodeDatum => {
              const fam = nodeDatum.family;
              if (nodeDatum.id === d.id && fam && familyColors[fam]) {
                return `url(#radial-${fam})`;
              }
              if (fam && familyColors[fam]) {
                return `url(#radial-${fam})`;
              }
              return '#E0E0E0';
            })
            .attr('filter', nodeDatum => nodeDatum.id === d.id ? 'url(#neon-glow)' : null);

          // Highlight connected links with relationship-specific styling
          link
            .transition()
            .duration(200)
            .style('opacity', link => {
              if (!connectedLinks.has(link)) return 0.1;
              const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
              const targetId = typeof link.target === 'string' ? link.target : link.target.id;
              const sourceClause = clauses.find(c => c.id === sourceId);
              const targetClause = clauses.find(c => c.id === targetId);
              
              if (sourceClause?.parentClause === targetId || targetClause?.parentClause === sourceId) {
                return 1;
              }
              return 0.7;
            })
            .style('stroke-width', link => {
              if (!connectedLinks.has(link)) return 1;
              const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
              const targetId = typeof link.target === 'string' ? link.target : link.target.id;
              const sourceClause = clauses.find(c => c.id === sourceId);
              const targetClause = clauses.find(c => c.id === targetId);
              
              if (sourceClause?.parentClause === targetId || targetClause?.parentClause === sourceId) {
                return 3;
              }
              return 2;
            });
        })
        .on('mouseout', () => {
          tooltip.style('opacity', 0);
          
          // Reset all nodes and links
          nodeGroup
            .transition()
            .duration(200)
            .style('opacity', 1)
            .select('circle')
            .attr('r', 35)
            .style('stroke-width', 2)
            .style('stroke', '#757575')
            .attr('filter', null);

          link
            .transition()
            .duration(200)
            .style('opacity', 0.7)
            .style('stroke-width', 1);
        });

      // Add drag behavior
      const drag = d3.drag<SVGGElement, NodeDatum>()
        .on('start', (event) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          event.subject.fx = event.subject.x;
          event.subject.fy = event.subject.y;
        })
        .on('drag', (event) => {
          event.subject.fx = event.x;
          event.subject.fy = event.y;
        })
        .on('end', (event) => {
          if (!event.active) simulation.alphaTarget(0);
          event.subject.fx = null;
          event.subject.fy = null;
        });

      nodeGroup.call(drag);

      // Add circles to node groups
      nodeGroup.append('circle')
        .attr('r', 35)
        .attr('fill', d => {
          const fam = d.family;
          if (fam && familyColors[fam]) {
            return `url(#radial-${fam})`;
          }
          return '#E0E0E0';
        })
        .attr('stroke', '#757575')
        .attr('stroke-width', 2);

      // Add text labels to node groups
      nodeGroup.append('text')
        .attr('dy', '.35em')
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('font-weight', 'bold')
        .style('fill', '#fff')
        .style('pointer-events', 'none')
        .text(d => d.label);

      // Calculate initial zoom to fit all nodes
      const padding = 100;
      const xExtent = d3.extent(nodes, d => d.x) as [number, number];
      const yExtent = d3.extent(nodes, d => d.y) as [number, number];
      const xRange = xExtent[1] - xExtent[0];
      const yRange = yExtent[1] - yExtent[0];
      const scale = Math.min(
        (width - padding) / xRange,
        (height - padding) / yRange,
        1.2
      );

      // Calculate center of the node group
      const centerX = (xExtent[0] + xExtent[1]) / 2;
      const centerY = (yExtent[0] + yExtent[1]) / 2;

      // Create transform that centers the node group
      const transform = d3.zoomIdentity
        .translate(width / 2, height / 2)
        .scale(scale)
        .translate(-centerX, -centerY);

      // Apply initial transform
      svg.call(zoom.transform, transform);

      // Update positions on each tick
      simulation.on('tick', () => {
        link
          .attr('x1', d => (typeof d.source === 'object' ? d.source.x || 0 : 0))
          .attr('y1', d => (typeof d.source === 'object' ? d.source.y || 0 : 0))
          .attr('x2', d => (typeof d.target === 'object' ? d.target.x || 0 : 0))
          .attr('y2', d => (typeof d.target === 'object' ? d.target.y || 0 : 0));

        nodeGroup
          .select('circle')
          .attr('cx', d => d.x || 0)
          .attr('cy', d => d.y || 0);

        nodeGroup
          .select('text')
          .attr('x', d => d.x || 0)
          .attr('y', d => d.y || 0);
      });

      // Store simulation reference
      simulationRef.current = simulation;

      // Add resize handler
      const handleResize = () => {
        if (!containerRef.current) return;
        
        const newWidth = containerRef.current.clientWidth;
        const newHeight = containerRef.current.clientHeight;
        
        svg
          .attr('width', newWidth)
          .attr('height', newHeight)
          .attr('viewBox', `0 0 ${newWidth} ${newHeight}`);
        
        simulation.force('center', d3.forceCenter(newWidth / 2, newHeight / 2));
        simulation.alpha(0.3).restart();
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        simulation.stop();
        tooltip.remove();
      };
    } catch (error) {
      console.error('Error initializing graph:', error);
    }
  }, [nodes, links, clauses, onNodeClick]);

  useEffect(() => {
    if (!containerRef.current) return
    
    // Set initial y position based on container height
    const containerHeight = containerRef.current.clientHeight
    const legendHeight = 100 // Approximate legend height
    const bottomBuffer = 35 // Buffer from bottom edge
    setLegendPosition(prev => ({
      ...prev,
      y: containerHeight - legendHeight - bottomBuffer
    }))
  }, []) // Run once on mount

  const handleZoomIn = () => {
    console.log('Zoom in clicked')
    if (!svgRef.current || !zoomRef.current) {
      console.log('Missing refs:', { svg: !!svgRef.current, zoom: !!zoomRef.current })
      return
    }
    const svg = d3.select(svgRef.current)
    const currentTransform = d3.zoomTransform(svgRef.current)
    console.log('Current transform:', currentTransform)
    const newScale = Math.min(currentTransform.k * 1.2, 4)
    
    svg.transition()
      .duration(200)
      .call(
        zoomRef.current.transform,
        d3.zoomIdentity
          .translate(currentTransform.x, currentTransform.y)
          .scale(newScale)
      )
  }

  const handleZoomOut = () => {
    console.log('Zoom out clicked')
    if (!svgRef.current || !zoomRef.current) {
      console.log('Missing refs:', { svg: !!svgRef.current, zoom: !!zoomRef.current })
      return
    }
    const svg = d3.select(svgRef.current)
    const currentTransform = d3.zoomTransform(svgRef.current)
    console.log('Current transform:', currentTransform)
    const newScale = Math.max(currentTransform.k * 0.8, 0.1)
    
    svg.transition()
      .duration(200)
      .call(
        zoomRef.current.transform,
        d3.zoomIdentity
          .translate(currentTransform.x, currentTransform.y)
          .scale(newScale)
      )
  }

  const handleResetZoom = () => {
    console.log('Reset zoom clicked')
    if (!svgRef.current || !zoomRef.current || !containerRef.current) {
      console.log('Missing refs:', { 
        svg: !!svgRef.current, 
        zoom: !!zoomRef.current,
        container: !!containerRef.current 
      })
      return
    }
    const svg = d3.select(svgRef.current)
    const width = containerRef.current.clientWidth
    const height = containerRef.current.clientHeight
    
    // Calculate the transform to fit all nodes
    const padding = 100
    const xExtent = d3.extent(nodes, (d: any) => d.x) as [number, number]
    const yExtent = d3.extent(nodes, (d: any) => d.y) as [number, number]
    const xRange = xExtent[1] - xExtent[0]
    const yRange = yExtent[1] - yExtent[0]
    const scale = Math.min(
      (width - padding) / xRange,
      (height - padding) / yRange,
      1.2
    )
    const centerX = (xExtent[0] + xExtent[1]) / 2
    const centerY = (yExtent[0] + yExtent[1]) / 2
    
    const transform = d3.zoomIdentity
      .translate(width / 2, height / 2)
      .scale(scale)
      .translate(-centerX, -centerY)
    
    console.log('Reset transform:', transform)
    
    svg.transition()
      .duration(500)
      .call(zoomRef.current.transform, transform)
  }

  const handleDragStart = (event: React.MouseEvent) => {
    setIsDragging(true)
    dragStartPos.current = {
      x: event.clientX - legendPosition.x,
      y: event.clientY - legendPosition.y
    }
  }

  const handleDragMove = (event: React.MouseEvent) => {
    if (!isDragging) return
    
    const newX = event.clientX - dragStartPos.current.x
    const newY = event.clientY - dragStartPos.current.y
    
    // Get container bounds
    const container = containerRef.current
    if (!container) return
    
    const containerRect = container.getBoundingClientRect()
    const legendWidth = 500 // Approximate legend width
    const legendHeight = 100 // Approximate legend height
    
    // Constrain to container bounds
    const constrainedX = Math.max(0, Math.min(newX, containerRect.width - legendWidth))
    const constrainedY = Math.max(0, Math.min(newY, containerRect.height - legendHeight))
    
    setLegendPosition({ x: constrainedX, y: constrainedY })
  }

  const handleDragEnd = () => {
    setIsDragging(false)
  }

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      handleDragMove(event as unknown as React.MouseEvent)
    }

    const handleMouseUp = () => {
      handleDragEnd()
    }

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  return (
    <Box
      ref={containerRef}
      sx={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        bgcolor: 'background.paper',
        borderRadius: 2.8,
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minWidth: 0,
        minHeight: 0
      }}
    >
      <svg
        ref={svgRef}
        style={{
          width: '100%',
          height: '100%',
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          display: 'block'
        }}
      />
      
      {/* Legend */}
      <Paper
        elevation={3}
        sx={{
          position: 'absolute',
          left: legendPosition.x,
          top: legendPosition.y,
          p: 1.5,
          borderRadius: 2,
          bgcolor: 'background.paper',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          width: 'fit-content',
          minWidth: 500,
          maxWidth: 800,
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none'
        }}
        onMouseDown={handleDragStart}
      >
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1, 
          cursor: 'grab',
          '&:active': { cursor: 'grabbing' }
        }}>
          <DragIndicatorIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Drag to reposition
          </Typography>
        </Box>

        {/* Families */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
            Families:
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'nowrap' }}>
            {Object.entries(familyColors).map(([family, color]) => (
              <Box key={family} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    bgcolor: color,
                    border: '1px solid #757575'
                  }}
                />
                <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>{family}</Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Relationships */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
            Relationships:
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 2,
                  bgcolor: '#1976d2',
                  borderRadius: 1
                }}
              />
              <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>Parent</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 2,
                  bgcolor: '#bbb',
                  borderRadius: 1,
                  backgroundImage: 'repeating-linear-gradient(to right, #bbb 0px, #bbb 5px, transparent 5px, transparent 10px)'
                }}
              />
              <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>Sibling</Typography>
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Zoom Controls */}
      <Paper
        elevation={3}
        sx={{
          position: 'absolute',
          right: 16,
          bottom: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          p: 0.5,
          borderRadius: 2,
          bgcolor: 'background.paper',
          zIndex: 1000
        }}
      >
        <IconButton 
          onClick={handleZoomIn}
          size="small"
          sx={{ 
            bgcolor: 'background.paper',
            '&:hover': { bgcolor: 'action.hover' }
          }}
        >
          <AddIcon />
        </IconButton>
        <IconButton 
          onClick={handleZoomOut}
          size="small"
          sx={{ 
            bgcolor: 'background.paper',
            '&:hover': { bgcolor: 'action.hover' }
          }}
        >
          <RemoveIcon />
        </IconButton>
        <IconButton 
          onClick={handleResetZoom}
          size="small"
          sx={{ 
            bgcolor: 'background.paper',
            '&:hover': { bgcolor: 'action.hover' }
          }}
        >
          <CenterFocusStrongIcon />
        </IconButton>
      </Paper>
    </Box>
  )
} 