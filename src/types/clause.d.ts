export interface Clause {
    id: string;
    clauseId: string;
    title: string;
    description: string;
    intent: string;
    status: string;
    category: string;
    family: string;
    conditions: string;
    implementationGuidance: string;
    assessmentMethod: string;
    riskClassification: string;
    referenceUrl: string;
    metadata: {
        penalties: string;
        reciprocity: string;
        last_updated: string;
    };
    parentClause: string;
    siblings: string[];
    relationships: {
        clauseId: string;
        type: string;
    }[];
}
export interface ClauseFamily {
    name: string;
    clauses: string[];
}
export interface ClauseData {
    clauses: Clause[];
    families: ClauseFamily[];
}
export interface ClauseNode extends Clause {
    x?: number;
    y?: number;
    children?: ClauseNode[];
    parent?: ClauseNode;
}
