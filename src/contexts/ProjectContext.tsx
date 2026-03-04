import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiCall } from '../services/api';
import { useOrg } from './OrgContext';
import { dlog } from '../utils/debugLog';
import { extractErrorMessage } from '../utils/errorUtils';

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

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined);

const PROJECT_KEY = 'projectId';

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { initialized: orgInitialized, currentOrg } = useOrg();
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProjectState] = useState<Project | null>(null);
  const [initialized, setInitialized] = useState(false);

  const refreshProjects = useCallback(async () => {
    dlog('ProjectProvider: refreshProjects called', {
      orgInitialized,
      currentOrg: currentOrg?.id,
      currentOrgName: currentOrg?.name
    });

    // Only load projects if org context is initialized and we have a current org
    if (!orgInitialized) {
      // OrgProvider hasn't finished loading yet — wait silently (don't flip initialized).
      dlog('ProjectProvider: skipping project load - org not yet initialized');
      return;
    }

    if (!currentOrg) {
      // OrgProvider finished but found no org (e.g. validate-organization failed or
      // the user genuinely has no membership). Mark projects as initialized so
      // ProjectGate can render something (ProjectSetupDialog) rather than staying
      // blank forever.
      dlog('ProjectProvider: org initialized but no currentOrg - marking projects initialized', {
        orgInitialized,
        hasCurrentOrg: false
      });
      setInitialized(true);
      return;
    }

    dlog('ProjectProvider: loading projects for org', { orgId: currentOrg.id, orgName: currentOrg.name });

    const resp = await apiCall<Project[]>('/api/projects');
    if (!resp.error && Array.isArray(resp.data)) {
      dlog('ProjectProvider: projects loaded successfully', {
        count: resp.data.length,
        projects: resp.data.map(p => ({ id: p.id, name: p.name }))
      });
      
      setProjects(resp.data);
      const storedId = localStorage.getItem(PROJECT_KEY);
      const match = resp.data.find(p => p.id === storedId) || resp.data[0] || null;
      if (match) {
        setCurrentProjectState(match);
        localStorage.setItem(PROJECT_KEY, match.id);
        dlog('ProjectProvider: current project set', { projectId: match.id, projectName: match.name });
      } else {
        setCurrentProjectState(null);
        localStorage.removeItem(PROJECT_KEY);
        dlog('ProjectProvider: no current project found');
      }
      setInitialized(true);
    } else {
      dlog('ProjectProvider: failed to load projects', { error: resp.error });
      // Always mark initialized even on error so ProjectGate never spins forever
      setInitialized(true);
    }
  }, [orgInitialized, currentOrg]);

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  const setCurrentProject = (p: Project) => {
    setCurrentProjectState(p);
    localStorage.setItem(PROJECT_KEY, p.id);
  };

  const createProject = async (name: string, description?: string) => {
    const resp = await apiCall<Project>('/api/projects', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
    if (resp.error) {
      throw new Error(extractErrorMessage(resp.error, 'Failed to create project'));
    }
    if (resp.data) {
      setProjects(prev => [...prev, resp.data!]);
      setCurrentProject(resp.data!);
    }
  };

  const value: ProjectContextValue = {
    projects,
    currentProject,
    initialized,
    setCurrentProject,
    refreshProjects,
    createProject,
  };

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};

export const useProject = (): ProjectContextValue => {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject must be used within ProjectProvider');
  return ctx;
}; 