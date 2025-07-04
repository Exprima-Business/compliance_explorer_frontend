import { dlog } from './debugLog';

export interface ConnectionConfig {
  keepAliveInterval: number;
  maxReconnectAttempts: number;
  initialReconnectDelay: number;
  maxReconnectDelay: number;
  enableKeepAlive: boolean;
  enableSystemEvents: boolean;
}

export const DEFAULT_CONNECTION_CONFIG: ConnectionConfig = {
  keepAliveInterval: 30000, // 30 seconds
  maxReconnectAttempts: 5,
  initialReconnectDelay: 1000, // 1 second
  maxReconnectDelay: 30000, // 30 seconds
  enableKeepAlive: true,
  enableSystemEvents: true
};

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

export interface ConnectionState {
  status: ConnectionStatus;
  lastConnected?: Date;
  lastError?: string;
  reconnectAttempts: number;
  isReconnecting: boolean;
}

export class ConnectionMonitor {
  private config: ConnectionConfig;
  private state: ConnectionState;
  private keepAliveInterval?: NodeJS.Timeout;
  private reconnectTimeout?: NodeJS.Timeout;
  private eventListeners: Map<string, () => void> = new Map();

  constructor(config: Partial<ConnectionConfig> = {}) {
    this.config = { ...DEFAULT_CONNECTION_CONFIG, ...config };
    this.state = {
      status: 'disconnected',
      reconnectAttempts: 0,
      isReconnecting: false
    };
  }

  public getState(): ConnectionState {
    return { ...this.state };
  }

  public getStatus(): ConnectionStatus {
    return this.state.status;
  }

  public onStatusChange(callback: (status: ConnectionStatus) => void): () => void {
    const listener = () => callback(this.state.status);
    this.eventListeners.set(`status_${Date.now()}`, listener);
    return () => {
      this.eventListeners.delete(`status_${Date.now()}`);
    };
  }

  public setStatus(status: ConnectionStatus, error?: string): void {
    const previousStatus = this.state.status;
    this.state.status = status;
    
    if (status === 'connected') {
      this.state.lastConnected = new Date();
      this.state.reconnectAttempts = 0;
      this.state.isReconnecting = false;
      this.state.lastError = undefined;
      this.startKeepAlive();
    } else if (status === 'error') {
      this.state.lastError = error;
      this.stopKeepAlive();
    } else if (status === 'disconnected') {
      this.stopKeepAlive();
    }

    dlog('Connection status changed:', {
      from: previousStatus,
      to: status,
      error,
      reconnectAttempts: this.state.reconnectAttempts
    });

    // Notify listeners
    this.eventListeners.forEach(listener => listener());
  }

  public startKeepAlive(): void {
    if (!this.config.enableKeepAlive) return;
    
    this.stopKeepAlive();
    
    this.keepAliveInterval = setInterval(() => {
      dlog('Sending keep-alive ping');
      this.sendKeepAlive();
    }, this.config.keepAliveInterval);
    
    dlog('Keep-alive started with interval:', this.config.keepAliveInterval);
  }

  public stopKeepAlive(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = undefined;
      dlog('Keep-alive stopped');
    }
  }

  public sendKeepAlive(): void {
    // This should be implemented by the specific connection handler
    // (e.g., Supabase channel)
    dlog('Keep-alive ping sent');
  }

  public attemptReconnect(): boolean {
    if (this.state.isReconnecting) {
      dlog('Reconnection already in progress, skipping');
      return false;
    }

    if (this.state.reconnectAttempts >= this.config.maxReconnectAttempts) {
      dlog('Max reconnection attempts reached, giving up');
      this.setStatus('error', 'Max reconnection attempts reached');
      return false;
    }

    this.state.isReconnecting = true;
    this.state.reconnectAttempts++;
    
    const delay = Math.min(
      this.config.initialReconnectDelay * Math.pow(2, this.state.reconnectAttempts - 1),
      this.config.maxReconnectDelay
    );

    dlog(`Scheduling reconnection attempt ${this.state.reconnectAttempts}/${this.config.maxReconnectAttempts} in ${delay}ms`);

    this.reconnectTimeout = setTimeout(() => {
      this.state.isReconnecting = false;
      this.setStatus('connecting');
      // The actual reconnection logic should be implemented by the caller
    }, delay);

    return true;
  }

  public cancelReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = undefined;
      this.state.isReconnecting = false;
      dlog('Reconnection cancelled');
    }
  }

  public setupSystemEvents(): void {
    if (!this.config.enableSystemEvents) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        dlog('Page became visible, checking connection');
        this.handleSystemEvent('visibility_change');
      }
    };

    const handleOnline = () => {
      dlog('Network came online');
      this.handleSystemEvent('online');
    };

    const handleFocus = () => {
      dlog('Window gained focus');
      this.handleSystemEvent('focus');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('focus', handleFocus);

    dlog('System event listeners attached');
  }

  public cleanup(): void {
    this.stopKeepAlive();
    this.cancelReconnect();
    
    // Remove system event listeners
    document.removeEventListener('visibilitychange', () => {});
    window.removeEventListener('online', () => {});
    window.removeEventListener('focus', () => {});
    
    this.eventListeners.clear();
    
    dlog('Connection monitor cleaned up');
  }

  private handleSystemEvent(eventType: string): void {
    if (this.state.status === 'disconnected' || this.state.status === 'error') {
      dlog(`Reconnecting due to system event: ${eventType}`);
      this.attemptReconnect();
    }
  }
}

// Export a singleton instance for global use
export const globalConnectionMonitor = new ConnectionMonitor(); 