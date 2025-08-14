import type { ApiResponse } from '../types/api';
export interface ScanSession {
    id: string;
    organizationId: string;
    projectId?: string;
    fileName: string;
    fileSize: number;
    status: 'processing' | 'complete' | 'error';
    createdAt: string;
    completedAt?: string;
    results: DetectedClause[];
    metadata: ProcessingMetadata;
    userModifications?: UserModifications;
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
export interface UserModifications {
    notes: string;
    selectedClauses: string[];
    customTags: string[];
    lastModified: string;
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
export interface ProgressiveResults {
    scanId: string;
    partialResults: DetectedClause[];
    isComplete: boolean;
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
export interface ImportClausesRequest {
    scanId: string;
    projectId: string;
    selectedClauses: string[];
}
export declare const validateFile: (file: File) => boolean;
export declare const handleScanError: (error: any) => string;
export declare const scanApi: {
    uploadDocument: (file: File, organizationId: string) => Promise<ApiResponse<{
        scanId: string;
        status: string;
        estimatedTime: number;
        sseUrl: string;
    }>>;
    getScan: (scanId: string) => Promise<ApiResponse<ScanSession>>;
    getScans: () => Promise<ApiResponse<ScanSession[]>>;
    retryScan: (scanId: string) => Promise<ApiResponse<{
        scanId: string;
        status: string;
    }>>;
    deleteScan: (scanId: string) => Promise<ApiResponse<void>>;
    createProjectFromScan: (request: CreateProjectFromScanRequest) => Promise<ApiResponse<any>>;
    importClauses: (request: ImportClausesRequest) => Promise<ApiResponse<any>>;
    updateScanResults: (scanId: string, modifications: Partial<UserModifications>) => Promise<ApiResponse<void>>;
};
export declare class ScanSSEConnection {
    private scanId;
    private onMessage;
    private onError;
    private onComplete;
    private eventSource;
    private reconnectAttempts;
    private maxReconnectAttempts;
    private reconnectDelay;
    constructor(scanId: string, onMessage: (data: any) => void, onError: (error: string) => void, onComplete: () => void);
    connect(): Promise<void>;
    disconnect(): void;
}
