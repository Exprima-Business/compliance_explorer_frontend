import React from 'react';
import type { Clause, ClauseFamily, ClauseFamilyGroup } from '../types/clause';
export interface ClauseContextValue {
    clauses: Clause[];
    families: ClauseFamilyGroup[];
    loading: boolean;
    error: string | null;
    bookmarkClause: (clauseId: string) => Promise<void>;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    selectedFamily: ClauseFamily | null;
    setSelectedFamily: (family: ClauseFamily | null) => void;
}
export declare const ClauseProvider: React.FC<{
    children: React.ReactNode;
}>;
export declare const useClause: () => ClauseContextValue;
