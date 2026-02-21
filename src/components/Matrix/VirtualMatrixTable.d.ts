import React from 'react';
import type { Clause } from '../../types/projectCreation';
interface VirtualMatrixTableProps {
    projectId: string;
    onClauseSelect: (clause: Clause) => void;
    onClauseDeselect: (clauseId: string) => void;
}
export declare const VirtualMatrixTable: React.FC<VirtualMatrixTableProps>;
export {};
