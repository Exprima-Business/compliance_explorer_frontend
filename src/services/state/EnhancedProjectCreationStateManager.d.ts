import type { ProjectCreationState, StateSnapshot, StateChangeListener, CreateProjectRequest } from '../../types/projectCreation';
export declare class EnhancedProjectCreationStateManager {
    private projectId;
    private state;
    private websocketService;
    private stateHistory;
    private listeners;
    private apiBaseUrl;
    constructor(projectId: string);
    initialize(): Promise<void>;
    createProjectFromScan(request: CreateProjectRequest): Promise<void>;
    loadValidationPreview(scanId: string): Promise<any>;
    private handleWebSocketMessage;
    private handleWebSocketError;
    private handleStateUpdate;
    private updateState;
    addStateChangeListener(listener: StateChangeListener): void;
    removeStateChangeListener(listener: StateChangeListener): void;
    getState(): ProjectCreationState;
    getStateHistory(): StateSnapshot[];
    getWebSocketMetrics(): any;
    getWebSocketStatus(): any;
    private loadInitialState;
    private getAuthToken;
    reset(): void;
    cleanup(): void;
}
