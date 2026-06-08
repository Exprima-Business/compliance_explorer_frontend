import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Card, CardContent, Chip, CircularProgress, Divider,
  FormControl, IconButton, InputLabel, Link, MenuItem, Select,
  Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import BlockIcon from '@mui/icons-material/Block';
import GavelIcon from '@mui/icons-material/Gavel';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import AlarmOnIcon from '@mui/icons-material/AlarmOn';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import {
  satisfactionService,
  type SatisfactionMethod,
  type SatisfactionStatus,
  type PatternType,
} from '../services/satisfactionService';

/**
 * SatisfactionMethodsPanel — Phase C-1
 *
 * Replaces the ClauseDetail "No control framework directly satisfies this
 * clause yet..." dead-end with an actionable "How to satisfy this clause"
 * panel. Lists each curated authoritative satisfaction method with:
 *   • temporal-pattern badge (binary action / ongoing / event-triggered / informational)
 *   • description + source citation
 *   • per-program status dropdown (when a program is in context)
 *   • linked framework/control chip when the method points at tracked controls
 *   • alternatives_group hint when methods are "pick one of"
 *
 * Render rules:
 *   • Groups methods by pattern_type for visual hierarchy.
 *   • Renders even when no methods exist yet (informational empty state
 *     pointing to the C-4 backfill workstream).
 *   • Per-program status controls only appear when programId is set; in
 *     read-only mode (no program selected) the methods are visible but
 *     status changes are disabled.
 *
 * Deferred to C-2:
 *   • Evidence file upload (currently just the URL field + notes)
 *   • Attestation acknowledgment flow with signature (currently a
 *     status flip + free-text acknowledgmentText)
 *   • Per-org method creation UI (read-only in C-1 — orgs can SEE
 *     per-org methods if seeded directly via SQL, but can't add via UI)
 */

interface Props {
  clauseCode: string;
  /** Current program id from useProject. If null, status is read-only. */
  programId: string | null;
  /** Program display name for the "tracked in {program}" hint. */
  programName: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Display helpers
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<SatisfactionStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  satisfied: 'Satisfied',
  not_applicable: 'Not applicable',
};

const STATUS_COLOR: Record<SatisfactionStatus, 'default' | 'info' | 'success' | 'warning'> = {
  not_started: 'default',
  in_progress: 'info',
  satisfied: 'success',
  not_applicable: 'warning',
};

const STATUS_ICON: Record<SatisfactionStatus, React.ReactNode> = {
  not_started: <RadioButtonUncheckedIcon fontSize="small" />,
  in_progress: <HourglassEmptyIcon fontSize="small" />,
  satisfied: <CheckCircleIcon fontSize="small" />,
  not_applicable: <BlockIcon fontSize="small" />,
};

const PATTERN_LABEL: Record<PatternType, string> = {
  binary_action: 'Do once',
  ongoing_obligation: 'Continuous',
  conditional_on_event: 'On event',
  informational: 'Informational',
};

const PATTERN_ICON: Record<PatternType, React.ReactNode> = {
  binary_action: <GavelIcon fontSize="small" />,
  ongoing_obligation: <EventRepeatIcon fontSize="small" />,
  conditional_on_event: <AlarmOnIcon fontSize="small" />,
  informational: <InfoOutlinedIcon fontSize="small" />,
};

const PATTERN_SECTION_ORDER: PatternType[] = [
  'ongoing_obligation',     // most common, surface first
  'binary_action',
  'conditional_on_event',
  'informational',
];

const PATTERN_SECTION_DESCRIPTION: Record<PatternType, string> = {
  ongoing_obligation:
    'Continuous obligations — implement and maintain. Status reflects current state.',
  binary_action:
    'Discrete one-time actions. Re-perform on the recurrence interval (if any) or trigger event.',
  conditional_on_event:
    'Latent until a trigger fires (incident, vulnerability, government request). Status reflects readiness + response history.',
  informational:
    'Authoritative reference only — no direct contractor action. Listed for traceability.',
};

/** Format a Postgres INTERVAL serialized form into a human label. */
function formatInterval(raw: string | null): string | null {
  if (!raw) return null;
  // Common forms from Supabase: "1 year", "3 years", "72:00:00", "14 days",
  // "5 years", "60 days". Pass through verbatim if it's already human-friendly.
  return raw;
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-method row
// ─────────────────────────────────────────────────────────────────────────────

interface MethodRowProps {
  method: SatisfactionMethod;
  programId: string | null;
  onStatusChange: (methodId: string, newStatus: SatisfactionStatus) => Promise<void>;
  saving: boolean;
}

const MethodRow: React.FC<MethodRowProps> = ({ method, programId, onStatusChange, saving }) => {
  const currentStatus: SatisfactionStatus = method.status?.status ?? 'not_started';
  const recurrence = formatInterval(method.recurrenceInterval);
  const response = formatInterval(method.responseWindow);

  return (
    <Box
      sx={{
        p: 1.5,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        mb: 1,
        bgcolor: currentStatus === 'satisfied' ? 'rgba(34, 197, 94, 0.04)' :
                 currentStatus === 'not_applicable' ? 'action.hover' : 'background.paper',
      }}
    >
      {/* Header — mechanism badge + alternatives chip + per-org marker */}
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1, flexWrap: 'wrap' }}>
        <Chip
          size="small"
          label={method.mechanismType.displayLabel}
          color={method.mechanismType.isNegativeSpace ? 'warning' : 'primary'}
          variant="outlined"
          sx={{ fontWeight: 600 }}
        />
        {method.alternativesGroup && (
          <Tooltip title={`This method is one of an alternatives group ("${method.alternativesGroup}") — satisfying any one of the group satisfies the requirement.`}>
            <Chip
              size="small"
              label="Alternative path"
              variant="outlined"
              color="info"
            />
          </Tooltip>
        )}
        {!method.isAuthoritative && (
          <Tooltip title="Per-org method (added by your organization, not part of the curated catalog).">
            <Chip size="small" label="Org-defined" variant="outlined" />
          </Tooltip>
        )}
        {!method.isRequired && (
          <Chip size="small" label="Optional" variant="outlined" />
        )}
      </Stack>

      {/* Description */}
      <Typography variant="body2" sx={{ mb: 1 }}>
        {method.description}
      </Typography>

      {/* Linked framework / control */}
      {method.frameworkName && (
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Tracked in:
          </Typography>
          <Chip
            size="small"
            label={method.controlIdentifier
              ? `${method.frameworkName} · ${method.controlIdentifier}`
              : method.frameworkName}
            variant="outlined"
            sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}
          />
        </Stack>
      )}

      {/* Recurrence / response window — temporal context */}
      {(recurrence || response) && (
        <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
          {recurrence && (
            <Typography variant="caption" color="text.secondary">
              Refresh every <strong>{recurrence}</strong>
            </Typography>
          )}
          {response && (
            <Typography variant="caption" color="text.secondary">
              Respond within <strong>{response}</strong>
            </Typography>
          )}
        </Stack>
      )}

      {/* Per-mechanism config link (system_url, form_url, etc.) */}
      {method.config && Object.entries(method.config).map(([key, val]) =>
        typeof val === 'string' && val.startsWith('http') ? (
          <Stack key={key} direction="row" spacing={0.5} alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {key.replace(/_/g, ' ')}:
            </Typography>
            <Link
              href={val}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ fontSize: '0.75rem' }}
            >
              {val}
              <OpenInNewIcon sx={{ fontSize: 12, ml: 0.5, verticalAlign: 'middle' }} />
            </Link>
          </Stack>
        ) : null
      )}

      {/* Source citation */}
      {method.sourceAuthorityForLink && (
        <Typography
          variant="caption"
          color="text.disabled"
          sx={{ display: 'block', fontStyle: 'italic', mb: 1 }}
        >
          Source: {method.sourceAuthorityForLink}
        </Typography>
      )}

      <Divider sx={{ my: 1 }} />

      {/* Per-program status control */}
      <Stack direction="row" spacing={2} alignItems="center" sx={{ flexWrap: 'wrap' }}>
        <Box sx={{ minWidth: 200 }}>
          <FormControl size="small" fullWidth disabled={!programId || saving}>
            <InputLabel>Status</InputLabel>
            <Select
              value={currentStatus}
              label="Status"
              onChange={(e) => onStatusChange(method.id, e.target.value as SatisfactionStatus)}
              startAdornment={
                <Box sx={{ mr: 1, display: 'flex', alignItems: 'center', color: `${STATUS_COLOR[currentStatus]}.main` }}>
                  {STATUS_ICON[currentStatus]}
                </Box>
              }
            >
              {(Object.keys(STATUS_LABEL) as SatisfactionStatus[]).map((s) => (
                <MenuItem key={s} value={s}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ display: 'flex', alignItems: 'center', color: `${STATUS_COLOR[s]}.main` }}>
                      {STATUS_ICON[s]}
                    </Box>
                    <Typography variant="body2">{STATUS_LABEL[s]}</Typography>
                  </Stack>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {method.status?.satisfiedAt && (
          <Typography variant="caption" color="text.secondary">
            Satisfied {new Date(method.status.satisfiedAt).toLocaleDateString()}
          </Typography>
        )}
        {method.status?.updatedAt && !method.status.satisfiedAt && (
          <Typography variant="caption" color="text.secondary">
            Updated {new Date(method.status.updatedAt).toLocaleDateString()}
          </Typography>
        )}

        {!programId && (
          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            Select a compliance program to track status.
          </Typography>
        )}
      </Stack>
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main panel
// ─────────────────────────────────────────────────────────────────────────────

const SatisfactionMethodsPanel: React.FC<Props> = ({ clauseCode, programId, programName }) => {
  const [methods, setMethods] = useState<SatisfactionMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingMethodId, setSavingMethodId] = useState<string | null>(null);
  const [snack, setSnack] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const resp = await satisfactionService.listForClause(clauseCode, programId ?? null);
      if (cancelled) return;
      if (resp.error) {
        setError(typeof resp.error === 'string' ? resp.error : resp.error.message);
      } else {
        setMethods(resp.data ?? []);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [clauseCode, programId]);

  /** Group methods by pattern_type, preserving sort_order within each group. */
  const methodsByPattern = useMemo(() => {
    const grouped = new Map<PatternType, SatisfactionMethod[]>();
    for (const m of methods) {
      const p = m.mechanismType.patternType;
      const arr = grouped.get(p) ?? [];
      arr.push(m);
      grouped.set(p, arr);
    }
    return grouped;
  }, [methods]);

  const handleStatusChange = async (methodId: string, newStatus: SatisfactionStatus) => {
    if (!programId) return;
    setSavingMethodId(methodId);
    setError(null);
    const resp = await satisfactionService.upsertStatus(methodId, {
      programId,
      status: newStatus,
    });
    setSavingMethodId(null);
    if (resp.error) {
      setError(typeof resp.error === 'string' ? resp.error : resp.error.message);
      return;
    }
    // Update local state with the returned status row.
    setMethods((prev) => prev.map((m) =>
      m.id === methodId
        ? { ...m, status: resp.data ?? m.status }
        : m
    ));
    setSnack(`Status updated to "${STATUS_LABEL[newStatus]}"`);
    setTimeout(() => setSnack(null), 2400);
  };

  if (loading) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress size={24} />
        </CardContent>
      </Card>
    );
  }

  // Empty state — clause has no curated methods yet (C-4 backfill territory).
  if (methods.length === 0) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>How to satisfy this clause</Typography>
          <Alert severity="info" sx={{ mt: 1 }}>
            <strong>Curated satisfaction methods aren't available for this clause yet.</strong>{' '}
            The clause text above is the authoritative reference. Our compliance
            librarians are working through the catalog — top-10 most-cited clauses
            are done; the rest land in scheduled backfill batches.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <Typography variant="h6">How to satisfy this clause</Typography>
          <Chip
            size="small"
            label={`${methods.length} method${methods.length === 1 ? '' : 's'}`}
            variant="outlined"
          />
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
          {programId
            ? `Status tracked against ${programName ?? 'your selected program'}. Each method is curated from authoritative federal sources cited inline.`
            : 'Read-only view. Select a compliance program in the project switcher to track satisfaction status.'}
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* Render groups in fixed order; skip empty ones. */}
        {PATTERN_SECTION_ORDER.map((pattern) => {
          const rows = methodsByPattern.get(pattern);
          if (!rows || rows.length === 0) return null;
          return (
            <Box key={pattern} sx={{ mb: 3 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                <Box sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center' }}>
                  {PATTERN_ICON[pattern]}
                </Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {PATTERN_LABEL[pattern]} ({rows.length})
                </Typography>
              </Stack>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mb: 1, ml: 4 }}
              >
                {PATTERN_SECTION_DESCRIPTION[pattern]}
              </Typography>
              {rows.map((m) => (
                <MethodRow
                  key={m.id}
                  method={m}
                  programId={programId}
                  onStatusChange={handleStatusChange}
                  saving={savingMethodId === m.id}
                />
              ))}
            </Box>
          );
        })}

        {snack && (
          <Alert severity="success" sx={{ mt: 1 }} onClose={() => setSnack(null)}>
            {snack}
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default SatisfactionMethodsPanel;
