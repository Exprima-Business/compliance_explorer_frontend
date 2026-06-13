import type { Clause, ClauseFamily, ClauseFamilyGroup } from '../types/clause';
import type { ApiResponse } from '../types/api';
export declare function getAuthToken(): Promise<string | null>;
interface ApiOptions extends RequestInit {
    requireAuth?: boolean;
    /** Override the default 30 s request timeout (in milliseconds). */
    timeout?: number;
}
export declare const apiCall: <T>(endpoint: string, options?: ApiOptions) => Promise<ApiResponse<T>>;
export declare const fetchClauses: () => Promise<ApiResponse<Clause[]>>;
export declare const getClausesByFamily: (family: ClauseFamily) => Promise<ApiResponse<Clause[]>>;
export declare const getClauseFamilies: () => Promise<ApiResponse<ClauseFamilyGroup[]>>;
export declare const getClauseById: (id: string) => Promise<ApiResponse<Clause>>;
export declare const searchClauses: (query: string) => Promise<ApiResponse<Clause[]>>;
export declare function uploadDocument(file: File): Promise<ApiResponse<any>>;
export declare const analyzeDocument: (documentId: string) => Promise<ApiResponse<any>>;
export {};
