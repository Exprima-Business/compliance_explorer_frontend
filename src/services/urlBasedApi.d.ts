import type { ApiResponse } from '../types/api';
interface ApiOptions extends RequestInit {
    requireAuth?: boolean;
}
export declare const urlBasedApiCall: <T>(endpoint: string, options?: ApiOptions, context?: {
    orgSlug?: string;
    projectSlug?: string;
}) => Promise<ApiResponse<T>>;
export {};
