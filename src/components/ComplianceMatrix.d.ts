import React from 'react';
import type { Clause } from '../types/clause';
interface ComplianceMatrixProps {
    clauses: Clause[];
    onClose: () => void;
}
export declare const ComplianceMatrix: React.FC<ComplianceMatrixProps>;
export {};
