import { ConnectionMonitor } from '../utils/connectionMonitor';
import type { ConnectionStatus, ConnectionState } from '../utils/connectionMonitor';
export interface UseConnectionMonitorOptions {
    monitor?: ConnectionMonitor;
    autoSetup?: boolean;
}
export declare const useConnectionMonitor: (options?: UseConnectionMonitorOptions) => {
    status: ConnectionStatus;
    state: ConnectionState;
    attemptReconnect: () => boolean;
    cancelReconnect: () => void;
    setStatus: (newStatus: ConnectionStatus, error?: string) => void;
    monitor: ConnectionMonitor;
};
