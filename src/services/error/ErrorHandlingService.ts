// Comprehensive Error Handling Service
import { 
  ErrorRecord, 
  ErrorContext, 
  ErrorSeverity, 
  RetryStrategy, 
  RecoveryAction,
  APIError,
  WebSocketError,
  StateSyncError
} from '../../types/projectCreation';
import { getPerformanceMonitoringService } from '../monitoring/FrontendPerformanceMonitoringService';

export class ErrorHandlingService {
  private errorHistory: ErrorRecord[] = [];
  private retryStrategies: Map<string, RetryStrategy> = new Map();
  private recoveryActions: Map<string, RecoveryAction> = new Map();
  private performanceMonitoring = getPerformanceMonitoringService();

  constructor() {
    this.setupGlobalErrorHandlers();
    this.initializeRetryStrategies();
    this.initializeRecoveryActions();
  }

  // Handle API errors
  handleAPIError(error: APIError, context: ErrorContext): void {
    const errorRecord: ErrorRecord = {
      id: this.generateErrorId(),
      timestamp: Date.now(),
      type: 'api_error',
      error: error,
      context: context,
      severity: this.determineSeverity(error),
      retryable: this.isRetryable(error)
    };

    this.logError(errorRecord);
    this.performanceMonitoring.trackErrorPerformance(
      new Error(error.message), 
      context.action, 
      context.component
    );

    if (errorRecord.retryable) {
      this.attemptRetry(errorRecord);
    } else {
      this.executeRecoveryAction(errorRecord);
    }
  }

  // Handle WebSocket errors
  handleWebSocketError(error: WebSocketError, context: ErrorContext): void {
    const errorRecord: ErrorRecord = {
      id: this.generateErrorId(),
      timestamp: Date.now(),
      type: 'websocket_error',
      error: error,
      context: context,
      severity: this.determineSeverity(error),
      retryable: this.isRetryable(error)
    };

    this.logError(errorRecord);
    this.performanceMonitoring.trackErrorPerformance(
      new Error(error.message), 
      context.action, 
      context.component
    );

    if (errorRecord.retryable) {
      this.attemptRetry(errorRecord);
    } else {
      this.executeRecoveryAction(errorRecord);
    }
  }

  // Handle state synchronization errors
  handleStateSyncError(error: StateSyncError, context: ErrorContext): void {
    const errorRecord: ErrorRecord = {
      id: this.generateErrorId(),
      timestamp: Date.now(),
      type: 'state_sync_error',
      error: error,
      context: context,
      severity: this.determineSeverity(error),
      retryable: this.isRetryable(error)
    };

    this.logError(errorRecord);
    this.performanceMonitoring.trackErrorPerformance(
      new Error(error.message), 
      context.action, 
      context.component
    );

    if (errorRecord.retryable) {
      this.attemptRetry(errorRecord);
    } else {
      this.executeRecoveryAction(errorRecord);
    }
  }

  // Handle generic errors
  handleGenericError(error: Error, context: ErrorContext): void {
    const errorRecord: ErrorRecord = {
      id: this.generateErrorId(),
      timestamp: Date.now(),
      type: 'generic_error',
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      context: context,
      severity: this.determineSeverity(error),
      retryable: false
    };

    this.logError(errorRecord);
    this.performanceMonitoring.trackErrorPerformance(error, context.action, context.component);
    this.executeRecoveryAction(errorRecord);
  }

  // Attempt retry with exponential backoff
  private async attemptRetry(errorRecord: ErrorRecord): Promise<void> {
    const strategy = this.retryStrategies.get(errorRecord.type);
    if (!strategy) {
      console.warn(`[ErrorHandling] No retry strategy found for error type: ${errorRecord.type}`);
      this.executeRecoveryAction(errorRecord);
      return;
    }

    let attempt = 0;
    const maxAttempts = strategy.maxAttempts;

    console.log(`[ErrorHandling] Starting retry for error ${errorRecord.id} (${errorRecord.type})`);

    while (attempt < maxAttempts) {
      attempt++;
      const delay = strategy.baseDelay * Math.pow(2, attempt - 1);

      console.log(`[ErrorHandling] Retry attempt ${attempt}/${maxAttempts} for error ${errorRecord.id} in ${delay}ms`);

      await new Promise(resolve => setTimeout(resolve, delay));

      try {
        await strategy.retryFunction(errorRecord);
        console.log(`[ErrorHandling] Retry successful for error ${errorRecord.id}`);
        return;
      } catch (retryError) {
        console.warn(`[ErrorHandling] Retry ${attempt}/${maxAttempts} failed for error ${errorRecord.id}:`, retryError);
        
        if (attempt === maxAttempts) {
          console.error(`[ErrorHandling] All retry attempts failed for error ${errorRecord.id}`);
          this.executeRecoveryAction(errorRecord);
        }
      }
    }
  }

  // Execute recovery action
  private executeRecoveryAction(errorRecord: ErrorRecord): void {
    const action = this.recoveryActions.get(errorRecord.type);
    if (!action) {
      console.warn(`[ErrorHandling] No recovery action found for error type: ${errorRecord.type}`);
      this.showGenericErrorMessage(errorRecord);
      return;
    }

    try {
      action.recoveryFunction(errorRecord);
      console.log(`[ErrorHandling] Recovery action executed for error ${errorRecord.id}`);
    } catch (recoveryError) {
      console.error(`[ErrorHandling] Recovery action failed for error ${errorRecord.id}:`, recoveryError);
      this.showGenericErrorMessage(errorRecord);
    }
  }

  // Setup global error handlers
  private setupGlobalErrorHandlers(): void {
    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleAPIError({
        message: event.reason?.message || 'Unhandled promise rejection',
        status: 0,
        statusText: 'Unknown'
      }, {
        component: 'global',
        action: 'unhandled_promise_rejection'
      });
    });

    // Global JavaScript errors
    window.addEventListener('error', (event) => {
      this.handleGenericError(
        new Error(event.error?.message || 'Global JavaScript error'),
        {
          component: 'global',
          action: 'global_error'
        }
      );
    });
  }

  // Initialize retry strategies
  private initializeRetryStrategies(): void {
    this.retryStrategies.set('api_error', {
      maxAttempts: 3,
      baseDelay: 1000,
      retryFunction: async (errorRecord) => {
        const context = errorRecord.context;
        if (!context.url || !context.method) {
          throw new Error('Missing URL or method for API retry');
        }

        const response = await fetch(context.url, {
          method: context.method,
          headers: context.headers || {},
          body: context.body
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }
    });

    this.retryStrategies.set('websocket_error', {
      maxAttempts: 5,
      baseDelay: 2000,
      retryFunction: async (errorRecord) => {
        const context = errorRecord.context;
        if (!context.url) {
          throw new Error('Missing URL for WebSocket retry');
        }

        return new Promise((resolve, reject) => {
          const ws = new WebSocket(context.url!);
          const timeout = setTimeout(() => {
            ws.close();
            reject(new Error('WebSocket connection timeout'));
          }, 10000);

          ws.onopen = () => {
            clearTimeout(timeout);
            resolve(ws);
          };
          
          ws.onerror = (error) => {
            clearTimeout(timeout);
            reject(error);
          };
        });
      }
    });

    this.retryStrategies.set('state_sync_error', {
      maxAttempts: 2,
      baseDelay: 500,
      retryFunction: async (errorRecord) => {
        // For state sync errors, we typically just need to retry the sync operation
        // This would be implemented based on your specific state management system
        console.log(`[ErrorHandling] Retrying state sync for error ${errorRecord.id}`);
        // Implementation would depend on your state management system
      }
    });
  }

  // Initialize recovery actions
  private initializeRecoveryActions(): void {
    this.recoveryActions.set('api_error', {
      recoveryFunction: (errorRecord) => {
        this.showErrorMessage('API request failed. Please try again.');
        
        // Log error for debugging
        console.error('API Error:', errorRecord);
      }
    });

    this.recoveryActions.set('websocket_error', {
      recoveryFunction: (errorRecord) => {
        this.showErrorMessage('Connection lost. Attempting to reconnect...');
        
        // Attempt to reconnect after a delay
        setTimeout(() => {
          window.location.reload();
        }, 5000);
      }
    });

    this.recoveryActions.set('state_sync_error', {
      recoveryFunction: (errorRecord) => {
        this.showErrorMessage('State synchronization failed. Please refresh the page.');
        
        // Log error for debugging
        console.error('State Sync Error:', errorRecord);
      }
    });

    this.recoveryActions.set('generic_error', {
      recoveryFunction: (errorRecord) => {
        this.showErrorMessage('An unexpected error occurred. Please try again.');
        
        // Log error for debugging
        console.error('Generic Error:', errorRecord);
      }
    });
  }

  // Show error message to user
  private showErrorMessage(message: string): void {
    // Create a toast notification or modal
    const errorElement = document.createElement('div');
    errorElement.className = 'fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50 shadow-lg max-w-md';
    errorElement.innerHTML = `
      <div class="flex items-center">
        <svg class="h-5 w-5 text-red-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span class="text-sm font-medium">${message}</span>
      </div>
    `;
    
    document.body.appendChild(errorElement);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (document.body.contains(errorElement)) {
        document.body.removeChild(errorElement);
      }
    }, 5000);
  }

  // Show generic error message
  private showGenericErrorMessage(errorRecord: ErrorRecord): void {
    this.showErrorMessage('An error occurred. Please try again or contact support if the problem persists.');
  }

  // Generate unique error ID
  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Determine error severity
  private determineSeverity(error: any): ErrorSeverity {
    if (error.status >= 500) return 'high';
    if (error.status >= 400) return 'medium';
    if (error.message?.includes('network') || error.message?.includes('connection')) return 'high';
    return 'low';
  }

  // Check if error is retryable
  private isRetryable(error: any): boolean {
    if (error.status >= 500) return true; // Server errors
    if (error.status === 429) return true; // Rate limiting
    if (error.status === 408) return true; // Timeout
    if (error.message?.includes('network') || error.message?.includes('connection')) return true;
    return false;
  }

  // Log error
  private logError(errorRecord: ErrorRecord): void {
    this.errorHistory.push(errorRecord);
    
    // Keep only last 100 errors
    if (this.errorHistory.length > 100) {
      this.errorHistory = this.errorHistory.slice(-100);
    }
    
    console.error('[ErrorHandling]', errorRecord);
  }

  // Get error history
  getErrorHistory(): ErrorRecord[] {
    return [...this.errorHistory];
  }

  // Get error statistics
  getErrorStatistics(): {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    recent: number;
  } {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    const recent = this.errorHistory.filter(error => error.timestamp > oneHourAgo).length;
    
    const byType = this.errorHistory.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const bySeverity = this.errorHistory.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      total: this.errorHistory.length,
      byType,
      bySeverity,
      recent
    };
  }

  // Clear error history
  clearErrorHistory(): void {
    this.errorHistory = [];
  }
}

// Singleton instance
let errorHandlingInstance: ErrorHandlingService | null = null;

export const getErrorHandlingService = (): ErrorHandlingService => {
  if (!errorHandlingInstance) {
    errorHandlingInstance = new ErrorHandlingService();
  }
  return errorHandlingInstance;
};

// React hook for error handling
export const useErrorHandling = () => {
  const service = getErrorHandlingService();
  
  return {
    handleAPIError: service.handleAPIError.bind(service),
    handleWebSocketError: service.handleWebSocketError.bind(service),
    handleStateSyncError: service.handleStateSyncError.bind(service),
    handleGenericError: service.handleGenericError.bind(service),
    getErrorHistory: service.getErrorHistory.bind(service),
    getErrorStatistics: service.getErrorStatistics.bind(service),
    clearErrorHistory: service.clearErrorHistory.bind(service)
  };
};
