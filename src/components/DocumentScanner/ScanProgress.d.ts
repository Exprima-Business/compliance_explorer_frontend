import React from 'react';
import type { ScanState } from '../../hooks/useScanUpload';
interface ScanProgressProps {
    state: ScanState;
    /** Raw SSE payload from the backend — shape may vary */
    progress: Record<string, any> | null;
    fileName: string | null;
}
declare const ScanProgress: React.FC<ScanProgressProps>;
export default ScanProgress;
