import type { ScanProgress, DetectedClause } from '../services/scanApi';
export type ScanState = 'idle' | 'uploading' | 'processing' | 'complete' | 'error';
export interface ScanUploadResult {
    state: ScanState;
    progress: ScanProgress | null;
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
