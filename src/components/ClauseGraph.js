var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { Box, IconButton, Paper, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
// Family color mapping and type
var familyColors = {
    DFARS: '#1976D2', // Primary Blue
    FIPS: '#D32F2F', // Primary Red
    NIST: '#388E3C', // Primary Green
    FAR: '#FBC02D', // Primary Yellow/Gold
    OMB: '#0288D1', // Bright Blue
    PRIVACY: '#F57C00', // Primary Orange
    HSPD: '#7B1FA2', // Primary Purple
};
export var ClauseGraph = function (_a) {
    var clauses = _a.clauses, onNodeClick = _a.onNodeClick;
    var svgRef = useRef(null);
    var containerRef = useRef(null);
    var simulationRef = useRef(null);
    var nodesRef = useRef([]);
    var zoomRef = useRef(null);
    var _b = useState({ x: 16, y: 0 }), legendPosition = _b[0], setLegendPosition = _b[1];
    var _c = useState(false), isDragging = _c[0], setIsDragging = _c[1];
    var dragStartPos = useRef({ x: 0, y: 0 });
    console.log('ClauseGraph received clauses:', (clauses === null || clauses === void 0 ? void 0 : clauses.length) || 0, 'clauses');
    if ((clauses === null || clauses === void 0 ? void 0 : clauses.length) > 0) {
        console.log('Sample clause:', JSON.stringify(clauses[0], null, 2));
    }
    // Memoize the nodes and links to prevent unnecessary recalculations
    var _d = useMemo(function () {
        if (!clauses || !Array.isArray(clauses)) {
            console.warn('ClauseGraph: clauses is undefined or not an array');
            return { nodes: [], links: [] };
        }
        console.log('Calculating nodes and links for', clauses.length, 'clauses');
        var nodes = clauses.map(function (clause) {
            // Try to find existing node position
            var existingNode = nodesRef.current.find(function (n) { return n.id === clause.id; });
            return {
                id: clause.id,
                label: clause.clauseId,
                family: clause.family,
                clause: clause,
                x: existingNode === null || existingNode === void 0 ? void 0 : existingNode.x,
                y: existingNode === null || existingNode === void 0 ? void 0 : existingNode.y,
                fx: existingNode === null || existingNode === void 0 ? void 0 : existingNode.fx,
                fy: existingNode === null || existingNode === void 0 ? void 0 : existingNode.fy
            };
        });
        var validNodeIds = new Set(nodes.map(function (node) { return node.id; }));
        var links = clauses.flatMap(function (clause) {
            return (clause.relationships || [])
                .filter(function (rel) { return validNodeIds.has(rel.clauseId); })
                .map(function (rel) { return ({
                source: clause.id,
                target: rel.clauseId
            }); });
        });
        console.log('Generated nodes:', nodes.length);
        console.log('Generated links:', links.length);
        if (nodes.length > 0) {
            console.log('Sample node:', JSON.stringify(nodes[0], null, 2));
        }
        if (links.length > 0) {
            console.log('Sample link:', JSON.stringify(links[0], null, 2));
        }
        nodesRef.current = nodes;
        return { nodes: nodes, links: links };
    }, [clauses]), nodes = _d.nodes, links = _d.links;
    useEffect(function () {
        if (!svgRef.current || !containerRef.current || nodes.length === 0) {
            console.log('Skipping graph initialization:', {
                hasSvgRef: !!svgRef.current,
                hasContainerRef: !!containerRef.current,
                nodesLength: nodes.length
            });
            return;
        }
        console.log('Initializing graph with', nodes.length, 'nodes and', links.length, 'links');
        // Clear previous graph
        d3.select(svgRef.current).selectAll('*').remove();
        // Get container dimensions with fallback
        var width = containerRef.current.clientWidth || window.innerWidth * 0.8;
        var height = containerRef.current.clientHeight || window.innerHeight * 0.8;
        // Create the SVG container with explicit dimensions
        var svg = d3.select(svgRef.current)
            .attr('width', width)
            .attr('height', height)
            .attr('viewBox', "0 0 ".concat(width, " ").concat(height))
            .attr('preserveAspectRatio', 'xMidYMid meet');
        // Define radial gradients for each family
        var defs = svg.append('defs');
        // Neon glow filter
        defs.append('filter')
            .attr('id', 'neon-glow')
            .attr('x', '-40%')
            .attr('y', '-40%')
            .attr('width', '180%')
            .attr('height', '180%')
            .html("\n        <feDropShadow dx=\"0\" dy=\"0\" stdDeviation=\"6\" flood-color=\"#7F39FB\" flood-opacity=\"0.85\"/>\n        <feDropShadow dx=\"0\" dy=\"0\" stdDeviation=\"12\" flood-color=\"#00B8D9\" flood-opacity=\"0.45\"/>\n      ");
        Object.entries(familyColors).forEach(function (_a) {
            var family = _a[0], color = _a[1];
            var grad = defs.append('radialGradient')
                .attr('id', "radial-".concat(family))
                .attr('cx', '50%')
                .attr('cy', '50%')
                .attr('r', '70%');
            grad.append('stop')
                .attr('offset', '0%')
                .attr('stop-color', '#fff')
                .attr('stop-opacity', 0.95);
            grad.append('stop')
                .attr('offset', '100%')
                .attr('stop-color', color)
                .attr('stop-opacity', 1);
        });
        // Create a group for zooming that will contain all elements
        var zoomGroup = svg.append('g')
            .attr('class', 'zoom-group');
        // Add zoom behavior
        var zoom = d3.zoom()
            .extent([[0, 0], [width, height]])
            .scaleExtent([0.1, 4])
            .on('zoom', function (event) {
            console.log('Zoom event:', event.transform);
            zoomGroup.attr('transform', event.transform);
        });
        // Apply zoom behavior to SVG
        svg.call(zoom);
        zoomRef.current = zoom;
        // Set up the simulation with adjusted forces
        var simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links)
            .id(function (d) { return d.id; })
            .distance(200) // Increased distance
            .strength(0.5)) // Reduced strength
            .force('charge', d3.forceManyBody()
            .strength(-400) // Increased repulsion
            .distanceMax(500)) // Increased max distance
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide()
            .radius(60) // Increased collision radius
            .strength(0.9)) // Increased collision strength
            .force('x', d3.forceX(function (d) {
            var families = Array.from(new Set(nodes.map(function (n) { return n.family; })));
            var familyIndex = families.indexOf(d.family);
            var columnWidth = width / (families.length + 1);
            return columnWidth * (familyIndex + 1);
        }).strength(0.3)) // Reduced x-force strength
            .force('y', d3.forceY(height / 2).strength(0.2)) // Reduced y-force strength
            .force('boundary', function () {
            nodes.forEach(function (node) {
                var padding = 60; // Increased padding
                if (node.x < padding)
                    node.x = padding;
                if (node.x > width - padding)
                    node.x = width - padding;
                if (node.y < padding)
                    node.y = padding;
                if (node.y > height - padding)
                    node.y = height - padding;
            });
        });
        // Store simulation reference
        simulationRef.current = simulation;
        // Force more simulation ticks with cooling
        for (var i = 0; i < 500; ++i) {
            simulation.tick();
            // Gradually reduce alpha for smoother convergence
            if (i > 300) {
                simulation.alpha(simulation.alpha() * 0.99);
            }
        }
        // Draw links within the zoom group
        var link = zoomGroup.append('g')
            .attr('class', 'links')
            .selectAll('line')
            .data(links)
            .join('line')
            .attr('stroke', function (d) {
            var sourceId = typeof d.source === 'string' ? d.source : d.source.id;
            var targetId = typeof d.target === 'string' ? d.target : d.target.id;
            var sourceClause = clauses.find(function (c) { return c.id === sourceId; });
            var targetClause = clauses.find(function (c) { return c.id === targetId; });
            // Check if this is a parent relationship
            if ((sourceClause === null || sourceClause === void 0 ? void 0 : sourceClause.parentClause) === targetId || (targetClause === null || targetClause === void 0 ? void 0 : targetClause.parentClause) === sourceId) {
                return '#1976d2'; // Primary blue for parent relationships
            }
            return '#bbb'; // Grey for sibling relationships
        })
            .attr('stroke-opacity', 0.7)
            .attr('stroke-width', function (d) {
            var sourceId = typeof d.source === 'string' ? d.source : d.source.id;
            var targetId = typeof d.target === 'string' ? d.target : d.target.id;
            var sourceClause = clauses.find(function (c) { return c.id === sourceId; });
            var targetClause = clauses.find(function (c) { return c.id === targetId; });
            // Thicker line for parent relationships
            if ((sourceClause === null || sourceClause === void 0 ? void 0 : sourceClause.parentClause) === targetId || (targetClause === null || targetClause === void 0 ? void 0 : targetClause.parentClause) === sourceId) {
                return 2;
            }
            return 1;
        })
            .attr('stroke-dasharray', function (d) {
            var sourceId = typeof d.source === 'string' ? d.source : d.source.id;
            var targetId = typeof d.target === 'string' ? d.target : d.target.id;
            var sourceClause = clauses.find(function (c) { return c.id === sourceId; });
            var targetClause = clauses.find(function (c) { return c.id === targetId; });
            // Solid line for parent relationships, dashed for siblings
            if ((sourceClause === null || sourceClause === void 0 ? void 0 : sourceClause.parentClause) === targetId || (targetClause === null || targetClause === void 0 ? void 0 : targetClause.parentClause) === sourceId) {
                return 'none';
            }
            return '5,5';
        });
        // Draw nodes within the zoom group
        var nodeGroup = zoomGroup.append('g')
            .attr('class', 'nodes')
            .selectAll('g')
            .data(nodes)
            .join('g')
            .style('cursor', 'pointer')
            .on('click', function (event, d) {
            event.stopPropagation(); // Prevent click from bubbling to SVG
            // Hide tooltip
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
            if (onNodeClick)
                onNodeClick(d.clause);
        })
            .on('mouseover', function (event, d) {
            // Scale up the hovered node and set radial gradient fill, bold stroke, and neon glow
            var fam = d.family;
            d3.select(this)
                .select('circle')
                .transition()
                .duration(200)
                .attr('r', 40)
                .style('stroke-width', 4)
                .style('stroke', '#7F39FB')
                .attr('fill', fam && Object.prototype.hasOwnProperty.call(familyColors, fam) ? "url(#radial-".concat(fam, ")") : '#E0E0E0')
                .attr('filter', 'url(#neon-glow)');
            // Calculate tooltip position
            var tooltipWidth = 200; // Match the width set in tooltip style
            var tooltipHeight = 100; // Approximate height
            var padding = 16; // Increased padding from screen edge
            var nodeOffset = 32; // Increased offset from node
            // Get viewport dimensions
            var viewportWidth = window.innerWidth;
            var viewportHeight = window.innerHeight;
            // Calculate initial position
            var left = event.pageX + nodeOffset;
            var top = event.pageY - tooltipHeight / 2;
            // Check if tooltip would clip right edge
            if (left + tooltipWidth + padding > viewportWidth) {
                left = event.pageX - tooltipWidth - nodeOffset;
            }
            // Check if tooltip would clip bottom edge
            if (top + tooltipHeight + padding > viewportHeight) {
                top = event.pageY - tooltipHeight - nodeOffset;
            }
            // Ensure tooltip doesn't go off left edge
            left = Math.max(padding, left);
            // Ensure tooltip doesn't go off top edge
            top = Math.max(padding, top);
            // Show tooltip with updated styling
            tooltip
                .style('opacity', 1)
                .html("\n            <div style=\"font-weight: 600; font-size: 16px; margin-bottom: 8px; color: #1976d2;\">".concat(d.clause.clauseId, "</div>\n            <div style=\"color: #666; font-size: 14px; line-height: 1.4; margin-bottom: 12px;\">").concat(d.clause.title, "</div>\n            <div style=\"display: flex; gap: 8px; align-items: center;\">\n              <span style=\"color: #1976d2; font-weight: 500;\">").concat(d.clause.family, "</span>\n              <span style=\"color: ").concat(d.clause.riskClassification === 'HIGH' ? '#d32f2f' : '#ed6c02', "; font-weight: 500;\">\n                ").concat(d.clause.riskClassification, "\n              </span>\n            </div>\n          "))
                .style('left', left + 'px')
                .style('top', top + 'px');
            // Find connected nodes and links
            var connectedNodes = new Set();
            var connectedLinks = new Set();
            // Find connected nodes and links
            links.forEach(function (link) {
                var sourceId = typeof link.source === 'string' ? link.source : link.source.id;
                var targetId = typeof link.target === 'string' ? link.target : link.target.id;
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
                .style('opacity', function (nodeDatum) {
                if (nodeDatum.id === d.id)
                    return 1;
                return connectedNodes.has(nodeDatum.id) ? 1 : 0.2;
            })
                .select('circle')
                .attr('r', function (nodeDatum) { return nodeDatum.id === d.id ? 40 : 35; })
                .style('stroke-width', function (nodeDatum) { return nodeDatum.id === d.id ? 4 : 2; })
                .style('stroke', function (nodeDatum) { return nodeDatum.id === d.id ? '#7F39FB' : '#757575'; })
                .attr('fill', function (nodeDatum) {
                var fam = nodeDatum.family;
                if (nodeDatum.id === d.id && fam && Object.prototype.hasOwnProperty.call(familyColors, fam)) {
                    return "url(#radial-".concat(fam, ")");
                }
                if (fam && Object.prototype.hasOwnProperty.call(familyColors, fam)) {
                    return "url(#radial-".concat(fam, ")");
                }
                return '#E0E0E0';
            })
                .attr('filter', function (nodeDatum) { return nodeDatum.id === d.id ? 'url(#neon-glow)' : null; });
            // Highlight connected links with relationship-specific styling
            link
                .transition()
                .duration(200)
                .style('opacity', function (link) {
                if (!connectedLinks.has(link))
                    return 0.1;
                var sourceId = typeof link.source === 'string' ? link.source : link.source.id;
                var targetId = typeof link.target === 'string' ? link.target : link.target.id;
                var sourceClause = clauses.find(function (c) { return c.id === sourceId; });
                var targetClause = clauses.find(function (c) { return c.id === targetId; });
                // Higher opacity for parent relationships
                if ((sourceClause === null || sourceClause === void 0 ? void 0 : sourceClause.parentClause) === targetId || (targetClause === null || targetClause === void 0 ? void 0 : targetClause.parentClause) === sourceId) {
                    return 1;
                }
                return 0.7;
            })
                .style('stroke-width', function (link) {
                if (!connectedLinks.has(link))
                    return 1;
                var sourceId = typeof link.source === 'string' ? link.source : link.source.id;
                var targetId = typeof link.target === 'string' ? link.target : link.target.id;
                var sourceClause = clauses.find(function (c) { return c.id === sourceId; });
                var targetClause = clauses.find(function (c) { return c.id === targetId; });
                // Thicker line for parent relationships
                if ((sourceClause === null || sourceClause === void 0 ? void 0 : sourceClause.parentClause) === targetId || (targetClause === null || targetClause === void 0 ? void 0 : targetClause.parentClause) === sourceId) {
                    return 3;
                }
                return 2;
            });
        })
            .on('mouseout', function () {
            // Reset node size, stroke, fill, and remove filter
            d3.select(this)
                .select('circle')
                .transition()
                .duration(200)
                .attr('r', 35)
                .style('stroke-width', 2)
                .style('stroke', '#757575')
                .attr('fill', function (d) {
                var fam = d.family;
                if (fam && Object.prototype.hasOwnProperty.call(familyColors, fam)) {
                    return "url(#radial-".concat(fam, ")");
                }
                return '#E0E0E0';
            })
                .attr('filter', null);
            // Hide tooltip
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
                .attr('fill', function (nodeDatum) {
                var fam = nodeDatum.family;
                if (fam && Object.prototype.hasOwnProperty.call(familyColors, fam)) {
                    return "url(#radial-".concat(fam, ")");
                }
                return '#E0E0E0';
            })
                .attr('filter', null);
            link
                .transition()
                .duration(200)
                .style('opacity', 0.7)
                .style('stroke-width', 1);
        })
            .call(d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended));
        // Add circles to node groups
        nodeGroup.append('circle')
            .attr('r', 35)
            .attr('fill', function (d) {
            var fam = d.family;
            if (fam && Object.prototype.hasOwnProperty.call(familyColors, fam)) {
                return "url(#radial-".concat(fam, ")");
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
            .style('fill', '#000')
            .style('pointer-events', 'none')
            .text(function (d) { return d.label; });
        // Calculate initial zoom to fit all nodes
        var padding = 100;
        var xExtent = d3.extent(nodes, function (d) { return d.x; });
        var yExtent = d3.extent(nodes, function (d) { return d.y; });
        var xRange = xExtent[1] - xExtent[0];
        var yRange = yExtent[1] - yExtent[0];
        var scale = Math.min((width - padding) / xRange, (height - padding) / yRange, 1.2);
        // Calculate center of the node group
        var centerX = (xExtent[0] + xExtent[1]) / 2;
        var centerY = (yExtent[0] + yExtent[1]) / 2;
        // Create transform that centers the node group
        var transform = d3.zoomIdentity
            .translate(width / 2, height / 2)
            .scale(scale)
            .translate(-centerX, -centerY);
        // Apply initial transform
        svg.call(zoom.transform, transform);
        // Add double-click to reset zoom
        svg.on('dblclick', function () {
            svg.transition()
                .duration(750)
                .call(zoom.transform, transform);
        });
        // Add mouse wheel zoom with smoother behavior
        svg.on('wheel', function (event) {
            event.preventDefault();
            var currentTransform = d3.zoomTransform(svg.node());
            var scale = currentTransform.k * (event.deltaY > 0 ? 0.9 : 1.1);
            var newTransform = d3.zoomIdentity
                .translate(currentTransform.x, currentTransform.y)
                .scale(scale);
            svg.transition()
                .duration(50)
                .call(zoom.transform, newTransform);
        });
        // Update positions on each tick with smoother transitions
        simulation.on('tick', function () {
            link
                .attr('x1', function (d) { return (typeof d.source === 'object' ? d.source.x : 0); })
                .attr('y1', function (d) { return (typeof d.source === 'object' ? d.source.y : 0); })
                .attr('x2', function (d) { return (typeof d.target === 'object' ? d.target.x : 0); })
                .attr('y2', function (d) { return (typeof d.target === 'object' ? d.target.y : 0); });
            nodeGroup
                .select('circle')
                .attr('cx', function (d) { return d.x; })
                .attr('cy', function (d) { return d.y; });
            nodeGroup
                .select('text')
                .attr('x', function (d) { return d.x; })
                .attr('y', function (d) { return d.y; });
        });
        function dragstarted(event) {
            if (!event.active)
                simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
        }
        function dragged(event) {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
        }
        function dragended(event) {
            if (!event.active)
                simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
        }
        // Add resize handler
        var handleResize = function () {
            if (!containerRef.current)
                return;
            var newWidth = containerRef.current.clientWidth;
            var newHeight = containerRef.current.clientHeight;
            svg
                .attr('width', newWidth)
                .attr('height', newHeight)
                .attr('viewBox', "0 0 ".concat(newWidth, " ").concat(newHeight));
            // Update simulation center
            simulation.force('center', d3.forceCenter(newWidth / 2, newHeight / 2));
            simulation.alpha(0.3).restart();
        };
        window.addEventListener('resize', handleResize);
        // Add tooltip div
        var tooltip = d3.select('body')
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
        return function () {
            window.removeEventListener('resize', handleResize);
            simulation.stop();
            tooltip.remove();
        };
    }, [nodes, links, clauses, onNodeClick]);
    useEffect(function () {
        if (!containerRef.current)
            return;
        // Set initial y position based on container height
        var containerHeight = containerRef.current.clientHeight;
        var legendHeight = 100; // Approximate legend height
        var bottomBuffer = 35; // Buffer from bottom edge
        setLegendPosition(function (prev) { return (__assign(__assign({}, prev), { y: containerHeight - legendHeight - bottomBuffer })); });
    }, []); // Run once on mount
    var handleZoomIn = function () {
        console.log('Zoom in clicked');
        if (!svgRef.current || !zoomRef.current) {
            console.log('Missing refs:', { svg: !!svgRef.current, zoom: !!zoomRef.current });
            return;
        }
        var svg = d3.select(svgRef.current);
        var currentTransform = d3.zoomTransform(svgRef.current);
        console.log('Current transform:', currentTransform);
        var newScale = Math.min(currentTransform.k * 1.2, 4);
        svg.transition()
            .duration(200)
            .call(zoomRef.current.transform, d3.zoomIdentity
            .translate(currentTransform.x, currentTransform.y)
            .scale(newScale));
    };
    var handleZoomOut = function () {
        console.log('Zoom out clicked');
        if (!svgRef.current || !zoomRef.current) {
            console.log('Missing refs:', { svg: !!svgRef.current, zoom: !!zoomRef.current });
            return;
        }
        var svg = d3.select(svgRef.current);
        var currentTransform = d3.zoomTransform(svgRef.current);
        console.log('Current transform:', currentTransform);
        var newScale = Math.max(currentTransform.k * 0.8, 0.1);
        svg.transition()
            .duration(200)
            .call(zoomRef.current.transform, d3.zoomIdentity
            .translate(currentTransform.x, currentTransform.y)
            .scale(newScale));
    };
    var handleResetZoom = function () {
        console.log('Reset zoom clicked');
        if (!svgRef.current || !zoomRef.current || !containerRef.current) {
            console.log('Missing refs:', {
                svg: !!svgRef.current,
                zoom: !!zoomRef.current,
                container: !!containerRef.current
            });
            return;
        }
        var svg = d3.select(svgRef.current);
        var width = containerRef.current.clientWidth;
        var height = containerRef.current.clientHeight;
        // Calculate the transform to fit all nodes
        var padding = 100;
        var xExtent = d3.extent(nodes, function (d) { return d.x; });
        var yExtent = d3.extent(nodes, function (d) { return d.y; });
        var xRange = xExtent[1] - xExtent[0];
        var yRange = yExtent[1] - yExtent[0];
        var scale = Math.min((width - padding) / xRange, (height - padding) / yRange, 1.2);
        var centerX = (xExtent[0] + xExtent[1]) / 2;
        var centerY = (yExtent[0] + yExtent[1]) / 2;
        var transform = d3.zoomIdentity
            .translate(width / 2, height / 2)
            .scale(scale)
            .translate(-centerX, -centerY);
        console.log('Reset transform:', transform);
        svg.transition()
            .duration(500)
            .call(zoomRef.current.transform, transform);
    };
    var handleDragStart = function (event) {
        setIsDragging(true);
        dragStartPos.current = {
            x: event.clientX - legendPosition.x,
            y: event.clientY - legendPosition.y
        };
    };
    var handleDragMove = function (event) {
        if (!isDragging)
            return;
        var newX = event.clientX - dragStartPos.current.x;
        var newY = event.clientY - dragStartPos.current.y;
        // Get container bounds
        var container = containerRef.current;
        if (!container)
            return;
        var containerRect = container.getBoundingClientRect();
        var legendWidth = 500; // Approximate legend width
        var legendHeight = 100; // Approximate legend height
        // Constrain to container bounds
        var constrainedX = Math.max(0, Math.min(newX, containerRect.width - legendWidth));
        var constrainedY = Math.max(0, Math.min(newY, containerRect.height - legendHeight));
        setLegendPosition({ x: constrainedX, y: constrainedY });
    };
    var handleDragEnd = function () {
        setIsDragging(false);
    };
    useEffect(function () {
        var handleMouseMove = function (event) {
            handleDragMove(event);
        };
        var handleMouseUp = function () {
            handleDragEnd();
        };
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return function () {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);
    return (_jsxs(Box, { ref: containerRef, sx: {
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            border: '1px solid #ddd',
            borderRadius: 2,
            bgcolor: '#fafafa',
            position: 'relative'
        }, children: [_jsx("svg", { ref: svgRef, style: { width: '100%', height: '100%' } }), _jsxs(Paper, { elevation: 3, sx: {
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
                }, onMouseDown: handleDragStart, children: [_jsxs(Box, { sx: {
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            cursor: 'grab',
                            '&:active': { cursor: 'grabbing' }
                        }, children: [_jsx(DragIndicatorIcon, { sx: { color: 'text.secondary', fontSize: 20 } }), _jsx(Typography, { variant: "caption", sx: { color: 'text.secondary' }, children: "Drag to reposition" })] }), _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 2 }, children: [_jsx(Typography, { variant: "subtitle2", sx: { fontWeight: 600, whiteSpace: 'nowrap' }, children: "Families:" }), _jsx(Box, { sx: { display: 'flex', gap: 2, flexWrap: 'nowrap' }, children: Object.entries(familyColors).map(function (_a) {
                                    var family = _a[0], color = _a[1];
                                    return (_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 0.5 }, children: [_jsx(Box, { sx: {
                                                    width: 12,
                                                    height: 12,
                                                    borderRadius: '50%',
                                                    bgcolor: color,
                                                    border: '1px solid #757575'
                                                } }), _jsx(Typography, { variant: "body2", sx: { fontSize: '0.75rem' }, children: family })] }, family));
                                }) })] }), _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 2 }, children: [_jsx(Typography, { variant: "subtitle2", sx: { fontWeight: 600, whiteSpace: 'nowrap' }, children: "Relationships:" }), _jsxs(Box, { sx: { display: 'flex', gap: 2 }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 0.5 }, children: [_jsx(Box, { sx: {
                                                    width: 40,
                                                    height: 2,
                                                    bgcolor: '#1976d2',
                                                    borderRadius: 1
                                                } }), _jsx(Typography, { variant: "body2", sx: { fontSize: '0.75rem' }, children: "Parent" })] }), _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 0.5 }, children: [_jsx(Box, { sx: {
                                                    width: 40,
                                                    height: 2,
                                                    bgcolor: '#bbb',
                                                    borderRadius: 1,
                                                    backgroundImage: 'repeating-linear-gradient(to right, #bbb 0px, #bbb 5px, transparent 5px, transparent 10px)'
                                                } }), _jsx(Typography, { variant: "body2", sx: { fontSize: '0.75rem' }, children: "Sibling" })] })] })] })] }), _jsxs(Paper, { elevation: 3, sx: {
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
                }, children: [_jsx(IconButton, { onClick: handleZoomIn, size: "small", sx: {
                            bgcolor: 'background.paper',
                            '&:hover': { bgcolor: 'action.hover' }
                        }, children: _jsx(AddIcon, {}) }), _jsx(IconButton, { onClick: handleZoomOut, size: "small", sx: {
                            bgcolor: 'background.paper',
                            '&:hover': { bgcolor: 'action.hover' }
                        }, children: _jsx(RemoveIcon, {}) }), _jsx(IconButton, { onClick: handleResetZoom, size: "small", sx: {
                            bgcolor: 'background.paper',
                            '&:hover': { bgcolor: 'action.hover' }
                        }, children: _jsx(CenterFocusStrongIcon, {}) })] })] }));
};
