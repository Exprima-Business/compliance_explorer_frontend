import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Typography, Paper, Stack, IconButton } from '@mui/material';
import BookmarkIcon from '@mui/icons-material/Bookmark';
export var BookmarkedClauses = function (_a) {
    var bookmarkedClauses = _a.bookmarkedClauses, onClauseClick = _a.onClauseClick, onBookmarkToggle = _a.onBookmarkToggle;
    return (_jsxs(Box, { sx: { mt: 3 }, children: [_jsxs(Typography, { variant: "subtitle1", sx: {
                    fontWeight: 600,
                    mb: 2,
                    color: 'text.primary',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                }, children: [_jsx(BookmarkIcon, { sx: { fontSize: 20 } }), "Bookmarked Clauses ", bookmarkedClauses.length > 0 && "(".concat(bookmarkedClauses.length, ")")] }), bookmarkedClauses.length === 0 ? (_jsx(Typography, { variant: "body2", color: "text.secondary", sx: {
                    fontStyle: 'italic',
                    textAlign: 'center',
                    py: 2
                }, children: "No bookmarked clauses yet. Click the bookmark icon on any clause to add it here." })) : (_jsx(Stack, { spacing: 2, children: bookmarkedClauses.map(function (clause) {
                    var _a;
                    return (_jsx(Paper, { elevation: 0, sx: {
                            p: 2,
                            cursor: 'pointer',
                            bgcolor: 'rgba(99, 102, 241, 0.03)',
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 2,
                            transition: 'all 0.2s ease-in-out',
                            '&:hover': {
                                bgcolor: 'rgba(99, 102, 241, 0.05)',
                                transform: 'translateY(-1px)',
                            }
                        }, onClick: function () { return onClauseClick(clause); }, children: _jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }, children: [_jsxs(Box, { children: [_jsx(Typography, { variant: "subtitle2", sx: {
                                                fontWeight: 600,
                                                color: 'primary.main',
                                                mb: 0.5
                                            }, children: clause.clauseCode || clause.clauseId }), _jsx(Typography, { variant: "body2", sx: {
                                                color: 'text.primary',
                                                mb: 1,
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden'
                                            }, children: clause.title }), _jsxs(Box, { sx: { display: 'flex', gap: 2, flexWrap: 'wrap' }, children: [_jsxs(Typography, { variant: "body2", color: "text.secondary", children: [_jsx("strong", { children: "Family:" }), " ", ((_a = clause.family) === null || _a === void 0 ? void 0 : _a.name) || 'No Family'] }), _jsxs(Typography, { variant: "caption", sx: {
                                                        color: clause.riskClassification === 'HIGH'
                                                            ? 'error.main'
                                                            : clause.riskClassification === 'MEDIUM'
                                                                ? 'warning.main'
                                                                : 'success.main',
                                                        fontWeight: 500
                                                    }, children: [_jsx("strong", { children: "Risk:" }), " ", clause.riskClassification] })] })] }), _jsx(IconButton, { size: "small", onClick: function (e) {
                                        e.stopPropagation();
                                        onBookmarkToggle(clause);
                                    }, sx: {
                                        color: 'primary.main',
                                        '&:hover': {
                                            color: 'primary.dark',
                                        }
                                    }, children: _jsx(BookmarkIcon, { fontSize: "small" }) })] }) }, clause.id));
                }) }))] }));
};
