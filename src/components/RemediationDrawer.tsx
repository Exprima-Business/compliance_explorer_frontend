import {
  Box, Button, Chip, CircularProgress, Divider, Drawer, IconButton, Stack, Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import { useNavigate } from 'react-router-dom';
import { useCascadeMoveObligations } from '../hooks/useCascadeMoveObligations';
import type { CascadeMove } from '../hooks/useCascadeLeverage';

const PURPLE = '#534AB7';

/** Plain-English "how to fix" guidance per remediation family. */
function howToFix(label: string): string {
  const l = label.toLowerCase();
  if (l.includes('framework control')) return 'Implement the mapped controls in the Controls matrix and attach evidence.';
  if (l.includes('flowdown') || l.includes('subcontract')) return 'Add the required clause language to your subcontract templates.';
  if (l.includes('policy') || l.includes('procedure')) return 'Draft or update the policy, then map it to the requirements below.';
  if (l.includes('incident')) return 'Stand up the reporting workflow and document the response timeline.';
  if (l.includes('training')) return 'Assign the curriculum and retain completion records.';
  if (l.includes('assessment') || l.includes('authorization')) return 'Schedule the assessment / authorization and upload the resulting package.';
  return 'Work each requirement below — open it to mark satisfaction and attach evidence.';
}

/**
 * Slide-over detail for a Priority Remediation action. Shows the action, the
 * specific requirements it resolves (live, each clickable to its clause where
 * satisfaction is marked), how-to-fix guidance, and the operational fields
 * (owner / status / affected solicitations / risk) — placeholders until wired.
 */
export default function RemediationDrawer({
  move, onClose,
}: {
  move: CascadeMove | null;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const open = !!move;
  const { data: obligations, isLoading } = useCascadeMoveObligations(move?.mechanismTypeId ?? null, open);

  const goClause = (identifier: string) => {
    onClose();
    navigate(`/clauses/${encodeURIComponent(identifier)}`);
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 440 }, maxWidth: '100%' } }}>
      {move && (
        <Box sx={{ p: 2 }}>
          {/* Header */}
          <Stack direction="row" alignItems="flex-start" spacing={1} sx={{ mb: 1.5 }}>
            <TaskAltIcon sx={{ color: PURPLE, mt: 0.25 }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                Remediation action
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2 }}>{move.mechanismLabel}</Typography>
            </Box>
            <IconButton size="small" onClick={onClose} aria-label="Close"><CloseIcon fontSize="small" /></IconButton>
          </Stack>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Resolves <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>{move.obligationsCleared} requirements</Box>
            {' '}across {move.authoritiesCount} authorities.
          </Typography>

          {/* Operational fields (placeholders until wired) */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 2 }}>
            <Field label="Status" value={<Chip label="Not started" size="small" variant="outlined" sx={{ height: 20, fontSize: 11 }} />} />
            <Field label="Owner" value={<Typography variant="body2" color="text.secondary">Unassigned</Typography>} />
            <Field label="Affects solicitations" value={<Typography variant="body2" color="text.secondary">—</Typography>} />
            <Field label="Risk reduction" value={<Typography variant="body2" color="text.secondary">—</Typography>} />
          </Box>

          {/* How to fix */}
          <Box sx={{ bgcolor: '#F5F4FC', borderRadius: 1.5, p: 1.5, mb: 2 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: '#3C3489', display: 'block', mb: 0.25 }}>How to fix</Typography>
            <Typography variant="body2" color="text.secondary">{howToFix(move.mechanismLabel)}</Typography>
          </Box>

          <Divider sx={{ mb: 1.5 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Requirements this resolves
          </Typography>

          {isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={20} /></Box>
          )}

          {!isLoading && obligations && obligations.length > 0 && (
            <Stack spacing={0.5}>
              {obligations.map(o => (
                <Stack key={o.artifactId} direction="row" alignItems="center" spacing={1}
                  onClick={() => goClause(o.identifier)}
                  sx={{ cursor: 'pointer', p: 0.75, borderRadius: 1, '&:hover': { bgcolor: 'action.hover' } }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: PURPLE }} noWrap>{o.identifier}</Typography>
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }} title={o.title}>
                      {o.sourceAuthority} · {o.title}
                    </Typography>
                  </Box>
                  <OpenInNewIcon sx={{ fontSize: 15, color: 'text.secondary', flexShrink: 0 }} />
                </Stack>
              ))}
            </Stack>
          )}

          {!isLoading && (!obligations || obligations.length === 0) && (
            <Typography variant="body2" color="text.secondary">No open requirements for this action.</Typography>
          )}
        </Box>
      )}
    </Drawer>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{label}</Typography>
      {value}
    </Box>
  );
}
