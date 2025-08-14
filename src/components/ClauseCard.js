var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card, CardContent, Typography, Box, Paper, Stack, IconButton, Button } from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import CategoryIcon from '@mui/icons-material/Category';
import LinkIcon from '@mui/icons-material/Link';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import CloseIcon from '@mui/icons-material/Close';
import { useBookmarks } from '../contexts/BookmarkContext';
export var ClauseCard = function (_a) {
    var _b, _c;
    var clause = _a.clause, onBookmarkToggle = _a.onBookmarkToggle, onClose = _a.onClose, sx = _a.sx, _d = _a.compact, compact = _d === void 0 ? false : _d;
    var _e = useBookmarks(), isClauseBookmarked = _e.isClauseBookmarked, toggleBookmark = _e.toggleBookmark;
    // Determine bookmark status from BookmarkContext
    var isBookmarked = isClauseBookmarked(clause.id);
    var handleBookmarkToggle = function () {
        if (onBookmarkToggle) {
            onBookmarkToggle();
        }
        else {
            toggleBookmark(clause.id);
        }
    };
    var renderField = function (label, value) {
        if (!value)
            return null;
        return (_jsxs(Paper, { elevation: 0, sx: {
                mb: 3,
                p: 2.5,
                bgcolor: 'rgba(99, 102, 241, 0.03)',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1.4,
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                    bgcolor: 'rgba(99, 102, 241, 0.05)',
                    transform: 'translateY(-1px)',
                }
            }, children: [_jsx(Typography, { variant: "subtitle1", color: "primary", gutterBottom: true, sx: {
                        fontWeight: 600,
                        letterSpacing: '0.02em',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        mb: 2
                    }, children: label }), Array.isArray(value) ? (_jsx(Box, { component: "ul", sx: { pl: 2, m: 0 }, children: value.map(function (item, index) { return (_jsx(Typography, { component: "li", variant: "body2", paragraph: true, sx: {
                            color: 'text.secondary',
                            lineHeight: 1.7,
                            '&:last-child': { mb: 0 }
                        }, children: item }, index)); }) })) : (_jsx(Typography, { variant: "body2", paragraph: true, sx: {
                        color: 'text.secondary',
                        lineHeight: 1.7,
                        mb: 0
                    }, children: value }))] }));
    };
    if (compact) {
        return (_jsx(Card, { elevation: 0, sx: __assign({ bgcolor: 'transparent', border: '1px solid', borderColor: 'divider', borderRadius: 2, transition: 'all 0.2s ease-in-out', '&:hover': {
                    bgcolor: 'rgba(99, 102, 241, 0.03)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                } }, sx), children: _jsx(CardContent, { sx: {
                    p: 2.5,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    minHeight: 90,
                    '&:last-child': {
                        pb: 2.5
                    }
                }, children: _jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mt: 1.25 }, children: [_jsxs(Box, { sx: { flex: 1 }, children: [_jsx(Typography, { variant: "h6", sx: {
                                        fontSize: '0.9rem',
                                        fontWeight: 600,
                                        color: 'primary.main',
                                        mb: 0.5,
                                        transition: 'color 0.2s ease-in-out',
                                        '&:hover': {
                                            color: 'secondary.main',
                                        }
                                    }, children: clause.clauseCode }), _jsx(Typography, { variant: "body2", sx: {
                                        fontSize: '0.85rem',
                                        color: 'text.primary',
                                        lineHeight: 1.4,
                                        mb: 0.75,
                                        transition: 'color 0.2s ease-in-out',
                                    }, children: clause.title }), _jsxs(Box, { sx: { display: 'flex', gap: 2.5 }, children: [_jsxs(Box, { sx: {
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 0.75,
                                                transition: 'all 0.2s ease-in-out',
                                                '&:hover': {
                                                    transform: 'translateY(-1px)',
                                                }
                                            }, children: [_jsx(CategoryIcon, { sx: {
                                                        color: 'primary.main',
                                                        fontSize: 16,
                                                        transition: 'color 0.2s ease-in-out',
                                                    } }), _jsx(Typography, { variant: "caption", sx: {
                                                        color: 'text.secondary',
                                                        fontSize: '0.75rem',
                                                        transition: 'color 0.2s ease-in-out',
                                                    }, children: ((_b = clause.family) === null || _b === void 0 ? void 0 : _b.name) || 'No Family' })] }), _jsxs(Box, { sx: {
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 0.75,
                                                transition: 'all 0.2s ease-in-out',
                                                '&:hover': {
                                                    transform: 'translateY(-1px)',
                                                }
                                            }, children: [_jsx(SecurityIcon, { sx: {
                                                        color: clause.riskClassification === 'HIGH' ? 'error.main' : 'warning.main',
                                                        fontSize: 16,
                                                        transition: 'color 0.2s ease-in-out',
                                                    } }), _jsx(Typography, { variant: "caption", sx: {
                                                        color: clause.riskClassification === 'HIGH' ? 'error.main' : 'warning.main',
                                                        fontSize: '0.75rem',
                                                        transition: 'color 0.2s ease-in-out',
                                                    }, children: clause.riskClassification })] })] })] }), _jsxs(Box, { sx: { display: 'flex', gap: 0.5 }, children: [_jsx(IconButton, { onClick: handleBookmarkToggle, sx: {
                                        color: isBookmarked ? 'secondary.main' : 'text.secondary',
                                        transition: 'all 0.2s ease-in-out',
                                        '&:hover': {
                                            color: 'secondary.main',
                                            transform: 'scale(1.1)',
                                        },
                                    }, children: isBookmarked ? _jsx(BookmarkIcon, {}) : _jsx(BookmarkBorderIcon, {}) }), onClose && (_jsx(IconButton, { onClick: onClose, sx: {
                                        color: 'text.secondary',
                                        transition: 'all 0.2s ease-in-out',
                                        '&:hover': {
                                            color: 'error.main',
                                            transform: 'scale(1.1)',
                                        },
                                    }, children: _jsx(CloseIcon, {}) }))] })] }) }) }));
    }
    return (_jsx(Card, { elevation: 0, sx: __assign({ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'linear-gradient(135deg, #f8fafc 60%, #e0e7ff 100%)', borderRadius: 3, boxShadow: '0 2px 8px 0 rgba(0,184,217,0.08), 0 8px 24px 0 rgba(109,91,255,0.08)', transition: 'transform 0.18s cubic-bezier(0.4,0,0.2,1), box-shadow 0.18s cubic-bezier(0.4,0,0.2,1)', '&:hover, &:focus-within': {
                transform: 'scale(1.025)',
                boxShadow: '0 8px 32px 0 rgba(0,184,217,0.13), 0 16px 48px 0 rgba(127,57,251,0.13)',
            } }, sx), children: _jsxs(CardContent, { sx: { flexGrow: 1, overflow: 'auto', p: 0 }, children: [_jsx(Paper, { elevation: 0, sx: {
                        mb: 3,
                        p: 2.5,
                        bgcolor: 'rgba(0,184,217,0.04)',
                        border: '1.5px solid',
                        borderColor: 'divider',
                        borderRadius: 2.2,
                        boxShadow: '0 1.5px 6px 0 rgba(127,57,251,0.06)',
                        borderBottom: '1px solid rgba(0,184,217,0.13)',
                    }, children: _jsxs(Stack, { spacing: 2, children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }, children: [_jsxs(Box, { children: [_jsx(Typography, { variant: "h5", sx: {
                                                    fontWeight: 800,
                                                    letterSpacing: '-0.02em',
                                                    color: 'primary.main',
                                                    mb: 1,
                                                    fontSize: '1.25rem',
                                                    lineHeight: 1.1,
                                                }, children: clause.clauseCode }), _jsx(Typography, { variant: "h6", sx: {
                                                    fontWeight: 600,
                                                    color: 'text.primary',
                                                }, children: clause.title })] }), _jsxs(Box, { sx: { display: 'flex', gap: 1 }, children: [onBookmarkToggle && (_jsx(IconButton, { onClick: handleBookmarkToggle, sx: {
                                                    color: isBookmarked ? 'primary.main' : 'text.secondary',
                                                    transition: 'transform 0.18s cubic-bezier(0.4,0,0.2,1), color 0.18s cubic-bezier(0.4,0,0.2,1)',
                                                    '&:hover, &:focus': {
                                                        color: 'secondary.main',
                                                        transform: 'scale(1.18)',
                                                    }
                                                }, children: isBookmarked ? _jsx(BookmarkIcon, {}) : _jsx(BookmarkBorderIcon, {}) })), onClose && (_jsx(IconButton, { onClick: onClose, sx: {
                                                    color: 'text.secondary',
                                                    transition: 'transform 0.18s cubic-bezier(0.4,0,0.2,1), color 0.18s cubic-bezier(0.4,0,0.2,1)',
                                                    '&:hover, &:focus': {
                                                        color: 'error.main',
                                                        transform: 'scale(1.18)',
                                                    }
                                                }, children: _jsx(CloseIcon, {}) }))] })] }), _jsxs(Box, { sx: {
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(2, 1fr)',
                                    gap: 2,
                                    mt: 2
                                }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(CategoryIcon, { sx: { color: 'primary.main', fontSize: 20 } }), _jsxs(Box, { children: [_jsx(Typography, { variant: "caption", color: "text.secondary", children: "Family" }), _jsx(Typography, { variant: "body2", sx: { fontWeight: 500 }, children: ((_c = clause.family) === null || _c === void 0 ? void 0 : _c.name) || 'No Family' })] })] }), _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(SecurityIcon, { sx: {
                                                    color: clause.riskClassification === 'HIGH' ? 'error.main' : 'warning.main',
                                                    fontSize: 20
                                                } }), _jsxs(Box, { children: [_jsx(Typography, { variant: "caption", color: "text.secondary", children: "Risk Level" }), _jsx(Typography, { variant: "body2", sx: {
                                                            fontWeight: 500,
                                                            color: clause.riskClassification === 'HIGH' ? 'error.main' : 'warning.main'
                                                        }, children: clause.riskClassification })] })] }), clause.referenceUrl && (_jsxs(Box, { sx: {
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1,
                                            gridColumn: 'span 2'
                                        }, children: [_jsx(LinkIcon, { sx: { color: 'primary.main', fontSize: 20 } }), _jsxs(Box, { sx: { flex: 1 }, children: [_jsx(Typography, { variant: "caption", color: "text.secondary", children: "Reference" }), _jsx(Box, { sx: { mt: 0.5 }, children: _jsx(Button, { href: clause.referenceUrl, target: "_blank", rel: "noopener noreferrer", size: "small", variant: "outlined", sx: {
                                                                fontSize: '0.75rem',
                                                                textTransform: 'none',
                                                                color: 'primary.main',
                                                                borderColor: 'rgba(0,184,217,0.3)',
                                                                bgcolor: 'rgba(0,184,217,0.05)',
                                                                '&:hover': {
                                                                    bgcolor: 'rgba(0,184,217,0.1)',
                                                                    borderColor: 'rgba(0,184,217,0.5)',
                                                                },
                                                            }, children: "View Full Text" }) })] })] }))] })] }) }), renderField('Description', clause.description), renderField('Intent', clause.intent), renderField('Conditions', clause.conditions), renderField('Implementation Guidance', clause.implementationGuidance), renderField('Assessment Method', clause.assessmentMethod), renderField('Penalties', clause.metadata.penalties)] }) }));
};
