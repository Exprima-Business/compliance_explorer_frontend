import React from 'react';
import type { ValidatedClause } from '../../utils/clauseMatching';
interface ScanResultsTableProps {
    results: ValidatedClause[];
    onSelectionChange: (selectedClauseIds: string[]) => void;
}
declare const ScanResultsTable: React.FC<ScanResultsTableProps>;
export default ScanResultsTable;
