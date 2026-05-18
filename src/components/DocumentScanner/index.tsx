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
import SaveAsProjectDialog from './SaveAsProjectDialog';
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

  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showEvalDialog, setShowEvalDialog] = useState(false);
  const [selectedClauses, setSelectedClauses] = useState<string[]>([]);

  // Cross-reference scan results against the clauses DB whenever results
  // or the DB clause list changes. This gives immediate feedback about
  // which detected clauses actually exist in the database.
  const validatedResults = useMemo(
    () => validateDetectedClauses(scan.results, clauses),
    [scan.results, clauses],
  );

  // Detected clauses the user has UN-checked. Computed here (where both the
  // full result set and the live selection are available) and handed to the
  // save dialog so it can warn before the user excludes anything — especially
  // unmatched clauses, which are real regulations not yet in our database.
  // `selectedClauses` holds `matchedClauseId || clauseId`, so a result counts
  // as selected when either of those identifiers is present.
  const deselectedClauses = useMemo(
    () =>
      validatedResults
        .filter(r => !selectedClauses.includes(r.matchedClauseId || r.clauseId))
        .map(r => ({
          clauseId: r.clauseId,
          title: r.title,
          isUnmatched: r.matchType === 'none',
        })),
    [validatedResults, selectedClauses],
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
            onSelectionChange={setSelectedClauses}
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
              onClick={() => { scan.reset(); setSelectedClauses([]); }}
              fullWidth={isMobile}
            >
              Scan Another Document
            </Button>
            {/* Secondary, transitional: direct save into a project.
                Retired in 036f-2 once the evaluation flow is validated. */}
            <Button
              variant="outlined"
              size={isMobile ? 'small' : 'medium'}
              startIcon={<SaveIcon />}
              onClick={() => setShowSaveDialog(true)}
              disabled={selectedClauses.length === 0}
              fullWidth={isMobile}
            >
              Save to Project ({selectedClauses.length})
            </Button>
            {/* Primary: save the scan as a solicitation evaluation. The
                evaluation captures ALL detected clauses (not just the
                checked ones) — it is the full pre-bid analysis record. */}
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

          {/* Save-as-project dialog (transitional) */}
          <SaveAsProjectDialog
            open={showSaveDialog}
            onClose={() => setShowSaveDialog(false)}
            scanId={scan.scanId}
            selectedClauseIds={selectedClauses}
            deselectedClauses={deselectedClauses}
            onProjectCreated={(projectId) => {
              // Navigate to the Matrix page for the new project.
              // SaveAsProjectDialog already set localStorage('projectId')
              // and called refreshProjects(), so the project selector and
              // BookmarkContext will pick up the new project automatically.
              navigate(`/matrix/${projectId}`);
            }}
          />

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
