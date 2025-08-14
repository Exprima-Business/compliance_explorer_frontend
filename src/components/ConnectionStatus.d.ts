import React from 'react';
interface ConnectionStatusProps {
    status: 'connected' | 'connecting' | 'disconnected' | 'error';
    showLabel?: boolean;
    size?: 'small' | 'medium';
}
declare const ConnectionStatus: React.FC<ConnectionStatusProps>;
export default ConnectionStatus;
