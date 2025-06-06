import React from 'react';
interface ClauseResult {
    clauseId: string;
    title: string;
    description: string;
    confidence: number;
}
interface ScanResultsProps {
    results: ClauseResult[];
}
export declare const ScanResults: React.FC<ScanResultsProps>;
export {};
