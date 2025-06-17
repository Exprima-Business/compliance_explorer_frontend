import type { GraphData } from '../types/clause';
import { apiCall } from './api';

export const graphService = {
  getGraph: async (): Promise<GraphData> => {
    const res = await apiCall<{ nodes: any[]; links: any[] }>('/api/clauses/graph');
    if (res.error) throw new Error(res.error);

    // backend may return links instead of edges; map for compatibility
    const edges = (res.data.links ?? []).map(l => ({ source: l.source, target: l.target, value: l.value ?? 1 }));
    return {
      nodes: res.data.nodes ?? [],
      edges
    };
  }
}; 