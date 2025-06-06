import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, IconButton, Paper } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { ClauseCard } from './ClauseCard';
export var FloatingPanel = function (_a) {
    var clause = _a.clause, onClose = _a.onClose, _b = _a.isBookmarked, isBookmarked = _b === void 0 ? false : _b, onBookmarkToggle = _a.onBookmarkToggle;
    if (!clause)
        return null;
    return (_jsxs(Paper, { elevation: 3, sx: {
            position: 'fixed',
            right: 20,
            top: 20,
            bottom: 20,
            width: 400,
            overflow: 'auto',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'background.paper',
            borderRadius: 2,
        }, children: [_jsx(Box, { sx: {
                    position: 'sticky',
                    top: 0,
                    p: 1,
                    bgcolor: 'background.paper',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    zIndex: 1
                }, children: _jsx(IconButton, { onClick: onClose, size: "small", children: _jsx(CloseIcon, {}) }) }), _jsx(Box, { sx: { p: 2, flex: 1 }, children: _jsx(ClauseCard, { clause: clause, isBookmarked: isBookmarked, onBookmarkToggle: onBookmarkToggle }) })] }));
};
