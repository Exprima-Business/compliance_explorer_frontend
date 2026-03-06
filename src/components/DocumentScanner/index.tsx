import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Alert, Paper } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SaveIcon from '@mui/icons-material/Save';

import { useAuth } from '../../hooks/useAuth';
import { useClause } from '../../contexts/ClauseContext';
import { useScanUpload } from '../../hooks/useScanUpload';
import { validateDetectedClauses } from '../../utils/clauseMatching';
import FileUpload from './FileUpload';
import ScanProgress from './ScanProgress';
import ScanResultsTable from './ScanResultsTable';
import SaveAsProjectDialog from './SaveAsProjectDialog';

// ---------------------------------------------------------------------------
// DocumentScanner — thin orchestrator
// ---------------------------------------------------------------------------

export const DocumentScanner: React.FC = () => {
  // -- ALL hooks at the top, unconditionally ---------------------------------
  const { user } = useAuth();
  const { scanId: urlScanId } = useParams<{ scanId?: string }>();
  const { clauses } = useClause();

  const navigate = useNavigate();
  const scan = useScanUpload(urlScanId);

  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [selectedClauses, setSelectedClauses] = useState<string[]>([]);

  // Cross-reference scan results against the clauses DB whenever results
  // or the DB clause list changes. This gives immediate feedback about
  // which detected clauses actually exist in the database.
  const validatedResults = useMemo(
    () => validateDetectedClauses(scan.results, clauses),
    [scan.results, clauses],
  );

  // -- NO conditional hooks below this line ----------------------------------

  if (!user) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 10 }}>
        <Typography variant="h6" color="text.secondary">
          Please sign in to use the Document Scanner.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 960, mx: 'auto', py: 4, px: 2 }}>
      {/* Header */}
      <Typography variant="h4" gutterBottom>
        Document Scanner
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Upload a document to detect compliance clauses using AI analysis.
      </Typography>

      {/* ---- Idle: show file upload ---- */}
      {scan.state === 'idle' && (
        <FileUpload onFileSelected={scan.upload} />
      )}

      {/* ---- Uploading / Processing: show progress ---- */}
      {(scan.state === 'uploading' || scan.state === 'processing') && (
        <ScanProgress
          state={scan.state}
          progress={scan.progress}
          fileName={scan.fileName}
        />
      )}

      {/* ---- Error: show message + retry ---- */}
      {scan.state === 'error' && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Alert severity="error" sx={{ mb: 3, justifyContent: 'center' }}>
            {scan.error || 'An unexpected error occurred.'}
          </Alert>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={scan.reset}
          >
            Try Again
          </Button>
        </Paper>
      )}

      {/* ---- Complete: show results + actions ---- */}
      {scan.state === 'complete' && (
        <>
          <ScanResultsTable
            results={validatedResults}
            onSelectionChange={setSelectedClauses}
          />

          {/* Action bar */}
          <Box sx={{ display: 'flex', gap: 2, mt: 3, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={scan.reset}
            >
              Scan Another Document
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={() => setShowSaveDialog(true)}
              disabled={selectedClauses.length === 0}
            >
              Save as Project ({selectedClauses.length})
            </Button>
          </Box>

          {/* Save-as-project dialog */}
          <SaveAsProjectDialog
            open={showSaveDialog}
            onClose={() => setShowSaveDialog(false)}
            scanId={scan.scanId}
            selectedClauseIds={selectedClauses}
            onProjectCreated={(projectId) => {
              // Navigate to the Matrix page for the new project.
              // SaveAsProjectDialog already set localStorage('projectId')
              // and called refreshProjects(), so the project selector and
              // BookmarkContext will pick up the new project automatically.
              navigate(`/matrix/${projectId}`);
            }}
          />
        </>
      )}
    </Box>
  );
};

export default DocumentScanner;
