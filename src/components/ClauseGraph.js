import { jsx as _jsx } from "react/jsx-runtime";
import { useCallback, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
// Define a color palette for different families
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
    'Default': '#33b5e5'
};
export var ClauseGraph = function (_a) {
    var graphData = _a.graphData, onNodeClick = _a.onNodeClick;
    var handleNodeClick = useCallback(function (node) {
        if (onNodeClick) {
            onNodeClick(node);
        }
    }, [onNodeClick]);
    var transformedData = useMemo(function () {
        // Build a quick lookup map for node objects by id to ensure link.source/target
        // are concrete node references (objects), not just string ids. This helps
        // react-force-graph avoid cases where it tries to read properties (e.g., `id`)
        // from an unresolved string.
        var nodeById = new Map();
        graphData.nodes.forEach(function (node) { return nodeById.set(node.id, node); });
        var links = graphData.links
            .map(function (edge) {
            var sourceNode = nodeById.get(edge.source);
            var targetNode = nodeById.get(edge.target);
            // Skip links that reference missing nodes as an extra safety net
            if (!sourceNode || !targetNode) {
                console.warn('[ClauseGraph] Dropping link with missing nodes', edge);
                return null;
            }
            return {
                source: sourceNode.id, // react-force-graph accepts id or object; keep id for serialization
                target: targetNode.id,
                value: edge.value
            };
        })
            .filter(function (l) { return l !== null; });
        return {
            nodes: graphData.nodes,
            links: links
        };
    }, [graphData]);
    // Expose graph data for debugging only in development builds
    if (import.meta.env.DEV) {
        window.__graphData = graphData;
    }
    return (_jsx(ForceGraph2D, { graphData: transformedData, nodeLabel: "name", nodeColor: function (node) {
            var _a, _b, _c;
            if (node.color)
                return node.color;
            var familyName = (_b = (_a = node.family) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : 'Default';
            return (_c = familyColors[familyName]) !== null && _c !== void 0 ? _c : familyColors['Default'];
        }, linkColor: function () { return '#999'; }, linkWidth: 1, linkDirectionalParticles: 2, onNodeClick: handleNodeClick, cooldownTicks: 100, onEngineStop: function () { return console.log('Graph layout complete'); } }));
};
