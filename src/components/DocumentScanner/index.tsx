import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Alert, AlertTitle, Paper, Checkbox, FormControlLabel,
  useMediaQuery, useTheme,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SaveIcon from '@mui/icons-material/Save';

import { useAuth } from '../../hooks/useAuth';
import { useClause } from '../../contexts/ClauseContext';
import { useScanUpload } from '../../hooks/useScanUpload';
import { validateDetectedClauses } from '../../utils/clauseMatching';
import FileUpload from './FileUpload';
import Disclaimer from '../Disclaimer';
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
  // Hard upload gate: the user must affirm no CUI/classified/export-controlled
  // material before the uploader is enabled (beta trust requirement).
  const [acknowledged, setAcknowledged] = useState(false);

  // Cross-reference scan results against the clauses DB whenever results
  // or the DB clause list changes. This gives immediate feedback about
  // which detected clauses actually exist in the database.
  const validatedResults = useMemo(
    () => validateDetectedClauses(scan.results, clauses),
    [scan.results, clauses],
  );

  // ── Scan persistence ──────────────────────────────────────────────
  // Scan state lives in memory; navigating away unmounts this component
  // and loses it. The scan itself is a server-side job and keeps running.
  // Once a scan has an id, mirror it into the URL and remember it, so
  // returning to the scanner (tab click or back) restores the in-progress
  // or completed scan via useScanUpload's scanId-restore path. Demo scans
  // (demo-* ids) are local-only and cannot be restored, so they are skipped.
  useEffect(() => {
    const sid = scan.scanId;
    if (!sid || sid.startsWith('demo-')) return;
    localStorage.setItem('lastScanId', sid);
    if (sid !== urlScanId) {
      navigate(`/document-scanner/${sid}`, { replace: true });
    }
  }, [scan.scanId, urlScanId, navigate]);

  // Reset both the scan state and the persisted/URL scan reference, so
  // "Scan Another Document" (and error retry) return to a clean slate.
  const handleReset = useCallback(() => {
    scan.reset();
    setAcknowledged(false); // re-gate the next upload
    localStorage.removeItem('lastScanId');
    navigate('/document-scanner', { replace: true });
  }, [scan, navigate]);

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

      {/* ---- Idle: hard upload gate + file upload ---- */}
      {scan.state === 'idle' && (
        <>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <AlertTitle sx={{ fontWeight: 600 }}>Before you upload</AlertTitle>
            <Typography variant="body2">
              Upload only <strong>public or appropriately redacted</strong> solicitations. Do not upload
              Controlled Unclassified Information (CUI), classified, or export-controlled (ITAR/EAR)
              material. ClauseAtlas is an informational tool — it is <strong>not legal advice</strong> and
              <strong> not a CMMC or assessment authority</strong>. You can request deletion of any uploaded
              document at any time.
            </Typography>
          </Alert>
          <FormControlLabel
            sx={{ mb: 2, alignItems: 'flex-start', '& .MuiCheckbox-root': { pt: 0 } }}
            control={
              <Checkbox
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                inputProps={{ 'aria-label': 'Acknowledge upload terms' }}
              />
            }
            label={
              <Typography variant="body2" color="text.secondary">
                I confirm this document contains no CUI, classified, or export-controlled information, and I
                have the right to upload it.
              </Typography>
            }
          />
          <FileUpload onFileSelected={scan.upload} disabled={!acknowledged} />
        </>
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
            onClick={handleReset}
          >
            Try Again
          </Button>
        </Paper>
      )}

      {/* ---- Complete: show results + actions ---- */}
      {scan.state === 'complete' && (
        <>
          <Box sx={{ mb: 2 }}><Disclaimer /></Box>
          <ScanResultsTable results={validatedResults} />

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
              onClick={handleReset}
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
              Save as Evaluation
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
