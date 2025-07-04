import { useState, useEffect, useCallback } from 'react';
import { ConnectionMonitor } from '../utils/connectionMonitor';
import type { ConnectionStatus, ConnectionState } from '../utils/connectionMonitor';

export interface UseConnectionMonitorOptions {
  monitor?: ConnectionMonitor;
  autoSetup?: boolean;
}

export const useConnectionMonitor = (options: UseConnectionMonitorOptions = {}) => {
  const { monitor = new ConnectionMonitor(), autoSetup = true } = options;
  
  const [status, setStatus] = useState<ConnectionStatus>(monitor.getStatus());
  const [state, setState] = useState<ConnectionState>(monitor.getState());

  useEffect(() => {
    // Subscribe to status changes
    const unsubscribe = monitor.onStatusChange((newStatus) => {
      setStatus(newStatus);
      setState(monitor.getState());
    });

    // Setup system events if autoSetup is enabled
    if (autoSetup) {
      monitor.setupSystemEvents();
    }

    return () => {
      unsubscribe();
      if (autoSetup) {
        monitor.cleanup();
      }
    };
  }, [monitor, autoSetup]);

  const attemptReconnect = useCallback(() => {
    return monitor.attemptReconnect();
  }, [monitor]);

  const cancelReconnect = useCallback(() => {
    monitor.cancelReconnect();
  }, [monitor]);

  const setStatusManually = useCallback((newStatus: ConnectionStatus, error?: string) => {
    monitor.setStatus(newStatus, error);
  }, [monitor]);

  return {
    status,
    state,
    attemptReconnect,
    cancelReconnect,
    setStatus: setStatusManually,
    monitor
  };
}; 