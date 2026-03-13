import type { DetectedClause } from '../services/scanApi';
export type ScanState = 'idle' | 'uploading' | 'processing' | 'complete' | 'error';
/** Progress payload — may be the frontend ScanProgress type OR the raw
 *  backend SSE object (which has `progress` 0-100, `currentChunk`, etc.).
 *  Components should read fields defensively. */
export type ProgressPayload = Record<string, any> | null;
export interface ScanUploadResult {
    state: ScanState;
    progress: ProgressPayload;
    results: DetectedClause[];
    scanId: string | null;
    fileName: string | null;
    error: string | null;
    upload: (file: File) => void;
    reset: () => void;
}
/**
 * useScanUpload — state-machine hook for the full document scan lifecycle.
 *
 * States: idle -> uploading -> processing -> complete | error
 *
 * Connects via SSE for real-time progress. Falls back to polling after
 * `SSE_FAILURE_THRESHOLD` consecutive SSE failures.
 *
 * All hooks are unconditional at the top level — impossible to trigger
 * React Error #300.
 */
export declare function useScanUpload(initialScanId?: string): ScanUploadResult;
