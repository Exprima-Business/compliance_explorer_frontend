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
  description: string;
}

export interface Clause {
  id: string;
  clauseId: string;
  title: string;
  description: string;
  intent: string;
  status: string;
  category: string;
  family: ClauseFamily;
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
  isBookmarked?: boolean;
}

export interface ClauseFamilyGroup {
  family: ClauseFamily;
  clauses: Clause[];
}

export interface ApiResponse<T> {
  data: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface MatrixRow {
  id: string;
  clauseId: string;
  title: string;
  description: string;
  intent: string;
  status: string;
  category: string;
  family: ClauseFamily;
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
  label: string;
  title: string;
  group: string;
  category: string;
  riskLevel: RiskClassification;
  isBookmarked: boolean;
}

export interface GraphEdge {
  from: string;
  to: string;
  type: string;
  arrows: string;
  smooth: {
    type: string;
    roundness: number;
  };
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  clauses: Clause[];
} 