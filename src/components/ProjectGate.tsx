import React from 'react';
import ProjectSetupDialog from './ProjectSetupDialog';
import { useProject } from '../contexts/ProjectContext';
import { useOrg } from '../contexts/OrgContext';

const ProjectGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { initialized: projectInitialized, currentProject } = useProject();
  const { initialized: orgInitialized } = useOrg();

  // Wait for both org and project contexts to be initialized
  if (!orgInitialized || !projectInitialized) return null; // could show spinner
  if (!currentProject) return <ProjectSetupDialog />;

  return <>{children}</>;
};

export default ProjectGate; 