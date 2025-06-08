import React from 'react';
interface ClauseResult {
    clauseId: string;
    title: string;
    description: string;
    confidence: number;
    semanticSimilarity?: number;
    supportingContext?: string;
    family?: string;
    conditions?: string;
    implementationRequirements?: string;
}
interface ScanResultsProps {
    results: ClauseResult[];
    progress?: ScanProgress | null;
}
interface ScanProgress {
    current: number;
    total: number;
    status: 'processing' | 'completed' | 'error';
    message?: string;
}
export declare const ScanResults: React.FC<ScanResultsProps>;
export {};
