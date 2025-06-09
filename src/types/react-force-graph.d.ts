declare module 'react-force-graph' {
  import { Component } from 'react';

  interface ForceGraphProps {
    graphData: {
      nodes: any[];
      links: any[];
    };
    nodeLabel?: string | ((node: any) => string);
    nodeColor?: string | ((node: any) => string);
    nodeRelSize?: number;
    linkColor?: string | ((link: any) => string);
    linkWidth?: number;
    linkDirectionalParticles?: number;
    linkDirectionalParticleSpeed?: number;
    onNodeClick?: (node: any) => void;
    cooldownTicks?: number;
    onEngineStop?: () => void;
  }

  export class ForceGraph2D extends Component<ForceGraphProps> {}
} 