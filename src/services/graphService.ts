import type { GraphData } from '../types/clause';
import { apiCall } from './api';

export const graphService = {
  getGraph: async (): Promise<GraphData> => {
    const res = await apiCall<{ nodes: any[]; links?: any[]; edges?: any[] }>('/api/clauses/graph');
    if (res.error) throw new Error(res.error);

    // Normalize to expected shape (nodes + links)
    const links = (res.data.links ?? res.data.edges ?? []).map(l => ({
      source: l.source,
      target: l.target,
      value: l.value ?? 1
    }));

    return {
      nodes: res.data.nodes ?? [],
      links
    };
  }
}; 