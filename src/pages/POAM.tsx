import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DownloadIcon from '@mui/icons-material/Download';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import FlagIcon from '@mui/icons-material/Flag';
import { useSearchParams } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import {
  ITEM_STATUSES,
  MILESTONE_STATUSES,
  RISK_LEVELS,
  itemStatusColor,
  itemStatusLabel,
  milestoneStatusColor,
  milestoneStatusLabel,
  poamService,
  riskColor,
  riskLabel,
  type ControlOption,
  type PoamItem,
  type PoamItemStatus,
  type PoamMilestone,
  type PoamMilestoneStatus,
  type PoamRiskLevel,
} from '../services/poamService';
import { extractErrorMessage } from '../utils/errorUtils';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  // Accept either YYYY-MM-DD or ISO timestamp; show YYYY-MM-DD.
  const m = iso.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : iso;
}

/** Plain YYYY-MM-DD (no em-dash placeholder) for CSV cells. */
function csvDate(iso: string | null): string {
  if (!iso) return '';
  const m = iso.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : iso;
}

/** Excel-safe CSV cell — wraps in quotes if the value contains a comma, quote, or newline; doubles internal quotes. */
function csvCell(value: string | null | undefined): string {
  const s = (value ?? '').toString();
  if (s === '') return '';
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function downloadCsv(filename: string, rows: string[][]): void {
  // Excel-friendly: UTF-8 BOM + CRLF line endings.
  const bom = '﻿';
  const body = rows.map(r => r.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob([bom + body], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function blankItemForm(programId: string) {
  // Auto-set Identified date to today on new manual entry. The field stays
  // editable for cases where the weakness was discovered earlier than today.
  const today = new Date().toISOString().slice(0, 10);
  return {
    programId,
    controlId: '' as string,
    weakness: '',
    description: '',
    riskLevel: 'moderate' as PoamRiskLevel,
    status: 'open' as PoamItemStatus,
    remediationPlan: '',
    responsibleParty: '',
    identifiedAt: today,
    scheduledCompletion: '',
  };
}

type ItemForm = ReturnType<typeof blankItemForm>;

function blankMilestoneForm() {
  return {
    description: '',
    targetDate: '',
    status: 'pending' as PoamMilestoneStatus,
  };
}

type MilestoneForm = ReturnType<typeof blankMilestoneForm>;

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

const POAM: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { currentProject } = useProject();
  const programId = currentProject?.id ?? null;
  const [searchParams, setSearchParams] = useSearchParams();

  const [items, setItems] = useState<PoamItem[]>([]);
  const [controlOptions, setControlOptions] = useState<ControlOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Item dialog (create or edit)
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PoamItem | null>(null);
  const [itemForm, setItemForm] = useState<ItemForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Milestone dialog
  const [msDialogOpen, setMsDialogOpen] = useState(false);
  const [msItemId, setMsItemId] = useState<string | null>(null);
  const [editingMs, setEditingMs] = useState<PoamMilestone | null>(null);
  const [msForm, setMsForm] = useState<MilestoneForm>(blankMilestoneForm());
  const [msSaving, setMsSaving] = useState(false);
  const [msError, setMsError] = useState<string | null>(null);

  // ── Load ─────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!programId) {
      setItems([]);
      setControlOptions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const [itemsResp, optionsResp] = await Promise.all([
      poamService.list(programId),
      poamService.listControlOptions(programId),
    ]);
    if (itemsResp.error) {
      setError(extractErrorMessage(itemsResp.error));
      setItems([]);
    } else {
      setItems(itemsResp.data ?? []);
    }
    // Soft-fail on control options — items still render without the dropdown.
    if (!optionsResp.error) {
      setControlOptions(optionsResp.data ?? []);
    }
    setLoading(false);
  }, [programId]);

  useEffect(() => { void load(); }, [load]);

  // ── Deep-link from Controls page ─────────────────────────────────────────
  // Controls.tsx renders a flag icon on unfinished controls that navigates here
  // with ?controlId=<uuid>&controlIdentifier=<id>&action=create. Consume it once
  // (clear the params so refresh doesn't re-trigger), pre-open the dialog with
  // the control linked and a sensible default weakness.
  const dialogPrefilledRef = React.useRef(false);
  useEffect(() => {
    if (dialogPrefilledRef.current) return;
    if (!programId) return;
    const action = searchParams.get('action');
    const ctrlId = searchParams.get('controlId');
    if (action !== 'create' || !ctrlId) return;

    const ctrlIdent = searchParams.get('controlIdentifier') || '';
    dialogPrefilledRef.current = true;

    setEditingItem(null);
    setItemForm({
      ...blankItemForm(programId),
      controlId: ctrlId,
      weakness: ctrlIdent ? `Control ${ctrlIdent} not yet implemented` : '',
    });
    setSaveError(null);
    setItemDialogOpen(true);

    // Consume — clear so a page refresh doesn't re-open the dialog.
    const next = new URLSearchParams(searchParams);
    next.delete('action');
    next.delete('controlId');
    next.delete('controlIdentifier');
    setSearchParams(next, { replace: true });
  }, [programId, searchParams, setSearchParams]);

  // ── Counts ───────────────────────────────────────────────────────────────
  const counts = useMemo(() => {
    const c = { open: 0, inProgress: 0, completed: 0, riskAccepted: 0, high: 0, overdue: 0 };
    const today = new Date().toISOString().slice(0, 10);
    for (const it of items) {
      if (it.status === 'open') c.open += 1;
      else if (it.status === 'in_progress') c.inProgress += 1;
      else if (it.status === 'completed') c.completed += 1;
      else if (it.status === 'risk_accepted') c.riskAccepted += 1;
      if (it.riskLevel === 'high') c.high += 1;
      if (
        it.scheduledCompletion &&
        it.scheduledCompletion < today &&
        it.status !== 'completed' &&
        it.status !== 'risk_accepted'
      ) {
        c.overdue += 1;
      }
    }
    return c;
  }, [items]);

  // ── Expansion ────────────────────────────────────────────────────────────
  const toggleExpanded = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // ── Export ───────────────────────────────────────────────────────────────
  const handleExportCsv = () => {
    if (items.length === 0) return;
    const header = [
      'Item #',
      'Linked control',
      'Weakness',
      'Description',
      'Risk level',
      'Status',
      'Responsible party',
      'Identified',
      'Scheduled completion',
      'Completed',
      'Remediation plan',
      'Milestones',
    ];
    const rows: string[][] = [header];
    items.forEach((it, idx) => {
      const milestones = it.milestones
        .map(ms => `[${milestoneStatusLabel(ms.status)}${ms.targetDate ? `, target ${csvDate(ms.targetDate)}` : ''}] ${ms.description}`)
        .join(' | ');
      rows.push([
        String(idx + 1),
        it.controlIdentifier ?? '',
        it.weakness,
        it.description ?? '',
        riskLabel(it.riskLevel),
        itemStatusLabel(it.status),
        it.responsibleParty ?? '',
        csvDate(it.identifiedAt),
        csvDate(it.scheduledCompletion),
        csvDate(it.completedAt),
        it.remediationPlan ?? '',
        milestones,
      ]);
    });
    const slug = (currentProject?.name || 'program').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const today = new Date().toISOString().slice(0, 10);
    downloadCsv(`poam-${slug}-${today}.csv`, rows);
  };

  // ── Item CRUD ────────────────────────────────────────────────────────────
  const openCreateItem = () => {
    if (!programId) return;
    setEditingItem(null);
    setItemForm(blankItemForm(programId));
    setSaveError(null);
    setItemDialogOpen(true);
  };

  const openEditItem = (it: PoamItem) => {
    setEditingItem(it);
    setItemForm({
      programId: it.programId,
      controlId: it.controlId ?? '',
      weakness: it.weakness,
      description: it.description ?? '',
      riskLevel: it.riskLevel,
      status: it.status,
      remediationPlan: it.remediationPlan ?? '',
      responsibleParty: it.responsibleParty ?? '',
      identifiedAt: it.identifiedAt ?? '',
      scheduledCompletion: it.scheduledCompletion ?? '',
    });
    setSaveError(null);
    setItemDialogOpen(true);
  };

  const closeItemDialog = () => {
    setItemDialogOpen(false);
    setEditingItem(null);
    setItemForm(null);
    setSaveError(null);
  };

  const saveItem = async () => {
    if (!itemForm) return;
    if (!itemForm.weakness.trim()) {
      setSaveError('Weakness summary is required.');
      return;
    }
    if (!itemForm.remediationPlan.trim()) {
      setSaveError('Remediation Plan is required — describe the steps that will close this weakness.');
      return;
    }
    if (!itemForm.scheduledCompletion) {
      setSaveError('Scheduled Completion is required — pick a target date for remediation.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const payload = {
        controlId: itemForm.controlId || null,
        weakness: itemForm.weakness.trim(),
        description: itemForm.description.trim() || null,
        riskLevel: itemForm.riskLevel,
        status: itemForm.status,
        remediationPlan: itemForm.remediationPlan.trim(),
        responsibleParty: itemForm.responsibleParty.trim() || null,
        identifiedAt: itemForm.identifiedAt || new Date().toISOString().slice(0, 10),
        scheduledCompletion: itemForm.scheduledCompletion,
      };
      if (editingItem) {
        const resp = await poamService.update(editingItem.id, payload);
        if (resp.error) { setSaveError(extractErrorMessage(resp.error)); return; }
      } else {
        const resp = await poamService.create({
          programId: itemForm.programId,
          ...payload,
        });
        if (resp.error) { setSaveError(extractErrorMessage(resp.error)); return; }
      }
      closeItemDialog();
      await load();
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (it: PoamItem) => {
    if (!window.confirm(`Delete POA&M item "${it.weakness}"? This also removes its milestones.`)) return;
    const resp = await poamService.remove(it.id);
    if (resp.error) {
      setError(extractErrorMessage(resp.error));
      return;
    }
    await load();
  };

  // ── Milestones ───────────────────────────────────────────────────────────
  const openCreateMilestone = (itemId: string) => {
    setMsItemId(itemId);
    setEditingMs(null);
    setMsForm(blankMilestoneForm());
    setMsError(null);
    setMsDialogOpen(true);
  };

  const openEditMilestone = (itemId: string, ms: PoamMilestone) => {
    setMsItemId(itemId);
    setEditingMs(ms);
    setMsForm({
      description: ms.description,
      targetDate: ms.targetDate ?? '',
      status: ms.status,
    });
    setMsError(null);
    setMsDialogOpen(true);
  };

  const closeMsDialog = () => {
    setMsDialogOpen(false);
    setEditingMs(null);
    setMsItemId(null);
    setMsForm(blankMilestoneForm());
    setMsError(null);
  };

  const saveMilestone = async () => {
    if (!msItemId) return;
    if (!msForm.description.trim()) {
      setMsError('Milestone description is required.');
      return;
    }
    setMsSaving(true);
    setMsError(null);
    try {
      if (editingMs) {
        const resp = await poamService.updateMilestone(editingMs.id, {
          description: msForm.description.trim(),
          targetDate: msForm.targetDate || null,
          status: msForm.status,
        });
        if (resp.error) { setMsError(extractErrorMessage(resp.error)); return; }
      } else {
        const resp = await poamService.addMilestone(msItemId, {
          description: msForm.description.trim(),
          targetDate: msForm.targetDate || null,
          status: msForm.status,
        });
        if (resp.error) { setMsError(extractErrorMessage(resp.error)); return; }
      }
      closeMsDialog();
      await load();
    } finally {
      setMsSaving(false);
    }
  };

  const deleteMilestone = async (ms: PoamMilestone) => {
    if (!window.confirm(`Delete milestone "${ms.description}"?`)) return;
    const resp = await poamService.removeMilestone(ms.id);
    if (resp.error) {
      setError(extractErrorMessage(resp.error));
      return;
    }
    await load();
  };

  // ── Render ───────────────────────────────────────────────────────────────
  if (!programId) {
    return (
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Alert severity="info">
          Select a compliance program to view its Plan of Action &amp; Milestones.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
        <FlagIcon color="primary" />
        <Typography variant={isMobile ? 'h5' : 'h4'} sx={{ fontWeight: 700 }}>
          Plan of Action &amp; Milestones
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Track weaknesses against a remediation schedule — the body that NIST
        800-171 §3.12.2, CMMC L2, and FedRAMP all expect as evidence of an
        active risk-management program.
      </Typography>

      {/* Summary cards */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(6, 1fr)' },
        gap: 1.5,
        mb: 2,
      }}>
        <SummaryCard label="Open" value={counts.open} tone="warning" />
        <SummaryCard label="In progress" value={counts.inProgress} tone="info" />
        <SummaryCard label="Completed" value={counts.completed} tone="success" />
        <SummaryCard label="Risk accepted" value={counts.riskAccepted} tone="default" />
        <SummaryCard label="High risk" value={counts.high} tone="error" />
        <SummaryCard label="Overdue" value={counts.overdue} tone={counts.overdue > 0 ? 'error' : 'default'} />
      </Box>

      {/* Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mb: 2 }}>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={handleExportCsv}
          disabled={items.length === 0}
        >
          Export CSV
        </Button>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreateItem}
          disabled={!programId}
        >
          New POA&amp;M item
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : items.length === 0 ? (
        <Card variant="outlined">
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
              No POA&amp;M items yet.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Track weaknesses found during self-assessment, third-party assessment,
              or audit — and the milestones to remediate them.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <TableContainer component={Card} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 32 }} />
                <TableCell>Weakness</TableCell>
                <TableCell>Risk</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Owner</TableCell>
                <TableCell>Scheduled</TableCell>
                <TableCell sx={{ width: 120, textAlign: 'right' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map(it => {
                const isOpen = expanded.has(it.id);
                const today = new Date().toISOString().slice(0, 10);
                const overdue =
                  !!it.scheduledCompletion &&
                  it.scheduledCompletion < today &&
                  it.status !== 'completed' &&
                  it.status !== 'risk_accepted';
                return (
                  <React.Fragment key={it.id}>
                    <TableRow hover sx={{ '& > *': { borderBottom: isOpen ? 'unset' : undefined } }}>
                      <TableCell>
                        <IconButton size="small" onClick={() => toggleExpanded(it.id)}>
                          {isOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
                          {it.controlIdentifier && (
                            <Chip
                              size="small"
                              label={it.controlIdentifier}
                              variant="outlined"
                              color="primary"
                              sx={{ fontFamily: 'monospace', fontWeight: 600 }}
                            />
                          )}
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{it.weakness}</Typography>
                        </Stack>
                        {it.description && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                            {it.description.length > 120
                              ? `${it.description.slice(0, 120)}…`
                              : it.description}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={riskLabel(it.riskLevel)}
                          color={riskColor(it.riskLevel)}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={itemStatusLabel(it.status)}
                          color={itemStatusColor(it.status)}
                          variant="filled"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{it.responsibleParty || '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <Typography variant="body2">{fmtDate(it.scheduledCompletion)}</Typography>
                          {overdue && (
                            <Chip size="small" label="Overdue" color="error" variant="outlined" />
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => openEditItem(it)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" onClick={() => deleteItem(it)}>
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                    {isOpen && (
                      <TableRow>
                        <TableCell colSpan={7} sx={{ bgcolor: 'action.hover', py: 2 }}>
                          <ItemDetail
                            item={it}
                            onAddMilestone={() => openCreateMilestone(it.id)}
                            onEditMilestone={(ms) => openEditMilestone(it.id, ms)}
                            onDeleteMilestone={deleteMilestone}
                          />
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Item dialog */}
      <Dialog open={itemDialogOpen} onClose={closeItemDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editingItem ? 'Edit POA&M item' : 'New POA&M item'}</DialogTitle>
        <DialogContent dividers>
          {itemForm && (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                select
                label="Linked control"
                value={itemForm.controlId}
                onChange={e => setItemForm({ ...itemForm, controlId: e.target.value })}
                fullWidth
                helperText={
                  controlOptions.length === 0
                    ? 'No frameworks activated — link will appear once a framework is activated.'
                    : 'The control this weakness applies to. Leave blank for cross-cutting findings.'
                }
                disabled={controlOptions.length === 0}
              >
                <MenuItem value=""><em>None</em></MenuItem>
                {controlOptions.map(c => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.identifier}{c.title ? ` — ${c.title}` : ''}
                    {c.frameworkName ? ` (${c.frameworkName})` : ''}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Weakness *"
                value={itemForm.weakness}
                onChange={e => setItemForm({ ...itemForm, weakness: e.target.value })}
                fullWidth
                autoFocus
                helperText="Short summary of the finding (e.g. 'MFA not enforced for privileged accounts')"
              />
              <TextField
                label="Description"
                value={itemForm.description}
                onChange={e => setItemForm({ ...itemForm, description: e.target.value })}
                fullWidth
                multiline
                minRows={2}
                maxRows={6}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  select
                  label="Risk level"
                  value={itemForm.riskLevel}
                  onChange={e => setItemForm({ ...itemForm, riskLevel: e.target.value as PoamRiskLevel })}
                  fullWidth
                >
                  {RISK_LEVELS.map(r => (
                    <MenuItem key={r} value={r}>{riskLabel(r)}</MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Status"
                  value={itemForm.status}
                  onChange={e => setItemForm({ ...itemForm, status: e.target.value as PoamItemStatus })}
                  fullWidth
                >
                  {ITEM_STATUSES.map(s => (
                    <MenuItem key={s} value={s}>{itemStatusLabel(s)}</MenuItem>
                  ))}
                </TextField>
              </Stack>
              <TextField
                label="Remediation plan"
                value={itemForm.remediationPlan}
                onChange={e => setItemForm({ ...itemForm, remediationPlan: e.target.value })}
                fullWidth
                multiline
                minRows={2}
                maxRows={6}
                required
                error={!itemForm.remediationPlan.trim() && saveError?.toLowerCase().includes('remediation')}
                helperText="How will this be fixed? (Required)"
              />
              <TextField
                label="Responsible party"
                value={itemForm.responsibleParty}
                onChange={e => setItemForm({ ...itemForm, responsibleParty: e.target.value })}
                fullWidth
                helperText="Owner or team accountable for remediation"
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Identified"
                  type="date"
                  value={itemForm.identifiedAt}
                  onChange={e => setItemForm({ ...itemForm, identifiedAt: e.target.value })}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  helperText="Auto-set to today; editable for historical findings"
                />
                <TextField
                  label="Scheduled completion"
                  type="date"
                  value={itemForm.scheduledCompletion}
                  onChange={e => setItemForm({ ...itemForm, scheduledCompletion: e.target.value })}
                  fullWidth
                  required
                  error={!itemForm.scheduledCompletion && saveError?.toLowerCase().includes('scheduled')}
                  InputLabelProps={{ shrink: true }}
                  helperText="Target remediation date (Required)"
                />
              </Stack>
              {saveError && <Alert severity="error">{saveError}</Alert>}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeItemDialog} disabled={saving}>Cancel</Button>
          <Button onClick={saveItem} variant="contained" disabled={saving}>
            {saving ? 'Saving…' : editingItem ? 'Save' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Milestone dialog */}
      <Dialog open={msDialogOpen} onClose={closeMsDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingMs ? 'Edit milestone' : 'New milestone'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Description *"
              value={msForm.description}
              onChange={e => setMsForm({ ...msForm, description: e.target.value })}
              fullWidth
              autoFocus
              multiline
              minRows={2}
              maxRows={5}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Target date"
                type="date"
                value={msForm.targetDate}
                onChange={e => setMsForm({ ...msForm, targetDate: e.target.value })}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                select
                label="Status"
                value={msForm.status}
                onChange={e => setMsForm({ ...msForm, status: e.target.value as PoamMilestoneStatus })}
                fullWidth
              >
                {MILESTONE_STATUSES.map(s => (
                  <MenuItem key={s} value={s}>{milestoneStatusLabel(s)}</MenuItem>
                ))}
              </TextField>
            </Stack>
            {msError && <Alert severity="error">{msError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeMsDialog} disabled={msSaving}>Cancel</Button>
          <Button onClick={saveMilestone} variant="contained" disabled={msSaving}>
            {msSaving ? 'Saving…' : editingMs ? 'Save' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

const SummaryCard: React.FC<{
  label: string;
  value: number;
  tone: 'default' | 'info' | 'success' | 'warning' | 'error';
}> = ({ label, value, tone }) => {
  const theme = useTheme();
  const palette =
    tone === 'success' ? theme.palette.success.main
    : tone === 'warning' ? theme.palette.warning.main
    : tone === 'error' ? theme.palette.error.main
    : tone === 'info' ? theme.palette.info.main
    : theme.palette.text.secondary;
  return (
    <Card variant="outlined">
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 }, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="h5" sx={{ fontWeight: 700, color: palette, mt: 0.25 }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
};

const ItemDetail: React.FC<{
  item: PoamItem;
  onAddMilestone: () => void;
  onEditMilestone: (ms: PoamMilestone) => void;
  onDeleteMilestone: (ms: PoamMilestone) => void;
}> = ({ item, onAddMilestone, onEditMilestone, onDeleteMilestone }) => {
  return (
    <Box sx={{ px: 1 }}>
      {/* Body details */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ mb: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="overline" color="text.secondary">Description</Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
            {item.description || <em style={{ color: '#9ca3af' }}>none</em>}
          </Typography>
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="overline" color="text.secondary">Remediation plan</Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
            {item.remediationPlan || <em style={{ color: '#9ca3af' }}>none</em>}
          </Typography>
        </Box>
      </Stack>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ mb: 2 }}>
        <Stat label="Identified" value={fmtDate(item.identifiedAt)} />
        <Stat label="Scheduled" value={fmtDate(item.scheduledCompletion)} />
        <Stat label="Completed" value={fmtDate(item.completedAt)} />
        <Stat label="Created" value={fmtDate(item.createdAt)} />
      </Stack>

      <Divider sx={{ my: 1.5 }} />

      {/* Milestones */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Milestones ({item.milestones.length})
        </Typography>
        <Button size="small" startIcon={<AddIcon />} onClick={onAddMilestone}>
          Add milestone
        </Button>
      </Box>
      {item.milestones.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          No milestones yet — break the remediation into trackable steps.
        </Typography>
      ) : (
        <Stack spacing={1}>
          {item.milestones.map(ms => (
            <Card key={ms.id} variant="outlined" sx={{ p: 1 }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Chip
                  size="small"
                  label={milestoneStatusLabel(ms.status)}
                  color={milestoneStatusColor(ms.status)}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {ms.description}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Target: {fmtDate(ms.targetDate)}
                  </Typography>
                </Box>
                <Tooltip title="Edit milestone">
                  <IconButton size="small" onClick={() => onEditMilestone(ms)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete milestone">
                  <IconButton size="small" onClick={() => onDeleteMilestone(ms)}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
};

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <Box sx={{ minWidth: 120 }}>
    <Typography variant="overline" color="text.secondary">{label}</Typography>
    <Typography variant="body2">{value}</Typography>
  </Box>
);

export default POAM;
