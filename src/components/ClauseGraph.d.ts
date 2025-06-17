import React from 'react';
import type { GraphData, GraphNode } from '../types/clause';
interface ClauseGraphProps {
    graphData: GraphData;
    onNodeClick?: (node: GraphNode) => void;
}
export declare const ClauseGraph: React.FC<ClauseGraphProps>;
export {};
