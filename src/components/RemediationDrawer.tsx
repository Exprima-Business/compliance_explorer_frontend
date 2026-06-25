import { useEffect, useMemo, useState } from 'react';
import {
  Box, Chip, CircularProgress, Divider, Drawer, FormControl, IconButton,
  MenuItem, Select, Stack, Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { type CascadeMoveObligation } from '../hooks/useCascadeMoveObligations';
import { useCascadeOrgMoveObligations } from '../hooks/useCascadeOrg';
import type { CascadeMove } from '../hooks/useCascadeLeverage';
import { useOrgMembers, memberLabel } from '../hooks/useOrgMembers';
import { useOrg } from '../contexts/OrgContext';
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
  const { currentOrg } = useOrg();
  const open = !!move;
  // Drill-in is org-scoped now (the program tier is retired).
  const { data: obligations, isLoading } = useCascadeOrgMoveObligations(
    move?.mechanismTypeId ?? null,
    open,
  );

  // Group what this move clears by authority (mockup B: the unlock tree). The
  // obligations a move clears are open by construction (it satisfies them).
  const grouped = useMemo(() => {
    const byAuth = new Map<string, CascadeMoveObligation[]>();
    for (const o of obligations ?? []) {
      const k = o.sourceAuthority || 'Other';
      const arr = byAuth.get(k) ?? [];
      arr.push(o);
      byAuth.set(k, arr);
    }
    return Array.from(byAuth.entries())
      .map(([authority, items]) => ({ authority, items }))
      .sort((a, b) => b.items.length - a.items.length);
  }, [obligations]);

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
    if (!move) return;
    setSavingLead(true);
    const res = await apiCall<{ leadUserId: string | null }>(
      `/api/cascade/org/lead/${encodeURIComponent(move.mechanismTypeId)}`,
      { method: 'PUT', body: JSON.stringify({ leadUserId }), requireAuth: true },
    );
    setSavingLead(false);
    if (res.error) return;
    setLocalLead(leadUserId ?? '');
    // Refresh the dashboard card's Owner column.
    queryClient.invalidateQueries({ queryKey: keys.cascadeOrgLeverage(currentOrg?.id) });
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
                  <FormControl size="small" fullWidth disabled={savingLead || membersLoading}>
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
            What this clears
          </Typography>

          {isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={20} /></Box>
          )}

          {!isLoading && grouped.length > 0 && (
            <>
              <Stack spacing={1.75}>
                {grouped.map(({ authority, items }) => (
                  <Box key={authority}>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 0.75 }}>
                      {authority}
                    </Typography>
                    <Stack spacing={0.75}>
                      {items.map(o => (
                        <Stack key={o.artifactId} direction="row" alignItems="flex-start" spacing={1}
                          onClick={() => goClause(o.identifier)}
                          sx={{ cursor: 'pointer', borderRadius: 1, p: 0.5, '&:hover': { bgcolor: 'action.hover' } }}>
                          <Chip label="open" size="small" variant="outlined"
                            sx={{ height: 18, fontSize: 10, color: '#854F0B', borderColor: '#BA7517', flexShrink: 0, mt: 0.25 }} />
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography component="span" variant="body2" sx={{ fontWeight: 500, color: PURPLE }}>{o.identifier}</Typography>
                            <Typography component="span" variant="body2" color="text.secondary"> — {o.title}</Typography>
                          </Box>
                          <OpenInNewIcon sx={{ fontSize: 14, color: 'text.secondary', flexShrink: 0, mt: 0.4 }} />
                        </Stack>
                      ))}
                    </Stack>
                  </Box>
                ))}
              </Stack>
              <Typography variant="caption" color="text.secondary"
                sx={{ fontStyle: 'italic', display: 'block', mt: 1.75, borderTop: '0.5px solid', borderColor: 'divider', pt: 1.25 }}>
                One action → {move.obligationsCleared} {move.obligationsCleared === 1 ? 'obligation' : 'obligations'} cleared
                across {move.authoritiesCount} {move.authoritiesCount === 1 ? 'authority' : 'authorities'}.
              </Typography>
            </>
          )}

          {!isLoading && grouped.length === 0 && (
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
