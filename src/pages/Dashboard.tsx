import React, { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  CircularProgress,
  Alert,
  LinearProgress,
  Collapse,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Security as SecurityIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  FolderOpen as FolderIcon,
  BubbleChart as GraphIcon,
  DocumentScanner as ScannerIcon,
  TableChart as MatrixIcon,
  ArrowForward as ArrowIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useClause } from '../contexts/ClauseContext';
import { useBookmarks } from '../contexts/BookmarkContext';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import type { Clause, RiskClassification, ClauseFamilyGroup } from '../types/clause';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const RISK_COLORS: Record<RiskClassification, string> = {
  HIGH: '#ef4444',
  MEDIUM: '#f59e0b',
  LOW: '#22c55e',
};

const RISK_BG: Record<RiskClassification, string> = {
  HIGH: 'rgba(239,68,68,0.08)',
  MEDIUM: 'rgba(245,158,11,0.08)',
  LOW: 'rgba(34,197,94,0.08)',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const Dashboard: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();

  const { clauses, loading, error, searchQuery, setSearchQuery, selectedFamily, setSelectedFamily, families } = useClause();
  const { bookmarks, loading: bookmarkLoading } = useBookmarks();
  const { currentProject } = useProject();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [expandedFamily, setExpandedFamily] = useState<string | null>(null);

  // Valid families for the filter dropdown
  const validFamilies = useMemo(() =>
    Array.isArray(families)
      ? families.filter((fg): fg is ClauseFamilyGroup =>
          Boolean(fg && fg.family && fg.family.id && fg.family.name)
        )
      : [],
  [families]);

  // Whether a search or family filter is active
  const isFiltered = Boolean(searchQuery.trim() || selectedFamily);

  // Clauses matching the current search query (applied on top of family filter from context)
  const filteredClauses = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return clauses;
    return clauses.filter(c =>
      c.clauseCode?.toLowerCase().includes(term) ||
      c.title?.toLowerCase().includes(term) ||
      c.description?.toLowerCase().includes(term) ||
      c.family?.name?.toLowerCase().includes(term) ||
      c.riskClassification?.toLowerCase().includes(term)
    );
  }, [clauses, searchQuery]);

  // ── Derived stats (memoized) ────────────────────────────────────
  const stats = useMemo(() => {
    const bookmarkedIds = new Set(bookmarks.map(b => b.clauseId));
    const bookmarkedClauses = clauses.filter(c => bookmarkedIds.has(c.id));

    // Risk breakdown — project clauses only
    const riskCounts: Record<RiskClassification, number> = { HIGH: 0, MEDIUM: 0, LOW: 0 };
    bookmarkedClauses.forEach(c => {
      const risk = c.riskClassification?.toUpperCase() as RiskClassification;
      if (risk in riskCounts) riskCounts[risk]++;
    });

    // Family breakdown — project clauses
    const familyMap = new Map<string, number>();
    bookmarkedClauses.forEach(c => {
      const name = c.family?.name || 'Uncategorized';
      familyMap.set(name, (familyMap.get(name) || 0) + 1);
    });
    const families = Array.from(familyMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8); // top 8

    // All-DB family count
    const allFamilies = new Set(clauses.map(c => c.family?.name).filter(Boolean));

    return {
      totalClauses: clauses.length,
      projectClauses: bookmarkedClauses.length,
      riskCounts,
      families,
      totalFamilies: allFamilies.size,
    };
  }, [clauses, bookmarks]);

  // ── Clauses grouped by family name (bookmarked only) ──────────
  const clausesByFamily = useMemo(() => {
    const bookmarkedIds = new Set(bookmarks.map(b => b.clauseId));
    const map = new Map<string, Clause[]>();
    clauses
      .filter(c => bookmarkedIds.has(c.id))
      .forEach(c => {
        const name = c.family?.name || 'Uncategorized';
        const arr = map.get(name) || [];
        arr.push(c);
        map.set(name, arr);
      });
    return map;
  }, [clauses, bookmarks]);

  // ── Loading / error states ──────────────────────────────────────
  if (authLoading || loading || bookmarkLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  // ── Render ──────────────────────────────────────────────────────
  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: { xs: 2, md: 3 } }}>
        <Typography variant={isMobile ? 'h5' : 'h4'} sx={{ fontWeight: 700, mb: 0.5 }}>
          Dashboard
        </Typography>
        {currentProject && (
          <Typography variant="body1" color="text.secondary">
            {currentProject.name}
            {currentProject.description && ` \u2014 ${currentProject.description}`}
          </Typography>
        )}
      </Box>

      {/* ── Search & Filter Bar ─────────────────────────────────── */}
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          mb: { xs: 2, md: 3 },
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'center',
        }}
      >
        <TextField
          size="small"
          placeholder="Search clauses..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
              </InputAdornment>
            ),
          }}
          sx={{ flex: 1, minWidth: 200 }}
        />
        <FormControl size="small" sx={{ minWidth: isMobile ? '100%' : 220 }}>
          <InputLabel>Filter by Family</InputLabel>
          <Select
            value={selectedFamily?.id || ''}
            label="Filter by Family"
            onChange={(e) => {
              const familyId = e.target.value;
              if (!familyId) {
                setSelectedFamily(null);
                return;
              }
              const familyGroup = validFamilies.find(fg => fg.family.id === familyId);
              setSelectedFamily(familyGroup?.family || null);
            }}
          >
            <MenuItem value="">All Families</MenuItem>
            {validFamilies.map((fg) => (
              <MenuItem key={fg.family.id} value={fg.family.id}>
                {fg.family.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* ── Quick Stats Row ─────────────────────────────────────── */}
      <Grid container spacing={isMobile ? 1.5 : 2} sx={{ mb: { xs: 2, md: 3 } }}>
        <Grid item xs={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
              <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                {isFiltered ? 'Matching Clauses' : 'Database'}
              </Typography>
              <Typography variant={isMobile ? 'h5' : 'h4'} sx={{ fontWeight: 700, color: 'secondary.main' }}>
                {isFiltered ? filteredClauses.length : stats.totalClauses}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {isFiltered
                  ? `of ${stats.totalClauses} total clauses`
                  : `clauses across ${stats.totalFamilies} families`}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
              <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                Project Clauses
              </Typography>
              <Typography variant={isMobile ? 'h5' : 'h4'} sx={{ fontWeight: 700, color: 'primary.main' }}>
                {stats.projectClauses}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                in project scope
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} md={3}>
          <Card sx={{ height: '100%', bgcolor: RISK_BG.HIGH }}>
            <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
              <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                High Risk
              </Typography>
              <Typography variant={isMobile ? 'h5' : 'h4'} sx={{ fontWeight: 700, color: RISK_COLORS.HIGH }}>
                {stats.riskCounts.HIGH}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                clauses require attention
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} md={3}>
          <Card sx={{ height: '100%', bgcolor: RISK_BG.LOW }}>
            <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
              <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                Low Risk
              </Typography>
              <Typography variant={isMobile ? 'h5' : 'h4'} sx={{ fontWeight: 700, color: RISK_COLORS.LOW }}>
                {stats.riskCounts.LOW}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                clauses on track
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ── Risk Distribution ───────────────────────────────────── */}
      {stats.projectClauses > 0 && (
        <Card sx={{ mb: { xs: 2, md: 3 } }}>
          <CardContent sx={{ p: isMobile ? 1.5 : 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
              Risk Distribution
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, height: 32, borderRadius: 2, overflow: 'hidden' }}>
              {(['HIGH', 'MEDIUM', 'LOW'] as RiskClassification[]).map(level => {
                const count = stats.riskCounts[level];
                const pct = stats.projectClauses > 0 ? (count / stats.projectClauses) * 100 : 0;
                if (pct === 0) return null;
                return (
                  <Box
                    key={level}
                    sx={{
                      width: `${pct}%`,
                      bgcolor: RISK_COLORS[level],
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      borderRadius: 1,
                      minWidth: pct > 8 ? 'auto' : 0,
                    }}
                  >
                    {pct > 12 && `${level} ${count}`}
                  </Box>
                );
              })}
            </Box>
            <Box sx={{ display: 'flex', gap: 2, mt: 1, flexWrap: 'wrap' }}>
              {(['HIGH', 'MEDIUM', 'LOW'] as RiskClassification[]).map(level => (
                <Box key={level} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: RISK_COLORS[level] }} />
                  <Typography variant="caption">
                    {level}: {stats.riskCounts[level]} ({stats.projectClauses > 0 ? Math.round((stats.riskCounts[level] / stats.projectClauses) * 100) : 0}%)
                  </Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* ── Family Breakdown ────────────────────────────────────── */}
      {stats.families.length > 0 && (
        <Card sx={{ mb: { xs: 2, md: 3 } }}>
          <CardContent sx={{ p: isMobile ? 1.5 : 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
              Clause Coverage by Family
            </Typography>
            {stats.families.map(([name, count]) => {
              const pct = stats.projectClauses > 0 ? (count / stats.projectClauses) * 100 : 0;
              const isExpanded = expandedFamily === name;
              const familyClauses = clausesByFamily.get(name) || [];
              return (
                <Box key={name} sx={{ mb: 1 }}>
                  <Box
                    onClick={() => setExpandedFamily(isExpanded ? null : name)}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mb: 0.25,
                      cursor: 'pointer',
                      borderRadius: 1,
                      px: 0.5,
                      py: 0.25,
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {isExpanded ? (
                        <ExpandLessIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                      ) : (
                        <ExpandMoreIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                      )}
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{name}</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">{count}</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={pct}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      bgcolor: 'rgba(99,102,241,0.08)',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 3,
                        background: 'linear-gradient(90deg, #6366f1 0%, #0ea5e9 100%)',
                      },
                    }}
                  />
                  <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                    <Box sx={{ mt: 1, mb: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {familyClauses.map(clause => {
                        const risk = (clause.riskClassification?.toUpperCase() || 'LOW') as RiskClassification;
                        return (
                          <Card
                            key={clause.id}
                            variant="outlined"
                            onClick={() => navigate(`/matrix?clause=${encodeURIComponent(clause.clauseCode)}`)}
                            sx={{
                              cursor: 'pointer',
                              bgcolor: RISK_BG[risk],
                              borderLeft: `3px solid ${RISK_COLORS[risk]}`,
                              '&:hover': { boxShadow: 2 },
                            }}
                          >
                            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {clause.clauseCode}
                                </Typography>
                                <Chip
                                  label={risk}
                                  size="small"
                                  sx={{
                                    height: 20,
                                    fontSize: '0.65rem',
                                    fontWeight: 700,
                                    bgcolor: RISK_COLORS[risk],
                                    color: '#fff',
                                  }}
                                />
                              </Box>
                              <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                                {clause.title}
                              </Typography>
                              {clause.description && (
                                <Typography variant="caption" color="text.secondary">
                                  {clause.description.length > 100
                                    ? `${clause.description.slice(0, 100)}...`
                                    : clause.description}
                                </Typography>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </Box>
                  </Collapse>
                </Box>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* ── Filtered Clause Cards ──────────────────────────────── */}
      {isFiltered && filteredClauses.length > 0 && (
        <Card sx={{ mb: { xs: 2, md: 3 } }}>
          <CardContent sx={{ p: isMobile ? 1.5 : 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {selectedFamily ? selectedFamily.name : 'Search Results'}
                {' '}
                <Chip
                  label={`${filteredClauses.length} clause${filteredClauses.length !== 1 ? 's' : ''}`}
                  size="small"
                  sx={{ fontSize: '0.7rem', height: 22 }}
                />
              </Typography>
              {(searchQuery || selectedFamily) && (
                <Button
                  size="small"
                  onClick={() => { setSearchQuery(''); setSelectedFamily(null); }}
                  sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                >
                  Clear Filters
                </Button>
              )}
            </Box>
            <Grid container spacing={1.5}>
              {filteredClauses.map(clause => {
                const risk = (clause.riskClassification?.toUpperCase() || 'LOW') as RiskClassification;
                return (
                  <Grid item xs={12} sm={6} md={4} key={clause.id}>
                    <Card
                      variant="outlined"
                      onClick={() => navigate(`/matrix?clause=${encodeURIComponent(clause.clauseCode)}`)}
                      sx={{
                        cursor: 'pointer',
                        height: '100%',
                        bgcolor: RISK_BG[risk],
                        borderLeft: `3px solid ${RISK_COLORS[risk]}`,
                        '&:hover': { boxShadow: 2 },
                        transition: 'box-shadow 0.2s',
                      }}
                    >
                      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.8rem' }}>
                            {clause.clauseCode}
                          </Typography>
                          <Chip
                            label={risk}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.6rem',
                              fontWeight: 700,
                              bgcolor: RISK_COLORS[risk],
                              color: '#fff',
                            }}
                          />
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5, lineHeight: 1.3 }}>
                          {clause.title}
                        </Typography>
                        {clause.family?.name && (
                          <Chip
                            label={clause.family.name}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.6rem', height: 18, mt: 0.5 }}
                          />
                        )}
                        {clause.description && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, lineHeight: 1.3 }}>
                            {clause.description.length > 80
                              ? `${clause.description.slice(0, 80)}...`
                              : clause.description}
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* ── Quick Actions ───────────────────────────────────────── */}
      <Card>
        <CardContent sx={{ p: isMobile ? 1.5 : 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
            Quick Actions
          </Typography>
          <Box sx={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: 1.5,
          }}>
            <Button
              variant="contained"
              startIcon={<ScannerIcon />}
              endIcon={<ArrowIcon />}
              onClick={() => navigate('/document-scanner')}
              fullWidth={isMobile}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Scan a Document
            </Button>
            <Button
              variant="outlined"
              startIcon={<MatrixIcon />}
              endIcon={<ArrowIcon />}
              onClick={() => navigate('/matrix')}
              fullWidth={isMobile}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              View Compliance Matrix
            </Button>
            {!isMobile && (
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<GraphIcon />}
                endIcon={<ArrowIcon />}
                onClick={() => navigate('/graph')}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Explore Relationships
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* ── Empty state hint ────────────────────────────────────── */}
      {stats.projectClauses === 0 && (
        <Card sx={{ mt: { xs: 2, md: 3 }, bgcolor: 'rgba(99,102,241,0.04)', border: '1px dashed rgba(99,102,241,0.2)' }}>
          <CardContent sx={{ textAlign: 'center', py: { xs: 3, md: 4 } }}>
            <FolderIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No clauses in this project yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Use the Document Scanner to upload an RFP or contract and automatically identify compliance clauses.
            </Typography>
            <Button
              variant="contained"
              startIcon={<ScannerIcon />}
              onClick={() => navigate('/document-scanner')}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Get Started with Document Scanner
            </Button>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default Dashboard;
