import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import { ComplianceMatrix } from '../components/ComplianceMatrix';
import { useClause } from '../contexts/ClauseContext';
var Matrix = function () {
    var _a = useClause(), clauses = _a.clauses, loading = _a.loading, error = _a.error;
    if (loading) {
        return (_jsx(Box, { sx: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }, children: _jsx(CircularProgress, {}) }));
    }
    if (error) {
        return (_jsx(Box, { sx: { p: 3 }, children: _jsx(Alert, { severity: "error", children: error }) }));
    }
    var matrixData = clauses.map(function (clause) { return ({
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
    return (_jsxs(Box, { sx: { p: 3 }, children: [_jsx(Typography, { variant: "h4", gutterBottom: true, children: "Compliance Matrix" }), _jsx(ComplianceMatrix, { rows: matrixData })] }));
};
export default Matrix;
