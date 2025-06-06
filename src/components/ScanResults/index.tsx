import React from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  LinearProgress,
  CircularProgress,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';

interface ClauseResult {
  clauseId: string;
  title: string;
  description: string;
  confidence: number;
  semanticSimilarity?: number;
  supportingContext?: string;
  family?: string;
  conditions?: string;
  implementationRequirements?: string;
}

interface ScanResultsProps {
  results: ClauseResult[];
  progress?: ScanProgress | null;
}

interface ScanProgress {
  current: number;
  total: number;
  status: 'processing' | 'completed' | 'error';
  message?: string;
}

export const ScanResults: React.FC<ScanResultsProps> = ({ results, progress }) => {
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.5) return 'warning';
    return 'error';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.8) return <CheckCircleIcon />;
    return <WarningIcon />;
  };

  return (
    <Box sx={{ width: '100%', mt: 4 }}>
      <Typography variant="h6" gutterBottom>
        Analysis Results
      </Typography>
      
      {progress && (
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" sx={{ mr: 1 }}>
              {progress.status === 'processing' ? 'Processing document...' : 
               progress.status === 'completed' ? 'Analysis completed' : 
               'Error occurred'}
            </Typography>
            {progress.status === 'processing' && (
              <CircularProgress size={20} sx={{ ml: 1 }} />
            )}
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={(progress.current / progress.total) * 100}
            color={progress.status === 'error' ? 'error' : 'primary'}
          />
          {progress.message && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
              {progress.message}
            </Typography>
          )}
        </Box>
      )}

      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Clause ID</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Family</TableCell>
              <TableCell>Confidence</TableCell>
              <TableCell>Details</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {results.map((result, index) => (
              <TableRow key={index}>
                <TableCell>{result.clauseId || 'N/A'}</TableCell>
                <TableCell>{result.title}</TableCell>
                <TableCell>{result.description}</TableCell>
                <TableCell>{result.family || 'N/A'}</TableCell>
                <TableCell>
                  <Chip
                    icon={getConfidenceIcon(result.confidence)}
                    label={`${(result.confidence * 100).toFixed(0)}%`}
                    color={getConfidenceColor(result.confidence)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {result.supportingContext && (
                    <Chip
                      icon={<InfoIcon />}
                      label="View Context"
                      size="small"
                      onClick={() => {
                        // TODO: Implement context viewer
                        console.log('Context:', result.supportingContext);
                      }}
                    />
                  )}
                </TableCell>
              </TableRow>
            ))}
            {results.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No clauses found in the document
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}; 