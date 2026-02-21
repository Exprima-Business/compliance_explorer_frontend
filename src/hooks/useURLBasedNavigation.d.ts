import { type Organization } from '../contexts/OrgContext';
import { type Project } from '../contexts/ProjectContext';
export declare const useURLBasedNavigation: () => {
    navigateTo: (path: string) => void;
    getCurrentPath: () => string;
    isActiveTab: (path: string) => boolean;
    currentOrg: Organization | null;
    currentProject: Project | null;
    isURLBasedRouting: boolean;
    isProduction: boolean;
};
