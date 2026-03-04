import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
} from '@mui/material';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import type { ScanProgress as ScanProgressData } from '../../services/scanApi';
import type { ScanState } from '../../hooks/useScanUpload';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScanProgressProps {
  state: ScanState;
  progress: ScanProgressData | null;
  fileName: string | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ScanProgress: React.FC<ScanProgressProps> = ({ state, progress, fileName }) => {
  const pct =
    progress && progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0;

  const statusLabel =
    state === 'uploading'
      ? 'Uploading'
      : state === 'processing'
        ? 'Analyzing'
        : 'Working';

  return (
    <Card variant="outlined" sx={{ maxWidth: 520, mx: 'auto' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <HourglassTopIcon color="primary" />
          <Typography variant="h6">
            {state === 'uploading' ? 'Uploading Document' : 'Scanning Document'}
          </Typography>
        </Box>

        {fileName && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {fileName}
          </Typography>
        )}

        <Box sx={{ mb: 1 }}>
          <LinearProgress
            variant={state === 'uploading' || !progress ? 'indeterminate' : 'determinate'}
            value={pct}
          />
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Chip label={statusLabel} size="small" color="primary" variant="outlined" />

          {progress && progress.total > 0 && (
            <Typography variant="caption" color="text.secondary">
              {progress.current} / {progress.total} chunks
            </Typography>
          )}
        </Box>

        {progress?.message && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            {progress.message}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default ScanProgress;
