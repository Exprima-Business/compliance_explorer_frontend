import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { graphService } from '../services/graphService';
import type { GraphData } from '../types/clause';

export function useGraph(): UseQueryResult<GraphData, Error> {
  return useQuery<GraphData, Error>({
    queryKey: ['graph'],
    queryFn: () => graphService.getGraph(),
    staleTime: 60_000, // 1 minute
  });
} 