import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiCall } from '../services/api';

interface Project {
  id: string;
  name: string;
  slug: string;
  description?: string;
  createdAt: string;
}

interface ProjectContextValue {
  projects: Project[];
  currentProject: Project | null;
  setCurrentProject: (p: Project) => void;
  refreshProjects: () => Promise<void>;
  createProject: (name: string, description?: string) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined);

const PROJECT_KEY = 'projectId';

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProjectState] = useState<Project | null>(null);

  const refreshProjects = useCallback(async () => {
    const resp = await apiCall<Project[]>('/api/projects');
    if (!resp.error && Array.isArray(resp.data)) {
      setProjects(resp.data);
      const storedId = localStorage.getItem(PROJECT_KEY);
      const match = resp.data.find(p => p.id === storedId) || resp.data[0] || null;
      if (match) {
        setCurrentProjectState(match);
        localStorage.setItem(PROJECT_KEY, match.id);
      } else {
        setCurrentProjectState(null);
        localStorage.removeItem(PROJECT_KEY);
      }
    }
  }, []);

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
      const msg = typeof resp.error === 'string' ? resp.error : resp.error.message;
      throw new Error(msg);
    }
    if (resp.data) {
      setProjects(prev => [...prev, resp.data!]);
      setCurrentProject(resp.data!);
    }
  };

  const value: ProjectContextValue = {
    projects,
    currentProject,
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