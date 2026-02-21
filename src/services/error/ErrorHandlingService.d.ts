import type { ErrorRecord, ErrorContext, APIError, WebSocketError, StateSyncError } from '../../types/projectCreation';
export declare class ErrorHandlingService {
    private errorHistory;
    private retryStrategies;
    private recoveryActions;
    private performanceMonitoring;
    constructor();
    handleAPIError(error: APIError, context: ErrorContext): void;
    handleWebSocketError(error: WebSocketError, context: ErrorContext): void;
    handleStateSyncError(error: StateSyncError, context: ErrorContext): void;
    handleGenericError(error: Error, context: ErrorContext): void;
    private attemptRetry;
    private executeRecoveryAction;
    private setupGlobalErrorHandlers;
    private initializeRetryStrategies;
    private initializeRecoveryActions;
    private showErrorMessage;
    private showGenericErrorMessage;
    private generateErrorId;
    private determineSeverity;
    private isRetryable;
    private logError;
    getErrorHistory(): ErrorRecord[];
    getErrorStatistics(): {
        total: number;
        byType: Record<string, number>;
        bySeverity: Record<string, number>;
        recent: number;
    };
    clearErrorHistory(): void;
}
export declare const getErrorHandlingService: () => ErrorHandlingService;
export declare const useErrorHandling: () => {
    handleAPIError: (error: APIError, context: ErrorContext) => void;
    handleWebSocketError: (error: WebSocketError, context: ErrorContext) => void;
    handleStateSyncError: (error: StateSyncError, context: ErrorContext) => void;
    handleGenericError: (error: Error, context: ErrorContext) => void;
    getErrorHistory: () => ErrorRecord[];
    getErrorStatistics: () => {
        total: number;
        byType: Record<string, number>;
        bySeverity: Record<string, number>;
        recent: number;
    };
    clearErrorHistory: () => void;
};
