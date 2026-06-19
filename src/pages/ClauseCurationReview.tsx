import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box, Typography, Card, CardContent, CircularProgress, Alert, Chip, Button,
  TextField, MenuItem, Divider, IconButton, Stack, Snackbar, Tabs, Tab, Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PublishIcon from '@mui/icons-material/Publish';
import SaveIcon from '@mui/icons-material/Save';
import BlockIcon from '@mui/icons-material/Block';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import {
  pendingClauseService,
  type PendingClause, type MechanismType, type CurateDraft, type ProposedMethod,
  type EnrichedDraft, type Family,
} from '../services/pendingClauseService';

const RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH'];

/** Editable form state for one candidate (superset of CurateDraft). */
interface FormState {
  clauseCode: string;
  title: string;
  description: string;
  familyId: string;
  clauseCategory: string;
  riskClassification: string;
  implementationGuidance: string;
  assessmentMethod: string;
  referenceUrl: string;
  sourceAuthorityForLink: string;
  proposedMethods: ProposedMethod[];
}

const blankForm = (): FormState => ({
  clauseCode: '', title: '', description: '', familyId: '', clauseCategory: '', riskClassification: '',
  implementationGuidance: '', assessmentMethod: '', referenceUrl: '', sourceAuthorityForLink: '',
  proposedMethods: [],
});

const fromCandidate = (c: PendingClause): FormState => ({
  clauseCode: c.clause_code ?? '',
  title: c.title ?? '',
  description: c.description ?? '',
  familyId: c.family_id ?? '',
  clauseCategory: c.clause_category ?? '',
  riskClassification: c.risk_classification ?? '',
  implementationGuidance: c.implementation_guidance ?? '',
  assessmentMethod: c.assessment_method ?? '',
  referenceUrl: c.reference_url ?? '',
  sourceAuthorityForLink: c.source_authority_for_link ?? '',
  proposedMethods: Array.isArray(c.proposed_methods) ? c.proposed_methods : [],
});

const toDraft = (f: FormState): CurateDraft => ({
  clauseCode: f.clauseCode.trim() || undefined,
  title: f.title || undefined,
  description: f.description || null,
  familyId: f.familyId || null,
  clauseCategory: f.clauseCategory || null,
  riskClassification: f.riskClassification || null,
  implementationGuidance: f.implementationGuidance || null,
  assessmentMethod: f.assessmentMethod || null,
  referenceUrl: f.referenceUrl || null,
  sourceAuthorityForLink: f.sourceAuthorityForLink || null,
  proposedMethods: f.proposedMethods,
});

const ClauseCurationReview: React.FC = () => {
  const [statusTab, setStatusTab] = useState<'pending' | 'promoted' | 'rejected'>('pending');
  const [queue, setQueue] = useState<PendingClause[]>([]);
  const [mechTypes, setMechTypes] = useState<MechanismType[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(blankForm());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snack, setSnack] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const selected = useMemo(() => queue.find(c => c.id === selectedId) ?? null, [queue, selectedId]);

  const loadQueue = async (status: typeof statusTab) => {
    setLoading(true);
    setError(null);
    const resp = await pendingClauseService.list(status);
    if (resp.error) {
      setError(typeof resp.error === 'string' ? resp.error : resp.error.message);
      setQueue([]);
    } else {
      setQueue(resp.data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { loadQueue(statusTab); setSelectedId(null); }, [statusTab]);
  useEffect(() => {
    (async () => {
      const [mt, fam] = await Promise.all([
        pendingClauseService.mechanismTypes(),
        pendingClauseService.families(),
      ]);
      if (!mt.error) setMechTypes(mt.data ?? []);
      if (!fam.error) setFamilies(fam.data ?? []);
    })();
  }, []);
  useEffect(() => { if (selected) setForm(fromCandidate(selected)); }, [selected]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(f => ({ ...f, [k]: v }));

  const addMethod = () => set('proposedMethods', [
    ...form.proposedMethods,
    { mechanism_type_id: '', description: '', is_required: true, source_authority_for_link: '' },
  ]);
  const updateMethod = (i: number, patch: Partial<ProposedMethod>) =>
    set('proposedMethods', form.proposedMethods.map((m, idx) => idx === i ? { ...m, ...patch } : m));
  const removeMethod = (i: number) =>
    set('proposedMethods', form.proposedMethods.filter((_, idx) => idx !== i));

  /** AI-draft the catalog fields from an uploaded source document. Fills the
   *  form for review — nothing is saved until you Save draft / Promote. */
  const handleEnrichFile = async (file: File | null | undefined) => {
    if (!file || !selectedId) return;
    setEnriching(true); setError(null);
    const resp = await pendingClauseService.enrich(selectedId, file);
    setEnriching(false);
    if (fileInputRef.current) fileInputRef.current.value = ''; // allow re-selecting the same file
    if (resp.error) { setError(typeof resp.error === 'string' ? resp.error : resp.error.message); return; }
    const d = resp.data as EnrichedDraft;
    // The model suggests a family by name; pre-select the matching family_id if one exists.
    const matchedFamilyId = d.family
      ? families.find(fam => fam.name.toLowerCase() === d.family.trim().toLowerCase())?.id
      : undefined;
    setForm(f => ({
      ...f,
      clauseCode: d.suggestedClauseCode || f.clauseCode,
      title: d.title || f.title,
      description: d.description || f.description,
      familyId: matchedFamilyId || f.familyId,
      clauseCategory: d.clauseCategory || f.clauseCategory,
      riskClassification: d.riskClassification || f.riskClassification,
      implementationGuidance: d.implementationGuidance || f.implementationGuidance,
      assessmentMethod: d.assessmentMethod || f.assessmentMethod,
      referenceUrl: d.referenceUrl || f.referenceUrl,
      // Append AI-suggested methods; the human assigns each mechanism type.
      proposedMethods: [...f.proposedMethods, ...(d.proposedMethods ?? [])],
    }));
    setSnack('Fields drafted from the document — review, then Save or Promote.');
  };

  const saveDraft = async () => {
    if (!selectedId) return;
    setBusy(true); setError(null);
    const resp = await pendingClauseService.saveDraft(selectedId, toDraft(form));
    setBusy(false);
    if (resp.error) { setError(typeof resp.error === 'string' ? resp.error : resp.error.message); return; }
    setSnack('Draft saved.');
    setQueue(q => q.map(c => c.id === selectedId ? (resp.data as PendingClause) : c));
  };

  /** Returns the missing required-field labels (empty array = all present). */
  const requiredMissing = (): string[] => {
    const missing: string[] = [];
    if (!form.clauseCode.trim()) missing.push('clause code');
    if (!form.description.trim()) missing.push('description');
    if (!form.implementationGuidance.trim()) missing.push('implementation guidance');
    if (!form.familyId) missing.push('family');
    if (!form.clauseCategory.trim()) missing.push('category');
    if (!form.riskClassification) missing.push('risk');
    return missing;
  };

  const promote = async () => {
    if (!selectedId) return;
    const missing = requiredMissing();
    if (missing.length) { setError(`Required before promoting: ${missing.join(', ')}.`); return; }
    setBusy(true); setError(null);
    const resp = await pendingClauseService.promote(selectedId, toDraft(form));
    setBusy(false);
    if (resp.error) { setError(typeof resp.error === 'string' ? resp.error : resp.error.message); return; }
    setSnack(`Promoted to catalog (${resp.data?.methodsCreated ?? 0} satisfaction method(s) created).`);
    setSelectedId(null);
    loadQueue(statusTab);
  };

  /** Edit a clause that's already promoted — writes through to the catalog. */
  const saveCatalog = async () => {
    if (!selectedId) return;
    const missing = requiredMissing();
    if (missing.length) { setError(`Required before saving: ${missing.join(', ')}.`); return; }
    setBusy(true); setError(null);
    const resp = await pendingClauseService.updateCatalog(selectedId, toDraft(form));
    setBusy(false);
    if (resp.error) { setError(typeof resp.error === 'string' ? resp.error : resp.error.message); return; }
    setSnack('Catalog clause updated.');
    setQueue(q => q.map(c => c.id === selectedId ? (resp.data as PendingClause) : c));
  };

  const reject = async () => {
    if (!selectedId) return;
    const notes = window.prompt('Reason for rejecting this clause (optional):') ?? undefined;
    setBusy(true); setError(null);
    const resp = await pendingClauseService.reject(selectedId, notes);
    setBusy(false);
    if (resp.error) { setError(typeof resp.error === 'string' ? resp.error : resp.error.message); return; }
    setSnack('Clause rejected.');
    setSelectedId(null);
    loadQueue(statusTab);
  };

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <Typography variant="h4" gutterBottom>Clause Curation</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Not-in-catalog clauses discovered by solicitation scans. Flesh out the catalog fields and
        "How to Satisfy" methods, then promote into the authoritative catalog so every customer gets
        a fully guidance-backed clause.
      </Typography>

      <Tabs value={statusTab} onChange={(_, v) => setStatusTab(v)} sx={{ mb: 2 }}>
        <Tab value="pending" label="Pending" />
        <Tab value="promoted" label="Promoted" />
        <Tab value="rejected" label="Rejected" />
      </Tabs>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' }, alignItems: 'flex-start' }}>
        {/* Queue */}
        <Card sx={{ width: { xs: '100%', md: 340 }, flexShrink: 0 }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Queue ({queue.length})</Typography>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={24} /></Box>
            ) : queue.length === 0 ? (
              <Typography variant="body2" color="text.secondary">Nothing here.</Typography>
            ) : (
              <Stack spacing={1}>
                {queue.map(c => (
                  <Box
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    sx={{
                      p: 1.25, borderRadius: 1, cursor: 'pointer', border: '1px solid',
                      borderColor: c.id === selectedId ? 'primary.main' : 'divider',
                      bgcolor: c.id === selectedId ? 'action.selected' : 'transparent',
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{c.clause_code}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {c.title}
                    </Typography>
                    {c.confidence != null && (
                      <Chip size="small" label={`${Math.round((c.confidence ?? 0) * 100)}%`} sx={{ height: 18, mt: 0.5 }} />
                    )}
                  </Box>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>

        {/* Editor */}
        <Card sx={{ flex: 1, minWidth: 0, width: '100%' }}>
          <CardContent>
            {!selected ? (
              <Typography variant="body2" color="text.secondary">
                Select a clause from the queue to curate it.
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="h6">{form.clauseCode || selected.clause_code}</Typography>
                  <Chip size="small" label={selected.status} variant="outlined" />
                </Box>
                {selected.supporting_context && (
                  <Alert severity="info" variant="outlined" sx={{ fontStyle: 'italic' }}>
                    Source excerpt: “{selected.supporting_context}”
                  </Alert>
                )}

                {/* AI enrichment from a source document — fills the fields below for review. */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.xlsx,application/pdf"
                    style={{ display: 'none' }}
                    onChange={e => handleEnrichFile(e.target.files?.[0])}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={enriching ? <CircularProgress size={16} /> : <AutoFixHighIcon />}
                    disabled={enriching || busy || selected.status !== 'pending'}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {enriching ? 'Reading document…' : 'Auto-fill from source document'}
                  </Button>
                  <Typography variant="caption" color="text.secondary">
                    Upload the official PDF; AI drafts the fields below for your review. Nothing is saved until you Save or Promote.
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <TextField label="Clause code" size="small" value={form.clauseCode} onChange={e => set('clauseCode', e.target.value)} sx={{ width: 260 }} required
                    helperText="The canonical identifier, e.g. NIST SP 800-88 Rev2" />
                  <TextField label="Title" size="small" value={form.title} onChange={e => set('title', e.target.value)} sx={{ flex: 1, minWidth: 220 }} />
                </Box>
                <TextField label="Description" size="small" value={form.description} onChange={e => set('description', e.target.value)} fullWidth multiline minRows={2} required />
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <TextField label="Family" size="small" select required value={form.familyId} onChange={e => set('familyId', e.target.value)} sx={{ flex: 1, minWidth: 200 }}
                    helperText="Catalog family this clause belongs to">
                    <MenuItem value=""><em>select…</em></MenuItem>
                    {families.map(fam => <MenuItem key={fam.id} value={fam.id}>{fam.name}</MenuItem>)}
                  </TextField>
                  <TextField label="Category" size="small" required value={form.clauseCategory} onChange={e => set('clauseCategory', e.target.value)} sx={{ flex: 1, minWidth: 160 }} />
                  <TextField label="Risk" size="small" select required value={form.riskClassification} onChange={e => set('riskClassification', e.target.value)} sx={{ width: 140 }}>
                    <MenuItem value=""><em>none</em></MenuItem>
                    {RISK_LEVELS.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                  </TextField>
                </Box>
                <TextField label="Implementation guidance" size="small" value={form.implementationGuidance} onChange={e => set('implementationGuidance', e.target.value)} fullWidth multiline minRows={3} required />
                <TextField label="Assessment method" size="small" value={form.assessmentMethod} onChange={e => set('assessmentMethod', e.target.value)} fullWidth multiline minRows={2} />
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <TextField label="Reference URL" size="small" value={form.referenceUrl} onChange={e => set('referenceUrl', e.target.value)} sx={{ flex: 1, minWidth: 200 }} />
                  <TextField label="Source authority (citation)" size="small" value={form.sourceAuthorityForLink} onChange={e => set('sourceAuthorityForLink', e.target.value)} sx={{ flex: 1, minWidth: 200 }} />
                </Box>

                <Divider textAlign="left">
                  <Typography variant="subtitle2">How to Satisfy the Clause</Typography>
                </Divider>
                {selected.status !== 'pending' && (
                  <Typography variant="caption" color="text.secondary">
                    Satisfaction methods are read-only here for a published clause — editing them can affect
                    customers' completion tracking. Descriptive fields above can still be updated.
                  </Typography>
                )}
                {form.proposedMethods.map((m, i) => (
                  <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', flexWrap: 'wrap', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.25 }}>
                    <TextField label="Mechanism" size="small" select value={m.mechanism_type_id} disabled={selected.status !== 'pending'}
                      onChange={e => updateMethod(i, { mechanism_type_id: e.target.value })} sx={{ width: 220 }}>
                      <MenuItem value=""><em>select…</em></MenuItem>
                      {mechTypes.map(t => <MenuItem key={t.id} value={t.id}>{t.display_label}</MenuItem>)}
                    </TextField>
                    <TextField label="Obligation (plain English)" size="small" value={m.description} disabled={selected.status !== 'pending'}
                      onChange={e => updateMethod(i, { description: e.target.value })} sx={{ flex: 1, minWidth: 220 }} multiline />
                    <TextField label="Required?" size="small" select value={m.is_required === false ? 'no' : 'yes'} disabled={selected.status !== 'pending'}
                      onChange={e => updateMethod(i, { is_required: e.target.value === 'yes' })} sx={{ width: 110 }}>
                      <MenuItem value="yes">Required</MenuItem>
                      <MenuItem value="no">Optional</MenuItem>
                    </TextField>
                    {selected.status === 'pending' && (
                      <Tooltip title="Remove method">
                        <IconButton size="small" onClick={() => removeMethod(i)}><DeleteOutlineIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    )}
                  </Box>
                ))}
                {selected.status === 'pending' && (
                  <Button size="small" startIcon={<AddIcon />} onClick={addMethod} sx={{ alignSelf: 'flex-start' }}>
                    Add satisfaction method
                  </Button>
                )}

                <Divider />
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                  {selected.status === 'pending' && (
                    <>
                      <Button variant="outlined" startIcon={<SaveIcon />} disabled={busy} onClick={saveDraft}>
                        Save draft
                      </Button>
                      <Button variant="contained" startIcon={busy ? <CircularProgress size={16} /> : <PublishIcon />} disabled={busy} onClick={promote}>
                        Promote to catalog
                      </Button>
                      <Box sx={{ flex: 1 }} />
                      <Button color="error" startIcon={<BlockIcon />} disabled={busy} onClick={reject}>
                        Reject
                      </Button>
                    </>
                  )}
                  {selected.status === 'promoted' && (
                    <Button variant="contained" startIcon={busy ? <CircularProgress size={16} /> : <SaveIcon />} disabled={busy} onClick={saveCatalog}>
                      Save changes to catalog
                    </Button>
                  )}
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>

      <Snackbar open={!!snack} autoHideDuration={5000} onClose={() => setSnack(null)} message={snack ?? ''} />
    </Box>
  );
};

export default ClauseCurationReview;
