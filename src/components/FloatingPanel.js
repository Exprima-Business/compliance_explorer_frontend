import { jsx as _jsx } from "react/jsx-runtime";
import { Box, Paper } from '@mui/material';
import { ClauseCard } from './ClauseCard';
export var FloatingPanel = function (_a) {
    var clause = _a.clause, onClose = _a.onClose, _b = _a.isBookmarked, isBookmarked = _b === void 0 ? false : _b, onBookmarkToggle = _a.onBookmarkToggle;
    if (!clause)
        return null;
    return (_jsx(Paper, { elevation: 3, sx: {
            position: 'fixed',
            right: 20,
            top: { xs: 84, sm: 92 }, // Account for AppBar height (64px + 20px margin on xs, 72px + 20px margin on sm)
            bottom: 20,
            width: 400,
            overflow: 'auto',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'background.paper',
            borderRadius: 2,
        }, children: _jsx(Box, { sx: { p: 2, flex: 1 }, children: _jsx(ClauseCard, { clause: clause, isBookmarked: isBookmarked, onBookmarkToggle: onBookmarkToggle, onClose: onClose }) }) }));
};
