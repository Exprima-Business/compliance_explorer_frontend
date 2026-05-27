import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import GavelIcon from '@mui/icons-material/Gavel';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import {
  acceptCandidate,
  fetchCandidates,
  parkCandidate,
  rejectCandidate,
  RELATIONSHIP_TYPES,
  type CandidateStatus,
  type ExtractionMethod,
  type RelationshipCandidate,
  type RelationshipType,
} from '../services/regulatoryReviewService';
import { extractErrorMessage } from '../utils/errorUtils';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<CandidateStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  rejected: 'Rejected',
  needs_context: 'Needs Context',
};

const STATUS_COLORS: Record<CandidateStatus, string> = {
  pending: '#f59e0b',
  accepted: '#22c55e',
  rejected: '#ef4444',
  needs_context: '#64748b',
};

const METHOD_LABELS: Record<ExtractionMethod, string> = {
  regex: 'Regex',
  llm: 'LLM',
  manual: 'Manual',
  imported: 'Imported',
};

function artifactTypeColor(t: string): string {
  if (t === 'executive_order') return '#dc2626';
  if (t === 'omb_memo') return '#9333ea';
  if (t === 'statute') return '#0891b2';
  if (t === 'cfr_part' || t === 'cfr_section') return '#0ea5e9';
  if (t === 'far_clause' || t === 'dfars_clause' || t === 'hsar_clause' || t === 'agency_supplement_clause') return '#f59e0b';
  if (t === 'nist_publication') return '#22c55e';
  return '#64748b';
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

const RegulatoryGraphReview: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [activeStatus, setActiveStatus] = useState<CandidateStatus>('pending');
  const [items, setItems] = useState<RelationshipCandidate[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<CandidateStatus, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);

  // Reject / Park dialog
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectMode, setRejectMode] = useState<'reject' | 'park'>('reject');
  const [rejectNotes, setRejectNotes] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const resp = await fetchCandidates({ status: activeStatus, limit: 50 });
    if (resp.error) {
      setError(extractErrorMessage(resp.error));
      setItems([]);
    } else if (resp.data) {
      setItems(resp.data.items);
      setStatusCounts(resp.data.statusCounts);
    }
    setLoading(false);
  }, [activeStatus]);

  useEffect(() => { void load(); }, [load]);

  const handleAccept = async (candidate: RelationshipCandidate, overrideType?: RelationshipType) => {
    setActioningId(candidate.id);
    setError(null);
    try {
      const resp = await acceptCandidate(candidate.id, {
        relationship_type: overrideType || candidate.suggested_relationship_type,
      });
      if (resp.error) {
        setError(extractErrorMessage(resp.error));
      } else {
        // Remove from list optimistically
        setItems(prev => prev.filter(c => c.id !== candidate.id));
        if (statusCounts) {
          setStatusCounts({
            ...statusCounts,
            pending: Math.max(0, statusCounts.pending - 1),
            accepted: statusCounts.accepted + 1,
          });
        }
      }
    } finally {
      setActioningId(null);
    }
  };

  const openReject = (candidateId: string, mode: 'reject' | 'park') => {
    setRejectId(candidateId);
    setRejectMode(mode);
    setRejectNotes('');
  };

  const closeReject = () => {
    setRejectId(null);
    setRejectNotes('');
  };

  const submitReject = async () => {
    if (!rejectId) return;
    if (!rejectNotes.trim()) {
      setError('Please provide a reason — it becomes the audit trail.');
      return;
    }
    setActioningId(rejectId);
    setError(null);
    try {
      const resp = rejectMode === 'reject'
        ? await rejectCandidate(rejectId, rejectNotes.trim())
        : await parkCandidate(rejectId, rejectNotes.trim());
      if (resp.error) {
        setError(extractErrorMessage(resp.error));
      } else {
        setItems(prev => prev.filter(c => c.id !== rejectId));
        if (statusCounts) {
          const targetStatus = rejectMode === 'reject' ? 'rejected' : 'needs_context';
          setStatusCounts({
            ...statusCounts,
            pending: Math.max(0, statusCounts.pending - 1),
            [targetStatus]: statusCounts[targetStatus] + 1,
          });
        }
        closeReject();
      }
    } finally {
      setActioningId(null);
    }
  };

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.5 }}>
        <GavelIcon color="primary" />
        <Typography variant={isMobile ? 'h5' : 'h4'} sx={{ fontWeight: 700 }}>
          Regulatory Graph Review
        </Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Review proposed relationship edges between regulatory artifacts. Every accepted edge
        carries its source paragraph as audit evidence. Reject candidates whose source paragraph
        doesn't actually establish the proposed relationship.
      </Typography>

      {/* Status filter chips */}
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 2 }}>
        {(['pending', 'accepted', 'rejected', 'needs_context'] as CandidateStatus[]).map((s) => {
          const count = statusCounts?.[s] ?? 0;
          return (
            <Chip
              key={s}
              label={`${STATUS_LABELS[s]} (${count})`}
              onClick={() => setActiveStatus(s)}
              variant={activeStatus === s ? 'filled' : 'outlined'}
              size="small"
              sx={{
                color: activeStatus === s ? '#fff' : STATUS_COLORS[s],
                bgcolor: activeStatus === s ? STATUS_COLORS[s] : 'transparent',
                borderColor: STATUS_COLORS[s],
                fontWeight: 600,
                '&:hover': {
                  bgcolor: activeStatus === s ? STATUS_COLORS[s] : 'action.hover',
                },
              }}
            />
          );
        })}
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : items.length === 0 ? (
        <Card variant="outlined">
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="body1" color="text.secondary">
              {activeStatus === 'pending'
                ? 'No candidates pending review. The regex parser and LLM enrichment will populate this queue.'
                : `No ${STATUS_LABELS[activeStatus].toLowerCase()} candidates.`}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={2}>
          {items.map((c) => (
            <CandidateCard
              key={c.id}
              candidate={c}
              busy={actioningId === c.id}
              onAccept={(type) => handleAccept(c, type)}
              onReject={() => openReject(c.id, 'reject')}
              onPark={() => openReject(c.id, 'park')}
            />
          ))}
        </Stack>
      )}

      {/* Reject / Park dialog */}
      <Dialog open={!!rejectId} onClose={closeReject} maxWidth="sm" fullWidth>
        <DialogTitle>
          {rejectMode === 'reject' ? 'Reject candidate' : 'Park for additional context'}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {rejectMode === 'reject'
              ? 'Capture why this edge is wrong — the rationale becomes the audit trail and helps tune the extractor.'
              : 'What context do you need to make the decision? You can revisit this candidate later from the Needs Context filter.'}
          </Typography>
          <TextField
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
            placeholder={rejectMode === 'reject'
              ? 'e.g. The source paragraph mentions the target as historical background, not as a binding reference.'
              : 'e.g. Need to confirm whether 252.204-7012(b)(2)(i) actually points at SP 800-171 Rev 3 vs Rev 2.'}
            multiline
            minRows={3}
            fullWidth
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeReject} disabled={!!actioningId}>Cancel</Button>
          <Button
            variant="contained"
            color={rejectMode === 'reject' ? 'error' : 'inherit'}
            onClick={submitReject}
            disabled={!!actioningId || !rejectNotes.trim()}
          >
            {actioningId ? 'Saving…' : rejectMode === 'reject' ? 'Reject' : 'Park'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Candidate card
// ─────────────────────────────────────────────────────────────────────────────

const CandidateCard: React.FC<{
  candidate: RelationshipCandidate;
  busy: boolean;
  onAccept: (overrideType?: RelationshipType) => void;
  onReject: () => void;
  onPark: () => void;
}> = ({ candidate, busy, onAccept, onReject, onPark }) => {
  const [typeOverride, setTypeOverride] = useState<RelationshipType>(candidate.suggested_relationship_type);

  const isPending = candidate.status === 'pending';
  const sourceColor = artifactTypeColor(candidate.source.artifact_type);
  const targetColor = artifactTypeColor(candidate.target.artifact_type);

  return (
    <Card variant="outlined">
      <CardContent>
        {/* Top row: source → type → target */}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} sx={{ mb: 2 }}>
          {/* Source */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Source
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
              <Chip
                label={candidate.source.artifact_type.replace(/_/g, ' ')}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.6rem', height: 18, color: sourceColor, borderColor: sourceColor }}
              />
              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                {candidate.source.identifier}
              </Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, display: 'block' }}>
              {candidate.source.title}
            </Typography>
          </Box>

          {/* Type — editable */}
          <Box sx={{ flex: '0 0 auto', minWidth: 220 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Relationship type
            </Typography>
            <TextField
              select
              size="small"
              fullWidth
              value={typeOverride}
              onChange={(e) => setTypeOverride(e.target.value as RelationshipType)}
              disabled={!isPending || busy}
              sx={{ mt: 0.5 }}
            >
              {RELATIONSHIP_TYPES.map((t) => (
                <MenuItem key={t} value={t}>
                  {t.replace(/_/g, ' ')}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          {/* Target */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Target
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
              <Chip
                label={candidate.target.artifact_type.replace(/_/g, ' ')}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.6rem', height: 18, color: targetColor, borderColor: targetColor }}
              />
              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                {candidate.target.identifier}
              </Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, display: 'block' }}>
              {candidate.target.title}
            </Typography>
          </Box>
        </Stack>

        <Divider sx={{ my: 1.5 }} />

        {/* Source paragraph */}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5 }}>
          Source paragraph (verbatim)
        </Typography>
        <Box
          sx={{
            p: 1.5,
            bgcolor: 'action.hover',
            borderLeft: '3px solid',
            borderColor: 'primary.main',
            borderRadius: '0 4px 4px 0',
            mb: 1,
          }}
        >
          <Typography
            variant="body2"
            sx={{ fontFamily: 'serif', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}
          >
            {candidate.source_paragraph}
          </Typography>
        </Box>

        {/* Citation + description (when present) */}
        {candidate.source_authority_for_link && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontFamily: 'monospace' }}>
            Citation: {candidate.source_authority_for_link}
          </Typography>
        )}
        {candidate.description && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontStyle: 'italic', mt: 0.5 }}>
            {candidate.description}
          </Typography>
        )}

        {/* Provenance footer */}
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5, flexWrap: 'wrap' }}>
          <Chip
            label={METHOD_LABELS[candidate.extraction_method]}
            size="small"
            variant="outlined"
            sx={{ fontSize: '0.65rem', height: 20 }}
          />
          <Typography variant="caption" color="text.disabled">
            Confidence: {(candidate.extraction_confidence * 100).toFixed(0)}%
          </Typography>
          <Typography variant="caption" color="text.disabled">
            Created: {new Date(candidate.created_at).toLocaleString()}
          </Typography>
        </Stack>

        {/* Reviewer notes (when not pending) */}
        {candidate.reviewer_notes && (
          <Alert severity={candidate.status === 'rejected' ? 'error' : candidate.status === 'accepted' ? 'success' : 'info'} sx={{ mt: 1.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>
              {candidate.status === 'rejected' ? 'Rejection reason' : candidate.status === 'needs_context' ? 'Parked for context' : 'Reviewer notes'}
            </Typography>
            {candidate.reviewer_notes}
          </Alert>
        )}

        {/* Action buttons — only on pending */}
        {isPending && (
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button
              variant="contained"
              color="success"
              startIcon={<CheckIcon />}
              onClick={() => onAccept(typeOverride)}
              disabled={busy}
            >
              Accept
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<CloseIcon />}
              onClick={onReject}
              disabled={busy}
            >
              Reject
            </Button>
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<HourglassEmptyIcon />}
              onClick={onPark}
              disabled={busy}
            >
              Park
            </Button>
            {busy && <CircularProgress size={20} sx={{ ml: 1 }} />}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
};

export default RegulatoryGraphReview;
