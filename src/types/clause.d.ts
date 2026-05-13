export type RiskClassification = 'HIGH' | 'MEDIUM' | 'LOW';
export interface ClauseFamily {
    id: string;
    name: string;
    description?: string;
}
/**
 * Application-layer clause shape. Mirrors the backend `Clause` domain type
 * produced by `transformClauseRow()` — every read from the API can be
 * relied on to come back in this exact camelCase shape.
 */
export interface Clause {
    id: string;
    /**
     * Human-readable reference such as "DFARS 252.204-7012".
     */
    clauseCode: string;
    title: string;
    description: string;
    content: string;
    intent: string;
    status: string;
    /** Backend column: clause_category. Renamed at the boundary. */
    clauseCategory: string;
    family: ClauseFamily | null;
    familyId: string;
    conditions: string;
    implementationGuidance: string;
    assessmentMethod: string;
    riskClassification: RiskClassification;
    referenceUrl: string;
    metadata: Record<string, any> | null;
    isBookmarked: boolean;
    createdAt: string;
    updatedAt: string;
    createdBy: string | null;
    updatedBy: string | null;
    embeddingVector: string | null;
}
export interface ClauseFamilyGroup {
    id: string;
    name: string;
    family: ClauseFamily;
    clauses: Clause[];
}
export interface MatrixRow {
    id: string;
    clauseId: string;
    title: string;
    description: string;
    intent: string;
    status: string;
    category: string;
    family: ClauseFamily | null;
    conditions: string;
    implementationGuidance: string;
    assessmentMethod: string;
    riskClassification: RiskClassification;
    referenceUrl?: string;
}
export interface ClauseFamilyData {
    name: ClauseFamily;
    clauses: string[];
}
export interface ClauseData {
    clauses: Clause[];
    families: ClauseFamilyData[];
}
