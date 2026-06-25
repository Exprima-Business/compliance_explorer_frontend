import { useState } from 'react';
import {
  Box, Button, Card, CardContent, Chip, CircularProgress, Stack, Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import { useCascadeOrgLeverage } from '../hooks/useCascadeOrg';
import { type CascadeMove } from '../hooks/useCascadeLeverage';
import { useOrgMembers, memberLabel } from '../hooks/useOrgMembers';
import RemediationDrawer from '../components/RemediationDrawer';
import { PURPLE, riskBg, riskFg, statusSx, iconFor } from '../components/remediationVisuals';

/**
 * The full list of remediation actions (org-wide cascade moves), ranked by
 * requirements resolved. Reached from the dashboard's "View all actions" /
 * "See all actions" links. Clicking a row opens the same RemediationDrawer.
 */
export default function RemediationActions() {
  const navigate = useNavigate();
  const { data: moves, isLoading } = useCascadeOrgLeverage();
  const { data: members = [] } = useOrgMembers();
  const [activeMove, setActiveMove] = useState<CascadeMove | null>(null);

  const leadLabel = (userId: string | null) => {
    if (!userId) return null;
    const mem = members.find((x) => x.userId === userId);
    return mem ? memberLabel(mem) : 'Assigned';
  };

  const list = moves ?? [];

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      <Button
        size="small" startIcon={<ArrowBackIcon />}
        sx={{ textTransform: 'none', mb: 1 }}
        onClick={() => navigate('/dashboard')}
      >
        Dashboard
      </Button>
      <Typography variant="h4" sx={{ fontWeight: 700 }}>Remediation actions</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Every high-leverage move across your organization baseline, ranked by requirements resolved.
        Click an action to start it.
      </Typography>

      <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
          ) : list.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No actions yet — activate a framework to surface your obligations.
            </Typography>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Box
                component="table"
                sx={{
                  width: '100%', borderCollapse: 'collapse', minWidth: 640,
                  '& th': { textAlign: 'left', fontSize: 11, color: 'text.secondary', fontWeight: 500, py: 0.5, px: 1, whiteSpace: 'nowrap' },
                  '& td': { py: 1, px: 1, borderTop: '0.5px solid', borderColor: 'divider', fontSize: 13, verticalAlign: 'middle' },
                }}
              >
                <thead>
                  <tr>
                    <th></th><th>Action</th><th>Impact</th><th>Affects</th><th>Risk reduction</th><th>Owner</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((mv, i) => (
                    <Box
                      component="tr" key={mv.mechanismTypeId}
                      onClick={() => setActiveMove(mv)}
                      sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                    >
                      <td>
                        <Box sx={{ width: 22, height: 22, borderRadius: '50%', bgcolor: 'rgba(83,74,183,0.12)', color: PURPLE, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</Box>
                      </td>
                      <td>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          {iconFor(mv.mechanismLabel)}
                          <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>{mv.mechanismLabel}</Typography>
                        </Stack>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <Typography variant="body2"><Box component="span" sx={{ fontWeight: 600 }}>{mv.obligationsCleared}</Box> reqs</Typography>
                      </td>
                      <td><Typography variant="body2" color="text.secondary">{mv.affectsSolicitations > 0 ? mv.affectsSolicitations : '—'}</Typography></td>
                      <td><Chip label={mv.riskLevel} size="small" sx={{ height: 20, fontSize: 11, bgcolor: riskBg(mv.riskLevel), color: riskFg(mv.riskLevel) }} /></td>
                      <td>
                        {leadLabel(mv.leadUserId)
                          ? <Typography variant="body2" noWrap>{leadLabel(mv.leadUserId)}</Typography>
                          : <Typography variant="body2" color="text.secondary">Unassigned</Typography>}
                      </td>
                      <td><Chip label={mv.status} size="small" sx={{ height: 20, fontSize: 11, ...statusSx(mv.status) }} /></td>
                    </Box>
                  ))}
                </tbody>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      <RemediationDrawer move={activeMove} onClose={() => setActiveMove(null)} />
    </Box>
  );
}
