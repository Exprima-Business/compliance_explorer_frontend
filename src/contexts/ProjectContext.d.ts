import React from 'react';
export interface Project {
    id: string;
    name: string;
    slug: string;
    description?: string;
    createdAt: string;
}
interface ProjectContextValue {
    projects: Project[];
    currentProject: Project | null;
    initialized: boolean;
    setCurrentProject: (p: Project) => void;
    refreshProjects: () => Promise<void>;
    createProject: (name: string, description?: string) => Promise<void>;
}
export declare const ProjectProvider: React.FC<{
    children: React.ReactNode;
}>;
export declare const useProject: () => ProjectContextValue;
export {};
