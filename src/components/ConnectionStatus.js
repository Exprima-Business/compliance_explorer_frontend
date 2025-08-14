import { jsx as _jsx } from "react/jsx-runtime";
import { Box, Chip, Tooltip } from '@mui/material';
import { WifiOff as DisconnectedIcon, Wifi as ConnectedIcon, WifiTethering as ConnectingIcon, Error as ErrorIcon } from '@mui/icons-material';
var ConnectionStatus = function (_a) {
    var status = _a.status, _b = _a.showLabel, showLabel = _b === void 0 ? true : _b, _c = _a.size, size = _c === void 0 ? 'medium' : _c;
    var getStatusConfig = function () {
        switch (status) {
            case 'connected':
                return {
                    icon: _jsx(ConnectedIcon, {}),
                    color: 'success',
                    label: 'Realtime Connected',
                    tooltip: 'Live updates are active'
                };
            case 'connecting':
                return {
                    icon: _jsx(ConnectingIcon, {}),
                    color: 'warning',
                    label: 'Connecting...',
                    tooltip: 'Establishing realtime connection'
                };
            case 'disconnected':
                return {
                    icon: _jsx(DisconnectedIcon, {}),
                    color: 'default',
                    label: 'Disconnected',
                    tooltip: 'Realtime connection lost'
                };
            case 'error':
                return {
                    icon: _jsx(ErrorIcon, {}),
                    color: 'error',
                    label: 'Connection Error',
                    tooltip: 'Failed to establish realtime connection'
                };
            default:
                return {
                    icon: _jsx(DisconnectedIcon, {}),
                    color: 'default',
                    label: 'Unknown',
                    tooltip: 'Unknown connection status'
                };
        }
    };
    var config = getStatusConfig();
    return (_jsx(Tooltip, { title: config.tooltip, arrow: true, children: _jsx(Box, { sx: { display: 'inline-flex', alignItems: 'center' }, children: _jsx(Chip, { icon: config.icon, label: showLabel ? config.label : '', color: config.color, size: size, variant: "outlined", sx: {
                    '& .MuiChip-icon': {
                        fontSize: size === 'small' ? '16px' : '20px'
                    },
                    minWidth: showLabel ? 'auto' : size === 'small' ? '32px' : '40px',
                    height: size === 'small' ? '24px' : '32px'
                } }) }) }));
};
export default ConnectionStatus;
