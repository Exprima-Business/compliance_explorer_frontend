import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, FormControlLabel, Checkbox, Tooltip, Box, } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
export var ParentClauseDialog = function (_a) {
    var open = _a.open, onClose = _a.onClose, onConfirm = _a.onConfirm, childClause = _a.childClause, parentClause = _a.parentClause;
    var _b = useState(false), rememberChoice = _b[0], setRememberChoice = _b[1];
    var handleConfirm = function (removeParent) {
        onConfirm(removeParent, rememberChoice);
        setRememberChoice(false); // Reset for next time
    };
    return (_jsxs(Dialog, { open: open, onClose: onClose, maxWidth: "sm", fullWidth: true, children: [_jsx(DialogTitle, { children: "Remove Parent Clause?" }), _jsxs(DialogContent, { children: [_jsxs(Typography, { variant: "body1", sx: { mb: 2 }, children: ["You are removing the bookmark for clause \"", childClause.title, "\" (ID: ", childClause.id, ")."] }), _jsxs(Typography, { variant: "body1", sx: { mb: 2 }, children: ["This clause has a parent clause \"", parentClause.title, "\" (ID: ", parentClause.id, ") that is also bookmarked."] }), _jsx(Typography, { variant: "body1", sx: { mb: 2, color: 'text.secondary' }, children: "Would you like to remove the parent clause bookmark as well? This choice will affect how parent-child clause relationships are handled in the future." }), _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', mt: 2 }, children: [_jsx(FormControlLabel, { control: _jsx(Checkbox, { checked: rememberChoice, onChange: function (e) { return setRememberChoice(e.target.checked); } }), label: "Remember my choice" }), _jsx(Tooltip, { title: "Your preference will be saved and applied automatically in the future. You can change this setting later.", children: _jsx(InfoIcon, { fontSize: "small", sx: { ml: 1, color: 'text.secondary' } }) })] })] }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: onClose, children: "Cancel" }), _jsx(Button, { onClick: function () { return handleConfirm(false); }, children: "No" }), _jsx(Button, { onClick: function () { return handleConfirm(true); }, variant: "contained", children: "Yes" })] })] }));
};
