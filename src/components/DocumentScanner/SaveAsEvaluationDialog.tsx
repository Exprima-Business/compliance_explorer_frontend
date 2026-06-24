import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Box,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { evaluationService } from '../../services/evaluationService';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SaveAsEvaluationDialogProps {
  open: boolean;
  onClose: () => void;
  scanId: string | null;
  /** Called with the new evaluation id after a successful create */
  onCreated?: (evaluationId: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * SaveAsEvaluationDialog
 *
 * Saves a completed scan as a **solicitation evaluation** — the durable
 * record of "what this solicitation required, and how it compares to our
 * compliance program." Calls `POST /api/solicitation-evaluations` (036e).
 *
 * The evaluation is read-only analysis; it does NOT modify the compliance
 * program. Applying clauses into the program is a separate, explicit action
 * available on the evaluation detail page.
 */
const SaveAsEvaluationDialog: React.FC<SaveAsEvaluationDialogProps> = ({
  open,
  onClose,
  scanId,
  onCreated,
}) => {
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));

  // Coverage (covered / gap) for each detected clause is computed by the
  // backend against the org baseline (no program scope).

  const [title, setTitle] = useState('');
  const [solicitationNumber, setSolicitationNumber] = useState('');
  const [agency, setAgency] = useState('');
  const [responseDueDate, setResponseDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = !!title.trim();

  const resetForm = () => {
    setTitle('');
    setSolicitationNumber('');
    setAgency('');
    setResponseDueDate('');
    setError(null);
  };

  const handleClose = () => {
    if (loading) return;
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!scanId) {
      setError('No scan ID available.');
      return;
    }
    if (!title.trim()) {
      setError('A solicitation title is required.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const resp = await evaluationService.create({
        scanId,
        title: title.trim(),
        solicitationNumber: solicitationNumber.trim() || undefined,
        agency: agency.trim() || undefined,
        responseDueDate: responseDueDate || undefined,
      });

      if (resp.error) {
        const msg = typeof resp.error === 'string' ? resp.error : resp.error.message;
        setError(msg);
        return;
      }

      const evaluationId = resp.data?.evaluation?.id;
      resetForm();
      onClose();
      if (evaluationId) onCreated?.(evaluationId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save evaluation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth fullScreen={isMobile}>
      <DialogTitle>Save as Evaluation</DialogTitle>

      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Saves this scan as an evaluation — a record of what the document
          requires and how it compares to your compliance program. It does
          not change your program; you can apply clauses into the program
          afterward from the evaluation page.
        </Typography>

        <TextField
          autoFocus
          fullWidth
          label="Document Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={loading}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          label="Document Number (optional)"
          value={solicitationNumber}
          onChange={(e) => setSolicitationNumber(e.target.value)}
          disabled={loading}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          label="Agency (optional)"
          value={agency}
          onChange={(e) => setAgency(e.target.value)}
          disabled={loading}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          type="date"
          label="Response Due Date (optional)"
          value={responseDueDate}
          onChange={(e) => setResponseDueDate(e.target.value)}
          disabled={loading}
          InputLabelProps={{ shrink: true }}
        />

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || !canSubmit}
          startIcon={loading ? <CircularProgress size={18} /> : undefined}
        >
          {loading ? 'Saving...' : 'Save Evaluation'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SaveAsEvaluationDialog;
