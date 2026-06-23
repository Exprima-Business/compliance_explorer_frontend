import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Divider,
  FormControl, InputLabel, Link, MenuItem, Select,
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
import SaveIcon from '@mui/icons-material/Save';
import LockIcon from '@mui/icons-material/Lock';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import {
  satisfactionService,
  type SatisfactionMethod,
  type SatisfactionMethodStatus,
  type SatisfactionStatus,
  type PatternType,
  type StructuredEvidence,
  type UpsertStatusRequest,
} from '../services/satisfactionService';
import EvidenceFileUpload from './EvidenceFileUpload';
import { evidenceService } from '../services/evidenceService';
import { useOrgMembers, memberLabel, type OrgMember } from '../hooks/useOrgMembers';

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
// Mechanism-specific evidence form (D-1.4)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Per-mechanism evidence form payload. Mirrors UpsertStatusRequest's
 * evidence-shaped fields. Each form below produces a subset of these.
 */
interface EvidenceFormPayload {
  evidenceUrl?: string | null;
  evidenceNotes?: string | null;
  acknowledgmentText?: string | null;
  structuredEvidence?: StructuredEvidence | null;
}

interface EvidenceFormProps {
  method: SatisfactionMethod;
  disabled: boolean;
  saving: boolean;
  onSave: (payload: EvidenceFormPayload) => Promise<void>;
}

/** Pull a string field from existing structuredEvidence (defensive). */
function readStr(
  obj: Record<string, string | number | boolean | null> | null | undefined,
  key: string,
): string {
  if (!obj) return '';
  const v = obj[key];
  if (v === null || v === undefined) return '';
  return String(v);
}

/**
 * Generic notes + URL evidence form — used by maintain_policy_doc and as
 * the fallback for any mechanism without a custom form.
 */
const NotesAndUrlForm: React.FC<EvidenceFormProps & {
  urlLabel?: string;
  notesLabel?: string;
}> = ({ method, disabled, saving, onSave, urlLabel = 'Evidence URL', notesLabel = 'Notes' }) => {
  const [url, setUrl] = useState(method.status?.evidenceUrl ?? '');
  const [notes, setNotes] = useState(method.status?.evidenceNotes ?? '');

  return (
    <Stack spacing={1} sx={{ mt: 1 }}>
      <TextField
        size="small"
        label={urlLabel}
        placeholder="https://..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        disabled={disabled || saving}
        fullWidth
      />
      <TextField
        size="small"
        label={notesLabel}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        disabled={disabled || saving}
        multiline
        minRows={2}
        fullWidth
      />
      <Box>
        <Button
          size="small"
          variant="outlined"
          startIcon={<SaveIcon />}
          disabled={disabled || saving || (!url && !notes)}
          onClick={() => onSave({ evidenceUrl: url || null, evidenceNotes: notes || null })}
        >
          Save evidence
        </Button>
      </Box>
    </Stack>
  );
};

/** designated_role → {name, email, phone} */
const DesignatedRoleForm: React.FC<EvidenceFormProps> = ({ method, disabled, saving, onSave }) => {
  const existing = method.status?.structuredEvidence ?? null;
  const [name, setName] = useState(readStr(existing, 'name'));
  const [email, setEmail] = useState(readStr(existing, 'email'));
  const [phone, setPhone] = useState(readStr(existing, 'phone'));

  return (
    <Stack spacing={1} sx={{ mt: 1 }}>
      <Typography variant="caption" color="text.secondary">
        Record the person accountable for this obligation.
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <TextField
          size="small"
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={disabled || saving}
          fullWidth
        />
        <TextField
          size="small"
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={disabled || saving}
          fullWidth
        />
        <TextField
          size="small"
          label="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={disabled || saving}
          fullWidth
        />
      </Stack>
      <Box>
        <Button
          size="small"
          variant="outlined"
          startIcon={<SaveIcon />}
          disabled={disabled || saving || (!name && !email && !phone)}
          onClick={() => onSave({
            structuredEvidence: { name: name || null, email: email || null, phone: phone || null },
          })}
        >
          Save evidence
        </Button>
      </Box>
    </Stack>
  );
};

/** self_attestation_form → acknowledgmentText */
const SelfAttestationForm: React.FC<EvidenceFormProps> = ({ method, disabled, saving, onSave }) => {
  const [text, setText] = useState(method.status?.acknowledgmentText ?? '');

  return (
    <Stack spacing={1} sx={{ mt: 1 }}>
      <Typography variant="caption" color="text.secondary">
        Type your attestation. Saving records you (the authenticated user) as the signer
        with a timestamp.
      </Typography>
      <TextField
        size="small"
        label="Attestation text"
        placeholder="I acknowledge that..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={disabled || saving}
        multiline
        minRows={2}
        fullWidth
      />
      {method.status?.acknowledgedAt && (
        <Typography variant="caption" color="text.disabled">
          Signed {new Date(method.status.acknowledgedAt).toLocaleString()}
          {method.status.acknowledgedBy ? ` by ${method.status.acknowledgedBy}` : ''}
        </Typography>
      )}
      <Box>
        <Button
          size="small"
          variant="outlined"
          startIcon={<SaveIcon />}
          disabled={disabled || saving || !text}
          onClick={() => onSave({ acknowledgmentText: text })}
        >
          Save attestation
        </Button>
      </Box>
    </Stack>
  );
};

/** contractual_instrument_with_third_party → {party_name, executed_date, document_url} */
const ContractualInstrumentForm: React.FC<EvidenceFormProps> = ({ method, disabled, saving, onSave }) => {
  const existing = method.status?.structuredEvidence ?? null;
  const [partyName, setPartyName] = useState(readStr(existing, 'party_name'));
  const [executedDate, setExecutedDate] = useState(readStr(existing, 'executed_date'));
  const [documentUrl, setDocumentUrl] = useState(readStr(existing, 'document_url'));

  return (
    <Stack spacing={1} sx={{ mt: 1 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <TextField
          size="small"
          label="Party name"
          value={partyName}
          onChange={(e) => setPartyName(e.target.value)}
          disabled={disabled || saving}
          fullWidth
        />
        <TextField
          size="small"
          label="Executed date"
          type="date"
          value={executedDate}
          onChange={(e) => setExecutedDate(e.target.value)}
          disabled={disabled || saving}
          InputLabelProps={{ shrink: true }}
          fullWidth
        />
      </Stack>
      <TextField
        size="small"
        label="Document URL"
        placeholder="https://..."
        value={documentUrl}
        onChange={(e) => setDocumentUrl(e.target.value)}
        disabled={disabled || saving}
        fullWidth
      />
      <Box>
        <Button
          size="small"
          variant="outlined"
          startIcon={<SaveIcon />}
          disabled={disabled || saving || (!partyName && !executedDate && !documentUrl)}
          onClick={() => onSave({
            structuredEvidence: {
              party_name: partyName || null,
              executed_date: executedDate || null,
              document_url: documentUrl || null,
            },
          })}
        >
          Save evidence
        </Button>
      </Box>
    </Stack>
  );
};

/** annual_training → {roster_url, completion_date} */
const AnnualTrainingForm: React.FC<EvidenceFormProps> = ({ method, disabled, saving, onSave }) => {
  const existing = method.status?.structuredEvidence ?? null;
  const [rosterUrl, setRosterUrl] = useState(readStr(existing, 'roster_url'));
  const [completionDate, setCompletionDate] = useState(readStr(existing, 'completion_date'));

  return (
    <Stack spacing={1} sx={{ mt: 1 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <TextField
          size="small"
          label="Roster URL"
          placeholder="https://..."
          value={rosterUrl}
          onChange={(e) => setRosterUrl(e.target.value)}
          disabled={disabled || saving}
          fullWidth
        />
        <TextField
          size="small"
          label="Completion date"
          type="date"
          value={completionDate}
          onChange={(e) => setCompletionDate(e.target.value)}
          disabled={disabled || saving}
          InputLabelProps={{ shrink: true }}
          fullWidth
        />
      </Stack>
      <Box>
        <Button
          size="small"
          variant="outlined"
          startIcon={<SaveIcon />}
          disabled={disabled || saving || (!rosterUrl && !completionDate)}
          onClick={() => onSave({
            structuredEvidence: {
              roster_url: rosterUrl || null,
              completion_date: completionDate || null,
            },
          })}
        >
          Save evidence
        </Button>
      </Box>
    </Stack>
  );
};

/** post_to_government_system → {system_url, posted_at, confirmation} */
const PostToGovernmentSystemForm: React.FC<EvidenceFormProps> = ({ method, disabled, saving, onSave }) => {
  const existing = method.status?.structuredEvidence ?? null;
  const [systemUrl, setSystemUrl] = useState(readStr(existing, 'system_url'));
  const [postedAt, setPostedAt] = useState(readStr(existing, 'posted_at'));
  const [confirmation, setConfirmation] = useState(readStr(existing, 'confirmation'));

  return (
    <Stack spacing={1} sx={{ mt: 1 }}>
      <TextField
        size="small"
        label="System URL"
        placeholder="https://..."
        value={systemUrl}
        onChange={(e) => setSystemUrl(e.target.value)}
        disabled={disabled || saving}
        fullWidth
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <TextField
          size="small"
          label="Posted at"
          type="date"
          value={postedAt}
          onChange={(e) => setPostedAt(e.target.value)}
          disabled={disabled || saving}
          InputLabelProps={{ shrink: true }}
          fullWidth
        />
        <TextField
          size="small"
          label="Confirmation #"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          disabled={disabled || saving}
          fullWidth
        />
      </Stack>
      <Box>
        <Button
          size="small"
          variant="outlined"
          startIcon={<SaveIcon />}
          disabled={disabled || saving || (!systemUrl && !postedAt && !confirmation)}
          onClick={() => onSave({
            structuredEvidence: {
              system_url: systemUrl || null,
              posted_at: postedAt || null,
              confirmation: confirmation || null,
            },
          })}
        >
          Save evidence
        </Button>
      </Box>
    </Stack>
  );
};

/** third_party_assessment → {assessor, cert_date, cert_url} */
const ThirdPartyAssessmentForm: React.FC<EvidenceFormProps> = ({ method, disabled, saving, onSave }) => {
  const existing = method.status?.structuredEvidence ?? null;
  const [assessor, setAssessor] = useState(readStr(existing, 'assessor'));
  const [certDate, setCertDate] = useState(readStr(existing, 'cert_date'));
  const [certUrl, setCertUrl] = useState(readStr(existing, 'cert_url'));

  return (
    <Stack spacing={1} sx={{ mt: 1 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <TextField
          size="small"
          label="Assessor name"
          value={assessor}
          onChange={(e) => setAssessor(e.target.value)}
          disabled={disabled || saving}
          fullWidth
        />
        <TextField
          size="small"
          label="Certification date"
          type="date"
          value={certDate}
          onChange={(e) => setCertDate(e.target.value)}
          disabled={disabled || saving}
          InputLabelProps={{ shrink: true }}
          fullWidth
        />
      </Stack>
      <TextField
        size="small"
        label="Certification URL"
        placeholder="https://..."
        value={certUrl}
        onChange={(e) => setCertUrl(e.target.value)}
        disabled={disabled || saving}
        fullWidth
      />
      <Box>
        <Button
          size="small"
          variant="outlined"
          startIcon={<SaveIcon />}
          disabled={disabled || saving || (!assessor && !certDate && !certUrl)}
          onClick={() => onSave({
            structuredEvidence: {
              assessor: assessor || null,
              cert_date: certDate || null,
              cert_url: certUrl || null,
            },
          })}
        >
          Save evidence
        </Button>
      </Box>
    </Stack>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Uploaded-files section (Phase D Batch 4)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * One uploaded-file record stored inside structuredEvidence.uploaded_files.
 * Persisted server-side as JSONB on satisfaction_method_status.
 */
interface UploadedFileEntry {
  artifact_id: string;
  file_name: string;
  uploaded_at: string; // ISO timestamp
}

/**
 * Defensive read: `structuredEvidence.uploaded_files` may be missing, may
 * be of legacy shape, or may carry rogue keys. The wider FE type
 * (`Record<string, string|number|boolean|null>`) does not model arrays, so
 * we cast at the read boundary and validate each entry's shape before
 * trusting it. No `as any` — narrow casts only.
 */
function readUploadedFiles(
  structured: SatisfactionMethodStatus['structuredEvidence'] | undefined,
): UploadedFileEntry[] {
  if (!structured) return [];
  // Cast through unknown — the BE column is JSONB so it can hold arrays
  // under specific keys even though the FE type narrows to scalars.
  const raw = (structured as unknown as Record<string, unknown>)['uploaded_files'];
  if (!Array.isArray(raw)) return [];
  const out: UploadedFileEntry[] = [];
  for (const entry of raw) {
    if (
      entry &&
      typeof entry === 'object' &&
      typeof (entry as Record<string, unknown>).artifact_id === 'string' &&
      typeof (entry as Record<string, unknown>).file_name === 'string' &&
      typeof (entry as Record<string, unknown>).uploaded_at === 'string'
    ) {
      out.push({
        artifact_id: (entry as Record<string, unknown>).artifact_id as string,
        file_name: (entry as Record<string, unknown>).file_name as string,
        uploaded_at: (entry as Record<string, unknown>).uploaded_at as string,
      });
    }
  }
  return out;
}

/**
 * Merge a new uploaded-file entry into the existing structuredEvidence.
 * Preserves all other keys (party_name, executed_date, etc.) so the
 * mechanism-specific evidence is not nuked by an upload.
 */
function appendUploadedFile(
  existing: SatisfactionMethodStatus['structuredEvidence'] | undefined,
  entry: UploadedFileEntry,
): StructuredEvidence {
  const base: Record<string, unknown> = existing
    ? { ...(existing as unknown as Record<string, unknown>) }
    : {};
  const prior = readUploadedFiles(existing);
  // Dedupe by artifact_id in case the user re-uploads the same file.
  const next = [...prior.filter((p) => p.artifact_id !== entry.artifact_id), entry];
  base['uploaded_files'] = next;
  // The wider JSONB shape is safe at the BE — narrow cast at the boundary.
  return base as unknown as StructuredEvidence;
}

interface UploadedFilesListProps {
  files: UploadedFileEntry[];
}

/** Renders the existing uploaded-files list as clickable links to signed URLs. */
const UploadedFilesList: React.FC<UploadedFilesListProps> = ({ files }) => {
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleOpen = async (artifactId: string) => {
    setBusyId(artifactId);
    try {
      const resp = await evidenceService.getArtifact(artifactId);
      const url = resp.data?.signedUrl ?? null;
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } finally {
      setBusyId(null);
    }
  };

  if (files.length === 0) return null;

  return (
    <Box sx={{ mt: 1, mb: 0.5 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
        Uploaded files
      </Typography>
      <Stack spacing={0.5}>
        {files.map((f) => (
          <Stack key={f.artifact_id} direction="row" spacing={1} alignItems="center">
            <AttachFileIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
            <Link
              component="button"
              type="button"
              underline="hover"
              sx={{ fontSize: '0.8rem', textAlign: 'left' }}
              disabled={busyId === f.artifact_id}
              onClick={() => handleOpen(f.artifact_id)}
            >
              {f.file_name}
            </Link>
            <Typography variant="caption" color="text.disabled">
              {new Date(f.uploaded_at).toLocaleDateString()}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
};

/** Router that picks the right form per mechanism_type.typeName. */
const EvidenceForm: React.FC<EvidenceFormProps> = (props) => {
  const typeName = props.method.mechanismType.typeName;
  switch (typeName) {
    case 'designated_role':
      return <DesignatedRoleForm {...props} />;
    case 'maintain_policy_doc':
      return <NotesAndUrlForm {...props} urlLabel="Policy URL" notesLabel="Notes" />;
    case 'self_attestation_form':
      return <SelfAttestationForm {...props} />;
    case 'contractual_instrument_with_third_party':
      return <ContractualInstrumentForm {...props} />;
    case 'annual_training':
      return <AnnualTrainingForm {...props} />;
    case 'post_to_government_system':
      return <PostToGovernmentSystemForm {...props} />;
    case 'third_party_assessment':
      return <ThirdPartyAssessmentForm {...props} />;
    default:
      // Fallback: generic notes + URL covers incident_reporting_on_schedule,
      // continuous_monitoring, prohibition, evidence_preservation,
      // vulnerability_remediation_deadline, government_access_rights,
      // data_residency, marking_and_handling, personnel_security_credential,
      // use_restriction_on_disclosed_data, authorization_to_operate,
      // conformance_statement, flowdown_to_subcontractors,
      // statutory_authority_only.
      return <NotesAndUrlForm {...props} />;
  }
};

/**
 * TRUE if the given status row has *some* evidence already recorded —
 * any of url, notes, acknowledgmentText, or structuredEvidence with
 * at least one non-empty value. Used to gate the "Evidence required
 * to mark satisfied" warning.
 */
function hasAnyEvidence(s: SatisfactionMethodStatus | null | undefined): boolean {
  if (!s) return false;
  if (s.evidenceUrl) return true;
  if (s.evidenceNotes) return true;
  if (s.acknowledgmentText) return true;
  // Uploaded files count as evidence even if no other structured fields are set.
  if (readUploadedFiles(s.structuredEvidence).length > 0) return true;
  if (s.structuredEvidence) {
    for (const [k, v] of Object.entries(s.structuredEvidence)) {
      if (k === 'uploaded_files') continue; // handled above
      if (v !== null && v !== undefined && v !== '') return true;
    }
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-method row
// ─────────────────────────────────────────────────────────────────────────────

interface MethodRowProps {
  method: SatisfactionMethod;
  programId: string | null;
  members: OrgMember[];
  membersLoading: boolean;
  onStatusChange: (methodId: string, newStatus: SatisfactionStatus) => Promise<void>;
  onOwnerChange: (methodId: string, ownerUserId: string | null) => Promise<void>;
  onEvidenceSave: (methodId: string, payload: EvidenceFormPayload) => Promise<void>;
  saving: boolean;
}

const MethodRow: React.FC<MethodRowProps> = ({
  method, programId, members, membersLoading, onStatusChange, onOwnerChange, onEvidenceSave, saving,
}) => {
  const currentStatus: SatisfactionStatus = method.status?.status ?? 'not_started';
  const currentOwner: string = method.status?.ownerUserId ?? '';
  const recurrence = formatInterval(method.recurrenceInterval);
  const response = formatInterval(method.responseWindow);
  const isComputed = method.computed === true;
  const inputsDisabled = !programId || isComputed;
  const showEvidenceWarning =
    currentStatus === 'satisfied' && !hasAnyEvidence(method.status) && !isComputed;

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

      {/* D-1.2 — computed-status banner. Status + evidence inputs are
          disabled; user must update the linked framework control instead. */}
      {isComputed && (
        <Alert
          severity="info"
          icon={<LockIcon fontSize="small" />}
          sx={{ mb: 1, py: 0.5 }}
        >
          Status computed from framework control
          {method.controlIdentifier ? ` (${method.controlIdentifier})` : ''}.
          Update the control directly to change this method's status.
        </Alert>
      )}

      {/* Per-program status control */}
      <Stack direction="row" spacing={2} alignItems="center" sx={{ flexWrap: 'wrap' }}>
        <Box sx={{ minWidth: 200 }}>
          <FormControl size="small" fullWidth disabled={inputsDisabled || saving}>
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

        {/* Phase B-1 — requirement owner. Shares the Status disabled rule
            (program required + not a computed framework-linked method). */}
        <Box sx={{ minWidth: 220 }}>
          <FormControl size="small" fullWidth disabled={inputsDisabled || saving || membersLoading}>
            <InputLabel>Owner</InputLabel>
            <Select
              value={currentOwner}
              label="Owner"
              displayEmpty
              onChange={(e) => onOwnerChange(method.id, (e.target.value as string) || null)}
              startAdornment={
                <Box sx={{ mr: 1, display: 'flex', alignItems: 'center', color: 'text.secondary' }}>
                  <PersonOutlineIcon fontSize="small" />
                </Box>
              }
              renderValue={(val) => {
                if (!val) return <Typography variant="body2" color="text.secondary">Unassigned</Typography>;
                const m = members.find((x) => x.userId === val);
                return <Typography variant="body2">{m ? memberLabel(m) : 'Unknown user'}</Typography>;
              }}
            >
              <MenuItem value="">
                <Typography variant="body2" color="text.secondary">Unassigned</Typography>
              </MenuItem>
              {members.map((m) => (
                <MenuItem key={m.userId} value={m.userId}>
                  <Typography variant="body2">{memberLabel(m)}</Typography>
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

      {/* D-1.3 — immediate FE warning when user selects "satisfied" with no
          evidence on record. BE will also reject; this catches it sooner. */}
      {showEvidenceWarning && (
        <Alert severity="warning" sx={{ mt: 1, py: 0.5 }}>
          Evidence required to mark satisfied. Fill in the form below and save.
        </Alert>
      )}

      {/* D-1.4 — per-mechanism evidence input form. Only renders when a
          program is selected (no program → status is read-only anyway). */}
      {programId && (
        <>
          {/* Phase D Batch 4 — uploaded files list + uploader. Renders for
              every mechanism type as an additional evidence channel; the
              per-mechanism form below still accepts URL/notes/structured. */}
          <UploadedFilesList files={readUploadedFiles(method.status?.structuredEvidence)} />
          <EvidenceFileUpload
            disabled={inputsDisabled || saving}
            onUploaded={async ({ id, file_name }) => {
              const merged = appendUploadedFile(method.status?.structuredEvidence, {
                artifact_id: id,
                file_name,
                uploaded_at: new Date().toISOString(),
              });
              await onEvidenceSave(method.id, { structuredEvidence: merged });
            }}
          />
          <EvidenceForm
            method={method}
            disabled={inputsDisabled}
            saving={saving}
            onSave={(payload) => onEvidenceSave(method.id, payload)}
          />
        </>
      )}
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
  const { data: members = [], isLoading: membersLoading } = useOrgMembers();
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkValue, setBulkValue] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const resp = await satisfactionService.listForClause(clauseCode);
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

  /** Methods whose owner is user-assignable (excludes computed framework-linked). */
  const assignableMethods = useMemo(
    () => methods.filter((m) => m.computed !== true),
    [methods],
  );

  /**
   * Bulk-assign one owner to every assignable requirement on this clause, while
   * leaving the per-row pickers intact for finer-grained overrides. ownerUserId
   * null clears them all. Computed framework-linked methods are skipped (their
   * owner control is disabled too).
   */
  const handleAssignAllOwners = async (ownerUserId: string | null) => {
    if (!programId || assignableMethods.length === 0) return;
    setBulkSaving(true);
    setError(null);
    const results = await Promise.all(
      assignableMethods.map((m) =>
        satisfactionService.setOwner(m.id, ownerUserId)
          .then((resp) => ({ id: m.id, resp })),
      ),
    );
    setBulkSaving(false);
    const okById = new Map(
      results.filter((r) => !r.resp.error).map((r) => [r.id, r.resp.data]),
    );
    setMethods((prev) => prev.map((m) =>
      okById.has(m.id) ? { ...m, status: okById.get(m.id) ?? m.status } : m,
    ));
    const failed = results.length - okById.size;
    if (failed > 0) {
      setError(`Assigned ${okById.size} of ${results.length} requirements; ${failed} failed.`);
      return;
    }
    const who = members.find((x) => x.userId === ownerUserId);
    setSnack(ownerUserId
      ? `Assigned all ${results.length} requirements to ${who ? memberLabel(who) : 'member'}`
      : `Cleared owner on all ${results.length} requirements`);
    setTimeout(() => setSnack(null), 2600);
  };

  const handleStatusChange = async (methodId: string, newStatus: SatisfactionStatus) => {
    if (!programId) return;
    setSavingMethodId(methodId);
    setError(null);
    const resp = await satisfactionService.upsertStatus(methodId, {
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

  const handleOwnerChange = async (methodId: string, ownerUserId: string | null) => {
    if (!programId) return;
    setSavingMethodId(methodId);
    setError(null);
    const resp = await satisfactionService.setOwner(methodId, ownerUserId);
    setSavingMethodId(null);
    if (resp.error) {
      setError(typeof resp.error === 'string' ? resp.error : resp.error.message);
      return;
    }
    setMethods((prev) => prev.map((m) =>
      m.id === methodId ? { ...m, status: resp.data ?? m.status } : m
    ));
    const m = members.find((x) => x.userId === ownerUserId);
    setSnack(ownerUserId ? `Owner set to ${m ? memberLabel(m) : 'member'}` : 'Owner cleared');
    setTimeout(() => setSnack(null), 2400);
  };

  /**
   * D-1.4 — save mechanism-specific evidence. Preserves the method's
   * current status (we are saving evidence, not flipping status), and
   * merges the new evidence fields onto the upsert payload.
   */
  const handleEvidenceSave = async (methodId: string, payload: EvidenceFormPayload) => {
    if (!programId) return;
    const method = methods.find((m) => m.id === methodId);
    if (!method) return;
    setSavingMethodId(methodId);
    setError(null);

    // Preserve any previously uploaded files when a per-mechanism form
    // submits its own structuredEvidence (which would otherwise overwrite
    // the whole JSONB column on the BE). The upload path already includes
    // its own merge, so this only fires for mechanism-form saves.
    let nextPayload = payload;
    if (
      payload.structuredEvidence !== undefined &&
      payload.structuredEvidence !== null
    ) {
      const incoming = payload.structuredEvidence as unknown as Record<string, unknown>;
      const incomingHasUploads = Array.isArray(incoming['uploaded_files']);
      const priorUploads = readUploadedFiles(method.status?.structuredEvidence);
      if (!incomingHasUploads && priorUploads.length > 0) {
        const merged: Record<string, unknown> = { ...incoming, uploaded_files: priorUploads };
        nextPayload = {
          ...payload,
          structuredEvidence: merged as unknown as StructuredEvidence,
        };
      }
    }

    const req: UpsertStatusRequest = {
      status: method.status?.status ?? 'not_started',
      ...nextPayload,
    };
    const resp = await satisfactionService.upsertStatus(methodId, req);
    setSavingMethodId(null);
    if (resp.error) {
      setError(typeof resp.error === 'string' ? resp.error : resp.error.message);
      return;
    }
    setMethods((prev) => prev.map((m) =>
      m.id === methodId
        ? { ...m, status: resp.data ?? m.status }
        : m
    ));
    setSnack('Evidence saved');
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

        {/* Bulk owner assignment — one click assigns every requirement; per-row
            pickers below still allow different owners per task. */}
        {programId && assignableMethods.length > 1 && (
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
            <PersonOutlineIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            <FormControl size="small" sx={{ minWidth: 280 }} disabled={bulkSaving || membersLoading}>
              <Select
                value={bulkValue}
                displayEmpty
                onChange={(e) => {
                  const v = e.target.value as string;
                  setBulkValue('');
                  handleAssignAllOwners(v === '__clear__' ? null : v);
                }}
                renderValue={() => (
                  <Typography variant="body2" color="text.secondary">
                    Assign all {assignableMethods.length} requirements to…
                  </Typography>
                )}
              >
                <MenuItem value="__clear__"><em>Unassigned (clear all)</em></MenuItem>
                {members.map((m) => (
                  <MenuItem key={m.userId} value={m.userId}>{memberLabel(m)}</MenuItem>
                ))}
              </Select>
            </FormControl>
            {bulkSaving && <CircularProgress size={16} />}
            <Typography variant="caption" color="text.disabled">
              Applies to every requirement; you can still set individual owners below.
            </Typography>
          </Stack>
        )}

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
                  members={members}
                  membersLoading={membersLoading}
                  onStatusChange={handleStatusChange}
                  onOwnerChange={handleOwnerChange}
                  onEvidenceSave={handleEvidenceSave}
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
