import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React from 'react';
import { MenuItem, Select, FormControl, Tooltip, ListItemIcon } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useProject } from '../contexts/ProjectContext';
import { useURLBasedNavigation } from '../hooks/useURLBasedNavigation';
import NewProjectDialog from './NewProjectDialog';
var ProjectSelector = function () {
    var _a = useProject(), projects = _a.projects, currentProject = _a.currentProject, setCurrentProject = _a.setCurrentProject;
    var _b = useURLBasedNavigation(), navigateTo = _b.navigateTo, isURLBasedRouting = _b.isURLBasedRouting;
    var _c = React.useState(false), dialogOpen = _c[0], setDialogOpen = _c[1];
    if (!projects || projects.length === 0 || !currentProject)
        return null;
    var handleProjectChange = function (projectId) {
        if (projectId === '__new__') {
            setDialogOpen(true);
        }
        else {
            var proj = projects.find(function (p) { return p.id === projectId; });
            if (proj) {
                setCurrentProject(proj);
                // If using URL-based routing, navigate to the new project
                if (isURLBasedRouting) {
                    navigateTo('/matrix'); // Navigate to matrix page in new project
                }
            }
        }
    };
    return (_jsxs(_Fragment, { children: [_jsx(Tooltip, { title: "Switch project", children: _jsx(FormControl, { size: "small", sx: { minWidth: 160 }, children: _jsxs(Select, { value: currentProject.id, onChange: function (e) { return handleProjectChange(e.target.value); }, variant: "outlined", inputProps: { 'aria-label': 'project selector' }, sx: { fontWeight: 600 }, children: [projects.map(function (p) { return (_jsx(MenuItem, { value: p.id, children: p.name }, p.id)); }), _jsxs(MenuItem, { value: "__new__", children: [_jsx(ListItemIcon, { children: _jsx(AddIcon, { fontSize: "small" }) }), "New project\u2026"] })] }) }) }), dialogOpen && _jsx(NewProjectDialog, { open: dialogOpen, onClose: function () { return setDialogOpen(false); } })] }));
};
export default ProjectSelector;
