import type { Clause, ClauseFamily, ClauseFamilyGroup } from '../types/clause';
import type { ApiResponse } from '../types/api';
export declare function getAuthToken(): Promise<string | null>;
interface ApiOptions extends RequestInit {
    requireAuth?: boolean;
}
export declare const apiCall: <T>(endpoint: string, options?: ApiOptions) => Promise<ApiResponse<T>>;
export declare function fetchClauses(): Promise<ApiResponse<Clause[]>>;
export declare function getClausesByFamily(family: ClauseFamily): Promise<ApiResponse<Clause[]>>;
export declare function getClauseFamilies(): Promise<ApiResponse<ClauseFamilyGroup[]>>;
export declare function getClauseById(id: string): Promise<ApiResponse<Clause>>;
export declare function searchClauses(query: string): Promise<ApiResponse<Clause[]>>;
export declare function uploadDocument(file: File): Promise<ApiResponse<any>>;
export declare function analyzeDocument(documentId: string): Promise<ApiResponse<any>>;
export {};
