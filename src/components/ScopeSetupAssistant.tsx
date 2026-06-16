import { useEffect, useRef, useState } from 'react';
import {
  Box, Button, Chip, CircularProgress, Divider, Drawer, IconButton, Stack, TextField, Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useQueryClient } from '@tanstack/react-query';
import { assistantService, type IntakeTurn } from '../services/assistantService';
import { onboardingService, type CuratedBundle } from '../services/onboardingService';
import MarkdownLite from './MarkdownLite';

const PURPLE = '#534AB7';

const GREETING =
  "Let's set up your compliance scope. To start: which agencies or primes do you contract with, and what kind of data do you handle — CUI, PHI, or software you sell to the government?";

/**
 * Conversational scope setup. Interviews the user, then recommends ONE curated
 * bundle (the model can only pick from the fixed, human-curated list); applying
 * it activates that bundle's frameworks for the current program via the existing
 * onboarding endpoint, then refreshes the dashboard.
 */
export default function ScopeSetupAssistant({
  open, onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [turns, setTurns] = useState<IntakeTurn[]>([{ role: 'assistant', content: GREETING }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bundles, setBundles] = useState<CuratedBundle[]>([]);
  const [recommendedId, setRecommendedId] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [appliedTitle, setAppliedTitle] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    onboardingService.listBundles().then((r) => { if (r.data) setBundles(r.data); });
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns, loading, recommendedId, appliedTitle]);

  const recommended = bundles.find((b) => b.id === recommendedId) || null;

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || loading) return;
    setError(null);
    setInput('');
    setRecommendedId(null);
    const next: IntakeTurn[] = [...turns, { role: 'user', content }];
    setTurns(next);
    setLoading(true);
    const resp = await assistantService.intake(next);
    setLoading(false);
    if (resp.error || !resp.data) {
      const msg = typeof resp.error === 'string' ? resp.error : resp.error?.message;
      setError(msg || 'The setup assistant is unavailable right now.');
      return;
    }
    setTurns((prev) => [...prev, { role: 'assistant', content: resp.data!.reply }]);
    setRecommendedId(resp.data!.recommendedBundleId);
  };

  const applyBundle = async () => {
    if (!recommended) return;
    setApplying(true);
    setError(null);
    const resp = await onboardingService.applyBundle(recommended.id);
    setApplying(false);
    if (resp.error) {
      setError(typeof resp.error === 'string' ? resp.error : resp.error.message ?? 'Failed to activate bundle');
      return;
    }
    setAppliedTitle(recommended.title);
    setRecommendedId(null);
    // Bundle activation changes the whole posture — refresh the dashboard.
    queryClient.invalidateQueries();
    setTurns((prev) => [...prev, {
      role: 'assistant',
      content: `✓ Activated "${recommended.title}". Your dashboard scope is updated — close this to see your Posture, Gaps, and next steps.`,
    }]);
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose}
      PaperProps={{ sx: {
        width: { xs: '100%', sm: 460 }, maxWidth: '100%',
        top: { xs: '56px', sm: '72px' },
        height: { xs: 'calc(100% - 56px)', sm: 'calc(100% - 72px)' },
        display: 'flex', flexDirection: 'column',
      } }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ p: 2, pb: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <AutoAwesomeIcon sx={{ color: PURPLE }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.1 }}>Set up your scope</Typography>
          <Typography variant="caption" color="text.secondary">A few questions → your framework baseline</Typography>
        </Box>
        <IconButton size="small" onClick={onClose} aria-label="Close"><CloseIcon fontSize="small" /></IconButton>
      </Stack>

      <Box ref={scrollRef} sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
        <Stack spacing={1.5}>
          {turns.map((t, i) => (
            <Box key={i} sx={{ display: 'flex', justifyContent: t.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <Box sx={{
                maxWidth: '85%', px: 1.5, py: 1, borderRadius: 2, fontSize: 14,
                whiteSpace: t.role === 'user' ? 'pre-wrap' : 'normal',
                bgcolor: t.role === 'user' ? PURPLE : '#F5F4FC',
                color: t.role === 'user' ? '#fff' : 'text.primary',
              }}>
                {t.role === 'assistant' ? <MarkdownLite text={t.content} /> : t.content}
              </Box>
            </Box>
          ))}

          {loading && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
              <CircularProgress size={16} /><Typography variant="caption">Thinking…</Typography>
            </Box>
          )}

          {/* Recommendation card */}
          {recommended && (
            <Box sx={{ border: '1px solid', borderColor: PURPLE, borderRadius: 2, p: 1.5, bgcolor: '#F5F4FC' }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#3C3489', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                Recommended bundle
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 0.25 }}>{recommended.title}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>{recommended.persona}</Typography>
              <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                {recommended.resolvedFrameworks.map((f) => (
                  <Chip key={f.shortLabel} label={f.shortLabel} size="small" variant="outlined" />
                ))}
              </Stack>
              <Button fullWidth size="small" variant="contained" disabled={applying}
                startIcon={applying ? <CircularProgress size={14} /> : <CheckCircleIcon />}
                onClick={applyBundle}>
                {applying ? 'Activating…' : 'Activate this bundle'}
              </Button>
            </Box>
          )}

          {error && <Typography variant="caption" color="error">{error}</Typography>}
        </Stack>
      </Box>

      <Divider />
      <Box sx={{ p: 1.5 }}>
        <Stack direction="row" spacing={1} alignItems="flex-end">
          <TextField
            size="small" fullWidth multiline maxRows={4}
            placeholder="Type your answer…"
            value={input}
            disabled={loading || applying}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
          />
          <IconButton color="primary" disabled={loading || applying || !input.trim()} onClick={() => send(input)} aria-label="Send">
            <SendIcon />
          </IconButton>
        </Stack>
        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>
          {appliedTitle ? 'Scope updated. You can keep refining or close.' : 'Recommends a curated bundle; you confirm before anything is activated.'}
        </Typography>
      </Box>
    </Drawer>
  );
}
