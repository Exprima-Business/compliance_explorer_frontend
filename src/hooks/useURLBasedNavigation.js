import { useNavigate, useLocation } from 'react-router-dom';
import { useOrg } from '../contexts/OrgContext';
import { useProject } from '../contexts/ProjectContext';
var ENABLE_URL_BASED_ROUTING = import.meta.env.VITE_ENABLE_URL_BASED_ROUTING === 'true';
var IS_PRODUCTION = import.meta.env.PROD;
export var useURLBasedNavigation = function () {
    var navigate = useNavigate();
    var location = useLocation();
    var currentOrg = useOrg().currentOrg;
    var currentProject = useProject().currentProject;
    var navigateTo = function (path) {
        if (ENABLE_URL_BASED_ROUTING && currentOrg && currentProject) {
            // URL-based navigation with org/project slugs
            navigate("/".concat(currentOrg.slug, "/").concat(currentProject.slug).concat(path));
        }
        else {
            // Header-based navigation (current approach)
            navigate(path);
        }
    };
    var getCurrentPath = function () {
        if (ENABLE_URL_BASED_ROUTING) {
            // Extract the path after org/project slugs
            var pathParts = location.pathname.split('/');
            if (pathParts.length >= 4) {
                return "/".concat(pathParts.slice(3).join('/'));
            }
            return '/';
        }
        else {
            // Return the full path for header-based routing
            return location.pathname;
        }
    };
    var isActiveTab = function (path) {
        var currentPath = getCurrentPath();
        return currentPath === path;
    };
    return {
        navigateTo: navigateTo,
        getCurrentPath: getCurrentPath,
        isActiveTab: isActiveTab,
        currentOrg: currentOrg,
        currentProject: currentProject,
        isURLBasedRouting: ENABLE_URL_BASED_ROUTING,
        isProduction: IS_PRODUCTION
    };
};
