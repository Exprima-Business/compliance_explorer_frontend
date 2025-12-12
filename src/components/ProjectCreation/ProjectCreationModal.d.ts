import React from 'react';
import type { Project } from '../../types/projectCreation';
interface ProjectCreationModalProps {
    isOpen: boolean;
    onClose: () => void;
    scanId: string;
    onProjectCreated: (project: Project) => void;
}
export declare const ProjectCreationModal: React.FC<ProjectCreationModalProps>;
export {};
