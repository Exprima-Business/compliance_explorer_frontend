import React from 'react';
import ProjectSetupDialog from './ProjectSetupDialog';
import { useProject } from '../contexts/ProjectContext';

const ProjectGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { initialized, currentProject } = useProject();

  if (!initialized) return null; // could show spinner
  if (!currentProject) return <ProjectSetupDialog />;

  return <>{children}</>;
};

export default ProjectGate; 