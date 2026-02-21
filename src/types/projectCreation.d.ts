export interface CreateProjectRequest {
    scanId: string;
    projectName: string;
    description?: string;
    options: ProjectOptions;
}
export interface ProjectOptions {
    projectName: string;
    description: string;
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
    title: string;
    confidence: number;
    status: 'CREATED' | 'SKIPPED' | 'ERROR';
    bookmarkId?: string;
    error?: string;
}
export interface ProjectCreationMetadata {
    processingTime: number;
    totalClauses: number;
    validatedClauses: number;
    missingClauses: number;
}
export interface ValidationPreviewResponse {
    scanId: string;
    totalClauses: number;
    validatedClauses: number;
    missingClauses: number;
    validationResults: ClauseValidation[];
    metadata: {
        processingTime: number;
        validationTimestamp: string;
    };
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
    clauseBreakdown: ClauseValidation[] | ClauseResult[];
    estimatedProcessingTime: number;
}
export interface ClauseValidation {
    clauseId: string;
    title: string;
    confidence: number;
    status: 'VALIDATED' | 'MISSING' | 'FUZZY_MATCH';
    matchType: 'EXACT' | 'FUZZY' | 'NONE';
    databaseClause?: {
        id: string;
        title: string;
        description: string;
    };
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
export interface ProjectCreationProgressMessage {
    type: 'project_creation_progress';
    data: {
        jobId: string;
        projectId: string;
        status: 'processing';
        progress: number;
        message: string;
        timestamp: string;
    };
}
export interface ProjectCreationCompleteMessage {
    type: 'project_creation_complete';
    data: {
        jobId: string;
        projectId: string;
        status: 'completed';
        progress: 100;
        message: string;
        clausesCreated: number;
        timestamp: string;
    };
}
export interface ProjectCreationErrorMessage {
    type: 'project_creation_error';
    data: {
        jobId: string;
        projectId: string;
        status: 'failed';
        error: string;
        timestamp: string;
    };
}
