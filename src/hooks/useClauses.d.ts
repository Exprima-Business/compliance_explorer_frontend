import type { Clause, ClauseFamily, ClauseFamilyGroup } from '../types/clause';
export declare function useClauses(): {
    clauses: Clause[];
    families: ClauseFamilyGroup[];
    loading: boolean;
    error: string | null;
    fetchClausesByFamily: (family: ClauseFamily) => Promise<void>;
    searchClauses: (query: string) => Promise<void>;
    selectFamily: (family: ClauseFamily | null) => void;
    bookmarkClause: (clauseId: string) => Promise<void>;
};
