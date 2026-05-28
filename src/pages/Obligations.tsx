import React, { useMemo, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Container, Dialog, DialogActions,
  DialogContent, DialogContentText, DialogTitle, Divider, FormControl, IconButton,
  InputLabel, MenuItem, Paper, Select, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { keys } from '../queryClient';
import {
  listInstances, listObligations, createInstance, completeInstance, waiveInstance,
  type Obligation, type ObligationInstance, type InstanceStatus, type ObligationType,
  INSTANCE_STATUSES,
} from '../services/obligationsService';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BlockIcon from '@mui/icons-material/Block';

// ─────────────────────────────────────────────────────────────────────────────
// Status / type chip helpers
// ─────────────────────────────────────────────────────────────────────────────

function statusChipColor(status: InstanceStatus): 'default' | 'success' | 'warning' | 'error' | 'info' {
  switch (status) {
    case 'completed': return 'success';
    case 'in_progress': return 'info';
    case 'overdue': return 'error';
    case 'waived': return 'default';
    case 'not_started':
    default: return 'warning';
  }
}

const TYPE_COLORS: Record<ObligationType, string> = {
  attestation: '#7c3aed',
  action: '#0891b2',
  recurring: '#16a34a',
  checklist: '#ea580c',
  notification: '#dc2626',
};

function daysUntil(date: string | null): number | null {
  if (!date) return null;
  const due = new Date(date + 'T00:00:00Z').getTime();
  const today = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z').getTime();
  return Math.round((due - today) / 86_400_000);
}

function formatDueLabel(date: string | null): { label: string; emphasis: 'overdue' | 'soon' | 'normal' | 'none' } {
  if (!date) return { label: '—', emphasis: 'none' };
  const d = daysUntil(date);
  if (d == null) return { label: date, emphasis: 'normal' };
  if (d < 0) return { label: `${date} (${Math.abs(d)}d overdue)`, emphasis: 'overdue' };
  if (d === 0) return { label: `${date} (today)`, emphasis: 'soon' };
  if (d <= 30) return { label: `${date} (in ${d}d)`, emphasis: 'soon' };
  return { label: date, emphasis: 'normal' };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

const Obligations: React.FC = () => {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<InstanceStatus | 'all'>('all');
  const [dueWithin, setDueWithin] = useState<number | 'all'>('all');
  const [scope, setScope] = useState<'all' | 'org_wide' | 'program'>('all');
  const [addOpen, setAddOpen] = useState(false);
  const [completeFor, setCompleteFor] = useState<ObligationInstance | null>(null);
  const [waiveFor, setWaiveFor] = useState<ObligationInstance | null>(null);

  // Instances query
  const instancesParams = useMemo(() => {
    const p: any = {};
    if (statusFilter !== 'all') p.status = statusFilter;
    if (dueWithin !== 'all') p.due_within_days = dueWithin;
    if (scope === 'org_wide') p.project_id = 'null';
    return p;
  }, [statusFilter, dueWithin, scope]);

  const instancesQ = useQuery({
    queryKey: keys.obligationInstances(instancesParams),
    queryFn: async () => {
      const resp = await listInstances(instancesParams);
      if (!resp.data) {
        const msg = typeof resp.error === 'string' ? resp.error : resp.error?.message;
        throw new Error(msg || 'Failed to load instances');
      }
      return resp.data;
    },
  });

  // Catalog query — used in the Add dialog
  const catalogQ = useQuery({
    queryKey: keys.obligations(),
    queryFn: async () => {
      const resp = await listObligations();
      if (!resp.data) {
        const msg = typeof resp.error === 'string' ? resp.error : resp.error?.message;
        throw new Error(msg || 'Failed to load catalog');
      }
      return resp.data.items;
    },
  });

  const invalidateInstances = () => {
    qc.invalidateQueries({ queryKey: ['obligations', 'instances'] });
    qc.invalidateQueries({ queryKey: ['obligations', 'instance'] });
  };

  const completeMut = useMutation({
    mutationFn: async (input: { id: string; evidence_uri?: string; notes?: string }) => {
      const resp = await completeInstance(input.id, {
        evidence_uri: input.evidence_uri,
        notes: input.notes,
      });
      if (!resp.data) {
        const msg = typeof resp.error === 'string' ? resp.error : resp.error?.message;
        throw new Error(msg || 'Failed to complete');
      }
      return resp.data;
    },
    onSuccess: invalidateInstances,
  });

  const waiveMut = useMutation({
    mutationFn: async (input: { id: string; reason: string }) => {
      const resp = await waiveInstance(input.id, input.reason);
      if (!resp.data) {
        const msg = typeof resp.error === 'string' ? resp.error : resp.error?.message;
        throw new Error(msg || 'Failed to waive');
      }
      return resp.data;
    },
    onSuccess: invalidateInstances,
  });

  const createMut = useMutation({
    mutationFn: async (input: { obligation_id: string; project_id?: string | null }) => {
      const resp = await createInstance(input);
      if (!resp.data) {
        const msg = typeof resp.error === 'string' ? resp.error : resp.error?.message;
        throw new Error(msg || 'Failed to create instance');
      }
      return resp.data;
    },
    onSuccess: () => {
      invalidateInstances();
      setAddOpen(false);
    },
  });

  // Computed stats for the summary bar
  const stats = useMemo(() => {
    const items = instancesQ.data?.items ?? [];
    const today = new Date().toISOString().slice(0, 10);
    let overdue = 0, dueSoon = 0, completed = 0;
    for (const r of items) {
      if (r.status === 'completed' || r.status === 'waived') {
        if (r.status === 'completed') completed++;
        continue;
      }
      if (r.due_date && r.due_date < today) overdue++;
      else if (r.due_date) {
        const d = daysUntil(r.due_date);
        if (d != null && d <= 30) dueSoon++;
      }
    }
    return { total: items.length, overdue, dueSoon, completed };
  }, [instancesQ.data]);

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
        Compliance Obligations
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Federal cyber / IT / data obligations beyond control implementation —
        attestations, deadlines, recurring submissions, incident reporting.
      </Typography>

      {/* Summary chips */}
      <Stack direction="row" spacing={1.5} sx={{ mb: 3, flexWrap: 'wrap' }}>
        <Chip label={`${stats.overdue} overdue`} color="error" variant={stats.overdue ? 'filled' : 'outlined'} />
        <Chip label={`${stats.dueSoon} due in 30d`} color="warning" variant={stats.dueSoon ? 'filled' : 'outlined'} />
        <Chip label={`${stats.completed} completed`} color="success" variant="outlined" />
        <Chip label={`${stats.total} total`} variant="outlined" />
      </Stack>

      {/* Filter row */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Status</InputLabel>
            <Select
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <MenuItem value="all">All statuses</MenuItem>
              {INSTANCE_STATUSES.map((s) => (
                <MenuItem key={s} value={s}>{s.replace('_', ' ')}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Due window</InputLabel>
            <Select
              label="Due window"
              value={dueWithin}
              onChange={(e) => setDueWithin(e.target.value as any)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value={7}>Next 7 days</MenuItem>
              <MenuItem value={30}>Next 30 days</MenuItem>
              <MenuItem value={90}>Next 90 days</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Scope</InputLabel>
            <Select
              label="Scope"
              value={scope}
              onChange={(e) => setScope(e.target.value as any)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="org_wide">Org-wide only</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ flex: 1 }} />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddOpen(true)}
          >
            Add obligation
          </Button>
        </Stack>
      </Paper>

      {/* Loading / error states */}
      {instancesQ.isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      )}
      {instancesQ.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {(instancesQ.error as Error).message}
        </Alert>
      )}

      {/* Instance table */}
      {!instancesQ.isLoading && !instancesQ.error && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Obligation</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Owner</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Due</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Source</TableCell>
                <TableCell sx={{ fontWeight: 600, width: 140 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(instancesQ.data?.items ?? []).map((row) => {
                const ob = row.obligation;
                const due = formatDueLabel(row.due_date);
                return (
                  <TableRow key={row.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {ob?.short_title ?? ob?.title ?? '(deleted)'}
                      </Typography>
                      {row.project_id === null && (
                        <Chip label="org-wide" size="small" variant="outlined" sx={{ mt: 0.5, height: 18, fontSize: 10 }} />
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={ob?.obligation_type}
                        size="small"
                        sx={{
                          bgcolor: ob ? TYPE_COLORS[ob.obligation_type] : undefined,
                          color: '#fff',
                          fontWeight: 500,
                          height: 22,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {ob?.owner_role ?? '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={row.status.replace('_', ' ')}
                        size="small"
                        color={statusChipColor(row.status)}
                        variant={row.status === 'not_started' ? 'outlined' : 'filled'}
                      />
                    </TableCell>
                    <TableCell sx={{
                      color: due.emphasis === 'overdue' ? 'error.main'
                           : due.emphasis === 'soon' ? 'warning.dark'
                           : 'text.primary',
                      fontWeight: due.emphasis === 'overdue' ? 600 : 400,
                    }}>
                      {due.label}
                    </TableCell>
                    <TableCell>
                      {ob?.source ? (
                        <Tooltip title={ob.source.title}>
                          <Chip
                            label={ob.source.identifier}
                            size="small"
                            variant="outlined"
                            sx={{ fontFamily: 'monospace', height: 22 }}
                          />
                        </Tooltip>
                      ) : (
                        <Typography variant="caption" color="text.secondary">—</Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {row.status !== 'completed' && row.status !== 'waived' && (
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <Tooltip title="Mark complete">
                            <IconButton size="small" onClick={() => setCompleteFor(row)}>
                              <CheckCircleIcon fontSize="small" color="success" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Waive">
                            <IconButton size="small" onClick={() => setWaiveFor(row)}>
                              <BlockIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {(instancesQ.data?.items ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary" gutterBottom>
                      No obligation instances match the current filters.
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Click "Add obligation" to track one from the catalog.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add obligation dialog */}
      <AddObligationDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        catalog={catalogQ.data ?? []}
        onCreate={(obligation_id) => createMut.mutate({ obligation_id, project_id: null })}
        isCreating={createMut.isPending}
      />

      {/* Complete dialog */}
      <CompleteInstanceDialog
        instance={completeFor}
        onClose={() => setCompleteFor(null)}
        onSubmit={(payload) => {
          if (completeFor) completeMut.mutate({ id: completeFor.id, ...payload });
          setCompleteFor(null);
        }}
      />

      {/* Waive dialog */}
      <WaiveInstanceDialog
        instance={waiveFor}
        onClose={() => setWaiveFor(null)}
        onSubmit={(reason) => {
          if (waiveFor) waiveMut.mutate({ id: waiveFor.id, reason });
          setWaiveFor(null);
        }}
      />
    </Container>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Add dialog — pick a catalog obligation to start tracking
// ─────────────────────────────────────────────────────────────────────────────

interface AddDialogProps {
  open: boolean;
  onClose: () => void;
  catalog: Obligation[];
  onCreate: (obligation_id: string) => void;
  isCreating: boolean;
}

const AddObligationDialog: React.FC<AddDialogProps> = ({ open, onClose, catalog, onCreate, isCreating }) => {
  const [selected, setSelected] = useState<string>('');
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Add obligation to track</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          Pick a canonical obligation from the catalog. An org-wide instance
          will be created with the initial due date computed from the obligation's
          cadence. You can refine the due date or evidence later.
        </DialogContentText>
        <FormControl fullWidth size="small">
          <InputLabel>Obligation</InputLabel>
          <Select
            label="Obligation"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            {catalog.map((o) => (
              <MenuItem key={o.id} value={o.id}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%' }}>
                  <Chip
                    label={o.obligation_type}
                    size="small"
                    sx={{ bgcolor: TYPE_COLORS[o.obligation_type], color: '#fff', height: 18, fontSize: 10 }}
                  />
                  <Typography variant="body2">{o.title}</Typography>
                  <Box sx={{ flex: 1 }} />
                  <Typography variant="caption" color="text.secondary">{o.owner_role}</Typography>
                </Stack>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={() => onCreate(selected)}
          variant="contained"
          disabled={!selected || isCreating}
        >
          {isCreating ? 'Adding…' : 'Add'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Complete dialog
// ─────────────────────────────────────────────────────────────────────────────

interface CompleteDialogProps {
  instance: ObligationInstance | null;
  onClose: () => void;
  onSubmit: (payload: { evidence_uri?: string; notes?: string }) => void;
}

const CompleteInstanceDialog: React.FC<CompleteDialogProps> = ({ instance, onClose, onSubmit }) => {
  const [evidenceUri, setEvidenceUri] = useState('');
  const [notes, setNotes] = useState('');
  React.useEffect(() => {
    if (instance) { setEvidenceUri(''); setNotes(''); }
  }, [instance]);

  return (
    <Dialog open={!!instance} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Mark complete</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          {instance?.obligation?.title ?? 'Obligation'}
          {instance?.obligation?.cadence_unit && ['days', 'months', 'years'].includes(instance.obligation.cadence_unit) && (
            <Typography variant="caption" display="block" sx={{ mt: 1, color: 'info.main' }}>
              Completing this will auto-create the next period's instance.
            </Typography>
          )}
        </DialogContentText>
        <TextField
          fullWidth
          size="small"
          label="Evidence URI (signed PDF, submission receipt, etc.)"
          value={evidenceUri}
          onChange={(e) => setEvidenceUri(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          size="small"
          label="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          multiline
          minRows={2}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          color="success"
          onClick={() => onSubmit({
            evidence_uri: evidenceUri.trim() || undefined,
            notes: notes.trim() || undefined,
          })}
        >
          Mark complete
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Waive dialog
// ─────────────────────────────────────────────────────────────────────────────

interface WaiveDialogProps {
  instance: ObligationInstance | null;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}

const WaiveInstanceDialog: React.FC<WaiveDialogProps> = ({ instance, onClose, onSubmit }) => {
  const [reason, setReason] = useState('');
  React.useEffect(() => {
    if (instance) setReason('');
  }, [instance]);

  return (
    <Dialog open={!!instance} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Waive obligation</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          {instance?.obligation?.title}
          <Typography variant="caption" display="block" sx={{ mt: 1, color: 'warning.dark' }}>
            A waiver creates an audit-log entry. Be specific about why this obligation
            doesn't apply to your org / contract — auditors will read this.
          </Typography>
        </DialogContentText>
        <TextField
          fullWidth
          size="small"
          label="Waiver reason (required)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          multiline
          minRows={3}
          required
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          color="warning"
          disabled={!reason.trim()}
          onClick={() => onSubmit(reason.trim())}
        >
          Waive
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default Obligations;
