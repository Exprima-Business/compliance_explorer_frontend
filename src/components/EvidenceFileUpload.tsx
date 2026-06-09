import React, { useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { evidenceService, type EvidenceArtifactType } from '../services/evidenceService';

/**
 * EvidenceFileUpload — Phase D Batch 4
 *
 * Drag-drop + file-picker control that uploads a single file to
 * POST /api/evidence and surfaces the returned artifact to the parent via
 * `onUploaded`. Parents decide what to do with the id (store in
 * structured_evidence, attach via POST /api/evidence/:id/mappings, etc.).
 *
 * Standing principle: smallest, most boring solution.
 *   - MUI Button + hidden <input> + onDragOver/onDrop (no react-dropzone).
 *   - One XHR upload (for progress) via evidenceService.uploadFileWithProgress.
 *   - 50 MB client-side cap with a friendly message.
 */

/** Locked interface — Agent L (Controls.tsx) imports this verbatim. */
export interface EvidenceFileUploadProps {
  /** Disable while parent is saving / row is read-only. */
  disabled?: boolean;
  /** Called after a successful upload with normalized artifact fields. */
  onUploaded: (artifact: {
    id: string;
    file_name: string;
    artifact_type: string;
    signed_url?: string | null;
  }) => void | Promise<void>;
  /** Optional pre-selection of artifact_type — falls through to a dropdown if absent. */
  defaultArtifactType?: 'document' | 'screenshot' | 'config_export' | 'generated' | 'other';
  /** If true, component shows inline success message after upload. */
  showSuccessMessage?: boolean;
}

const ARTIFACT_TYPE_OPTIONS: ReadonlyArray<{ value: EvidenceArtifactType; label: string }> = [
  { value: 'document', label: 'Document' },
  { value: 'screenshot', label: 'Screenshot' },
  { value: 'config_export', label: 'Config export' },
  { value: 'generated', label: 'Generated' },
  { value: 'other', label: 'Other' },
];

const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB

const EvidenceFileUpload: React.FC<EvidenceFileUploadProps> = ({
  disabled = false,
  onUploaded,
  defaultArtifactType,
  showSuccessMessage = false,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [artifactType, setArtifactType] = useState<EvidenceArtifactType>(
    defaultArtifactType ?? 'document',
  );
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastUploadedName, setLastUploadedName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (file: File) => {
    setError(null);

    if (file.size > MAX_FILE_BYTES) {
      setError(
        `File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). The 50 MB limit keeps uploads fast — split or compress the file and try again.`,
      );
      return;
    }

    setUploading(true);
    setProgress(0);

    const resp = await evidenceService.uploadFileWithProgress(
      file,
      artifactType,
      (pct) => setProgress(pct),
    );

    setUploading(false);

    if (resp.error || !resp.data) {
      const msg =
        typeof resp.error === 'string'
          ? resp.error
          : resp.error?.message ?? 'Upload failed';
      setError(msg);
      return;
    }

    const artifact = resp.data;
    setLastUploadedName(artifact.filename);

    // Best-effort: fetch a signed URL so the parent can render a download link
    // immediately. If this fails, hand back null — the parent can re-fetch
    // via GET /api/evidence/:id later.
    let signedUrl: string | null = null;
    try {
      const detail = await evidenceService.getArtifact(artifact.id);
      if (detail.data?.signedUrl) signedUrl = detail.data.signedUrl;
    } catch {
      // non-fatal — parent gets null signed_url
    }

    await onUploaded({
      id: artifact.id,
      file_name: artifact.filename,
      artifact_type: artifact.artifactType,
      signed_url: signedUrl,
    });

    // Reset to ready state so the user can upload another file.
    if (inputRef.current) inputRef.current.value = '';
    setProgress(0);
  };

  const onPickFromInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled || uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (disabled || uploading) return;
    setDragOver(true);
  };

  const onDragLeave = () => setDragOver(false);

  const allDisabled = disabled || uploading;

  return (
    <Box sx={{ mt: 1 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        alignItems={{ xs: 'stretch', sm: 'center' }}
      >
        {!defaultArtifactType && (
          <FormControl size="small" sx={{ minWidth: 160 }} disabled={allDisabled}>
            <InputLabel>File type</InputLabel>
            <Select
              value={artifactType}
              label="File type"
              onChange={(e) => setArtifactType(e.target.value as EvidenceArtifactType)}
            >
              {ARTIFACT_TYPE_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <Box
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          sx={{
            flex: 1,
            border: '1px dashed',
            borderColor: dragOver ? 'primary.main' : 'divider',
            borderRadius: 1,
            px: 1.5,
            py: 1,
            bgcolor: dragOver ? 'action.hover' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            transition: 'background-color 120ms, border-color 120ms',
          }}
        >
          <Button
            size="small"
            variant="outlined"
            startIcon={<CloudUploadIcon />}
            disabled={allDisabled}
            onClick={() => inputRef.current?.click()}
          >
            Upload file
          </Button>
          <Typography variant="caption" color="text.secondary">
            or drop a file here (max 50 MB)
          </Typography>
          <input
            ref={inputRef}
            type="file"
            hidden
            onChange={onPickFromInput}
            disabled={allDisabled}
          />
        </Box>
      </Stack>

      {uploading && (
        <Box sx={{ mt: 1 }}>
          <LinearProgress variant="determinate" value={progress} />
          <Typography variant="caption" color="text.secondary">
            Uploading… {progress}%
          </Typography>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 1, py: 0.5 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {showSuccessMessage && lastUploadedName && !uploading && !error && (
        <Alert severity="success" sx={{ mt: 1, py: 0.5 }} onClose={() => setLastUploadedName(null)}>
          Uploaded <strong>{lastUploadedName}</strong>.
        </Alert>
      )}
    </Box>
  );
};

export default EvidenceFileUpload;
export { EvidenceFileUpload };
