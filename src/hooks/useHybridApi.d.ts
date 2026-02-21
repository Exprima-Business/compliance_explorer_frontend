import { type Organization } from '../contexts/OrgContext';
import { type Project } from '../contexts/ProjectContext';
import type { ApiResponse } from '../types/api';
export declare const useHybridApi: () => {
    apiCall: <T>(endpoint: string, options?: RequestInit) => Promise<ApiResponse<T>>;
    currentOrg: Organization | null;
    currentProject: Project | null;
    isURLBasedRouting: boolean;
};
