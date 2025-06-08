export type RiskClassification = 'HIGH' | 'MEDIUM' | 'LOW';

export type ClauseFamily = 'DFARS' | 'FIPS' | 'NIST' | 'FAR' | 'OMB' | 'PRIVACY' | 'HSPD';

export interface ClauseRelationship {
  id: string;
  clauseId: string;
  relatedClauseId: string;
  relationshipType: 'PARENT' | 'SIBLING';
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
  conditions: string[];
  implementationGuidance: string;
  assessmentMethod: string;
  riskClassification: RiskClassification;
  referenceUrl?: string;
  metadata: Record<string, any>;
  relationships: ClauseRelationship[];
  parentClause?: string;
  isBookmarked?: boolean;
}

export interface ClauseFamilyGroup {
  family: ClauseFamily;
  clauses: Clause[];
}

export interface ApiResponse<T> {
  data: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
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