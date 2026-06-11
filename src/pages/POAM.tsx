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
import { useNavigate, useSearchParams } from 'react-router-dom';
import FactCheckIcon from '@mui/icons-material/FactCheck';
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
import { fetchCrossFrameworkCounts } from '../services/crossFrameworkCreditService';

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

/**
 * Default remediation windows by risk level. Mirrors the system rows seeded
 * in BE migration 066 `poam_default_timelines` so manual edits in this
 * dialog match what the auto-POA&M workflow would have set on the server.
 *
 * Org-specific or framework-required overrides exist in the BE table but
 * are NOT consulted here — this is a UX shortcut, not an enforcement
 * boundary. If you need org-aware defaults in this dialog later, fetch
 * `/api/poam/default-timelines?programId=…` on dialog open and use the
 * resolved map.
 */
const DEFAULT_REMEDIATION_DAYS: Record<PoamRiskLevel, number> = {
  critical: 7,
  high: 14,
  moderate: 30,
  low: 60,
};

/** Add `days` to an ISO date string ('YYYY-MM-DD'). UTC-safe. */
function addDaysToDate(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function blankItemForm(programId: string) {
  // Auto-set Identified date to today on new manual entry. The field stays
  // editable for cases where the weakness was discovered earlier than today.
  // Scheduled completion seeds to today + 30 days (moderate default) so the
  // required field is filled out of the box — the user can change either
  // risk or the date and both stay in sync until the date is touched manually.
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
    scheduledCompletion: addDaysToDate(today, DEFAULT_REMEDIATION_DAYS.moderate),
    completedAt: '',
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
  const navigate = useNavigate();

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

  // Filter + group state — multiple filters compose with AND; "all" disables.
  // Persisted only in component state (not URL) since they're cheap to set.
  type FilterKey = 'ready_to_close' | 'overdue' | 'auto' | 'manual' | 'high_or_critical';
  const [activeFilters, setActiveFilters] = useState<Set<FilterKey>>(new Set());
  const [groupBy, setGroupBy] = useState<'none' | 'control'>('none');
  // Phase B-5: framework filter (single-select). 'all' = no filter.
  // Resolves a control's framework via controlOptions; items without a
  // linked control match only the 'all' selection.
  const [frameworkFilter, setFrameworkFilter] = useState<string>('all');
  // Phase B-5: cross-framework credit counts per controlId. Populated once
  // on items load via a single batch endpoint — no N+1. The chip renders
  // a count badge ("Satisfies +2"); click navigates to the Control Detail
  // panel that already shows the labeled edges (W2 / task #41).
  const [xfwCounts, setXfwCounts] = useState<Record<string, { satisfies: number; satisfied_by: number }>>({});

  const toggleFilter = (key: FilterKey) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const clearFilters = () => {
    setActiveFilters(new Set());
    setFrameworkFilter('all');
  };
  // Tracks whether the user has manually overridden the auto-computed
  // scheduled completion. While false, changing the risk level recomputes
  // scheduled = identified + days_for(risk). Flips to true the moment the
  // user types directly into the Scheduled completion field. Per user
  // direction (2026-05-29): "if the scheduled close has been modified by
  // the user prior to the risk level changing, keep the modified value."
  const [schedManuallyEdited, setSchedManuallyEdited] = useState(false);

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

  // Phase B-5: control id → ControlOption lookup. Used by:
  //   - framework filter (controlOptions[item.controlId].frameworkId)
  //   - framework dropdown options (unique frameworks across activated set)
  const controlOptionById = useMemo(() => {
    const m = new Map<string, ControlOption>();
    for (const co of controlOptions) m.set(co.id, co);
    return m;
  }, [controlOptions]);

  // Phase B-5: unique framework list for the dropdown. Sorted alphabetically
  // by name. An item with no linked control still appears under 'all'.
  const frameworkChoices = useMemo(() => {
    const seen = new Map<string, string>();
    for (const co of controlOptions) {
      if (!seen.has(co.frameworkId)) seen.set(co.frameworkId, co.frameworkName);
    }
    return Array.from(seen.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [controlOptions]);

  // Phase B-5: fetch cross-framework credit counts in one batch call whenever
  // the items list changes. Drives the "Satisfies +N" badge. Soft-fails — if
  // the endpoint errors, the badge simply doesn't render.
  useEffect(() => {
    const ids = items.map(it => it.controlId).filter((id): id is string => Boolean(id));
    if (ids.length === 0) {
      setXfwCounts({});
      return;
    }
    // De-dupe to minimize payload.
    const uniqueIds = Array.from(new Set(ids));
    let cancelled = false;
    void (async () => {
      const resp = await fetchCrossFrameworkCounts(uniqueIds);
      if (cancelled) return;
      if (resp.error || !resp.data) {
        setXfwCounts({});
        return;
      }
      setXfwCounts(resp.data);
    })();
    return () => { cancelled = true; };
  }, [items]);

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

  // ── Filtered + grouped view ──────────────────────────────────────────────
  // Filters compose with AND. `groupBy === 'control'` groups by the
  // controlIdentifier (rows without a control_id collect under "Unscoped").
  // The same rows render in either layout — only the grouping changes.
  const filteredItems = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    // Materialize the Set to an Array — older TS targets don't iterate Sets natively.
    const filters = Array.from(activeFilters);
    const fwActive = frameworkFilter !== 'all';
    if (filters.length === 0 && !fwActive) return items;
    return items.filter(it => {
      // Phase B-5: framework filter — applied first. Items without a linked
      // control are excluded whenever a specific framework is selected.
      if (fwActive) {
        if (!it.controlId) return false;
        const co = controlOptionById.get(it.controlId);
        if (!co || co.frameworkId !== frameworkFilter) return false;
      }
      for (const key of filters) {
        switch (key) {
          case 'ready_to_close':
            // B-01 defensive skip — "Ready to close" filter is meant to
            // surface items pending the reviewer's close action, NOT
            // already-closed rows that happen to still carry the flag
            // (pre-fix legacy DB state cleaned by migration 070).
            if (!it.readyForClosure
              || it.status === 'completed'
              || it.status === 'risk_accepted') return false;
            break;
          case 'overdue':
            if (
              !(
                it.scheduledCompletion &&
                it.scheduledCompletion < today &&
                it.status !== 'completed' &&
                it.status !== 'risk_accepted'
              )
            ) return false;
            break;
          case 'auto':
            if (!it.autoCreated) return false;
            break;
          case 'manual':
            if (it.autoCreated) return false;
            break;
          case 'high_or_critical':
            if (it.riskLevel !== 'high' && it.riskLevel !== 'critical') return false;
            break;
        }
      }
      return true;
    });
  }, [items, activeFilters, frameworkFilter, controlOptionById]);

  /**
   * When `groupBy === 'control'`, organize filtered items into groups keyed by
   * `controlIdentifier`. Rows without a controlId end up under "Unscoped".
   * Groups sorted alphabetically by identifier (Unscoped last).
   */
  const grouped = useMemo(() => {
    if (groupBy !== 'control') return null;
    const map = new Map<string, PoamItem[]>();
    for (const it of filteredItems) {
      const key = it.controlIdentifier || '__unscoped__';
      const arr = map.get(key) ?? [];
      arr.push(it);
      map.set(key, arr);
    }
    return Array.from(map.entries())
      .map(([key, rows]) => ({
        key,
        label: key === '__unscoped__' ? 'Unscoped (no control linked)' : `Control ${key}`,
        rows,
      }))
      .sort((a, b) => {
        if (a.key === '__unscoped__') return 1;
        if (b.key === '__unscoped__') return -1;
        return a.key.localeCompare(b.key, undefined, { numeric: true });
      });
  }, [filteredItems, groupBy]);

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
    // G-01: add objective_identifier, auto_created, ready_for_closure,
    //       created_at columns. The objective identifier was previously
    //       only embedded inside the weakness text; auditors need it as
    //       its own column for filtering / pivot analysis. Auto / Ready
    //       flags surface posture-story signal the FE shows as chips.
    // G-04: stable order — sort by identified_at ASC (with created_at
    //       ASC as tiebreaker) so item numbers don't reshuffle each
    //       export when new rows land.
    const header = [
      'Item #',
      'Linked control',
      'Objective',
      'Weakness',
      'Description',
      'Risk level',
      'Status',
      'Auto-created',
      'Ready to close',
      'Responsible party',
      'Created at',
      'Identified',
      'Scheduled completion',
      'Completed',
      'Remediation plan',
      'Milestones',
    ];
    const rows: string[][] = [header];
    const sortedItems = [...items].sort((a, b) => {
      const aIdent = a.identifiedAt ?? '';
      const bIdent = b.identifiedAt ?? '';
      const byIdent = aIdent.localeCompare(bIdent);
      if (byIdent !== 0) return byIdent;
      // Tiebreaker — createdAt is always populated.
      return (a.createdAt ?? '').localeCompare(b.createdAt ?? '');
    });
    sortedItems.forEach((it, idx) => {
      const milestones = it.milestones
        .map(ms => `[${milestoneStatusLabel(ms.status)}${ms.targetDate ? `, target ${csvDate(ms.targetDate)}` : ''}] ${ms.description}`)
        .join(' | ');
      rows.push([
        String(idx + 1),
        it.controlIdentifier ?? '',
        it.objectiveIdentifier ?? '',
        it.weakness,
        it.description ?? '',
        riskLabel(it.riskLevel),
        itemStatusLabel(it.status),
        it.autoCreated ? 'Yes' : '',
        // B-01 defensive skip — `ready_for_closure` is meaningless once
        // status is closed. Matches the same guard in the OSCAL exporter
        // so the two export paths agree on already-closed rows.
        (it.readyForClosure && it.status !== 'completed' && it.status !== 'risk_accepted') ? 'Yes' : '',
        it.responsibleParty ?? '',
        csvDate(it.createdAt),
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

  // ── OSCAL POA&M export ───────────────────────────────────────────────────
  /**
   * Hits the BE endpoint GET /api/oscal/poam/:programId which streams OSCAL
   * v1.1.2 JSON with an `attachment` Content-Disposition. Tenant scoping is
   * done on the BE — the FE doesn't have to filter anything.
   */
  const [oscalExporting, setOscalExporting] = useState(false);
  const handleExportOscal = async (includeClosed: boolean) => {
    if (!programId) return;
    setOscalExporting(true);
    setError(null);
    try {
      // Cookie auth (Phase 4b): authenticated by the HttpOnly session cookie
      // (credentials:include); no Bearer, and no CSRF token needed on a GET.
      // Then trigger a save-as in the browser via a blob URL — we preserve the
      // JSON formatting the BE emits, so just stringify the response data.
      const url = `/api/oscal/poam/${encodeURIComponent(programId)}${includeClosed ? '?include_closed=true' : ''}`;
      const resp = await fetch(
        `${import.meta.env.VITE_API_URL ?? ''}${url}`,
        {
          credentials: 'include',
        },
      );
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`OSCAL export failed (${resp.status}): ${text.slice(0, 200)}`);
      }
      const json = await resp.text();
      const blob = new Blob([json], { type: 'application/json' });
      const blobUrl = URL.createObjectURL(blob);
      const slug = (currentProject?.name || 'program').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const today = new Date().toISOString().slice(0, 10);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `poam-${slug}-${today}_oscal.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err: any) {
      setError(err?.message ?? 'OSCAL export failed');
    } finally {
      setOscalExporting(false);
    }
  };

  // ── Item CRUD ────────────────────────────────────────────────────────────
  const openCreateItem = () => {
    if (!programId) return;
    setEditingItem(null);
    setItemForm(blankItemForm(programId));
    // Fresh create — scheduled completion is the auto-computed default
    // (today + 30d). The user hasn't touched it yet.
    setSchedManuallyEdited(false);
    setSaveError(null);
    setItemDialogOpen(true);
  };

  const openEditItem = (it: PoamItem) => {
    setEditingItem(it);
    // When the auto-POA&M workflow has flagged the row "ready to close"
    // (underlying control/objective went IMPLEMENTED or N/A), pre-fill the
    // status as 'completed' and the Completed date as today. The reviewer
    // still has to hit save — they may want to adjust the remediation plan
    // first — but the dialog opens with the close already staged. Pair
    // with the "Save & Close" button label below.
    const today = new Date().toISOString().slice(0, 10);
    const stagedStatus: PoamItemStatus =
      it.readyForClosure && it.status !== 'completed' && it.status !== 'risk_accepted'
        ? 'completed'
        : it.status;
    const stagedCompletedAt =
      stagedStatus === 'completed' ? (it.completedAt ?? today) : (it.completedAt ?? '');
    setItemForm({
      programId: it.programId,
      controlId: it.controlId ?? '',
      weakness: it.weakness,
      description: it.description ?? '',
      riskLevel: it.riskLevel,
      status: stagedStatus,
      remediationPlan: it.remediationPlan ?? '',
      responsibleParty: it.responsibleParty ?? '',
      identifiedAt: it.identifiedAt ?? '',
      scheduledCompletion: it.scheduledCompletion ?? '',
      completedAt: stagedCompletedAt,
    });
    // Detect whether the existing scheduled date matches what we'd auto-
    // compute (identified + days_for(risk)). If they match, treat as
    // still-using-default — future risk-level changes will recompute.
    // If they don't match (user manually adjusted, or BE used an
    // org-specific override we don't know about), preserve the manual
    // override and stop auto-recomputing.
    const expected =
      it.identifiedAt
        ? addDaysToDate(it.identifiedAt, DEFAULT_REMEDIATION_DAYS[it.riskLevel])
        : null;
    setSchedManuallyEdited(
      it.scheduledCompletion !== null
        && it.scheduledCompletion !== ''
        && it.scheduledCompletion !== expected,
    );
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
      // When the row is being marked completed and no Completed date is
      // set, stamp today. When the row is being moved BACK out of completed,
      // clear the Completed date so the column doesn't lie.
      const today = new Date().toISOString().slice(0, 10);
      const completedAt =
        itemForm.status === 'completed'
          ? (itemForm.completedAt || today)
          : null;
      const payload = {
        controlId: itemForm.controlId || null,
        weakness: itemForm.weakness.trim(),
        description: itemForm.description.trim() || null,
        riskLevel: itemForm.riskLevel,
        status: itemForm.status,
        remediationPlan: itemForm.remediationPlan.trim(),
        responsibleParty: itemForm.responsibleParty.trim() || null,
        identifiedAt: itemForm.identifiedAt || today,
        scheduledCompletion: itemForm.scheduledCompletion,
        completedAt,
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

      {/* Filters + view toggle + actions */}
      <Box sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1,
        mb: 2,
      }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
            Filter:
          </Typography>
          <Chip
            size="small"
            label="All"
            variant={activeFilters.size === 0 && frameworkFilter === 'all' ? 'filled' : 'outlined'}
            color={activeFilters.size === 0 && frameworkFilter === 'all' ? 'primary' : 'default'}
            onClick={clearFilters}
          />
          <Chip
            size="small"
            label="Ready to close"
            variant={activeFilters.has('ready_to_close') ? 'filled' : 'outlined'}
            color={activeFilters.has('ready_to_close') ? 'success' : 'default'}
            onClick={() => toggleFilter('ready_to_close')}
          />
          <Chip
            size="small"
            label="Overdue"
            variant={activeFilters.has('overdue') ? 'filled' : 'outlined'}
            color={activeFilters.has('overdue') ? 'error' : 'default'}
            onClick={() => toggleFilter('overdue')}
          />
          <Chip
            size="small"
            label="High / Critical"
            variant={activeFilters.has('high_or_critical') ? 'filled' : 'outlined'}
            color={activeFilters.has('high_or_critical') ? 'error' : 'default'}
            onClick={() => toggleFilter('high_or_critical')}
          />
          <Chip
            size="small"
            label="Auto"
            variant={activeFilters.has('auto') ? 'filled' : 'outlined'}
            color={activeFilters.has('auto') ? 'info' : 'default'}
            onClick={() => toggleFilter('auto')}
          />
          <Chip
            size="small"
            label="Manual"
            variant={activeFilters.has('manual') ? 'filled' : 'outlined'}
            color={activeFilters.has('manual') ? 'info' : 'default'}
            onClick={() => toggleFilter('manual')}
          />
          {frameworkChoices.length > 1 && (
            <>
              <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
              <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
                Framework:
              </Typography>
              <TextField
                select
                size="small"
                value={frameworkFilter}
                onChange={(e) => setFrameworkFilter(e.target.value)}
                SelectProps={{ displayEmpty: true }}
                sx={{ minWidth: 180, '& .MuiOutlinedInput-root': { py: 0 } }}
              >
                <MenuItem value="all">All frameworks</MenuItem>
                {frameworkChoices.map(fw => (
                  <MenuItem key={fw.id} value={fw.id}>{fw.name}</MenuItem>
                ))}
              </TextField>
            </>
          )}
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
          <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
            View:
          </Typography>
          <Chip
            size="small"
            label="Flat"
            variant={groupBy === 'none' ? 'filled' : 'outlined'}
            color={groupBy === 'none' ? 'primary' : 'default'}
            onClick={() => setGroupBy('none')}
          />
          <Chip
            size="small"
            label="Group by control"
            variant={groupBy === 'control' ? 'filled' : 'outlined'}
            color={groupBy === 'control' ? 'primary' : 'default'}
            onClick={() => setGroupBy('control')}
          />
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExportCsv}
            disabled={items.length === 0}
          >
            Export CSV
          </Button>
          <Tooltip title="Open + in-progress items only. Hold Shift to include closed.">
            <span>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={(e) => handleExportOscal(e.shiftKey)}
                disabled={items.length === 0 || oscalExporting}
              >
                {oscalExporting ? 'Exporting…' : 'OSCAL POA&M'}
              </Button>
            </span>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openCreateItem}
            disabled={!programId}
          >
            New POA&amp;M item
          </Button>
        </Stack>
      </Box>
      {activeFilters.size > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          Showing {filteredItems.length} of {items.length} items
          {filteredItems.length !== items.length && ' (filtered)'}
        </Typography>
      )}

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
      ) : filteredItems.length === 0 ? (
        <Card variant="outlined">
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              No items match the active filters.
            </Typography>
            <Button size="small" onClick={clearFilters}>Clear filters</Button>
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
                {/* Phase B-3: Source column shows the originating evaluation
                    for POA&Ms created via the bulk-from-gaps workflow. Manual
                    and status-change auto-POA&Ms show "—". Click-through
                    navigates to the eval detail page. */}
                <TableCell>Source</TableCell>
                <TableCell>Scheduled</TableCell>
                <TableCell sx={{ width: 120, textAlign: 'right' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(() => {
                // Either render a single flat list or render one section per
                // controlIdentifier with a header row separating groups.
                const renderRows = (rows: PoamItem[]) => rows.map(it => {
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
                          {/* Phase B-5: cross-framework satisfies badge.
                              Renders only when the linked control has at least one
                              outgoing satisfies edge. Click navigates to the Control
                              Detail panel that already shows the labeled edges
                              (W2 / task #41) — keeps this row compact. */}
                          {it.controlId && (xfwCounts[it.controlId]?.satisfies ?? 0) > 0 && (
                            <Chip
                              size="small"
                              label={`Satisfies +${xfwCounts[it.controlId].satisfies}`}
                              variant="outlined"
                              color="success"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/controls?focus=${encodeURIComponent(it.controlId!)}`);
                              }}
                              sx={{ cursor: 'pointer', fontSize: '0.7rem' }}
                              title={`This control credits ${xfwCounts[it.controlId].satisfies} control(s) in other framework(s). Click to view the cross-framework credit panel.`}
                            />
                          )}
                          {/* Objective-grain chip — tells reviewers this row tracks one
                              specific 800-53A "determine if..." statement, not the whole control. */}
                          {it.objectiveIdentifier && (
                            <Chip
                              size="small"
                              label={it.objectiveIdentifier}
                              variant="outlined"
                              sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}
                              title="Linked to a specific assessment objective"
                            />
                          )}
                          {it.autoCreated && (
                            <Chip
                              size="small"
                              label="Auto"
                              variant="outlined"
                              color="info"
                              title="Created automatically by the auto-POA&M workflow on a control or objective status change"
                            />
                          )}
                          {it.readyForClosure
                            && it.status !== 'completed'
                            && it.status !== 'risk_accepted' && (
                            <Chip
                              size="small"
                              label="Ready to close"
                              variant="filled"
                              color="success"
                              title="The underlying control/objective is now closed. Confirm the remediation plan, then mark this row completed."
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
                        {it.sourceEvaluationId ? (
                          <Chip
                            size="small"
                            icon={<FactCheckIcon sx={{ fontSize: 14 }} />}
                            label={it.sourceEvaluationTitle ?? 'Evaluation'}
                            variant="outlined"
                            color="primary"
                            onClick={(e) => {
                              // Row also has hover/expand interactions, so we stop
                              // propagation here to keep the click scoped to the
                              // navigation intent. Same pattern as the clauseCode
                              // pill on EvaluationDetail.
                              e.stopPropagation();
                              navigate(`/evaluations/${it.sourceEvaluationId}`);
                            }}
                            sx={{
                              cursor: 'pointer',
                              maxWidth: 200,
                              '& .MuiChip-label': {
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              },
                            }}
                            title={`From evaluation: ${it.sourceEvaluationTitle ?? '(untitled)'} — click to open`}
                          />
                        ) : (
                          <Typography variant="body2" color="text.disabled">—</Typography>
                        )}
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
                        <TableCell colSpan={8} sx={{ bgcolor: 'action.hover', py: 2 }}>
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
                });

                if (groupBy === 'control' && grouped) {
                  return grouped.flatMap(group => [
                    // Section-header row — sticky-ish heading per group.
                    <TableRow key={`__header__${group.key}`} sx={{ bgcolor: 'action.selected' }}>
                      <TableCell colSpan={8} sx={{ py: 1 }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {group.label}
                          </Typography>
                          <Chip
                            size="small"
                            label={`${group.rows.length} item${group.rows.length === 1 ? '' : 's'}`}
                            variant="outlined"
                          />
                        </Stack>
                      </TableCell>
                    </TableRow>,
                    ...renderRows(group.rows),
                  ]);
                }
                return renderRows(filteredItems);
              })()}
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
                  onChange={e => {
                    const newRisk = e.target.value as PoamRiskLevel;
                    // If the user hasn't manually overridden the scheduled
                    // date, slide it to identified + days_for(newRisk) so
                    // the remediation window always matches the risk.
                    // Critical=7d / High=14d / Moderate=30d / Low=60d.
                    if (!schedManuallyEdited && itemForm.identifiedAt) {
                      setItemForm({
                        ...itemForm,
                        riskLevel: newRisk,
                        scheduledCompletion: addDaysToDate(
                          itemForm.identifiedAt,
                          DEFAULT_REMEDIATION_DAYS[newRisk],
                        ),
                      });
                    } else {
                      setItemForm({ ...itemForm, riskLevel: newRisk });
                    }
                  }}
                  fullWidth
                  helperText={
                    schedManuallyEdited
                      ? 'Scheduled date is locked to your manual value.'
                      : `Scheduled date auto-tracks to identified + ${DEFAULT_REMEDIATION_DAYS[itemForm.riskLevel]}d for this risk.`
                  }
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
                  onChange={e => {
                    const newValue = e.target.value;
                    // Mark as manually edited the moment the user types a
                    // value that differs from what we'd auto-compute. From
                    // then on, risk-level changes leave this date alone.
                    // Setting it to the auto value (or clearing it) does
                    // NOT trip the flag — that's a no-op from the user's
                    // perspective.
                    const expected = itemForm.identifiedAt
                      ? addDaysToDate(itemForm.identifiedAt, DEFAULT_REMEDIATION_DAYS[itemForm.riskLevel])
                      : null;
                    if (newValue && newValue !== expected) {
                      setSchedManuallyEdited(true);
                    }
                    setItemForm({ ...itemForm, scheduledCompletion: newValue });
                  }}
                  fullWidth
                  required
                  error={!itemForm.scheduledCompletion && saveError?.toLowerCase().includes('scheduled')}
                  InputLabelProps={{ shrink: true }}
                  helperText={
                    schedManuallyEdited
                      ? 'Manual value — won’t change when risk level changes.'
                      : 'Auto-tracks risk level (Required)'
                  }
                />
              </Stack>
              {saveError && <Alert severity="error">{saveError}</Alert>}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeItemDialog} disabled={saving}>Cancel</Button>
          <Button
            onClick={saveItem}
            variant="contained"
            disabled={saving}
            color={
              editingItem && itemForm?.status === 'completed' && editingItem.status !== 'completed'
                ? 'success'
                : 'primary'
            }
          >
            {saving
              ? 'Saving…'
              : !editingItem
                ? 'Create'
                : itemForm?.status === 'completed' && editingItem.status !== 'completed'
                  ? 'Save & Close'
                  : 'Save'}
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
