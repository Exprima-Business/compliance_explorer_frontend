import { useNavigate, useLocation } from 'react-router-dom';
import { useOrg, type Organization } from '../contexts/OrgContext';
import { useProject, type Project } from '../contexts/ProjectContext';

const ENABLE_URL_BASED_ROUTING = import.meta.env.VITE_ENABLE_URL_BASED_ROUTING === 'true';
const IS_PRODUCTION = import.meta.env.PROD;

export const useURLBasedNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentOrg } = useOrg();
  const { currentProject } = useProject();

  const navigateTo = (path: string) => {
    if (ENABLE_URL_BASED_ROUTING && currentOrg && currentProject) {
      // URL-based navigation with org/project slugs
      navigate(`/${currentOrg.slug}/${currentProject.slug}${path}`);
    } else {
      // Header-based navigation (current approach)
      navigate(path);
    }
  };

  const getCurrentPath = () => {
    if (ENABLE_URL_BASED_ROUTING) {
      // Extract the path after org/project slugs
      const pathParts = location.pathname.split('/');
      if (pathParts.length >= 4) {
        return `/${pathParts.slice(3).join('/')}`;
      }
      return '/';
    } else {
      // Return the full path for header-based routing
      return location.pathname;
    }
  };

  const isActiveTab = (path: string) => {
    const currentPath = getCurrentPath();
    return currentPath === path;
  };

  return {
    navigateTo,
    getCurrentPath,
    isActiveTab,
    currentOrg,
    currentProject,
    isURLBasedRouting: ENABLE_URL_BASED_ROUTING,
    isProduction: IS_PRODUCTION
  };
}; 