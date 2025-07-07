import { useCallback } from 'react';
import { useOrg } from '../contexts/OrgContext';
import { useProject } from '../contexts/ProjectContext';
import { urlBasedApiCall } from '../services/urlBasedApi';
import type { ApiResponse } from '../types/api';

const ENABLE_URL_BASED_ROUTING = import.meta.env.VITE_ENABLE_URL_BASED_ROUTING === 'true';

export const useHybridApi = () => {
  const { currentOrg } = useOrg();
  const { currentProject } = useProject();

  const apiCall = useCallback(async <T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> => {
    // Prepare context for URL-based API calls
    const context = ENABLE_URL_BASED_ROUTING && currentOrg && currentProject
      ? {
          orgSlug: currentOrg.slug,
          projectSlug: currentProject.slug
        }
      : undefined;

    return urlBasedApiCall<T>(endpoint, options, context);
  }, [currentOrg, currentProject]);

  return {
    apiCall,
    currentOrg,
    currentProject,
    isURLBasedRouting: ENABLE_URL_BASED_ROUTING
  };
}; 