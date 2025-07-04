import React from 'react';
import { Box, Chip, Tooltip } from '@mui/material';
import { 
  WifiOff as DisconnectedIcon,
  Wifi as ConnectedIcon,
  WifiTethering as ConnectingIcon,
  Error as ErrorIcon
} from '@mui/icons-material';

interface ConnectionStatusProps {
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  showLabel?: boolean;
  size?: 'small' | 'medium';
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ 
  status, 
  showLabel = true, 
  size = 'medium' 
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: <ConnectedIcon />,
          color: 'success' as const,
          label: 'Realtime Connected',
          tooltip: 'Live updates are active'
        };
      case 'connecting':
        return {
          icon: <ConnectingIcon />,
          color: 'warning' as const,
          label: 'Connecting...',
          tooltip: 'Establishing realtime connection'
        };
      case 'disconnected':
        return {
          icon: <DisconnectedIcon />,
          color: 'default' as const,
          label: 'Disconnected',
          tooltip: 'Realtime connection lost'
        };
      case 'error':
        return {
          icon: <ErrorIcon />,
          color: 'error' as const,
          label: 'Connection Error',
          tooltip: 'Failed to establish realtime connection'
        };
      default:
        return {
          icon: <DisconnectedIcon />,
          color: 'default' as const,
          label: 'Unknown',
          tooltip: 'Unknown connection status'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Tooltip title={config.tooltip} arrow>
      <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
        <Chip
          icon={config.icon}
          label={showLabel ? config.label : ''}
          color={config.color}
          size={size}
          variant="outlined"
          sx={{
            '& .MuiChip-icon': {
              fontSize: size === 'small' ? '16px' : '20px'
            },
            minWidth: showLabel ? 'auto' : size === 'small' ? '32px' : '40px',
            height: size === 'small' ? '24px' : '32px'
          }}
        />
      </Box>
    </Tooltip>
  );
};

export default ConnectionStatus; 