import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import type { ScanState } from '../../hooks/useScanUpload';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScanProgressProps {
  state: ScanState;
  /** Raw SSE payload from the backend — shape may vary */
  progress: Record<string, any> | null;
  fileName: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Derive a percentage (0-100) from whatever the backend sends.
 * The backend's ScanProgressService sends a `progress` field (0-100).
 * Falls back to chunk ratio if present, or null if nothing useful.
 */
function derivePercent(p: Record<string, any> | null): number | null {
  if (!p) return null;

  // Backend sends `progress` as 0-100
  if (typeof p.progress === 'number' && p.progress > 0) {
    return Math.min(Math.round(p.progress), 100);
  }

  // Fallback: chunk-based ratio (current/total from frontend type)
  if (typeof p.current === 'number' && typeof p.total === 'number' && p.total > 0) {
    return Math.min(Math.round((p.current / p.total) * 100), 100);
  }

  // Fallback: currentChunk / totalChunks from backend
  if (typeof p.currentChunk === 'number' && typeof p.totalChunks === 'number' && p.totalChunks > 0) {
    return Math.min(Math.round((p.currentChunk / p.totalChunks) * 100), 100);
  }

  return null;
}

/**
 * Pick a human-friendly status message based on the backend status field
 * and the hook-level state.
 */
function statusMessage(state: ScanState, p: Record<string, any> | null): string {
  // Use backend message if provided
  if (p?.message && typeof p.message === 'string' && p.message.length > 0) {
    return p.message;
  }

  // Map backend status strings to friendly text
  const backendStatus = p?.status as string | undefined;

  if (state === 'uploading') return 'Uploading your document\u2026';

  switch (backendStatus) {
    case 'connected':
      return 'Connected \u2014 preparing to process\u2026';
    case 'uploading':
      return 'Uploading document\u2026';
    case 'processing':
      return 'Extracting text from document\u2026';
    case 'analyzing':
      return 'AI is analyzing clauses \u2014 this may take a moment\u2026';
    default:
      return 'Processing document\u2026';
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ScanProgress: React.FC<ScanProgressProps> = ({ state, progress, fileName }) => {
  const pct = derivePercent(progress);
  const hasDeterminate = pct !== null && pct > 0;
  const msg = statusMessage(state, progress);

  // Estimated time remaining (backend sends in seconds)
  const etr =
    progress && typeof progress.estimatedTimeRemaining === 'number' && progress.estimatedTimeRemaining > 0
      ? progress.estimatedTimeRemaining
      : null;

  return (
    <Card variant="outlined" sx={{ maxWidth: 520, mx: 'auto' }}>
      <CardContent>
        {/* File name */}
        {fileName && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <DescriptionIcon fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary" noWrap>
              {fileName}
            </Typography>
          </Box>
        )}

        {/* Progress bar */}
        <Box sx={{ mb: 1.5 }}>
          <LinearProgress
            variant={hasDeterminate ? 'determinate' : 'indeterminate'}
            value={hasDeterminate ? pct! : undefined}
            sx={{ height: 6, borderRadius: 3 }}
          />
        </Box>

        {/* Status row */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Typography variant="body2" color="text.primary">
            {msg}
          </Typography>

          {hasDeterminate && (
            <Typography variant="body2" color="text.secondary" sx={{ ml: 2, whiteSpace: 'nowrap' }}>
              {pct}%
            </Typography>
          )}
        </Box>

        {/* Estimated time remaining */}
        {etr !== null && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            ~{etr < 60 ? `${etr}s` : `${Math.ceil(etr / 60)} min`} remaining
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default ScanProgress;
