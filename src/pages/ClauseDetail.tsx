import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  LinearProgress,
  Link,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import LinkIcon from '@mui/icons-material/Link';
import {
  fetchClauseDetail,
  fetchClauseGraph,
  type ClauseDetailResponse,
  type ClauseDetailActivatedFramework,
  type ClauseDetailControl,
  type ClauseGraphResponse,
  type RegulatoryArtifactRef,
} from '../services/clauseService';
import { extractErrorMessage } from '../utils/errorUtils';
import { safeHref } from '../utils/safeHref';
import { useProject } from '../contexts/ProjectContext';
import SatisfactionMethodsPanel from '../components/SatisfactionMethodsPanel';

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

const ControlChecklistItem: React.FC<{
  control: ClauseDetailControl;
  frameworkId: string;
  onJumpToControl: (frameworkId: string, controlId: string) => void;
}> = ({ control, frameworkId, onJumpToControl }) => {
  const icon = control.is_withdrawn
    ? <RadioButtonUncheckedIcon fontSize="small" sx={{ color: 'text.disabled' }} />
    : control.is_completed
      ? <CheckCircleIcon fontSize="small" sx={{ color: '#22c55e' }} />
      : control.status === 'IN_PROGRESS' || control.status === 'PARTIALLY_SUPPORTS' || control.status === 'PARTIALLY_IMPLEMENTED'
        ? <HourglassEmptyIcon fontSize="small" sx={{ color: '#f59e0b' }} />
        : <RadioButtonUncheckedIcon fontSize="small" sx={{ color: 'text.disabled' }} />;

  return (
    <ListItem
      onClick={() => !control.is_withdrawn && onJumpToControl(frameworkId, control.id)}
      sx={{
        cursor: control.is_withdrawn ? 'default' : 'pointer',
        opacity: control.is_withdrawn ? 0.5 : 1,
        borderRadius: 1,
        '&:hover': { bgcolor: control.is_withdrawn ? 'transparent' : 'action.hover' },
        py: 0.75,
      }}
    >
      <ListItemIcon sx={{ minWidth: 36 }}>{icon}</ListItemIcon>
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              label={control.identifier}
              size="small"
              sx={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.7rem' }}
            />
            {control.title && (
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {control.title}
              </Typography>
            )}
            {control.is_withdrawn && (
              <Chip label="Withdrawn" size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 18 }} />
            )}
          </Box>
        }
        secondary={
          control.requirement_text && (
            <Typography variant="caption" color="text.secondary" sx={{
              display: 'block',
              mt: 0.5,
              whiteSpace: 'pre-line',
              maxHeight: 60,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {control.requirement_text.length > 200
                ? `${control.requirement_text.slice(0, 200)}…`
                : control.requirement_text}
            </Typography>
          )
        }
      />
    </ListItem>
  );
};

const FrameworkChecklistCard: React.FC<{
  block: ClauseDetailActivatedFramework;
  onJumpToControl: (frameworkId: string, controlId: string) => void;
}> = ({ block, onJumpToControl }) => {
  const isMobile = useMediaQuery(useTheme().breakpoints.down('md'));
  const fullySatisfied = block.satisfied === block.total && block.total > 0;
  const colour = fullySatisfied ? '#22c55e' : block.satisfied > 0 ? '#f59e0b' : '#ef4444';

  return (
    <Card variant="outlined" sx={{ mb: 2, borderColor: colour, borderWidth: 1.5 }}>
      <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
        <Stack
          direction={isMobile ? 'column' : 'row'}
          alignItems={isMobile ? 'flex-start' : 'center'}
          spacing={1}
          sx={{ mb: 1.5 }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 700, flex: 1 }}>
            {block.framework.name}{' '}
            <Typography component="span" variant="caption" color="text.secondary">
              ({block.framework.version})
            </Typography>
          </Typography>
          <Chip
            label={`${block.satisfied} / ${block.total} controls satisfied`}
            size="small"
            sx={{ bgcolor: colour, color: '#fff', fontWeight: 600 }}
          />
          <Chip
            label={`${block.completionPct}%`}
            size="small"
            variant="outlined"
            sx={{ fontWeight: 600 }}
          />
        </Stack>

        <LinearProgress
          variant="determinate"
          value={block.completionPct}
          sx={{
            height: 6,
            borderRadius: 1,
            mb: 1.5,
            '& .MuiLinearProgress-bar': { bgcolor: colour },
          }}
        />

        {block.mappingType !== 'all' && (
          <Alert severity="info" sx={{ mb: 1.5, py: 0.5 }}>
            <Typography variant="caption">
              <strong>Mapping scope: {block.mappingType}.</strong>{' '}
              {block.mappingDescription || `Only ${block.mappingType} controls in this framework apply to this clause.`}
            </Typography>
          </Alert>
        )}

        <List dense disablePadding>
          {block.controls.map(c => (
            <ControlChecklistItem
              key={c.id}
              control={c}
              frameworkId={block.framework.id}
              onJumpToControl={onJumpToControl}
            />
          ))}
        </List>
      </CardContent>
    </Card>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

const ClauseDetail: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const { clauseCode: encoded } = useParams<{ clauseCode: string }>();
  const clauseCode = encoded ? decodeURIComponent(encoded) : '';
  // Phase C-1: pull current program for per-program satisfaction status.
  // Read-only fallback when no program is selected.
  const { currentProject } = useProject();

  const [data, setData] = useState<ClauseDetailResponse | null>(null);
  const [graph, setGraph] = useState<ClauseGraphResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clauseCode) {
      setError('No clause code in URL');
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      // Fetch detail + graph in parallel — they're independent.
      // Graph soft-fails: a missing artifact (404) just means the clause
      // isn't yet in the regulatory graph; the page still works.
      const [detailResp, graphResp] = await Promise.all([
        fetchClauseDetail(clauseCode),
        fetchClauseGraph(clauseCode),
      ]);
      if (cancelled) return;
      if (detailResp.error) {
        setError(extractErrorMessage(detailResp.error));
      } else if (detailResp.data) {
        setData(detailResp.data);
      }
      if (!graphResp.error && graphResp.data) {
        setGraph(graphResp.data);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [clauseCode]);

  // Jump to a specific control in the Controls page for the relevant framework.
  // We use search params so the Controls page can scroll to / expand the right
  // family + highlight the right row. Today the Controls page doesn't read
  // these yet — they're a forward-compatible hint for a follow-up commit.
  const handleJumpToControl = useCallback((_frameworkId: string, controlId: string) => {
    navigate(`/controls?controlId=${controlId}`);
  }, [navigate]);

  // ── Loading / error states ──────────────────────────────────────────────
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // We can show the page if EITHER the clause detail OR the regulatory
  // artifact exists. EOs, OMB memos, statutes, and CFR Parts live only in
  // the regulatory graph (no `clauses` table entry) but should be viewable.
  const haveAnyData = !!data || !!graph?.artifact;

  if (error && !haveAnyData) {
    return (
      <Box sx={{ p: { xs: 1, sm: 2, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
        <IconButton onClick={() => navigate(-1)} sx={{ mb: 1 }} aria-label="Back">
          <ArrowBackIcon />
        </IconButton>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!haveAnyData) {
    return (
      <Box sx={{ p: { xs: 1, sm: 2, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
        <IconButton onClick={() => navigate(-1)} sx={{ mb: 1 }} aria-label="Back">
          <ArrowBackIcon />
        </IconButton>
        <Alert severity="warning">No regulation found with identifier "{clauseCode}".</Alert>
      </Box>
    );
  }

  // Header content sourced from clause OR artifact (whichever we have).
  // Both share identifier/code + title; artifact may add citation + authority.
  const headerCode = data?.clause.clauseCode ?? graph!.artifact!.identifier;
  const headerTitle = data?.clause.title ?? graph!.artifact!.title;
  const headerSubtitle = data?.clause.family
    ? (typeof data.clause.family === 'string' ? data.clause.family : data.clause.family.name)
    : graph?.artifact?.source_authority;

  // Clause text only exists when the clauses table has a row. EOs/OMB memos
  // expose summary on the artifact instead.
  const clauseText = data?.clause.description
    ?? data?.clause.content
    ?? graph?.artifact?.summary
    ?? null;

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
      {/* Header — identifier and title at equal visual weight. Both are
          referenced equally in compliance work, so they get the same
          typographic emphasis (H5 desktop, H6 mobile). Identifier stays
          monospace to signal canonical-citation status. */}
      <Stack direction="row" alignItems="flex-start" spacing={1} sx={{ mb: 2 }}>
        <IconButton onClick={() => navigate(-1)} aria-label="Back" sx={{ mt: 0.25 }}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography
            variant={isMobile ? 'h6' : 'h5'}
            sx={{
              fontFamily: 'monospace',
              fontWeight: 700,
              color: 'primary.main',
              letterSpacing: '-0.01em',
              lineHeight: 1.3,
            }}
          >
            {headerCode}
          </Typography>
          <Typography
            variant={isMobile ? 'h6' : 'h5'}
            sx={{ fontWeight: 500, color: 'text.primary', mt: 0.25, lineHeight: 1.3 }}
          >
            {headerTitle}
          </Typography>
          {headerSubtitle && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              {headerSubtitle}
            </Typography>
          )}
          {/* Mig 095: reference-only meta-clauses (FAR 52.202-1, 52.252-2,
              52.212-4) exist in the catalog for citation matching but are not
              user-facing compliance obligations. Surface that distinction at
              the top of the page so reviewers know not to expect satisfaction
              status / methods on it. */}
          {data?.clause.isObligation === false && (
            <Chip
              size="small"
              label="Reference clause — not a compliance obligation"
              variant="outlined"
              color="default"
              sx={{ mt: 0.75, fontSize: '0.7rem', height: 22 }}
              title="This clause exists in the catalog as a citation/reference target (e.g. a definitions or incorporation-by-reference clause). It does not carry substantive compliance obligations itself, so the platform does not surface implementation status or satisfaction methods for it."
            />
          )}
          {/* Artifact-only view: show source authority + link when we don't have a clause record */}
          {!data && graph?.artifact && (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
              <Chip
                size="small"
                label={graph.artifact.artifact_type.replace(/_/g, ' ')}
                sx={{ fontSize: '0.65rem', height: 20 }}
                variant="outlined"
              />
              <Typography variant="caption" color="text.secondary">
                {graph.artifact.source_authority}
              </Typography>
              {(() => {
                const safeUrl = safeHref(graph.artifact.source_url);
                if (!safeUrl) return null;
                return (
                  <Link
                    href={safeUrl}
                    target="_blank"
                    rel="noopener"
                    variant="caption"
                    sx={{ ml: 1 }}
                  >
                    Authoritative source ↗
                  </Link>
                );
              })()}
            </Stack>
          )}
        </Box>
      </Stack>

      {/* Clause / artifact text */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            {data ? 'Clause Requirement' : 'Summary'}
          </Typography>
          <Typography
            variant="body2"
            sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}
          >
            {clauseText || 'No verbatim text on file. See the authoritative source link above.'}
          </Typography>
          {!data && graph?.artifact && (
            <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 1.5, fontStyle: 'italic' }}>
              Summary only — this regulation isn't tracked as a clause in your program yet.
              See related regulations below for connections to your active frameworks.
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Phase C-1: Satisfaction methods panel — replaces the prior dead-end
          message. Renders for every clause; shows curated authoritative
          methods + per-program status when a project is selected. When the
          catalog has no curated methods yet for the clause (C-4 backfill
          territory), the panel renders its own informational empty state. */}
      {/* Mig 095: reference-only clauses (is_obligation=false) never have
          satisfaction methods by definition — they're citation targets, not
          obligations. Hide the panel entirely so the "coming soon" empty
          state doesn't misleadingly suggest methods are pending. The
          Reference badge below the title already explains the distinction. */}
      {clauseCode && data?.clause.isObligation !== false && (
        <SatisfactionMethodsPanel
          clauseCode={clauseCode}
          programId={currentProject?.id ?? null}
          programName={currentProject?.name ?? null}
        />
      )}

      {data && data.activatedFrameworks.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
            How your program satisfies this clause
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            These are the framework controls your activated frameworks contribute toward this clause.
            Implement them all to satisfy the clause via reciprocity.
          </Typography>
          {data.activatedFrameworks.map(block => (
            <FrameworkChecklistCard
              key={block.framework.id}
              block={block}
              onJumpToControl={handleJumpToControl}
            />
          ))}
        </Box>
      )}

      {data && data.hasFrameworkCoverage && data.activatedFrameworks.length === 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <strong>You haven't activated any framework that satisfies this clause yet.</strong>{' '}
          Activate one of the alternatives below to start tracking compliance against it.
        </Alert>
      )}

      {data && data.alternativeFrameworks.length > 0 && (
        <>
          <Divider sx={{ my: 3 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
            Other frameworks that also satisfy this clause
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Not currently activated for this program. Activate one of these from
            the Controls page to add its checklist here.
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {data.alternativeFrameworks.map(alt => (
              <Tooltip key={alt.framework.id} title={`Mapping: ${alt.mappingType}`}>
                <Chip
                  icon={<LinkIcon />}
                  label={`${alt.framework.name} ${alt.framework.version}`}
                  onClick={() => navigate('/controls')}
                  sx={{ cursor: 'pointer' }}
                  variant="outlined"
                />
              </Tooltip>
            ))}
          </Box>
          <Button
            variant="text"
            size="small"
            sx={{ mt: 2 }}
            onClick={() => navigate('/controls')}
          >
            Manage activated frameworks →
          </Button>
        </>
      )}

      {/* Phase 1.5 — Related Regulations from the regulatory graph */}
      {graph && (graph.outgoing.length > 0 || graph.incoming.length > 0) && (
        <RelatedRegulationsPanel
          graph={graph}
          onArtifactClick={(artifact) => {
            // Only clauses we track have detail pages today; everything else
            // (EOs, OMB memos, statutes) gets a no-op for now until the
            // graph has its own viewer (Phase 4). We use the artifact_type
            // to decide whether to navigate.
            const navigable = ['far_clause', 'dfars_clause', 'hsar_clause', 'agency_supplement_clause'];
            if (navigable.includes(artifact.artifact_type)) {
              navigate(`/clauses/${encodeURIComponent(artifact.identifier)}`);
            }
          }}
        />
      )}
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Related Regulations panel (Phase 1.5)
// ─────────────────────────────────────────────────────────────────────────────

/** Short human-readable label for a relationship type. */
function relationshipLabel(rel: string, direction: 'outgoing' | 'incoming'): string {
  // For outgoing edges, present in active voice ("references X").
  // For incoming edges, present in passive voice ("referenced by Y").
  const out: Record<string, string> = {
    cites: 'references',
    incorporates_by_reference: 'incorporates by reference',
    derived_from: 'derived from',
    flows_down_to: 'flows down to',
    mandates: 'mandates',
    implements: 'implements',
    supersedes: 'supersedes',
    amends: 'amends',
    codified_in: 'codified in',
    created_by: 'created by',
    extension_of: 'extension of',
  };
  const inc: Record<string, string> = {
    cites: 'referenced by',
    incorporates_by_reference: 'incorporated by reference in',
    derived_from: 'derivation source of',
    flows_down_to: 'flowed down from',
    mandates: 'mandated by',
    implements: 'implemented by',
    supersedes: 'superseded by',
    amends: 'amended by',
    codified_in: 'codifies',
    created_by: 'created',
    extension_of: 'extended by',
  };
  return (direction === 'outgoing' ? out[rel] : inc[rel]) || rel.replace(/_/g, ' ');
}

/** Visual treatment per artifact type. */
function artifactTypeColor(type: string): string {
  if (type === 'executive_order') return '#dc2626';
  if (type === 'omb_memo') return '#9333ea';
  if (type === 'statute') return '#0891b2';
  if (type === 'cfr_part' || type === 'cfr_section') return '#0ea5e9';
  if (type === 'far_clause' || type === 'dfars_clause' || type === 'hsar_clause') return '#f59e0b';
  if (type === 'nist_publication') return '#22c55e';
  return '#64748b';
}

const ArtifactRow: React.FC<{
  relationshipLabel: string;
  artifact: RegulatoryArtifactRef;
  citation: string | null;
  description: string | null;
  onClick: (a: RegulatoryArtifactRef) => void;
}> = ({ relationshipLabel, artifact, citation, description, onClick }) => {
  const navigable = ['far_clause', 'dfars_clause', 'hsar_clause', 'agency_supplement_clause'].includes(artifact.artifact_type);
  return (
    <Box
      onClick={() => onClick(artifact)}
      sx={{
        p: 1.5,
        borderLeft: '3px solid',
        borderColor: artifactTypeColor(artifact.artifact_type),
        bgcolor: 'background.paper',
        borderRadius: '0 6px 6px 0',
        cursor: navigable ? 'pointer' : 'default',
        '&:hover': navigable ? { bgcolor: 'action.hover' } : {},
        mb: 1,
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5, flexWrap: 'wrap' }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {relationshipLabel}
        </Typography>
        <Chip
          label={artifact.artifact_type.replace(/_/g, ' ')}
          size="small"
          variant="outlined"
          sx={{ fontSize: '0.6rem', height: 18, color: artifactTypeColor(artifact.artifact_type), borderColor: artifactTypeColor(artifact.artifact_type) }}
        />
      </Stack>
      <Typography
        variant="body2"
        sx={{ fontFamily: 'monospace', fontWeight: 700, color: navigable ? 'primary.main' : 'text.primary' }}
      >
        {artifact.identifier}
      </Typography>
      <Typography variant="body2" color="text.primary" sx={{ mt: 0.25 }}>
        {artifact.title}
      </Typography>
      {description && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontStyle: 'italic' }}>
          {description}
        </Typography>
      )}
      {citation && (
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            mt: 0.5,
            color: 'text.disabled',
            fontFamily: 'monospace',
            fontSize: '0.7rem',
          }}
          title={`Authority: ${citation}`}
        >
          Source: {citation}
        </Typography>
      )}
    </Box>
  );
};

const RelatedRegulationsPanel: React.FC<{
  graph: ClauseGraphResponse;
  onArtifactClick: (a: RegulatoryArtifactRef) => void;
}> = ({ graph, onArtifactClick }) => {
  return (
    <>
      <Divider sx={{ my: 3 }} />
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
          Related Regulations
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          How this regulation connects to executive orders, statutes, NIST publications, and other federal regulations.
          Each link cites the specific paragraph that documents the relationship.
        </Typography>

        {graph.outgoing.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              This regulation
            </Typography>
            {graph.outgoing.map((edge, i) => (
              <ArtifactRow
                key={`out-${i}`}
                relationshipLabel={relationshipLabel(edge.relationship_type, 'outgoing')}
                artifact={edge.target}
                citation={edge.source_authority_for_link}
                description={edge.description}
                onClick={onArtifactClick}
              />
            ))}
          </Box>
        )}

        {graph.incoming.length > 0 && (
          <Box>
            <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              This regulation is
            </Typography>
            {graph.incoming.map((edge, i) => (
              <ArtifactRow
                key={`in-${i}`}
                relationshipLabel={relationshipLabel(edge.relationship_type, 'incoming')}
                artifact={edge.source}
                citation={edge.source_authority_for_link}
                description={edge.description}
                onClick={onArtifactClick}
              />
            ))}
          </Box>
        )}
      </Box>
    </>
  );
};

export default ClauseDetail;
