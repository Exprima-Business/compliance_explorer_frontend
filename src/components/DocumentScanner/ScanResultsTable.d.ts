import React from 'react';
import type { DetectedClause } from '../../services/scanApi';
interface ScanResultsTableProps {
    results: DetectedClause[];
    onSelectionChange: (selectedClauseIds: string[]) => void;
}
declare const ScanResultsTable: React.FC<ScanResultsTableProps>;
export default ScanResultsTable;
