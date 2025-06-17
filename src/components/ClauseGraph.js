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
    var transformedData = useMemo(function () { return ({
        nodes: graphData.nodes,
        links: graphData.edges.map(function (edge) { return ({
            source: edge.source,
            target: edge.target,
            value: edge.value
        }); })
    }); }, [graphData]);
    return (_jsx(ForceGraph2D, { graphData: transformedData, nodeLabel: "name", nodeColor: function (node) { return node.color || '#33b5e5'; }, linkColor: function () { return '#999'; }, linkWidth: 1, linkDirectionalParticles: 2, onNodeClick: handleNodeClick, cooldownTicks: 100, onEngineStop: function () { return console.log('Graph layout complete'); } }));
};
