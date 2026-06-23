import React, { useMemo, useState, useCallback } from 'react';
import {
  Box, Typography, CircularProgress, Alert, Card, CardContent,
  useMediaQuery, useTheme, Button, Chip, Snackbar, Tooltip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { ComplianceMatrix } from '../components/ComplianceMatrix';
import { useClause } from '../contexts/ClauseContext';
import { useBookmarks } from '../contexts/BookmarkContext';
import { useOrg } from '../contexts/OrgContext';
import { useNavigate } from 'react-router-dom';
import type { Clause } from '../types/clause';
import {
  fetchFrameworks, fetchActivatedFrameworksOrg,
  activateFrameworkOrg, deactivateFrameworkOrg, type ControlFramework
} from '../services/controlService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useOrgSummary } from '../hooks/useOrgSummary';

// Heatmap types
interface FamilyHeatmapData {
  identifier: string;
  name: string;
  total: number;
  /** Applicable count (total minus N/A). Optional for backward compat with older BE responses. */
  applicable?: number;
  notApplicable?: number;
  implemented: number;
  inProgress: number;
  notStarted: number;
  completionPct: number;
}
interface FrameworkHeatmapData {
  id: string;
  name: string;
  families: FamilyHeatmapData[];
  completionPct: number;
  /** Framework-level applicable/N/A counts. Optional for backward compat. */
  applicableControls?: number;
  notApplicable?: number;
}

function heatColor(pct: number): string {
  if (pct >= 80) return '#22c55e';
  if (pct >= 60) return '#4ade80';
  if (pct >= 40) return '#fbbf24';
  if (pct >= 20) return '#fb923c';
  if (pct > 0) return '#f87171';
  return '#e2e8f0';
}
function heatBg(pct: number): string {
  if (pct >= 80) return 'rgba(34,197,94,0.18)';
  if (pct >= 60) return 'rgba(74,222,128,0.15)';
  if (pct >= 40) return 'rgba(251,191,36,0.15)';
  if (pct >= 20) return 'rgba(251,146,60,0.15)';
  if (pct > 0) return 'rgba(248,113,113,0.15)';
  return 'rgba(226,232,240,0.3)';
}

const Matrix: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();

  const { clauses, loading, error } = useClause();
  const { bookmarks, loading: bookmarkLoading } = useBookmarks();
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;
  const qc = useQueryClient();

  // Framework activation state
  const [activating, setActivating] = useState<string | null>(null);
  const [snackMsg, setSnackMsg] = useState<string | null>(null);

  // Catalog frameworks + the org-activated set → which are available to
  // activate vs already active. Org baseline scope; activation writes the
  // org tier (org_frameworks + seeded org_control_status).
  const { data: frameworksData } = useQuery({
    queryKey: ['matrix-org-frameworks', orgId],
    queryFn: async () => {
      const [all, activated] = await Promise.all([
        fetchFrameworks(),
        fetchActivatedFrameworksOrg(),
      ]);
      return { all, activatedFrameworks: activated };
    },
    enabled: !!orgId,
  });
  const allFrameworks: ControlFramework[] = frameworksData?.all ?? [];
  const activatedFrameworks: ControlFramework[] = frameworksData?.activatedFrameworks ?? [];
  const activatedIds = useMemo(() => new Set(activatedFrameworks.map(f => f.id)), [activatedFrameworks]);
  const availableFrameworks = useMemo(
    () => allFrameworks.filter(f => !activatedIds.has(f.id)),
    [allFrameworks, activatedIds],
  );

  // Heatmap data — the ORG baseline posture summary (org-baseline B1). Same
  // response shape as the program summary, so the heatmap mapping is unchanged.
  const { data: projectSummary } = useOrgSummary();
  const heatmapData: FrameworkHeatmapData[] = useMemo(
    () => (projectSummary?.frameworks ?? []).map(fw => ({
      id: fw.id,
      name: fw.name,
      families: (fw.families ?? []) as FamilyHeatmapData[],
      completionPct: fw.completionPct,
      applicableControls: fw.applicableControls,
      notApplicable: fw.notApplicable,
    })),
    [projectSummary],
  );

  // Scan-detected overlay is deferred at org scope: project_matrix_data was
  // project-scoped. Org net-new clauses live in org_scoped_clauses — a
  // follow-up surface. Empty for now so the page renders cleanly.
  const scanDetectedClauses: Array<{
    id: string; clauseCode: string; title: string; description: string; confidence: number; status: string;
  }> = [];

  const invalidateAfterActivation = useCallback(() => Promise.all([
    qc.invalidateQueries({ queryKey: ['matrix-org-frameworks', orgId] }),
    qc.invalidateQueries({ queryKey: ['org-summary', orgId] }),
  ]), [qc, orgId]);

  const handleActivateFramework = useCallback(async (frameworkId: string) => {
    setActivating(frameworkId);
    try {
      await activateFrameworkOrg(frameworkId);
      await invalidateAfterActivation();
      setSnackMsg('Framework activated! View controls to begin compliance tracking.');
    } catch {
      setSnackMsg('Failed to activate framework. Please try again.');
    } finally {
      setActivating(null);
    }
  }, [invalidateAfterActivation]);

  const handleDeactivateFramework = useCallback(async (frameworkId: string) => {
    setActivating(frameworkId);
    try {
      await deactivateFrameworkOrg(frameworkId);
      await invalidateAfterActivation();
      setSnackMsg('Framework deactivated.');
    } catch {
      setSnackMsg('Failed to deactivate framework. Please try again.');
    } finally {
      setActivating(null);
    }
  }, [invalidateAfterActivation]);

  // ---------------------------------------------------------------------------
  // ALL useMemo hooks MUST be above any early returns to avoid React Error #300
  // ("Rendered fewer hooks than expected"). React requires the same number of
  // hooks on every render — placing them after a conditional `return` meant
  // they were skipped during loading/error states, changing the hook count.
  // ---------------------------------------------------------------------------

  // Memoize derived data — expensive array scans that should not re-run on
  // every render if bookmarks and clauses haven't changed.
  //
  // Cross-clause requirements (e.g. "bookmark X implies you also need Y") now
  // run through the framework→clause reciprocity layer
  // (control_clause_mappings + getReciprocity), so the matrix is a pure
  // bookmarks view — no implicit parent-clause expansion.
  const matrixClauses = useMemo(
    () => clauses.filter((clause: Clause) =>
      bookmarks.some(b => b.clauseId === clause.id)
    ),
    [clauses, bookmarks]
  );

  const matrixData = useMemo(
    () => matrixClauses.map((clause: Clause) => ({
      id: clause.id,
      clauseId: clause.clauseCode,
      title: clause.title,
      description: clause.description,
      intent: clause.intent,
      status: clause.status,
      category: clause.clauseCategory,
      family: clause.family ?? { id: 'unknown', name: 'Uncategorized' },
      conditions: clause.conditions,
      implementationGuidance: clause.implementationGuidance,
      assessmentMethod: clause.assessmentMethod,
      riskClassification: clause.riskClassification,
      referenceUrl: clause.referenceUrl
    })),
    [matrixClauses]
  );

  // -- Early returns (AFTER all hooks) ----------------------------------------

  if (loading || bookmarkLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <Typography variant={isMobile ? 'h5' : 'h4'} gutterBottom>
        Compliance Matrix
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: { xs: 1.5, md: 3 } }}>
        Organization-wide control posture{currentOrg?.name ? ` — ${currentOrg.name}` : ''}.
      </Typography>

      {/* Available frameworks to activate (org baseline) */}
      {availableFrameworks.length > 0 && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
              Activate a framework
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
              Activating a framework adds its controls to your organization baseline so you can track implementation.
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {availableFrameworks.map(fw => (
                <Box key={fw.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: 1, minWidth: 200 }}>
                    <Typography variant="body2" fontWeight={600}>{fw.name} {fw.version}</Typography>
                    <Typography variant="caption" color="text.secondary">{fw.total_controls} controls</Typography>
                  </Box>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<SecurityIcon />}
                    disabled={activating === fw.id}
                    onClick={() => handleActivateFramework(fw.id)}
                    sx={{ whiteSpace: 'nowrap' }}
                  >
                    {activating === fw.id ? 'Activating…' : 'Activate'}
                  </Button>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Activated framework banners */}
      {activatedFrameworks.map(fw => (
        <Card key={fw.id} sx={{
          mb: 2, border: '2px solid', borderColor: 'success.main',
          background: theme.palette.mode === 'dark'
            ? 'rgba(76,175,80,0.08)' : 'rgba(76,175,80,0.05)'
        }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <CheckCircleIcon color="success" sx={{ fontSize: 36 }} />
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                {fw.name} {fw.version}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Framework activated — {fw.total_controls} controls ready for compliance tracking.
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Button
                variant="outlined"
                color="success"
                endIcon={<ArrowForwardIcon />}
                onClick={() => navigate('/controls')}
              >
                View Controls
              </Button>
              <Button
                variant="text"
                color="inherit"
                size="small"
                disabled={activating === fw.id}
                onClick={() => handleDeactivateFramework(fw.id)}
              >
                Deactivate
              </Button>
            </Box>
          </CardContent>
        </Card>
      ))}

      {/* ── Crosswalk Heatmap ─────────────────────────────────── */}
      {heatmapData.length > 0 && (
        <Card sx={{ mb: { xs: 1.5, md: 3 } }}>
          <CardContent sx={{ p: { xs: 1, md: 2 } }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
              Control Family Compliance Heatmap
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
              Completion includes controls satisfied via cross-framework crosswalk —
              e.g. NIST 800-53 progress crediting NIST 800-171.
            </Typography>
            {heatmapData.map(fw => {
              const naCount = fw.notApplicable ?? 0;
              const applicable = fw.applicableControls ?? null;
              return (
              <Box key={fw.id} sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  {fw.name} — {fw.completionPct}% overall
                  {applicable !== null && naCount > 0 && (
                    <Typography
                      component="span"
                      variant="caption"
                      sx={{ ml: 1, color: 'text.secondary', fontWeight: 400 }}
                    >
                      ({applicable} applicable, {naCount} N/A)
                    </Typography>
                  )}
                </Typography>
                <Box sx={{
                  display: 'grid',
                  gridTemplateColumns: isMobile
                    ? 'repeat(auto-fill, minmax(80px, 1fr))'
                    : 'repeat(auto-fill, minmax(110px, 1fr))',
                  gap: 0.75,
                }}>
                  {fw.families.map(fam => (
                    <Tooltip
                      key={fam.identifier}
                      title={
                        `${fam.name}\n${fam.implemented}/${fam.total} implemented` +
                        (fam.inProgress > 0 ? `, ${fam.inProgress} in progress` : '') +
                        (fam.notStarted > 0 ? `, ${fam.notStarted} not started` : '')
                      }
                      arrow
                    >
                      <Box sx={{
                        p: 1,
                        borderRadius: 1,
                        bgcolor: heatBg(fam.completionPct),
                        border: '1px solid',
                        borderColor: heatColor(fam.completionPct),
                        textAlign: 'center',
                        cursor: 'default',
                        transition: 'transform 0.15s',
                        '&:hover': { transform: 'scale(1.04)', boxShadow: 2 },
                      }}>
                        <Typography variant="caption" sx={{
                          fontWeight: 700, display: 'block', lineHeight: 1.2,
                          color: fam.completionPct > 0 ? heatColor(fam.completionPct) : '#94a3b8',
                        }}>
                          {fam.identifier}
                        </Typography>
                        <Typography sx={{
                          fontSize: '1.1rem', fontWeight: 800, lineHeight: 1.3,
                          color: fam.completionPct > 0 ? heatColor(fam.completionPct) : '#cbd5e1',
                        }}>
                          {fam.completionPct}%
                        </Typography>
                        <Typography variant="caption" sx={{
                          display: 'block', fontSize: '0.6rem', color: 'text.secondary',
                          lineHeight: 1.1, mt: 0.25,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {fam.name}
                        </Typography>
                      </Box>
                    </Tooltip>
                  ))}
                </Box>
                {/* Color scale legend */}
                <Box sx={{ display: 'flex', gap: 1, mt: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>Coverage:</Typography>
                  {[0, 20, 40, 60, 80, 100].map(v => (
                    <Box key={v} sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                      <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: heatColor(v), border: '1px solid', borderColor: 'divider' }} />
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>{v}%</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Single Compliance Matrix */}
      <Card>
        <Box sx={{ p: { xs: 0.5, sm: 1.5, md: 3 } }}>
          {matrixData.length === 0 ? (
            <Box sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 8,
              textAlign: 'center'
            }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No clauses in this project yet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Use the Document Scanner to scan a document and save matching clauses to this project.
              </Typography>
            </Box>
          ) : (
            <ComplianceMatrix rows={matrixData} scanDetectedClauses={scanDetectedClauses} />
          )}
        </Box>
      </Card>

      {/* Posture Gaps — regulations the user chose to include from a scan that
          aren't in our curated database. These persist as scan-detected rows
          (clause_id=null) with limited data; the user opted in by selecting
          them in the scanner UI. */}
      {scanDetectedClauses.length > 0 && (
        <Card sx={{ mt: { xs: 1.5, md: 3 }, border: '1px solid', borderColor: 'warning.light' }}>
          <CardContent sx={{ p: { xs: 1, md: 2 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <WarningAmberIcon sx={{ color: '#b45309' }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#b45309' }}>
                Posture Gaps — Detected, Not in Database ({scanDetectedClauses.length})
              </Typography>
              <Chip
                label="Limited Data"
                size="small"
                sx={{ bgcolor: '#fef3c7', color: '#b45309', fontWeight: 600, fontSize: '0.7rem' }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              The scanner found these regulations in a compliance document and you chose to include them, but
              they aren't yet in our curated database — so they're tracked here with limited data (no
              framework controls or implementation guidance). They may require manual review or addition
              to the database.
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Clause Code</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Title</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Confidence</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {scanDetectedClauses.map(clause => (
                    <TableRow key={clause.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {clause.clauseCode}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{clause.title}</Typography>
                        {clause.description && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            {clause.description}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`${Math.round(clause.confidence * 100)}%`}
                          size="small"
                          variant="outlined"
                          color={clause.confidence >= 0.8 ? 'success' : clause.confidence >= 0.5 ? 'warning' : 'error'}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip label={clause.status} size="small" color="warning" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      <Snackbar
        open={!!snackMsg}
        autoHideDuration={4000}
        onClose={() => setSnackMsg(null)}
        message={snackMsg}
      />
    </Box>
  );
};

export default Matrix;
