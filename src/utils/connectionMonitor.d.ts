export interface ConnectionConfig {
    keepAliveInterval: number;
    maxReconnectAttempts: number;
    initialReconnectDelay: number;
    maxReconnectDelay: number;
    enableKeepAlive: boolean;
    enableSystemEvents: boolean;
}
export declare const DEFAULT_CONNECTION_CONFIG: ConnectionConfig;
export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';
export interface ConnectionState {
    status: ConnectionStatus;
    lastConnected?: Date;
    lastError?: string;
    reconnectAttempts: number;
    isReconnecting: boolean;
}
export declare class ConnectionMonitor {
    private config;
    private state;
    private keepAliveInterval?;
    private reconnectTimeout?;
    private eventListeners;
    constructor(config?: Partial<ConnectionConfig>);
    getState(): ConnectionState;
    getStatus(): ConnectionStatus;
    onStatusChange(callback: (status: ConnectionStatus) => void): () => void;
    setStatus(status: ConnectionStatus, error?: string): void;
    startKeepAlive(): void;
    stopKeepAlive(): void;
    sendKeepAlive(): void;
    attemptReconnect(): boolean;
    cancelReconnect(): void;
    setupSystemEvents(): void;
    cleanup(): void;
    private handleSystemEvent;
}
export declare const globalConnectionMonitor: ConnectionMonitor;
