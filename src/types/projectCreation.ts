// Project Creation Types and Interfaces

export interface CreateProjectRequest {
  scanId: string;
  projectName: string;
  description?: string;
  options: ProjectOptions;
}

export interface ProjectOptions {
  validateAgainstDatabase: boolean;
  includeAllClauses: boolean;
  minConfidence: number;
  clauseFilter?: string[];
  createBookmarks: boolean;
  bookmarkStatus: 'DETECTED' | 'VALIDATED' | 'MANUAL';
}

export interface CreateProjectResponse {
  project: Project;
  clausesCreated: number;
  validationResults: ClauseResult[];
  metadata: ProjectCreationMetadata;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  sourceScanId: string;
  createdAt: string;
  organizationId: string;
}

export interface ClauseResult {
  clauseId: string;
  status: 'SUCCESS' | 'WARNING' | 'ERROR';
  message: string;
  confidence: number;
}

export interface ProjectCreationMetadata {
  processingTime: number;
  totalClauses: number;
  validatedClauses: number;
  missingClauses: number;
}

export interface ValidationResult {
  totalClauses: number;
  validatedClauses: number;
  missingClauses: number;
  confidenceDistribution: {
    high: number;
    medium: number;
    low: number;
  };
  recommendations: string[];
  clauseBreakdown: ClauseValidation[];
  estimatedProcessingTime: number;
}

export interface ClauseValidation {
  clauseId: string;
  title: string;
  confidence: number;
  validationStatus: 'VALIDATED' | 'MISSING' | 'PARTIAL_MATCH';
  recommendation: string;
}

export interface Clause {
  id: string;
  clauseCode: string;
  title: string;
  description: string;
  status: 'DETECTED' | 'VALIDATED' | 'MANUAL';
  confidence?: number;
  locations?: string[];
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

export interface MatrixDataResponse {
  clauses: Clause[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  metadata: {
    totalClauses: number;
    validatedClauses: number;
    missingClauses: number;
  };
}

// WebSocket Types
export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp?: number;
  id?: string;
  sequence?: number;
}

export interface OrderedWebSocketMessage extends WebSocketMessage {
  sequence: number;
  id: string;
}

export interface ProjectUpdate {
  type: 'project_update' | 'project_created' | 'project_creation_failed';
  data: any;
  timestamp: number;
}

// State Management Types
export interface ProjectCreationState {
  status: 'idle' | 'creating' | 'completed' | 'error';
  progress: number;
  message: string;
  error: string | null;
  project: Project | null;
  validationResults: ValidationResult | null;
  websocketConnected: boolean;
}

export interface StateSnapshot {
  timestamp: number;
  state: ProjectCreationState;
  changes: Partial<ProjectCreationState>;
}

export type StateChangeListener = (newState: ProjectCreationState, previousState: ProjectCreationState) => void;

// Performance Monitoring Types
export interface WebSocketPerformanceMetrics {
  latency: number;
  messageRate: number;
  errorRate: number;
  connectionUptime: number;
}

export interface StateUpdatePerformanceMetrics {
  updateTime: number;
  queueSize: number;
  processingTime: number;
}

export interface APIPerformanceMetrics {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  success: boolean;
}

export interface UserInteractionPerformanceMetrics {
  action: string;
  component: string;
  responseTime: number;
  success: boolean;
}

export interface FrontendMetrics {
  type: string;
  projectId?: string;
  timestamp: number;
  data: any;
}

export interface CorrelatedMetrics {
  projectId: string;
  timeRange: number;
  frontendMetrics: FrontendMetrics[];
  backendMetrics: any[];
  correlated: {
    websocketLatency: number;
    stateUpdateTime: number;
    errorRate: number;
  };
  insights: PerformanceInsights[];
}

export interface PerformanceInsights {
  type: 'performance_warning' | 'error_warning' | 'optimization_suggestion';
  severity: 'low' | 'medium' | 'high';
  message: string;
  recommendation: string;
}

// Error Handling Types
export interface ErrorRecord {
  id: string;
  timestamp: number;
  type: string;
  error: any;
  context: ErrorContext;
  severity: ErrorSeverity;
  retryable: boolean;
}

export interface ErrorContext {
  component: string;
  action: string;
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: any;
}

export type ErrorSeverity = 'low' | 'medium' | 'high';

export interface RetryStrategy {
  maxAttempts: number;
  baseDelay: number;
  retryFunction: (errorRecord: ErrorRecord) => Promise<any>;
}

export interface RecoveryAction {
  recoveryFunction: (errorRecord: ErrorRecord) => void;
}

export interface APIError {
  message: string;
  status: number;
  statusText: string;
}

export interface WebSocketError {
  message: string;
  code?: number;
  reason?: string;
}

export interface StateSyncError {
  message: string;
  conflictType: 'version' | 'data' | 'permission';
  clientVersion?: number;
  serverVersion?: number;
}

export interface StateUpdateResult {
  success: boolean;
  version: number;
  updates: any;
  conflictResolution?: boolean;
}
