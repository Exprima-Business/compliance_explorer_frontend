import type { Clause, ClauseFamily } from '../types/clause';
export declare function fetchClauses(): Promise<Clause[]>;
export declare function getClausesByFamily(familyName: string): Promise<Clause[]>;
export declare function getClauseFamilies(): Promise<ClauseFamily[]>;
