import { useQuery } from '@tanstack/react-query';
import { graphService } from '../services/graphService';
export function useGraph() {
    return useQuery({
        queryKey: ['graph'],
        queryFn: function () { return graphService.getGraph(); },
        staleTime: 60000, // 1 minute
    });
}
