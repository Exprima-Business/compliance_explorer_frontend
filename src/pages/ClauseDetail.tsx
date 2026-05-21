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
  type ClauseDetailResponse,
  type ClauseDetailActivatedFramework,
  type ClauseDetailControl,
} from '../services/clauseService';
import { extractErrorMessage } from '../utils/errorUtils';

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

  const [data, setData] = useState<ClauseDetailResponse | null>(null);
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
      const resp = await fetchClauseDetail(clauseCode);
      if (cancelled) return;
      if (resp.error) {
        setError(extractErrorMessage(resp.error));
      } else if (resp.data) {
        setData(resp.data);
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

  if (error) {
    return (
      <Box sx={{ p: { xs: 1, sm: 2, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
        <IconButton onClick={() => navigate(-1)} sx={{ mb: 1 }} aria-label="Back">
          <ArrowBackIcon />
        </IconButton>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box sx={{ p: { xs: 1, sm: 2, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
        <IconButton onClick={() => navigate(-1)} sx={{ mb: 1 }} aria-label="Back">
          <ArrowBackIcon />
        </IconButton>
        <Alert severity="warning">No data for clause {clauseCode}.</Alert>
      </Box>
    );
  }

  const { clause, activatedFrameworks, alternativeFrameworks, hasFrameworkCoverage } = data;

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <IconButton onClick={() => navigate(-1)} aria-label="Back">
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{ fontFamily: 'monospace', letterSpacing: 0.5 }}
          >
            {clause.clauseCode}
          </Typography>
          <Typography variant={isMobile ? 'h5' : 'h4'} sx={{ fontWeight: 700, mt: -0.5 }}>
            {clause.title}
          </Typography>
          {clause.family && (
            <Typography variant="caption" color="text.secondary">
              {typeof clause.family === 'string' ? clause.family : clause.family.name}
            </Typography>
          )}
        </Box>
      </Stack>

      {/* Clause text */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Clause Requirement
          </Typography>
          <Typography
            variant="body2"
            sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}
          >
            {clause.description || clause.content || 'No verbatim text on file for this clause.'}
          </Typography>
        </CardContent>
      </Card>

      {/* No framework coverage at all */}
      {!hasFrameworkCoverage && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <strong>No control framework directly satisfies this clause yet.</strong>{' '}
          The clause text above is the authoritative reference. As we add more
          framework crosswalks (CMMC, HIPAA, Section 508, etc.) this page will
          show specific controls to implement.
        </Alert>
      )}

      {/* Activated frameworks — full checklists */}
      {activatedFrameworks.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
            How your program satisfies this clause
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            These are the framework controls your activated frameworks contribute toward this clause.
            Implement them all to satisfy the clause via reciprocity.
          </Typography>
          {activatedFrameworks.map(block => (
            <FrameworkChecklistCard
              key={block.framework.id}
              block={block}
              onJumpToControl={handleJumpToControl}
            />
          ))}
        </Box>
      )}

      {/* No activated framework but alternatives exist */}
      {hasFrameworkCoverage && activatedFrameworks.length === 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <strong>You haven't activated any framework that satisfies this clause yet.</strong>{' '}
          Activate one of the alternatives below to start tracking compliance against it.
        </Alert>
      )}

      {/* Alternative frameworks — not activated, but available */}
      {alternativeFrameworks.length > 0 && (
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
            {alternativeFrameworks.map(alt => (
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
    </Box>
  );
};

export default ClauseDetail;
