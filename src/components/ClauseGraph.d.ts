/// <reference types="react" />
import type { Clause } from '../types/clause';
interface ClauseGraphProps {
    clauses: Clause[];
    onNodeClick?: (clause: Clause) => void;
}
export declare const ClauseGraph: React.FC<ClauseGraphProps>;
export {};
