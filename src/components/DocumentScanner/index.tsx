import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Alert, Paper, useMediaQuery, useTheme } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SaveIcon from '@mui/icons-material/Save';

import { useAuth } from '../../hooks/useAuth';
import { useClause } from '../../contexts/ClauseContext';
import { useScanUpload } from '../../hooks/useScanUpload';
import { validateDetectedClauses } from '../../utils/clauseMatching';
import FileUpload from './FileUpload';
import ScanProgress from './ScanProgress';
import ScanResultsTable from './ScanResultsTable';
import SaveAsEvaluationDialog from './SaveAsEvaluationDialog';

// ---------------------------------------------------------------------------
// DocumentScanner — thin orchestrator
// ---------------------------------------------------------------------------

export const DocumentScanner: React.FC = () => {
  // -- ALL hooks at the top, unconditionally ---------------------------------
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const { user } = useAuth();
  const { scanId: urlScanId } = useParams<{ scanId?: string }>();
  const { clauses } = useClause();

  const navigate = useNavigate();
  const scan = useScanUpload(urlScanId);

  const [showEvalDialog, setShowEvalDialog] = useState(false);

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
    <Box sx={{ maxWidth: 960, mx: 'auto', py: isMobile ? 2 : 4, px: isMobile ? 1 : 2 }}>
      {/* Header */}
      <Typography variant={isMobile ? 'h5' : 'h4'} gutterBottom>
        Document Scanner
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: isMobile ? 2 : 4 }}>
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
            onSelectionChange={() => {}}
          />

          {/* Action bar */}
          <Box sx={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? 1.5 : 2,
            mt: isMobile ? 2 : 3,
            justifyContent: isMobile ? 'stretch' : 'flex-end',
          }}>
            <Button
              variant="outlined"
              size={isMobile ? 'small' : 'medium'}
              startIcon={<RefreshIcon />}
              onClick={() => scan.reset()}
              fullWidth={isMobile}
            >
              Scan Another Document
            </Button>
            {/* Save the scan as a solicitation evaluation — the full
                pre-bid analysis record covering ALL detected clauses.
                Applying selected clauses to the compliance program
                happens from the evaluation detail page. */}
            <Button
              variant="contained"
              size={isMobile ? 'small' : 'medium'}
              startIcon={<SaveIcon />}
              onClick={() => setShowEvalDialog(true)}
              fullWidth={isMobile}
            >
              Save as Solicitation Evaluation
            </Button>
          </Box>

          {/* Save-as-evaluation dialog (036f — pre-bid validator flow) */}
          <SaveAsEvaluationDialog
            open={showEvalDialog}
            onClose={() => setShowEvalDialog(false)}
            scanId={scan.scanId}
            onCreated={(evaluationId) => navigate(`/evaluations/${evaluationId}`)}
          />
        </>
      )}
    </Box>
  );
};

export default DocumentScanner;
