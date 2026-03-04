import React from 'react';
import type { ScanProgress as ScanProgressData } from '../../services/scanApi';
import type { ScanState } from '../../hooks/useScanUpload';
interface ScanProgressProps {
    state: ScanState;
    progress: ScanProgressData | null;
    fileName: string | null;
}
declare const ScanProgress: React.FC<ScanProgressProps>;
export default ScanProgress;
