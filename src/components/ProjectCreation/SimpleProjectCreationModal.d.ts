import React from 'react';
interface SimpleProjectCreationModalProps {
    isOpen: boolean;
    onClose: () => void;
    scanResults: any[];
    onProjectCreated: (project: any) => void;
}
export declare const SimpleProjectCreationModal: React.FC<SimpleProjectCreationModalProps>;
export {};
