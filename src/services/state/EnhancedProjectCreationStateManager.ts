// Enhanced Project Creation State Manager with WebSocket Integration
import { 
  ProjectCreationState, 
  StateSnapshot, 
  StateChangeListener, 
  CreateProjectRequest, 
  CreateProjectResponse,
  WebSocketMessage,
  StateUpdateResult
} from '../../types/projectCreation';
import { EnhancedWebSocketService } from '../websocket/EnhancedWebSocketService';

export class EnhancedProjectCreationStateManager {
  private state: ProjectCreationState = {
    status: 'idle',
    progress: 0,
    message: '',
    error: null,
    project: null,
    validationResults: null,
    websocketConnected: false
  };
  
  private websocketService: EnhancedWebSocketService | null = null;
  private stateHistory: StateSnapshot[] = [];
  private listeners: StateChangeListener[] = [];
  private apiBaseUrl: string;

  constructor(private projectId: string) {
    this.apiBaseUrl = process.env.VITE_API_URL || 'http://localhost:3000';
  }

  // Initialize state manager
  async initialize(): Promise<void> {
    try {
      console.log('[StateManager] Initializing for project:', this.projectId);
      
      // Connect to WebSocket
      this.websocketService = new EnhancedWebSocketService(
        this.projectId,
        (message) => this.handleWebSocketMessage(message),
        (error) => this.handleWebSocketError(error)
      );
      
      this.websocketService.connect();
      
      // Load initial state
      await this.loadInitialState();
      
      this.updateState({ 
        websocketConnected: true,
        message: 'Connected to real-time updates'
      });
      
    } catch (error) {
      console.error('[StateManager] Initialization failed:', error);
      this.updateState({ 
        error: (error as Error).message, 
        status: 'error',
        websocketConnected: false
      });
    }
  }

  // Create project from scan
  async createProjectFromScan(request: CreateProjectRequest): Promise<void> {
    try {
      console.log('[StateManager] Starting project creation:', request);
      
      this.updateState({ 
        status: 'creating', 
        progress: 0, 
        message: 'Starting project creation...',
        error: null
      });
      
      // Send creation request
      const response = await fetch(`${this.apiBaseUrl}/api/projects/create-from-scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(request)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }
      
      const result: CreateProjectResponse = await response.json();
      
      this.updateState({
        status: 'completed',
        progress: 100,
        message: 'Project created successfully',
        project: result.project,
        validationResults: {
          totalClauses: result.metadata.totalClauses,
          validatedClauses: result.metadata.validatedClauses,
          missingClauses: result.metadata.missingClauses,
          confidenceDistribution: { high: 0, medium: 0, low: 0 },
          recommendations: [],
          clauseBreakdown: result.validationResults,
          estimatedProcessingTime: result.metadata.processingTime
        }
      });
      
      console.log('[StateManager] Project creation completed:', result.project);
      
    } catch (error) {
      console.error('[StateManager] Project creation failed:', error);
      this.updateState({
        status: 'error',
        error: (error as Error).message,
        message: 'Project creation failed'
      });
    }
  }

  // Load validation preview
  async loadValidationPreview(scanId: string): Promise<any> {
    try {
      console.log('[StateManager] Loading validation preview for scan:', scanId);
      
      const response = await fetch(`${this.apiBaseUrl}/api/scans/${scanId}/validation-preview`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }
      
      const validationResults = await response.json();
      
      this.updateState({
        validationResults: validationResults,
        message: 'Validation preview loaded'
      });
      
      return validationResults;
      
    } catch (error) {
      console.error('[StateManager] Failed to load validation preview:', error);
      this.updateState({
        error: (error as Error).message,
        message: 'Failed to load validation preview'
      });
      throw error;
    }
  }

  // Handle WebSocket messages
  private handleWebSocketMessage(message: WebSocketMessage): void {
    console.log('[StateManager] Received WebSocket message:', message.type);
    
    switch (message.type) {
      case 'project_update':
        this.updateState({
          progress: message.data.progress || this.state.progress,
          message: message.data.message || this.state.message
        });
        break;
        
      case 'project_created':
        this.updateState({
          status: 'completed',
          progress: 100,
          message: 'Project created successfully',
          project: message.data.project,
          validationResults: message.data.validationResults
        });
        break;
        
      case 'project_creation_failed':
        this.updateState({
          status: 'error',
          error: message.data.error,
          message: 'Project creation failed'
        });
        break;
        
      case 'state_update':
        this.handleStateUpdate(message.data);
        break;
        
      default:
        console.warn('[StateManager] Unknown WebSocket message type:', message.type);
    }
  }

  // Handle WebSocket errors
  private handleWebSocketError(error: Error): void {
    console.error('[StateManager] WebSocket error:', error);
    this.updateState({
      websocketConnected: false,
      error: error.message
    });
  }

  // Handle state updates from server
  private handleStateUpdate(updateData: StateUpdateResult): void {
    if (updateData.success) {
      this.updateState({
        progress: updateData.updates.progress || this.state.progress,
        message: updateData.updates.message || this.state.message
      });
    } else {
      this.updateState({
        error: 'State synchronization failed',
        message: 'Failed to sync with server state'
      });
    }
  }

  // Update state with history tracking
  private updateState(updates: Partial<ProjectCreationState>): void {
    const previousState = { ...this.state };
    this.state = { ...this.state, ...updates };
    
    // Store state snapshot
    this.stateHistory.push({
      timestamp: Date.now(),
      state: { ...this.state },
      changes: updates
    });
    
    // Keep only last 50 state snapshots
    if (this.stateHistory.length > 50) {
      this.stateHistory = this.stateHistory.slice(-50);
    }
    
    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener(this.state, previousState);
      } catch (error) {
        console.error('[StateManager] Listener error:', error);
      }
    });
    
    console.log('[StateManager] State updated:', updates);
  }

  // Add state change listener
  addStateChangeListener(listener: StateChangeListener): void {
    this.listeners.push(listener);
  }

  // Remove state change listener
  removeStateChangeListener(listener: StateChangeListener): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  // Get current state
  getState(): ProjectCreationState {
    return { ...this.state };
  }

  // Get state history
  getStateHistory(): StateSnapshot[] {
    return [...this.stateHistory];
  }

  // Get WebSocket performance metrics
  getWebSocketMetrics(): any {
    return this.websocketService?.getPerformanceMetrics() || null;
  }

  // Get WebSocket connection status
  getWebSocketStatus(): any {
    return this.websocketService?.getConnectionStatus() || null;
  }

  // Load initial state
  private async loadInitialState(): Promise<void> {
    try {
      // Check if project already exists
      const response = await fetch(`${this.apiBaseUrl}/api/projects/${this.projectId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });
      
      if (response.ok) {
        const project = await response.json();
        this.updateState({
          project: project,
          status: 'completed',
          message: 'Project already exists'
        });
      }
    } catch (error) {
      // Project doesn't exist or other error - this is expected for new projects
      console.log('[StateManager] Project not found or error loading:', error);
    }
  }

  // Get authentication token
  private getAuthToken(): string {
    // This should be implemented based on your auth system
    // For now, return a placeholder
    return localStorage.getItem('auth_token') || '';
  }

  // Reset state
  reset(): void {
    this.state = {
      status: 'idle',
      progress: 0,
      message: '',
      error: null,
      project: null,
      validationResults: null,
      websocketConnected: this.websocketService ? true : false
    };
    
    this.stateHistory = [];
    
    // Notify listeners of reset
    this.listeners.forEach(listener => {
      try {
        listener(this.state, this.state);
      } catch (error) {
        console.error('[StateManager] Listener error during reset:', error);
      }
    });
  }

  // Cleanup
  cleanup(): void {
    console.log('[StateManager] Cleaning up...');
    
    if (this.websocketService) {
      this.websocketService.disconnect();
      this.websocketService = null;
    }
    
    this.listeners = [];
    this.stateHistory = [];
  }
}
