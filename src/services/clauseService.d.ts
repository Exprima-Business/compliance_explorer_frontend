import type { Clause, ClauseFamily, ClauseFamilyGroup, ApiResponse, GraphData } from '../types/clause';
export declare const clauseService: {
    getAllClauses: () => Promise<ApiResponse<Clause[]>>;
    getGraphData: () => Promise<ApiResponse<GraphData>>;
    getClausesByFamily: (family: ClauseFamily) => Promise<ApiResponse<Clause[]>>;
    getClauseFamilies: () => Promise<ApiResponse<ClauseFamilyGroup[]>>;
    getClauseById: (id: string) => Promise<ApiResponse<Clause>>;
    searchClauses: (query: string) => Promise<ApiResponse<Clause[]>>;
    bookmarkClause: (clauseId: string) => Promise<ApiResponse<void>>;
};
