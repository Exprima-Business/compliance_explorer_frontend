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
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useRef, useState, useEffect } from 'react';
import * as d3 from 'd3';
// Constants
var NODE_RADIUS = 45;
var SIDEBAR_WIDTH = 320;
var APPBAR_HEIGHT = 64;
// Legacy color palette for different families
var familyColors = {
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
};
// Color hash function (fallback)
function hashColor(str) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    var hue = Math.abs(hash) % 360;
    return "hsl(".concat(hue, ", 70%, 50%)");
}
export var ClauseGraphD3 = function (_a) {
    var graphData = _a.graphData, onNodeClick = _a.onNodeClick;
    var svgRef = useRef(null);
    var containerRef = useRef(null);
    var simulationRef = useRef(null);
    var _b = useState({ width: 800, height: 600 }), dimensions = _b[0], setDimensions = _b[1];
    var _c = useState(null), hoverNode = _c[0], setHoverNode = _c[1];
    var dragStartRef = useRef(null);
    var _d = useState({
        visible: false,
        x: 0,
        y: 0,
        data: null
    }), tooltip = _d[0], setTooltip = _d[1];
    // Resize observer for container
    useEffect(function () {
        var el = containerRef.current;
        if (!el)
            return;
        var resizeObserver = new ResizeObserver(function () {
            var _a = el.getBoundingClientRect(), width = _a.width, height = _a.height;
            setDimensions({ width: width, height: height });
        });
        resizeObserver.observe(el);
        // Initial set
        var _a = el.getBoundingClientRect(), width = _a.width, height = _a.height;
        setDimensions({ width: width, height: height });
        return function () { return resizeObserver.disconnect(); };
    }, []);
    // Transform data (deduplicate nodes)
    var transformedData = useMemo(function () {
        var _a;
        var nodeMap = new Map();
        graphData.nodes.forEach(function (n) {
            if (!nodeMap.has(n.id))
                nodeMap.set(n.id, __assign({}, n));
        });
        var links = ((_a = graphData.links) !== null && _a !== void 0 ? _a : []).filter(function (l) {
            return !!nodeMap.get(l.source) && !!nodeMap.get(l.target);
        });
        return { nodes: Array.from(nodeMap.values()), links: links };
    }, [graphData]);
    // Color function
    var getNodeColor = function (node) {
        // Use family color if available, otherwise fallback to default
        var fam = node.family;
        if (fam) {
            var color = familyColors[fam.name];
            if (color)
                return color;
        }
        return '#6366f1'; // Default color
    };
    // Hover highlighting helpers
    var relatedNodeIds = useMemo(function () {
        if (!hoverNode)
            return new Set();
        var set = new Set();
        set.add(hoverNode.id);
        transformedData.links.forEach(function (l) {
            if (l.source === hoverNode.id)
                set.add(l.target);
            if (l.target === hoverNode.id)
                set.add(l.source);
        });
        return set;
    }, [hoverNode, transformedData.links]);
    // D3 Graph Rendering
    useEffect(function () {
        if (!svgRef.current || !transformedData.nodes.length)
            return;
        var svg = d3.select(svgRef.current);
        svg.selectAll('*').remove(); // Clear previous content
        // Add zoom behavior
        var zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on('zoom', function (event) {
            g.attr('transform', event.transform);
        });
        svg.call(zoom);
        // Create main group for all content
        var g = svg.append('g');
        // Add SVG definitions for gradients and filters
        var defs = svg.append('defs');
        // Add glow filter for nodes
        var glowFilter = defs.append('filter')
            .attr('id', 'glow')
            .attr('x', '-50%')
            .attr('y', '-50%')
            .attr('width', '200%')
            .attr('height', '200%');
        glowFilter.append('feGaussianBlur')
            .attr('stdDeviation', '3')
            .attr('result', 'coloredBlur');
        var feMerge = glowFilter.append('feMerge');
        feMerge.append('feMergeNode').attr('in', 'coloredBlur');
        feMerge.append('feMergeNode').attr('in', 'SourceGraphic');
        // Add pulse filter for animated effects
        var pulseFilter = defs.append('filter')
            .attr('id', 'pulse')
            .attr('x', '-100%')
            .attr('y', '-100%')
            .attr('width', '300%')
            .attr('height', '300%');
        pulseFilter.append('feGaussianBlur')
            .attr('stdDeviation', '2')
            .attr('result', 'pulseBlur');
        var pulseMerge = pulseFilter.append('feMerge');
        pulseMerge.append('feMergeNode').attr('in', 'pulseBlur');
        pulseMerge.append('feMergeNode').attr('in', 'SourceGraphic');
        // Add gradient definitions for each family with futuristic styling
        Object.entries(familyColors).forEach(function (_a) {
            var family = _a[0], color = _a[1];
            // Main node gradient - fades from family color at edge to white in center
            var gradient = defs.append('radialGradient')
                .attr('id', "gradient-".concat(family))
                .attr('cx', '50%')
                .attr('cy', '50%')
                .attr('r', '50%');
            gradient.append('stop')
                .attr('offset', '0%')
                .attr('stop-color', '#ffffff')
                .attr('stop-opacity', 1);
            gradient.append('stop')
                .attr('offset', '33%')
                .attr('stop-color', '#ffffff')
                .attr('stop-opacity', 1);
            gradient.append('stop')
                .attr('offset', '100%')
                .attr('stop-color', color)
                .attr('stop-opacity', 1);
        });
        // Create gradients for any additional family values found in the data
        var dataFamilies = new Set();
        transformedData.nodes.forEach(function (node) {
            var _a, _b;
            // Use same logic as getNodeColor
            var family1 = (_a = node.family) === null || _a === void 0 ? void 0 : _a.name;
            var family2 = (_b = node.family) === null || _b === void 0 ? void 0 : _b.id;
            var family3 = node.family;
            var family4 = node.familyName;
            var family = family1 || family2 || family3 || family4 || 'Default';
            dataFamilies.add(family);
        });
        dataFamilies.forEach(function (family) {
            var _a;
            if (!familyColors[family]) {
                // Create gradient for unknown family using hash color
                var color = hashColor(family);
                var gradient = defs.append('radialGradient')
                    .attr('id', "gradient-".concat(family))
                    .attr('cx', '30%')
                    .attr('cy', '30%')
                    .attr('r', '70%');
                gradient.append('stop')
                    .attr('offset', '0%')
                    .attr('stop-color', color)
                    .attr('stop-opacity', 1);
                gradient.append('stop')
                    .attr('offset', '100%')
                    .attr('stop-color', ((_a = d3.color(color)) === null || _a === void 0 ? void 0 : _a.darker(0.3).toString()) || color)
                    .attr('stop-opacity', 0.8);
            }
        });
        // Add subtle background pattern
        var pattern = defs.append('pattern')
            .attr('id', 'grid')
            .attr('width', 20)
            .attr('height', 20)
            .attr('patternUnits', 'userSpaceOnUse');
        pattern.append('path')
            .attr('d', 'M 20 0 L 0 0 0 20')
            .attr('fill', 'none')
            .attr('stroke', 'rgba(255, 255, 255, 0.1)')
            .attr('stroke-width', 0.5);
        // Add background with pattern
        g.append('rect')
            .attr('width', dimensions.width)
            .attr('height', dimensions.height)
            .attr('fill', 'url(#grid)')
            .style('pointer-events', 'none');
        // Create simulation with stable configuration
        var simulation = d3.forceSimulation(transformedData.nodes)
            .force('link', d3.forceLink(transformedData.links).id(function (d) { return d.id; }).distance(50))
            .force('charge', d3.forceManyBody().strength(-100))
            .force('center', d3.forceCenter(dimensions.width / 2, dimensions.height / 2))
            .force('collision', d3.forceCollide(NODE_RADIUS * 1.2))
            .alphaDecay(0.02) // Slower decay for more stability
            .velocityDecay(0.4); // Higher velocity decay for less bouncing
        // Store simulation reference
        simulationRef.current = simulation;
        // Create links with enhanced styling
        var links = g.append('g')
            .selectAll('line')
            .data(transformedData.links)
            .enter()
            .append('line')
            .attr('stroke', '#999')
            .attr('stroke-width', function (d) {
            // Make PARENT relationships bolder than SIBLING
            var relationshipType = d.relationshipType || 'SIBLING';
            return relationshipType === 'PARENT' ? 4 : 2;
        })
            .attr('opacity', 0.6)
            .style('filter', 'drop-shadow(0 0 2px rgba(153, 153, 153, 0.3))');
        // Create nodes with clean design
        var nodes = g.append('g')
            .selectAll('g')
            .data(transformedData.nodes)
            .enter()
            .append('g')
            .attr('class', 'node')
            .call(d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended));
        // Add main circle with gradient
        var circles = nodes.append('circle')
            .attr('r', NODE_RADIUS)
            .attr('fill', function (d) {
            var _a, _b;
            var family = ((_a = d.family) === null || _a === void 0 ? void 0 : _a.name) || ((_b = d.family) === null || _b === void 0 ? void 0 : _b.id) || d.family || 'Default';
            return "url(#gradient-".concat(family, ")");
        })
            .attr('stroke', function (d) { return d.isBookmarked ? '#FFD700' : 'none'; })
            .attr('stroke-width', function (d) { return d.isBookmarked ? 3 : 0; })
            .style('cursor', 'pointer')
            .style('filter', 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))')
            .style('transition', 'all 0.3s ease');
        // Add labels to nodes
        var labels = nodes.append('text')
            .text(function (d) { return d.clauseId || d.name; })
            .attr('text-anchor', 'middle')
            .attr('dy', '.35em')
            .attr('font-size', '14px')
            .attr('fill', '#000')
            .attr('font-weight', '600')
            .style('pointer-events', 'none')
            .style('text-shadow', '0 1px 2px rgba(255, 255, 255, 0.8)');
        // Hover effects with subtle styling
        nodes.on('mouseenter', function (event, d) {
            // Set the hover node state
            setHoverNode(d);
            // Show tooltip
            setTooltip({
                visible: true,
                x: event.pageX + 10,
                y: event.pageY - 10,
                data: d
            });
            var node = d3.select(this);
            var circle = node.select('circle');
            var label = node.select('text');
            // Add subtle glow effect and slight scale to hovered node
            circle.style('filter', 'drop-shadow(0 0 12px rgba(255, 255, 255, 0.6))')
                .style('transform', 'scale(1.1)');
            // Show tooltip
            label.style('font-size', '16px')
                .style('font-weight', '700')
                .style('text-shadow', '0 0 8px rgba(255, 255, 255, 0.8)');
        })
            .on('mouseleave', function (event, d) {
            // Clear the hover node state
            setHoverNode(null);
            // Hide tooltip
            setTooltip(function (prev) { return (__assign(__assign({}, prev), { visible: false })); });
            var node = d3.select(this);
            var circle = node.select('circle');
            var label = node.select('text');
            // Remove glow effect from hovered node
            circle.style('filter', 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))')
                .style('transform', 'scale(1)');
            // Reset label
            label.style('font-size', '14px')
                .style('font-weight', '600')
                .style('text-shadow', '0 1px 2px rgba(255, 255, 255, 0.8)');
        })
            .on('click', function (event, d) {
            // Only fire click if there wasn't a significant drag
            if (dragStartRef.current) {
                var dragDistance = Math.sqrt(Math.pow(event.x - dragStartRef.current.x, 2) +
                    Math.pow(event.y - dragStartRef.current.y, 2));
                if (dragDistance > 5) {
                    // This was a drag, not a click
                    return;
                }
            }
            if (onNodeClick) {
                onNodeClick(d);
            }
        });
        // Drag functions with stable simulation
        function dragstarted(event, d) {
            // Clear hover state when dragging starts
            setHoverNode(null);
            // Track drag start position
            dragStartRef.current = { x: event.x, y: event.y };
            // Fix the node position for dragging
            d.fx = d.x;
            d.fy = d.y;
            // Gently heat up the simulation without restarting
            if (simulationRef.current) {
                simulationRef.current.alphaTarget(0.1);
            }
        }
        function dragged(event, d) {
            // Update the fixed position as we drag
            d.fx = event.x;
            d.fy = event.y;
        }
        function dragended(event, d) {
            // Release the fixed position and cool down the simulation
            d.fx = null;
            d.fy = null;
            if (simulationRef.current) {
                simulationRef.current.alphaTarget(0);
            }
            // Clear drag start reference
            dragStartRef.current = null;
        }
        // Update positions on simulation tick
        simulation.on('tick', function () {
            links
                .attr('x1', function (d) { return d.source.x; })
                .attr('y1', function (d) { return d.source.y; })
                .attr('x2', function (d) { return d.target.x; })
                .attr('y2', function (d) { return d.target.y; });
            nodes.attr('transform', function (d) { return "translate(".concat(d.x, ",").concat(d.y, ")"); });
        });
        // Cleanup function
        return function () {
            simulation.stop();
        };
    }, [transformedData.nodes.length, transformedData.links.length, dimensions.width, dimensions.height]);
    // Update hover effects
    useEffect(function () {
        if (!svgRef.current)
            return;
        var svg = d3.select(svgRef.current);
        // Update node opacity and styling based on hover
        svg.selectAll('.node circle')
            .style('opacity', function (d) {
            if (!hoverNode)
                return 1;
            return relatedNodeIds.has(d.id) ? 1 : 0.4;
        })
            .style('filter', function (d) {
            if (!hoverNode)
                return 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))';
            if (d.id === hoverNode.id)
                return 'drop-shadow(0 0 12px rgba(255, 255, 255, 0.6))';
            if (relatedNodeIds.has(d.id))
                return 'drop-shadow(0 0 6px rgba(255, 255, 255, 0.4))';
            return 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))';
        })
            .style('transform', function (d) {
            if (!hoverNode)
                return 'scale(1)';
            if (d.id === hoverNode.id)
                return 'scale(1.1)';
            if (relatedNodeIds.has(d.id))
                return 'scale(1.02)';
            return 'scale(1)';
        });
        // Update node labels
        svg.selectAll('.node text')
            .style('opacity', function (d) {
            if (!hoverNode)
                return 1;
            return relatedNodeIds.has(d.id) ? 1 : 0.4;
        })
            .style('font-size', function (d) {
            if (!hoverNode)
                return '14px';
            if (d.id === hoverNode.id)
                return '16px';
            if (relatedNodeIds.has(d.id))
                return '15px';
            return '14px';
        })
            .style('font-weight', function (d) {
            if (!hoverNode)
                return '600';
            if (d.id === hoverNode.id)
                return '700';
            if (relatedNodeIds.has(d.id))
                return '700';
            return '600';
        });
        // Update link opacity and styling based on hover
        svg.selectAll('line')
            .style('opacity', function (d) {
            if (!hoverNode)
                return 0.6;
            return d.source.id === hoverNode.id || d.target.id === hoverNode.id ? 1 : 0.2;
        })
            .style('stroke', function (d) {
            if (!hoverNode)
                return '#999';
            return d.source.id === hoverNode.id || d.target.id === hoverNode.id ? '#fff' : '#999';
        })
            .style('stroke-width', function (d) {
            var relationshipType = d.relationshipType || 'SIBLING';
            var baseWidth = relationshipType === 'PARENT' ? 4 : 2;
            if (!hoverNode)
                return baseWidth;
            if (d.source.id === hoverNode.id || d.target.id === hoverNode.id) {
                return relationshipType === 'PARENT' ? 6 : 3;
            }
            return baseWidth;
        });
    }, [hoverNode, relatedNodeIds]);
    return (_jsxs("div", { ref: containerRef, style: { width: '100%', height: '100%', position: 'relative' }, children: [_jsx("svg", { ref: svgRef, width: dimensions.width, height: dimensions.height, style: { display: 'block' } }), tooltip.visible && tooltip.data && (_jsx("div", { style: {
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
                }, children: (function () {
                    var _a;
                    return (_jsxs(_Fragment, { children: [_jsx("div", { style: {
                                    marginBottom: '8px',
                                    fontWeight: '800',
                                    color: '#6366f1',
                                    fontSize: '16px',
                                    letterSpacing: '-0.02em'
                                }, children: tooltip.data.clauseId || 'No ID' }), _jsx("div", { style: {
                                    marginBottom: '12px',
                                    fontWeight: '600',
                                    color: '#1f2937',
                                    fontSize: '14px',
                                    lineHeight: '1.4'
                                }, children: tooltip.data.title || 'No Title' }), _jsxs("div", { style: {
                                    display: 'flex',
                                    gap: '16px',
                                    fontSize: '12px',
                                    color: '#6b7280'
                                }, children: [_jsxs("div", { children: [_jsx("strong", { style: { color: '#6366f1' }, children: "Risk:" }), " ", tooltip.data.riskClassification || 'Unknown'] }), _jsxs("div", { children: [_jsx("strong", { style: { color: '#6366f1' }, children: "Family:" }), " ", ((_a = tooltip.data.family) === null || _a === void 0 ? void 0 : _a.name) || 'Unknown'] })] })] }));
                })() }))] }));
};
