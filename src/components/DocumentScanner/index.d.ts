import React from 'react';
export interface ScanResult {
    id: string;
    text: string;
    matches: Array<{
        clauseId: string;
        confidence: number;
        explanation: string;
    }>;
}
export declare const DocumentScanner: React.FC;
