import type { Clause, ClauseFamily, ClauseFamilyGroup } from '../types/clause';
import type { ApiResponse } from '../types/api';
export declare const clauseService: {
    getAllClauses: () => Promise<ApiResponse<Clause[]>>;
    getClausesByFamily: (family: ClauseFamily) => Promise<ApiResponse<Clause[]>>;
    getClauseFamilies: () => Promise<ApiResponse<ClauseFamilyGroup[]>>;
    getClauseById: (id: string) => Promise<ApiResponse<Clause>>;
    searchClauses: (query: string) => Promise<ApiResponse<Clause[]>>;
    bookmarkClause: (clauseId: string) => Promise<ApiResponse<{
        id: string;
        isBookmarked: boolean;
    }>>;
};
