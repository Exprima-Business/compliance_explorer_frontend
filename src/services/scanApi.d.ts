import type { ApiResponse } from '../types/api';
export interface ScanSession {
    id: string;
    scanId?: string;
    organizationId: string;
    projectId?: string;
    fileName: string;
    fileSize: number;
    status: 'processing' | 'complete' | 'error';
    createdAt: string;
    completedAt?: string;
    results: DetectedClause[];
    metadata: ProcessingMetadata;
    expiresAt: string;
}
export interface DetectedClause {
    id: string;
    clauseId: string;
    title: string;
    description: string;
    confidence: number;
    semanticSimilarity?: number;
    supportingContext?: string;
    family?: string;
    conditions?: string;
    implementationRequirements?: string;
    isSelected: boolean;
    userConfidence?: number;
    customNotes?: string;
    implementationStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
    userModified: boolean;
    lastModified: string;
}
export interface ProcessingMetadata {
    totalTokens: number;
    estimatedCost: number;
    processingTime: number;
    totalPages: number;
    modelUsed: string;
    chunksProcessed: number;
    totalChunks: number;
}
export interface ScanProgress {
    scanId: string;
    current: number;
    total: number;
    status: 'processing' | 'complete' | 'error';
    message: string;
    estimatedTimeRemaining: number;
    pagesProcessed: number;
    totalPages: number;
}
export interface CreateProjectFromScanRequest {
    scanId: string;
    projectName: string;
    selectedClauses: string[];
    organizationId: string;
}
export declare const validateFile: (file: File) => boolean;
export declare const scanApi: {
    /** Upload a document and start an AI scan */
    uploadDocument: (file: File, organizationId: string) => Promise<ApiResponse<{
        scanId: string;
        status: string;
        estimatedTime: number;
        sseUrl: string;
    }>>;
    /** Fetch a single scan by ID */
    getScan: (scanId: string) => Promise<ApiResponse<ScanSession>>;
    /** List all scans for the current user / org */
    getScans: () => Promise<ApiResponse<ScanSession[]>>;
    /** Retry a failed scan */
    retryScan: (scanId: string) => Promise<ApiResponse<{
        scanId: string;
        status: string;
    }>>;
    /** Delete a scan */
    deleteScan: (scanId: string) => Promise<ApiResponse<void>>;
    /**
     * Create a project from completed scan results.
     *
     * Hits `POST /api/projects/create-from-scan` — the backend handles
     * project creation, clause validation, and bookmark creation in one call.
     */
    createProjectFromScan: (request: CreateProjectFromScanRequest) => Promise<ApiResponse<any>>;
};
