import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import ProjectSetupDialog from './ProjectSetupDialog';
import { useProject } from '../contexts/ProjectContext';
import { useOrg } from '../contexts/OrgContext';
var ProjectGate = function (_a) {
    var children = _a.children;
    var _b = useProject(), projectInitialized = _b.initialized, currentProject = _b.currentProject;
    var orgInitialized = useOrg().initialized;
    // Wait for both org and project contexts to be initialized
    if (!orgInitialized || !projectInitialized)
        return null; // could show spinner
    if (!currentProject)
        return _jsx(ProjectSetupDialog, {});
    return _jsx(_Fragment, { children: children });
};
export default ProjectGate;
