// Enhanced WebSocket Service with Message Ordering and Error Handling
import type { WebSocketMessage, OrderedWebSocketMessage, WebSocketPerformanceMetrics } from '../../types/projectCreation';
import environment from '../../config/environment';

export class EnhancedWebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private messageQueue: WebSocketMessage[] = [];
  private isConnected = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private performanceMetrics: WebSocketPerformanceMetrics = {
    latency: 0,
    messageRate: 0,
    errorRate: 0,
    connectionUptime: 0
  };
  private connectionStartTime: number = 0;
  private messageCount = 0;
  private errorCount = 0;

  constructor(
    private projectId: string,
    private onMessage: (message: WebSocketMessage) => void,
    private onError: (error: Error) => void,
    private wsUrl?: string
  ) {
    this.wsUrl = wsUrl || `${environment.api.url.replace('http', 'ws')}/projects/${projectId}`;
  }

  // Connect to WebSocket
  connect(): void {
    try {
      console.log('[WebSocket] Connecting to:', this.wsUrl);
      this.ws = new WebSocket(this.wsUrl!);
      this.connectionStartTime = Date.now();
      
      this.ws.onopen = () => {
        console.log('[WebSocket] Connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.processMessageQueue();
        this.updatePerformanceMetrics();
      };
      
      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
          this.messageCount++;
          this.updatePerformanceMetrics();
        } catch (error) {
          console.error('[WebSocket] Failed to parse message:', error);
          this.errorCount++;
          this.onError(new Error('Failed to parse WebSocket message'));
        }
      };
      
      this.ws.onclose = (event) => {
        console.log('[WebSocket] Disconnected:', event.code, event.reason);
        this.isConnected = false;
        this.stopHeartbeat();
        this.updatePerformanceMetrics();
        
        // Only attempt reconnect if not a clean close
        if (event.code !== 1000) {
          this.attemptReconnect();
        }
      };
      
      this.ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        this.errorCount++;
        this.onError(new Error('WebSocket connection error'));
        this.updatePerformanceMetrics();
      };
      
    } catch (error) {
      console.error('[WebSocket] Failed to connect:', error);
      this.onError(error as Error);
    }
  }

  // Send message with queuing
  send(message: WebSocketMessage): void {
    if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
        this.messageCount++;
        this.updatePerformanceMetrics();
      } catch (error) {
        console.error('[WebSocket] Failed to send message:', error);
        this.errorCount++;
        this.messageQueue.push(message);
        this.onError(new Error('Failed to send WebSocket message'));
      }
    } else {
      console.log('[WebSocket] Queueing message (not connected):', message);
      this.messageQueue.push(message);
    }
  }

  // Handle incoming messages
  private handleMessage(message: WebSocketMessage): void {
    // Handle different message types
    switch (message.type) {
      case 'project_update':
        this.onMessage(message);
        break;
      case 'project_created':
        this.onMessage(message);
        break;
      case 'project_creation_failed':
        this.onError(new Error(message.data.error));
        break;
      case 'heartbeat':
        // Handle heartbeat response
        this.handleHeartbeatResponse(message);
        break;
      case 'state_update':
        this.onMessage(message);
        break;
      default:
        console.warn('[WebSocket] Unknown message type:', message.type);
        this.onMessage(message);
    }
  }

  // Handle heartbeat response
  private handleHeartbeatResponse(message: WebSocketMessage): void {
    if (message.data && message.data.timestamp) {
      const latency = Date.now() - message.data.timestamp;
      this.performanceMetrics.latency = latency;
    }
  }

  // Attempt reconnection with exponential backoff
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocket] Max reconnection attempts reached');
      this.onError(new Error('WebSocket connection failed after maximum retry attempts'));
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`[WebSocket] Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  // Process queued messages
  private processMessageQueue(): void {
    console.log(`[WebSocket] Processing ${this.messageQueue.length} queued messages`);
    
    while (this.messageQueue.length > 0 && this.isConnected) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message);
      }
    }
  }

  // Start heartbeat
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.send({ 
          type: 'heartbeat', 
          data: { timestamp: Date.now() } 
        });
      }
    }, 30000); // 30 seconds
  }

  // Stop heartbeat
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Update performance metrics
  private updatePerformanceMetrics(): void {
    const now = Date.now();
    this.performanceMetrics.connectionUptime = this.connectionStartTime ? now - this.connectionStartTime : 0;
    this.performanceMetrics.messageRate = this.messageCount / Math.max(this.performanceMetrics.connectionUptime / 1000, 1);
    this.performanceMetrics.errorRate = this.errorCount / Math.max(this.messageCount, 1);
  }

  // Get performance metrics
  getPerformanceMetrics(): WebSocketPerformanceMetrics {
    this.updatePerformanceMetrics();
    return { ...this.performanceMetrics };
  }

  // Get connection status
  getConnectionStatus(): {
    connected: boolean;
    readyState: number;
    reconnectAttempts: number;
    queuedMessages: number;
  } {
    return {
      connected: this.isConnected,
      readyState: this.ws?.readyState || WebSocket.CLOSED,
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length
    };
  }

  // Disconnect
  disconnect(): void {
    console.log('[WebSocket] Disconnecting...');
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this.isConnected = false;
    this.messageQueue = [];
    this.reconnectAttempts = 0;
  }

  // Cleanup
  cleanup(): void {
    this.disconnect();
  }
}
