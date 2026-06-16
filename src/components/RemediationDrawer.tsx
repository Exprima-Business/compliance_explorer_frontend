import { useEffect, useState } from 'react';
import {
  Box, Chip, CircularProgress, Divider, Drawer, FormControl, IconButton,
  MenuItem, Select, Stack, Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useCascadeMoveObligations } from '../hooks/useCascadeMoveObligations';
import type { CascadeMove } from '../hooks/useCascadeLeverage';
import { useOrgMembers, memberLabel } from '../hooks/useOrgMembers';
import { useProject } from '../contexts/ProjectContext';
import { apiCall } from '../services/api';
import { keys } from '../queryClient';

const PURPLE = '#534AB7';
const riskBg = (l: string) => (l === 'High' ? 'rgba(163,45,45,0.12)' : l === 'Medium' ? 'rgba(180,83,9,0.12)' : 'rgba(0,0,0,0.06)');
const riskFg = (l: string) => (l === 'High' ? '#A32D2D' : l === 'Medium' ? '#854d0e' : '#5f5e5a');
const statusSx = (s: string) =>
  s === 'Complete' ? { bgcolor: 'rgba(21,128,61,0.12)', color: '#15803d' }
    : s === 'In progress' ? { bgcolor: 'rgba(180,83,9,0.12)', color: '#854d0e' }
      : { bgcolor: 'rgba(0,0,0,0.06)', color: '#5f5e5a' };

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
  const { currentProject } = useProject();
  const programId = currentProject?.id;
  const { data: members = [], isLoading: membersLoading } = useOrgMembers();
  const queryClient = useQueryClient();

  // Action-level oversight lead (the card's "Owner"). Seed from the move; keep
  // a local copy so the drawer reflects a change instantly while the leverage
  // query refetches in the background.
  const [localLead, setLocalLead] = useState<string>(move?.leadUserId ?? '');
  const [savingLead, setSavingLead] = useState(false);
  useEffect(() => {
    setLocalLead(move?.leadUserId ?? '');
  }, [move?.mechanismTypeId, move?.leadUserId]);

  const handleSetLead = async (leadUserId: string | null) => {
    if (!programId || !move) return;
    setSavingLead(true);
    const res = await apiCall<{ leadUserId: string | null }>(
      `/api/cascade/lead/${encodeURIComponent(programId)}/${encodeURIComponent(move.mechanismTypeId)}`,
      { method: 'PUT', body: JSON.stringify({ leadUserId }), requireAuth: true },
    );
    setSavingLead(false);
    if (res.error) return;
    setLocalLead(leadUserId ?? '');
    // Refresh the dashboard card's Owner column.
    queryClient.invalidateQueries({ queryKey: keys.cascadeLeverage(programId) });
  };

  const goClause = (identifier: string) => {
    onClose();
    navigate(`/clauses/${encodeURIComponent(identifier)}`);
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose}
      PaperProps={{ sx: {
        width: { xs: '100%', sm: 440 }, maxWidth: '100%',
        top: { xs: '56px', sm: '72px' },
        height: { xs: 'calc(100% - 56px)', sm: 'calc(100% - 72px)' },
      } }}>
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
            <Field label="Status" value={<Chip label={move.status} size="small" sx={{ height: 20, fontSize: 11, ...statusSx(move.status) }} />} />
            <Field
              label="Owner (oversight lead)"
              value={(
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <FormControl size="small" fullWidth disabled={!programId || savingLead || membersLoading}>
                    <Select
                      value={localLead}
                      displayEmpty
                      onChange={(e) => handleSetLead((e.target.value as string) || null)}
                      sx={{ '& .MuiSelect-select': { py: 0.5, fontSize: 13 } }}
                      renderValue={(val) => {
                        if (!val) return <Typography variant="body2" color="text.secondary">Unassigned</Typography>;
                        const m = members.find((x) => x.userId === val);
                        return <Typography variant="body2">{m ? memberLabel(m) : 'Unknown user'}</Typography>;
                      }}
                    >
                      <MenuItem value=""><Typography variant="body2" color="text.secondary">Unassigned</Typography></MenuItem>
                      {members.map((m) => (
                        <MenuItem key={m.userId} value={m.userId}><Typography variant="body2">{memberLabel(m)}</Typography></MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  {savingLead && <CircularProgress size={14} />}
                </Stack>
              )}
            />
            <Field
              label="Affects solicitations"
              value={(
                <Typography variant="body2" color={move.affectsSolicitations > 0 ? 'text.primary' : 'text.secondary'}>
                  {move.affectsSolicitations > 0
                    ? `${move.affectsSolicitations} ${move.affectsSolicitations === 1 ? 'solicitation' : 'solicitations'}`
                    : 'None'}
                </Typography>
              )}
            />
            <Field
              label="Risk reduction"
              value={<Chip label={move.riskLevel} size="small" sx={{ height: 20, fontSize: 11, bgcolor: riskBg(move.riskLevel), color: riskFg(move.riskLevel) }} />}
            />
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
