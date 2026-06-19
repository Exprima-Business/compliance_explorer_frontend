import React, { useEffect, useState } from 'react';
import {
  Box, Typography, TextField, MenuItem, Button, Chip, IconButton,
  Stack, Divider, Alert, CircularProgress, Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SearchIcon from '@mui/icons-material/Search';
import {
  pendingClauseService, RELATIONSHIP_TYPES, ARTIFACT_TYPES,
  type ClauseGraph, type ArtifactRef,
} from '../services/pendingClauseService';
import type { ApiResponse } from '../types/api';

const label = (s: string) => s.replace(/_/g, ' ');

interface Props {
  pendingId: string;
  defaultIdentifier?: string;
  defaultTitle?: string;
  defaultUrl?: string;
  defaultSummary?: string;
}

/**
 * Related Regulations for a PROMOTED clause: link it to a regulatory-graph node
 * (preferring an existing artifact), then add/remove edges to other artifacts.
 */
const ClauseGraphPanel: React.FC<Props> = ({ pendingId, defaultIdentifier, defaultTitle, defaultUrl, defaultSummary }) => {
  const [graph, setGraph] = useState<ClauseGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Shared artifact search.
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<ArtifactRef[]>([]);
  const [searching, setSearching] = useState(false);

  // Add-relationship form.
  const [target, setTarget] = useState<ArtifactRef | null>(null);
  const [relType, setRelType] = useState('');
  const [direction, setDirection] = useState<'outgoing' | 'incoming'>('outgoing');
  const [citation, setCitation] = useState('');

  // Create-artifact form (only when no existing node fits).
  const [showCreate, setShowCreate] = useState(false);
  const [na, setNa] = useState({ artifactType: '', identifier: '', title: '', sourceAuthority: '', sourceUrl: '', summary: '' });

  const errOf = (resp: ApiResponse<unknown>) =>
    typeof resp.error === 'string' ? resp.error : resp.error?.message ?? 'Request failed';

  const load = async () => {
    setLoading(true); setError(null);
    const resp = await pendingClauseService.graph(pendingId);
    setLoading(false);
    if (resp.error) { setError(errOf(resp)); return; }
    setGraph(resp.data ?? null);
  };
  useEffect(() => {
    setResults([]); setSearch(''); setTarget(null); setRelType(''); setCitation(''); setShowCreate(false);
    setNa({ artifactType: '', identifier: defaultIdentifier ?? '', title: defaultTitle ?? '', sourceAuthority: '', sourceUrl: defaultUrl ?? '', summary: defaultSummary ?? '' });
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingId]);

  const apply = (resp: ApiResponse<ClauseGraph>): boolean => {
    if (resp.error) { setError(errOf(resp)); return false; }
    setGraph(resp.data ?? null);
    setError(null);
    return true;
  };

  const runSearch = async () => {
    if (!search.trim()) return;
    setSearching(true);
    const resp = await pendingClauseService.searchArtifacts(search.trim());
    setSearching(false);
    if (resp.error) { setError(errOf(resp)); return; }
    setResults(resp.data?.items ?? []);
  };

  const doLink = async (artifactId: string) => {
    setBusy(true);
    const ok = apply(await pendingClauseService.linkArtifact(pendingId, artifactId));
    setBusy(false);
    if (ok) { setResults([]); setSearch(''); }
  };

  const doCreate = async () => {
    if (!na.artifactType || !na.identifier.trim() || !na.title.trim() || !na.sourceAuthority.trim()) {
      setError('Type, identifier, title, and source authority are required to create a graph node.');
      return;
    }
    setBusy(true);
    const ok = apply(await pendingClauseService.createArtifact(pendingId, {
      artifactType: na.artifactType, identifier: na.identifier, title: na.title,
      sourceAuthority: na.sourceAuthority, sourceUrl: na.sourceUrl || null, summary: na.summary || null,
    }));
    setBusy(false);
    if (ok) setShowCreate(false);
  };

  const doAdd = async () => {
    if (!target) { setError('Pick a related regulation first.'); return; }
    if (!relType) { setError('Choose a relationship type.'); return; }
    if (!citation.trim()) { setError('A citation / justification is required.'); return; }
    setBusy(true);
    const ok = apply(await pendingClauseService.addRelationship(pendingId, {
      otherArtifactId: target.id, relationshipType: relType, direction, citation,
    }));
    setBusy(false);
    if (ok) { setTarget(null); setRelType(''); setCitation(''); setSearch(''); setResults([]); }
  };

  const doRemove = async (relId: string) => {
    setBusy(true);
    apply(await pendingClauseService.removeRelationship(pendingId, relId));
    setBusy(false);
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress size={22} /></Box>;
  }
  if (graph && graph.promoted === false) {
    return <Alert severity="info" variant="outlined">Promote this clause to wire it into the regulatory graph.</Alert>;
  }

  const hasArtifact = !!graph?.artifact;

  const searchBox = (onPick: (a: ArtifactRef) => void, pickLabel: string) => (
    <Box>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <TextField size="small" label="Search regulatory graph" value={search} fullWidth
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); runSearch(); } }} />
        <Button size="small" variant="outlined" startIcon={searching ? <CircularProgress size={14} /> : <SearchIcon />} onClick={runSearch} disabled={searching}>
          Search
        </Button>
      </Box>
      {results.length > 0 && (
        <Stack spacing={0.5} sx={{ mt: 1, maxHeight: 200, overflowY: 'auto' }}>
          {results.map(a => (
            <Box key={a.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 0.75, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{a.identifier}</Typography>
                <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>{a.title}</Typography>
              </Box>
              <Chip size="small" label={label(a.artifact_type)} variant="outlined" />
              <Button size="small" onClick={() => onPick(a)} disabled={busy}>{pickLabel}</Button>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Divider textAlign="left"><Typography variant="subtitle2">Related Regulations</Typography></Divider>
      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

      {!hasArtifact ? (
        <>
          <Typography variant="caption" color="text.secondary">
            This clause isn't linked to a regulatory-graph node yet. Find the existing node for it (preferred —
            avoids duplicates), or create one only if none exists.
          </Typography>
          {searchBox(doLink, 'Link')}
          <Box>
            <Button size="small" onClick={() => setShowCreate(s => !s)}>
              {showCreate ? 'Cancel new node' : 'No match — create a new graph node'}
            </Button>
          </Box>
          {showCreate && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                <TextField size="small" select label="Artifact type" value={na.artifactType} required sx={{ minWidth: 200 }}
                  onChange={e => setNa({ ...na, artifactType: e.target.value })}>
                  <MenuItem value=""><em>select…</em></MenuItem>
                  {ARTIFACT_TYPES.map(t => <MenuItem key={t} value={t}>{label(t)}</MenuItem>)}
                </TextField>
                <TextField size="small" label="Identifier" value={na.identifier} required sx={{ flex: 1, minWidth: 200 }}
                  onChange={e => setNa({ ...na, identifier: e.target.value })} />
              </Box>
              <TextField size="small" label="Title" value={na.title} required fullWidth
                onChange={e => setNa({ ...na, title: e.target.value })} />
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                <TextField size="small" label="Source authority" value={na.sourceAuthority} required sx={{ flex: 1, minWidth: 180 }}
                  onChange={e => setNa({ ...na, sourceAuthority: e.target.value })} helperText="e.g. NIST, OMB, GSA (FAR)" />
                <TextField size="small" label="Source URL" value={na.sourceUrl} sx={{ flex: 1, minWidth: 180 }}
                  onChange={e => setNa({ ...na, sourceUrl: e.target.value })} />
              </Box>
              <Button size="small" variant="contained" onClick={doCreate} disabled={busy}>Create &amp; link node</Button>
            </Box>
          )}
        </>
      ) : (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="caption" color="text.secondary">Graph node:</Typography>
            <Chip size="small" color="primary" variant="outlined"
              label={`${graph!.artifact!.identifier} · ${label(graph!.artifact!.artifact_type)}`} />
          </Box>

          {graph!.relationships.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No related regulations yet.</Typography>
          ) : (
            <Stack spacing={0.5}>
              {graph!.relationships.map(r => (
                <Box key={r.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 0.75, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                  <Chip size="small" label={label(r.relationship_type)} />
                  <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }} noWrap>
                    {r.direction === 'outgoing' ? '→ ' : '← '}{r.other.identifier}
                    <Typography component="span" variant="caption" color="text.secondary"> ({r.other.title})</Typography>
                  </Typography>
                  <Tooltip title="Remove edge">
                    <span><IconButton size="small" onClick={() => doRemove(r.id)} disabled={busy}><DeleteOutlineIcon fontSize="small" /></IconButton></span>
                  </Tooltip>
                </Box>
              ))}
            </Stack>
          )}

          {/* Add a related regulation */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, border: '1px dashed', borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
            <Typography variant="caption" color="text.secondary">Add a related regulation</Typography>
            {target ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip size="small" color="secondary" variant="outlined" label={`${target.identifier} · ${label(target.artifact_type)}`} onDelete={() => setTarget(null)} />
              </Box>
            ) : searchBox(a => { setTarget(a); setResults([]); setSearch(''); }, 'Select')}

            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              <TextField size="small" select label="Direction" value={direction} sx={{ minWidth: 220 }}
                onChange={e => setDirection(e.target.value as 'outgoing' | 'incoming')}>
                <MenuItem value="outgoing">This clause → related</MenuItem>
                <MenuItem value="incoming">Related → this clause</MenuItem>
              </TextField>
              <TextField size="small" select label="Relationship" value={relType} required sx={{ minWidth: 220 }}
                onChange={e => setRelType(e.target.value)}>
                <MenuItem value=""><em>select…</em></MenuItem>
                {RELATIONSHIP_TYPES.map(t => <MenuItem key={t} value={t}>{label(t)}</MenuItem>)}
              </TextField>
            </Box>
            <TextField size="small" label="Citation / justification" value={citation} required fullWidth multiline
              onChange={e => setCitation(e.target.value)}
              helperText="Where this link is documented — e.g. 'NIST SP 800-171 r3 §3.8.3 references SP 800-88 for media sanitization.'" />
            <Button size="small" variant="contained" startIcon={busy ? <CircularProgress size={14} /> : <AddIcon />} onClick={doAdd} disabled={busy}>
              Add related regulation
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
};

export default ClauseGraphPanel;
