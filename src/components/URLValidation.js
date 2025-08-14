import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrg } from '../contexts/OrgContext';
import { useProject } from '../contexts/ProjectContext';
import { Alert, Box, Button, Typography } from '@mui/material';
export var URLValidation = function (_a) {
    var children = _a.children;
    var _b = useParams(), orgSlug = _b.orgSlug, projectSlug = _b.projectSlug;
    var _c = useOrg(), currentOrg = _c.currentOrg, orgs = _c.orgs, orgInitialized = _c.initialized;
    var _d = useProject(), currentProject = _d.currentProject, projects = _d.projects, projectInitialized = _d.initialized;
    var navigate = useNavigate();
    var _e = useState(null), error = _e[0], setError = _e[1];
    var _f = useState(false), isRedirecting = _f[0], setIsRedirecting = _f[1];
    useEffect(function () {
        // Wait for contexts to be initialized
        if (!orgInitialized || !projectInitialized) {
            return;
        }
        // Clear any previous errors
        setError(null);
        // Validate organization slug
        if (orgSlug && (currentOrg === null || currentOrg === void 0 ? void 0 : currentOrg.slug) !== orgSlug) {
            console.warn("URL organization slug (".concat(orgSlug, ") doesn't match current organization (").concat(currentOrg === null || currentOrg === void 0 ? void 0 : currentOrg.slug, ")"));
            // Find the organization by slug
            var targetOrg = orgs.find(function (org) { return org.slug === orgSlug; });
            if (targetOrg) {
                // Organization exists, show message and redirect
                setError("Switching to organization: ".concat(targetOrg.name));
                setIsRedirecting(true);
                setTimeout(function () {
                    if (currentOrg && currentProject) {
                        navigate("/".concat(currentOrg.slug, "/").concat(currentProject.slug, "/matrix"));
                    }
                }, 2000);
            }
            else {
                // Organization doesn't exist, show error and redirect
                setError("Organization \"".concat(orgSlug, "\" not found. Redirecting to current organization."));
                setIsRedirecting(true);
                setTimeout(function () {
                    if (currentOrg && currentProject) {
                        navigate("/".concat(currentOrg.slug, "/").concat(currentProject.slug, "/matrix"));
                    }
                }, 3000);
            }
            return;
        }
        // Validate project slug
        if (projectSlug && (currentProject === null || currentProject === void 0 ? void 0 : currentProject.slug) !== projectSlug) {
            console.warn("URL project slug (".concat(projectSlug, ") doesn't match current project (").concat(currentProject === null || currentProject === void 0 ? void 0 : currentProject.slug, ")"));
            // Find the project by slug
            var targetProject = projects.find(function (project) { return project.slug === projectSlug; });
            if (targetProject) {
                // Project exists, show message and redirect
                setError("Switching to project: ".concat(targetProject.name));
                setIsRedirecting(true);
                setTimeout(function () {
                    if (currentOrg && currentProject) {
                        navigate("/".concat(currentOrg.slug, "/").concat(currentProject.slug, "/matrix"));
                    }
                }, 2000);
            }
            else {
                // Project doesn't exist, show error and redirect
                setError("Project \"".concat(projectSlug, "\" not found. Redirecting to current project."));
                setIsRedirecting(true);
                setTimeout(function () {
                    if (currentOrg && currentProject) {
                        navigate("/".concat(currentOrg.slug, "/").concat(currentProject.slug, "/matrix"));
                    }
                }, 3000);
            }
            return;
        }
    }, [orgSlug, projectSlug, currentOrg, currentProject, orgs, projects, orgInitialized, projectInitialized, navigate]);
    // Show loading state while validating
    if (!orgInitialized || !projectInitialized) {
        return (_jsx(Box, { sx: {
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh'
            }, children: _jsx(Typography, { children: "Loading..." }) }));
    }
    // Show error message if there's an error
    if (error) {
        return (_jsxs(Box, { sx: {
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                p: 3
            }, children: [_jsx(Alert, { severity: "warning", sx: { mb: 2, maxWidth: 600 }, children: error }), isRedirecting && (_jsx(Typography, { variant: "body2", color: "text.secondary", children: "Redirecting in a few seconds..." })), _jsx(Button, { variant: "outlined", onClick: function () {
                        setError(null);
                        setIsRedirecting(false);
                        if (currentOrg && currentProject) {
                            navigate("/".concat(currentOrg.slug, "/").concat(currentProject.slug, "/matrix"));
                        }
                    }, sx: { mt: 2 }, children: "Go Now" })] }));
    }
    // If validation passes, render children
    return _jsx(_Fragment, { children: children });
};
