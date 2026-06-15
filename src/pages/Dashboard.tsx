import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Autocomplete,
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
  DocumentScanner as ScannerIcon,
  TableChart as MatrixIcon,
  ArrowForward as ArrowIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Search as SearchIcon,
  Shield as ShieldIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useClause } from '../contexts/ClauseContext';
import { useBookmarks } from '../contexts/BookmarkContext';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { FloatingPanel } from '../components/FloatingPanel';
import ObligationsDueWidget from '../components/ObligationsDueWidget';
import RecentEvaluationsWidget from '../components/RecentEvaluationsWidget';
import ProgramReadinessWidget from '../components/ProgramReadinessWidget';
import CascadeLeverageWidget from '../components/CascadeLeverageWidget';
import type { Clause, RiskClassification, ClauseFamilyGroup } from '../types/clause';
import { useProjectSummary } from '../hooks/useProjectSummary';
import {
  fetchRegulatoryArtifacts,
  type RegulatoryArtifactListItem,
} from '../services/regulatoryArtifactsService';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend,
} from 'recharts';

// Compliance summary types live in the shared `useProjectSummary` hook now —
// imported above so Dashboard, Matrix, and any future consumer agree on shape.

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
  const [selectedClause, setSelectedClause] = useState<Clause | null>(null);

  // ── Catalog jump-search ───────────────────────────────────────
  // Separate from `searchQuery` (which filters the in-project clause list).
  // This one hits the full regulatory-artifacts catalog via /api/regulatory-
  // artifacts?q=... and navigates to /clauses/[identifier] on pick — the same
  // detail route the Regulations page uses, so users can leap directly to any
  // clause's detail page from the dashboard without paging through the catalog.
  const [catalogInput, setCatalogInput] = useState('');
  const [catalogOptions, setCatalogOptions] = useState<RegulatoryArtifactListItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  // Track the request that owns the current input so out-of-order responses
  // can't overwrite a fresher search's results.
  const catalogReqIdRef = useRef(0);

  useEffect(() => {
    const term = catalogInput.trim();
    if (term.length < 2) {
      setCatalogOptions([]);
      setCatalogLoading(false);
      return;
    }
    const reqId = ++catalogReqIdRef.current;
    setCatalogLoading(true);
    const timer = setTimeout(async () => {
      const resp = await fetchRegulatoryArtifacts({ q: term, limit: 5 });
      if (reqId !== catalogReqIdRef.current) return; // stale
      if (resp.data?.items) setCatalogOptions(resp.data.items);
      else setCatalogOptions([]);
      setCatalogLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [catalogInput]);

  const openClauseDetail = (identifier: string) => {
    navigate(`/clauses/${encodeURIComponent(identifier)}`);
  };

  // Compliance progress summary — React Query. Shared with Matrix.tsx via
  // the same projectSummary key, so back-navigation between the two views
  // is cache-instant. Invalidated by control / objective status flips and
  // POA&M mutations.
  const { data: complianceSummary = null } = useProjectSummary();

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

      {/* ── Catalog jump-search ────────────────────────────────────
          Jumps to any clause's detail page from the full regulatory catalog.
          Distinct from the in-program filter below (which narrows the list of
          clauses already bookmarked into this program). */}
      <Box sx={{ mb: { xs: 1.5, md: 2 } }}>
        <Autocomplete<RegulatoryArtifactListItem, false, false, true>
          freeSolo
          size="small"
          options={catalogOptions}
          loading={catalogLoading}
          filterOptions={(x) => x /* server-side filtering */}
          inputValue={catalogInput}
          onInputChange={(_, value) => setCatalogInput(value)}
          getOptionLabel={(opt) =>
            typeof opt === 'string' ? opt : `${opt.identifier} — ${opt.title}`
          }
          onChange={(_, value) => {
            if (!value || typeof value === 'string') return;
            openClauseDetail(value.identifier);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && catalogOptions.length > 0) {
              const first = catalogOptions[0];
              // Defer to next tick so Autocomplete doesn't swallow the navigation.
              e.preventDefault();
              openClauseDetail(first.identifier);
            }
          }}
          renderOption={(props, opt) => (
            <li {...props} key={opt.id}>
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Typography
                  variant="body2"
                  sx={{ fontFamily: 'monospace', fontWeight: 700, color: 'primary.main' }}
                >
                  {opt.identifier}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {opt.title}
                </Typography>
              </Box>
            </li>
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Find any clause — e.g. DFARS 7012, FAR 52.204-21, NIST SP 800-171"
              helperText="Searches the full regulatory catalog and opens the clause's detail page."
              InputProps={{
                ...params.InputProps,
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <>
                    {catalogLoading ? <CircularProgress size={16} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
        />
      </Box>

      {/* ── Search & Filter Bar ───────────────────────────────────
          Narrows the in-project clause list below (bookmarked into your
          program). Different surface than the catalog jump-search above. */}
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
          placeholder="Filter clauses in this program..."
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

      {/* ── Program Readiness — north-star "ready to bid?" view (D-2.1+2.2) ─ */}
      <ProgramReadinessWidget />

      {/* ── Cascade "Moves" — highest-leverage actions (mig 131) ──── */}
      <CascadeLeverageWidget />

      {/* ── Obligations widget (W3 Phase 4) ─────────────────────── */}
      <ObligationsDueWidget />

      {/* ── Recent Document Evaluations (Phase B-4) ─────────────── */}
      <RecentEvaluationsWidget />

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

      {/* ── Compliance Progress ─────────────────────────────────── */}
      {complianceSummary && complianceSummary.frameworks.length > 0 && (
        <Card sx={{ mb: { xs: 2, md: 3 }, border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: isMobile ? 1.5 : 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ShieldIcon color="primary" />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Compliance Progress
                </Typography>
              </Box>
              <Button
                size="small"
                endIcon={<ArrowIcon />}
                onClick={() => navigate('/controls')}
                sx={{ textTransform: 'none' }}
              >
                View Details
              </Button>
            </Box>

            {complianceSummary.frameworks.map(fw => {
              const pct = fw.completionPct;
              const gaugeColor = pct >= 80 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444';
              const donutData = [
                { name: 'Implemented', value: fw.implemented, color: '#22c55e' },
                { name: 'In Progress', value: fw.inProgress, color: '#f59e0b' },
                { name: 'Not Started', value: fw.notStarted, color: '#e5e7eb' },
              ].filter(d => d.value > 0);

              return (
                <Box key={fw.id} sx={{ mb: 2.5 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
                    {fw.name}
                  </Typography>

                  {/* Gauge + Donut side by side */}
                  <Grid container spacing={2} sx={{ mb: 1.5 }}>
                    {/* Compliance Gauge */}
                    <Grid item xs={12} sm={5} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <Box sx={{ position: 'relative', width: 180, height: 120 }}>
                        <ResponsiveContainer width="100%" height={120}>
                          <PieChart>
                            <Pie
                              data={[
                                { value: pct },
                                { value: 100 - pct },
                              ]}
                              cx="50%"
                              cy="95%"
                              startAngle={180}
                              endAngle={0}
                              innerRadius={55}
                              outerRadius={75}
                              dataKey="value"
                              stroke="none"
                            >
                              <Cell fill={gaugeColor} />
                              <Cell fill="#f1f5f9" />
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                        <Box sx={{
                          position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
                          textAlign: 'center',
                        }}>
                          <Typography variant="h4" sx={{ fontWeight: 800, color: gaugeColor, lineHeight: 1 }}>
                            {Math.round(pct)}%
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                            Overall Compliance
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>

                    {/* Control Status Donut */}
                    <Grid item xs={12} sm={7}>
                      <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                          <Pie
                            data={donutData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={60}
                            dataKey="value"
                            paddingAngle={2}
                            stroke="none"
                          >
                            {donutData.map((entry, idx) => (
                              <Cell key={idx} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip
                            content={({ payload }) => {
                              if (!payload || payload.length === 0) return null;
                              const { name, value } = payload[0];
                              const v = Number(value);
                              return (
                                <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', p: 1, borderRadius: 1, boxShadow: 1 }}>
                                  <Typography variant="caption" sx={{ fontWeight: 600 }}>{String(name)}</Typography>
                                  <Typography variant="caption" display="block" color="text.secondary">
                                    {v} controls ({Math.round((v / fw.totalControls) * 100)}%)
                                  </Typography>
                                </Box>
                              );
                            }}
                          />
                          <Legend
                            verticalAlign="middle"
                            align="right"
                            layout="vertical"
                            iconType="circle"
                            iconSize={8}
                            formatter={(value: string) => {
                              const d = donutData.find(dd => dd.name === value);
                              return (
                                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                  {value}: {d?.value ?? 0}
                                </span>
                              );
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </Grid>
                  </Grid>

                  {/* Objective breakdown if available */}
                  {fw.objectives && fw.objectives.total > 0 && (
                    <Box sx={{ mt: 1, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>
                        Assessment Objectives ({fw.objectives.total})
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, height: 16, borderRadius: 1, overflow: 'hidden' }}>
                        {fw.objectives.fullyMet > 0 && (
                          <Box sx={{ width: `${(fw.objectives.fullyMet / fw.objectives.total) * 100}%`, bgcolor: '#22c55e', borderRadius: 0.5 }} />
                        )}
                        {fw.objectives.partiallyMet > 0 && (
                          <Box sx={{ width: `${(fw.objectives.partiallyMet / fw.objectives.total) * 100}%`, bgcolor: '#f59e0b', borderRadius: 0.5 }} />
                        )}
                        {fw.objectives.notMet > 0 && (
                          <Box sx={{ width: `${(fw.objectives.notMet / fw.objectives.total) * 100}%`, bgcolor: '#ef4444', borderRadius: 0.5 }} />
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                        <Typography variant="caption" sx={{ color: '#22c55e' }}>
                          {fw.objectives.fullyMet} Met
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#f59e0b' }}>
                          {fw.objectives.partiallyMet} Partial
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#ef4444' }}>
                          {fw.objectives.notMet} Not Met
                        </Typography>
                      </Box>
                    </Box>
                  )}
                </Box>
              );
            })}

            {/* Reciprocity badges */}
            {complianceSummary.reciprocity.length > 0 && (
              <Box sx={{ mt: 1, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" sx={{ fontWeight: 600, mb: 1, display: 'block' }}>
                  Clause Reciprocity
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {complianceSummary.reciprocity.map(r => (
                    <Chip
                      key={r.clauseCode}
                      label={`${r.clauseCode}: ${Math.round(r.implementedPct)}%`}
                      size="small"
                      color={r.implementedPct >= 80 ? 'success' : r.implementedPct >= 40 ? 'warning' : 'default'}
                      variant="outlined"
                      sx={{ fontWeight: 600 }}
                    />
                  ))}
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* No frameworks hint */}
      {complianceSummary && complianceSummary.frameworks.length === 0 && stats.projectClauses > 0 && (
        <Card sx={{ mb: { xs: 2, md: 3 }, bgcolor: 'rgba(99,102,241,0.04)', border: '1px dashed rgba(99,102,241,0.2)' }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <ShieldIcon sx={{ color: 'text.secondary', fontSize: 32 }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                No compliance frameworks activated
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Activate a framework from the Matrix tab to begin tracking control compliance.
              </Typography>
            </Box>
            <Button
              size="small"
              variant="outlined"
              onClick={() => navigate('/matrix')}
              sx={{ textTransform: 'none' }}
            >
              Go to Matrix
            </Button>
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
                            onClick={() => setSelectedClause(clause)}
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
                      onClick={() => setSelectedClause(clause)}
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

      {/* ── Quick Actions — always visible ───────────────────────── */}
      <Card sx={{ mb: { xs: 2, md: 3 } }}>
        <CardContent sx={{ p: isMobile ? 1.5 : 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
            Quick Actions
          </Typography>
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
            gap: 1.5,
          }}>
            <Button
              variant="contained"
              startIcon={<ScannerIcon />}
              onClick={() => navigate('/document-scanner')}
              fullWidth
              sx={{ textTransform: 'none', fontWeight: 600, py: 1.2 }}
            >
              Scan Document
            </Button>
            <Button
              variant="outlined"
              startIcon={<ShieldIcon />}
              onClick={() => navigate('/controls')}
              fullWidth
              sx={{ textTransform: 'none', fontWeight: 600, py: 1.2 }}
            >
              View Controls
            </Button>
            <Button
              variant="outlined"
              startIcon={<MatrixIcon />}
              onClick={() => navigate('/matrix')}
              fullWidth
              sx={{ textTransform: 'none', fontWeight: 600, py: 1.2 }}
            >
              Matrix
            </Button>
            {/* Re-entry to the BundlePicker flow. Deep-links to /controls with
                ?addFramework=1, which the Controls page consumes to open the
                Add-framework dialog. Lets users layer additional frameworks
                (e.g. HIPAA on top of NIST 800-171) without having to deactivate
                what they already have. */}
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => navigate('/controls?addFramework=1')}
              fullWidth
              sx={{ textTransform: 'none', fontWeight: 600, py: 1.2 }}
            >
              Add framework
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* ── Demo Flow Hero Cards ────────────────────────────────── */}
      {/* State-aware CTAs that guide the demo narrative */}
      {stats.projectClauses === 0 && !complianceSummary?.frameworks?.length && (
        /* Step 1: No clauses scanned yet — big CTA to scan */
        <Card sx={{
          mb: { xs: 2, md: 3 },
          background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(14,165,233,0.08) 100%)',
          border: '2px solid rgba(99,102,241,0.2)',
        }}>
          <CardContent sx={{ textAlign: 'center', py: { xs: 3, md: 4 } }}>
            <ScannerIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1.5 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
              Start Your Compliance Journey
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, maxWidth: 420, mx: 'auto' }}>
              Upload a contract, RFP, or policy document and ClauseAtlas will automatically identify every compliance clause.
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<ScannerIcon />}
              endIcon={<ArrowIcon />}
              onClick={() => navigate('/document-scanner')}
              sx={{ textTransform: 'none', fontWeight: 700, px: 4, py: 1.2 }}
            >
              Scan Your First Document
            </Button>
          </CardContent>
        </Card>
      )}
      {stats.projectClauses > 0 && (!complianceSummary?.frameworks?.length) && (
        /* Step 2: Clauses scanned but no framework activated */
        <Card sx={{
          mb: { xs: 2, md: 3 },
          background: 'linear-gradient(135deg, rgba(34,197,94,0.06) 0%, rgba(99,102,241,0.06) 100%)',
          border: '2px solid rgba(34,197,94,0.2)',
        }}>
          <CardContent sx={{ py: { xs: 2.5, md: 3 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexDirection: isMobile ? 'column' : 'row', textAlign: isMobile ? 'center' : 'left' }}>
              <ShieldIcon sx={{ fontSize: 40, color: '#22c55e' }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.25 }}>
                  {stats.projectClauses} Clauses Identified — Activate a Framework
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Your clauses map to compliance frameworks. Activate one from the Controls tab to begin tracking.
                </Typography>
              </Box>
              <Button
                variant="contained"
                color="success"
                startIcon={<ShieldIcon />}
                endIcon={<ArrowIcon />}
                onClick={() => navigate('/controls')}
                sx={{ textTransform: 'none', fontWeight: 700, whiteSpace: 'nowrap', alignSelf: isMobile ? 'stretch' : 'center' }}
              >
                Activate Framework
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* ── Clause Detail Panel ───────────────────────────────────── */}
      <FloatingPanel
        clause={selectedClause}
        onClose={() => setSelectedClause(null)}
      />
    </Box>
  );
};

export default Dashboard;
