import type { WebSocketMessage, WebSocketPerformanceMetrics } from '../../types/projectCreation';
export declare class EnhancedWebSocketService {
    private projectId;
    private onMessage;
    private onError;
    private wsUrl?;
    private ws;
    private reconnectAttempts;
    private maxReconnectAttempts;
    private reconnectDelay;
    private messageQueue;
    private isConnected;
    private heartbeatInterval;
    private performanceMetrics;
    private connectionStartTime;
    private messageCount;
    private errorCount;
    constructor(projectId: string, onMessage: (message: WebSocketMessage) => void, onError: (error: Error) => void, wsUrl?: string | undefined);
    connect(): void;
    send(message: WebSocketMessage): void;
    private handleMessage;
    private handleHeartbeatResponse;
    private attemptReconnect;
    private processMessageQueue;
    private startHeartbeat;
    private stopHeartbeat;
    private updatePerformanceMetrics;
    getPerformanceMetrics(): WebSocketPerformanceMetrics;
    getConnectionStatus(): {
        connected: boolean;
        readyState: number;
        reconnectAttempts: number;
        queuedMessages: number;
    };
    disconnect(): void;
    cleanup(): void;
}
