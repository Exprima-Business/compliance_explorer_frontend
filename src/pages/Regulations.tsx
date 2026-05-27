import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  Pagination,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import {
  fetchRegulatoryArtifacts,
  type RegulatoryArtifactListItem,
  type RegulatoryArtifactsResponse,
} from '../services/regulatoryArtifactsService';
import { extractErrorMessage } from '../utils/errorUtils';

// ─────────────────────────────────────────────────────────────────────────────
// Display helpers
// ─────────────────────────────────────────────────────────────────────────────

function typeLabel(t: string): string {
  return t
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function typeColor(t: string): string {
  if (t === 'executive_order') return '#dc2626';
  if (t === 'omb_memo') return '#9333ea';
  if (t === 'statute') return '#0891b2';
  if (t === 'cfr_part' || t === 'cfr_section') return '#0ea5e9';
  if (t === 'far_clause' || t === 'dfars_clause' || t === 'hsar_clause' || t === 'agency_supplement_clause') return '#f59e0b';
  if (t === 'nist_publication') return '#22c55e';
  return '#64748b';
}

const PAGE_SIZE = 25;

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

const Regulations: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeType = searchParams.get('type') || '';
  const activeQuery = searchParams.get('q') || '';
  const activePage = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);

  const [searchInput, setSearchInput] = useState(activeQuery);
  const [data, setData] = useState<RegulatoryArtifactsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Keep search input in sync when URL changes (back button, etc.)
  useEffect(() => {
    setSearchInput(activeQuery);
  }, [activeQuery]);

  // Load data whenever filter / page changes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const resp = await fetchRegulatoryArtifacts({
        type: activeType || undefined,
        q: activeQuery || undefined,
        limit: PAGE_SIZE,
        offset: (activePage - 1) * PAGE_SIZE,
      });
      if (cancelled) return;
      if (resp.error) {
        setError(extractErrorMessage(resp.error));
      } else if (resp.data) {
        setData(resp.data);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [activeType, activeQuery, activePage]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const setFilter = useCallback((updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === '') next.delete(key);
      else next.set(key, value);
    }
    // Reset page when filter or search changes
    if ('type' in updates || 'q' in updates) next.delete('page');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFilter({ q: searchInput.trim() || null });
  };

  const totalPages = useMemo(
    () => (data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1),
    [data],
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
        <AccountBalanceIcon color="primary" />
        <Typography variant={isMobile ? 'h5' : 'h4'} sx={{ fontWeight: 700 }}>
          Regulations
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Browse every regulatory artifact tracked by the platform — federal acquisition clauses,
        executive orders, OMB memoranda, NIST publications, statutes, and CFR sections — and the
        relationships between them. Click any artifact for its full detail and graph view.
      </Typography>

      {/* Search */}
      <Box component="form" onSubmit={handleSearchSubmit} sx={{ mb: 2 }}>
        <TextField
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by identifier or title (e.g. 'DFARS 7012', '14028', 'CUI')"
          size="small"
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: searchInput && (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={() => {
                    setSearchInput('');
                    setFilter({ q: null });
                  }}
                  aria-label="Clear search"
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Type filter chips */}
      {data && data.types.length > 0 && (
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          flexWrap="wrap"
          sx={{ mb: 2 }}
        >
          <Chip
            label={`All (${data.types.reduce((sum, t) => sum + t.count, 0)})`}
            onClick={() => setFilter({ type: null })}
            variant={activeType === '' ? 'filled' : 'outlined'}
            color={activeType === '' ? 'primary' : 'default'}
            size="small"
          />
          {data.types.map(({ artifact_type, count }) => (
            <Chip
              key={artifact_type}
              label={`${typeLabel(artifact_type)} (${count})`}
              onClick={() => setFilter({ type: artifact_type })}
              variant={activeType === artifact_type ? 'filled' : 'outlined'}
              size="small"
              sx={{
                color: activeType === artifact_type ? '#fff' : typeColor(artifact_type),
                bgcolor: activeType === artifact_type ? typeColor(artifact_type) : 'transparent',
                borderColor: typeColor(artifact_type),
                '&:hover': {
                  bgcolor: activeType === artifact_type ? typeColor(artifact_type) : 'action.hover',
                },
              }}
            />
          ))}
        </Stack>
      )}

      {/* Status + results */}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : data && data.items.length === 0 ? (
        <Card variant="outlined">
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="body1" color="text.secondary">
              No regulations match your filter.
              {(activeType || activeQuery) && (
                <>
                  {' '}
                  <Typography
                    component="span"
                    color="primary"
                    sx={{ cursor: 'pointer', textDecoration: 'underline' }}
                    onClick={() => {
                      setSearchInput('');
                      setFilter({ q: null, type: null });
                    }}
                  >
                    Clear filters
                  </Typography>
                </>
              )}
            </Typography>
          </CardContent>
        </Card>
      ) : data ? (
        <>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Showing {(activePage - 1) * PAGE_SIZE + 1}
            –{Math.min(activePage * PAGE_SIZE, data.total)} of {data.total}
            {activeType && ` ${typeLabel(activeType)}`}
            {activeQuery && ` matching "${activeQuery}"`}
          </Typography>

          <Stack spacing={1} sx={{ mb: 3 }}>
            {data.items.map((artifact) => (
              <ArtifactCard key={artifact.id} artifact={artifact} onClick={() => {
                navigate(`/clauses/${encodeURIComponent(artifact.identifier)}`);
              }} />
            ))}
          </Stack>

          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Pagination
                count={totalPages}
                page={activePage}
                onChange={(_, value) => setFilter({ page: String(value) })}
                color="primary"
                size={isMobile ? 'small' : 'medium'}
              />
            </Box>
          )}
        </>
      ) : null}
    </Box>
  );
};

const ArtifactCard: React.FC<{
  artifact: RegulatoryArtifactListItem;
  onClick: () => void;
}> = ({ artifact, onClick }) => {
  return (
    <Card
      variant="outlined"
      onClick={onClick}
      sx={{
        cursor: 'pointer',
        borderLeft: '3px solid',
        borderColor: typeColor(artifact.artifact_type),
        transition: 'all 0.15s',
        '&:hover': {
          boxShadow: 1,
          bgcolor: 'action.hover',
        },
      }}
    >
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', mb: 0.5 }}>
          <Chip
            label={typeLabel(artifact.artifact_type)}
            size="small"
            variant="outlined"
            sx={{
              fontSize: '0.65rem',
              height: 20,
              color: typeColor(artifact.artifact_type),
              borderColor: typeColor(artifact.artifact_type),
            }}
          />
          <Typography
            variant="body2"
            sx={{ fontFamily: 'monospace', fontWeight: 700, color: 'primary.main' }}
          >
            {artifact.identifier}
          </Typography>
          {artifact.version && (
            <Typography variant="caption" color="text.secondary">
              v{artifact.version}
            </Typography>
          )}
          <Box sx={{ flexGrow: 1 }} />
          <Typography variant="caption" color="text.disabled">
            {artifact.source_authority}
          </Typography>
        </Stack>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {artifact.title}
        </Typography>
        {artifact.summary && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              mt: 0.5,
              lineHeight: 1.5,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            } as any}
          >
            {artifact.summary}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default Regulations;
