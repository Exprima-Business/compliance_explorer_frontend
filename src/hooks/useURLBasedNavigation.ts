import { useNavigate, useLocation } from 'react-router-dom';
import { useOrg } from '../contexts/OrgContext';

const ENABLE_URL_BASED_ROUTING = import.meta.env.VITE_ENABLE_URL_BASED_ROUTING === 'true';
const IS_PRODUCTION = import.meta.env.PROD;

export const useURLBasedNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentOrg } = useOrg();

  const navigateTo = (path: string) => {
    if (ENABLE_URL_BASED_ROUTING && currentOrg) {
      // URL-based navigation with the org slug (org is the scope now).
      navigate(`/${currentOrg.slug}${path}`);
    } else {
      // Header-based navigation (current approach)
      navigate(path);
    }
  };

  const getCurrentPath = () => {
    if (ENABLE_URL_BASED_ROUTING) {
      // Extract the path after the org slug.
      const pathParts = location.pathname.split('/');
      if (pathParts.length >= 3) {
        return `/${pathParts.slice(2).join('/')}`;
      }
      return '/';
    } else {
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
    isURLBasedRouting: ENABLE_URL_BASED_ROUTING,
    isProduction: IS_PRODUCTION,
  };
};
