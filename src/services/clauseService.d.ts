import type { Clause, ClauseFamily } from '../types/clause';
export declare const fetchClauses: () => Promise<Clause[]>;
export declare const searchClauses: (query: string) => Promise<Clause[]>;
export declare const getClauseById: (clauseId: string) => Promise<Clause | undefined>;
export declare const getRelatedClauses: (clauseId: string) => Promise<Clause[]>;
export declare const getClausesByFamily: (family: string) => Promise<Clause[]>;
export declare const getClauseFamilies: () => Promise<ClauseFamily[]>;
