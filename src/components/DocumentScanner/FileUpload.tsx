import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Box, Typography, Paper } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DescriptionIcon from '@mui/icons-material/Description';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FileUploadProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

// Accepted MIME types — matches scanApi.validateFile
const ACCEPTED_TYPES: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'text/plain': ['.txt'],
};

const MAX_SIZE = 25 * 1024 * 1024; // 25 MB

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelected, disabled = false }) => {
  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted.length > 0) {
        onFileSelected(accepted[0]);
      }
    },
    [onFileSelected],
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_SIZE,
    multiple: false,
    disabled,
  });

  return (
    <Paper
      {...getRootProps()}
      variant="outlined"
      sx={{
        p: 5,
        textAlign: 'center',
        cursor: disabled ? 'default' : 'pointer',
        borderStyle: 'dashed',
        borderWidth: 2,
        borderColor: isDragReject
          ? 'error.main'
          : isDragActive
            ? 'primary.main'
            : 'grey.400',
        bgcolor: isDragActive ? 'action.hover' : 'background.paper',
        opacity: disabled ? 0.5 : 1,
        transition: 'border-color 0.2s, background-color 0.2s',
        '&:hover': disabled
          ? {}
          : { borderColor: 'primary.main', bgcolor: 'action.hover' },
      }}
    >
      <input {...getInputProps()} />

      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
        {isDragActive ? (
          <>
            <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main' }} />
            <Typography variant="h6" color="primary">
              Drop your file here
            </Typography>
          </>
        ) : (
          <>
            <DescriptionIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
            <Typography variant="h6">
              Drag &amp; drop a document here, or click to browse
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Supported formats: PDF, Word, Excel, Text &mdash; Max 25 MB
            </Typography>
          </>
        )}
      </Box>
    </Paper>
  );
};

export default FileUpload;
