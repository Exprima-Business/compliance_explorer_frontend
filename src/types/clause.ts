export type RiskClassification = 'HIGH' | 'MEDIUM' | 'LOW';

export interface ClauseFamily {
  id: string;
  name: string;
  description?: string;
}

export interface ClauseRelationship {
  id: string;
  sourceClauseId: string;
  targetClauseId: string;
  type: string;
  description?: string;
}

export interface Clause {
  id: string;
  /**
   * Human-readable reference such as "DFARS 252.204-7012".
   * Renamed from `clauseId` to avoid confusion with the primary-key UUID.
   */
  clauseCode: string;
  /**
   * @deprecated Temporary alias during migration; will be removed.
   */
  clauseId?: string;
  title: string;
  description: string;
  content: string;
  intent: string;
  status: string;
  category: string;
  family: ClauseFamily | null;
  familyId: string;
  conditions: string;
  implementationGuidance: string;
  assessmentMethod: string;
  riskClassification: RiskClassification;
  referenceUrl?: string;
  metadata: Record<string, any>;
  relationships: ClauseRelationship[];
  parentClause?: string;
  siblings?: string[];
  created_at: string;
  updated_at: string;
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

export interface ClauseNode extends Clause {
  x?: number;
  y?: number;
  children?: ClauseNode[];
  parent?: ClauseNode;
}

export interface GraphNode {
  id: string;
  name: string;
  clauseId?: string;
  title?: string;
  riskClassification?: string;
  category?: string;
  val: number;
  color?: string;
  family?: ClauseFamily;
}

export interface GraphEdge {
  source: string;
  target: string;
  value: number;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphEdge[];
  edges?: never; // deprecated
} 