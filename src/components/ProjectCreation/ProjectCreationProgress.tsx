// Project Creation Progress Component
import React, { useState, useEffect } from 'react';
import type { ProjectCreationState } from '../../types/projectCreation';
import { EnhancedProjectCreationStateManager } from '../../services/state/EnhancedProjectCreationStateManager';

interface ProjectCreationProgressProps {
  stateManager: EnhancedProjectCreationStateManager;
}

export const ProjectCreationProgress: React.FC<ProjectCreationProgressProps> = ({ stateManager }) => {
  const [state, setState] = useState<ProjectCreationState>(stateManager.getState());
  const [websocketStatus, setWebSocketStatus] = useState<any>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null);

  useEffect(() => {
    const handleStateChange = (newState: ProjectCreationState) => {
      setState(newState);
    };

    stateManager.addStateChangeListener(handleStateChange);

    // Update WebSocket status and metrics periodically
    const updateInterval = setInterval(() => {
      setWebSocketStatus(stateManager.getWebSocketStatus());
      setPerformanceMetrics(stateManager.getWebSocketMetrics());
    }, 1000);

    return () => {
      stateManager.removeStateChangeListener(handleStateChange);
      clearInterval(updateInterval);
    };
  }, [stateManager]);

  const getProgressColor = () => {
    if (state.status === 'error') return 'bg-red-600';
    if (state.status === 'completed') return 'bg-green-600';
    return 'bg-blue-600';
  };

  const getStatusIcon = () => {
    switch (state.status) {
      case 'completed':
        return (
          <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm text-gray-500">{Math.round(state.progress)}%</span>
        </div>
        <div className="bg-gray-200 rounded-full h-2">
          <div
            className={`${getProgressColor()} h-2 rounded-full transition-all duration-300 ease-out`}
            style={{ width: `${state.progress}%` }}
          />
        </div>
      </div>

      {/* Status Message */}
      <div className="flex items-center space-x-3">
        {getStatusIcon()}
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">{state.message}</p>
          {state.error && (
            <p className="text-sm text-red-600 mt-1">{state.error}</p>
          )}
        </div>
      </div>

      {/* WebSocket Connection Status */}
      {websocketStatus && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                websocketStatus.connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
              }`} />
              <span className="text-sm font-medium text-gray-700">
                Real-time Updates
              </span>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${
              websocketStatus.connected 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {websocketStatus.connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          
          {websocketStatus.queuedMessages > 0 && (
            <div className="mt-2 text-xs text-yellow-600">
              {websocketStatus.queuedMessages} messages queued
            </div>
          )}
          
          {websocketStatus.reconnectAttempts > 0 && (
            <div className="mt-2 text-xs text-orange-600">
              Reconnection attempt {websocketStatus.reconnectAttempts}
            </div>
          )}
        </div>
      )}

      {/* Performance Metrics */}
      {performanceMetrics && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Performance Metrics</h4>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-gray-500">Latency:</span>
              <span className="ml-1 font-medium">
                {performanceMetrics.latency ? `${performanceMetrics.latency}ms` : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Message Rate:</span>
              <span className="ml-1 font-medium">
                {performanceMetrics.messageRate ? `${performanceMetrics.messageRate.toFixed(1)}/s` : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Error Rate:</span>
              <span className="ml-1 font-medium">
                {performanceMetrics.errorRate ? `${(performanceMetrics.errorRate * 100).toFixed(1)}%` : '0%'}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Uptime:</span>
              <span className="ml-1 font-medium">
                {performanceMetrics.connectionUptime ? `${Math.round(performanceMetrics.connectionUptime / 1000)}s` : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Project Details */}
      {state.project && (
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-800 mb-2">Project Created</h4>
          <div className="text-sm text-blue-700">
            <p><strong>Name:</strong> {state.project.name}</p>
            <p><strong>ID:</strong> {state.project.id}</p>
            {state.project.description && (
              <p><strong>Description:</strong> {state.project.description}</p>
            )}
          </div>
        </div>
      )}

      {/* Validation Results */}
      {state.validationResults && (
        <div className="bg-green-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-green-800 mb-2">Validation Results</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">
                {state.validationResults.validatedClauses}
              </div>
              <div className="text-green-700">Validated</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-yellow-600">
                {state.validationResults.missingClauses}
              </div>
              <div className="text-yellow-700">Missing</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">
                {state.validationResults.totalClauses}
              </div>
              <div className="text-blue-700">Total</div>
            </div>
          </div>
        </div>
      )}

      {/* Processing Time */}
      {state.validationResults?.estimatedProcessingTime && (
        <div className="text-center text-xs text-gray-500">
          Estimated processing time: {state.validationResults.estimatedProcessingTime}s
        </div>
      )}
    </div>
  );
};
