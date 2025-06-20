import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import { ComplianceMatrix } from '../components/ComplianceMatrix';
import { useClause } from '../contexts/ClauseContext';
import { useBookmarks } from '../contexts/BookmarkContext';
var Matrix = function () {
    var _a = useClause(), clauses = _a.clauses, loading = _a.loading, error = _a.error;
    var bookmarks = useBookmarks().bookmarks;
    if (loading) {
        return (_jsx(Box, { sx: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }, children: _jsx(CircularProgress, {}) }));
    }
    if (error) {
        return (_jsx(Box, { sx: { p: 3 }, children: _jsx(Alert, { severity: "error", children: error }) }));
    }
    // Helper function to find parent clauses
    var findParentClauses = function (clause) {
        var parentClauses = [];
        clause.relationships.forEach(function (relationship) {
            if (relationship.type === 'PARENT') {
                var parentClause = clauses.find(function (c) { return c.clauseId === relationship.targetClauseId; });
                if (parentClause) {
                    parentClauses.push(parentClause);
                }
            }
        });
        return parentClauses;
    };
    // Get all bookmarked clauses and their parent clauses
    var bookmarkedClauses = bookmarks
        .map(function (b) { return clauses.find(function (c) { return c.id === b.clauseId; }); })
        .filter(function (c) { return Boolean(c); });
    var parentClauses = new Set();
    // Add parent clauses of bookmarked clauses
    bookmarkedClauses.forEach(function (clause) {
        var parents = findParentClauses(clause);
        parents.forEach(function (parent) {
            parentClauses.add(parent.id);
        });
    });
    // Combine bookmarked clauses with their parent clauses
    var matrixClauses = clauses.filter(function (clause) {
        return bookmarks.some(function (b) { return b.clauseId === clause.id; }) || parentClauses.has(clause.id);
    });
    var matrixData = matrixClauses.map(function (clause) { return ({
        id: clause.id,
        clauseId: clause.clauseId,
        title: clause.title,
        description: clause.description,
        intent: clause.intent,
        status: clause.status,
        category: clause.category,
        family: clause.family,
        conditions: clause.conditions,
        implementationGuidance: clause.implementationGuidance,
        assessmentMethod: clause.assessmentMethod,
        riskClassification: clause.riskClassification,
        referenceUrl: clause.referenceUrl
    }); });
    return (_jsxs(Box, { sx: { p: 3 }, children: [_jsx(Typography, { variant: "h4", gutterBottom: true, children: "Compliance Matrix" }), matrixData.length === 0 ? (_jsxs(Box, { sx: {
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    py: 8,
                    textAlign: 'center'
                }, children: [_jsx(Typography, { variant: "h6", color: "text.secondary", gutterBottom: true, children: "No bookmarked clauses yet" }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "Bookmark clauses from the Clauses tab to see them appear in the matrix" })] })) : (_jsx(ComplianceMatrix, { rows: matrixData }))] }));
};
export default Matrix;
