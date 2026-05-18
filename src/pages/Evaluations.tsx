import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, CircularProgress, Alert, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  useTheme, useMediaQuery,
} from '@mui/material';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import { evaluationService, type SolicitationEvaluation } from '../services/evaluationService';

/** Small coloured chip summarising an evaluation's coverage. */
const CoverageChips: React.FC<{ e: SolicitationEvaluation }> = ({ e }) => {
  const s = e.coverageSummary ?? { detected: 0, covered: 0, gaps: 0, unknown: 0 };
  return (
    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
      <Chip size="small" label={`${s.covered} covered`} color="success" variant="outlined" />
      <Chip size="small" label={`${s.gaps} gaps`} color="warning" variant="outlined" />
      {s.unknown > 0 && (
        <Chip size="small" label={`${s.unknown} unknown`} variant="outlined" />
      )}
    </Box>
  );
};

const Evaluations: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();

  const [evaluations, setEvaluations] = useState<SolicitationEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const resp = await evaluationService.list();
      if (cancelled) return;
      if (resp.error) {
        setError(typeof resp.error === 'string' ? resp.error : resp.error.message);
      } else {
        setEvaluations(resp.data ?? []);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <Typography variant={isMobile ? 'h5' : 'h4'} gutterBottom>
        Solicitation Evaluations
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Pre-bid evaluations — each one records what a scanned solicitation
        requires and how it compares to your compliance program.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {evaluations.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <FactCheckIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography variant="h6" gutterBottom>No solicitation evaluations yet</Typography>
            <Typography variant="body2" color="text.secondary">
              Scan a solicitation in the Document Scanner, then choose
              &ldquo;Save as Solicitation Evaluation&rdquo; to create one.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Solicitation</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Agency</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Coverage</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Created</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {evaluations.map(e => (
                  <TableRow
                    key={e.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/evaluations/${e.id}`)}
                  >
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{e.title}</Typography>
                      {e.solicitationNumber && (
                        <Typography variant="caption" color="text.secondary">
                          {e.solicitationNumber}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{e.agency || '—'}</TableCell>
                    <TableCell><CoverageChips e={e} /></TableCell>
                    <TableCell>
                      <Chip size="small" label={e.status} variant="outlined" />
                    </TableCell>
                    <TableCell>
                      {new Date(e.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}
    </Box>
  );
};

export default Evaluations;
