import { useEffect, useRef, useState } from 'react';
import {
  Box, Chip, CircularProgress, Drawer, IconButton, Stack, TextField, Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useOrg } from '../contexts/OrgContext';
import { assistantService } from '../services/assistantService';
import MarkdownLite from './MarkdownLite';

const PURPLE = '#534AB7';

interface Turn {
  role: 'user' | 'assistant';
  text: string;
}

const SUGGESTIONS = [
  'Why are these obligations in my scope?',
  'What are my highest-impact next steps?',
  'What do I need to do to satisfy DFARS 252.204-7012?',
  'Does implementing NIST 800-171 cover any of my other obligations?',
];

/**
 * Grounded compliance assistant — a read-only Q&A slide-over. Answers come from
 * the program's real activated scope (BE assembles the context); the assistant
 * explains scope and next steps, it does not change compliance status.
 */
export default function ComplianceAssistant({
  open, onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  // Scope is the org now; programId carries the org id as the "scope present" gate.
  const { currentOrg } = useOrg();
  const programId = currentOrg?.id;
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns, loading]);

  const send = async (q: string) => {
    const question = q.trim();
    if (!question || !programId || loading) return;
    setError(null);
    setInput('');
    setTurns((prev) => [...prev, { role: 'user', text: question }]);
    setLoading(true);
    const resp = await assistantService.ask(question);
    setLoading(false);
    if (resp.error || !resp.data) {
      const msg = typeof resp.error === 'string' ? resp.error : resp.error?.message;
      setError(msg || 'The assistant is unavailable right now.');
      return;
    }
    setTurns((prev) => [...prev, { role: 'assistant', text: resp.data!.answer }]);
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose}
      PaperProps={{ sx: {
        width: { xs: '100%', sm: 460 }, maxWidth: '100%',
        top: { xs: '56px', sm: '72px' },
        height: { xs: 'calc(100% - 56px)', sm: 'calc(100% - 72px)' },
        display: 'flex', flexDirection: 'column',
      } }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ p: 2, pb: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <AutoAwesomeIcon sx={{ color: PURPLE }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.1 }}>Compliance assistant</Typography>
          <Typography variant="caption" color="text.secondary">Grounded in your activated scope</Typography>
        </Box>
        <IconButton size="small" onClick={onClose} aria-label="Close"><CloseIcon fontSize="small" /></IconButton>
      </Stack>

      {/* Conversation */}
      <Box ref={scrollRef} sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
        {turns.length === 0 && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Ask about your obligations, why something is in scope, or what to do next. Try:
            </Typography>
            <Stack spacing={1}>
              {SUGGESTIONS.map((s) => (
                <Chip key={s} label={s} variant="outlined" onClick={() => send(s)}
                  sx={{ height: 'auto', py: 0.75, justifyContent: 'flex-start', '& .MuiChip-label': { whiteSpace: 'normal', display: 'block' } }} />
              ))}
            </Stack>
          </Box>
        )}

        <Stack spacing={1.5}>
          {turns.map((t, i) => (
            <Box key={i} sx={{ display: 'flex', justifyContent: t.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <Box sx={{
                maxWidth: '85%', px: 1.5, py: 1, borderRadius: 2, fontSize: 14,
                whiteSpace: t.role === 'user' ? 'pre-wrap' : 'normal',
                bgcolor: t.role === 'user' ? PURPLE : '#F5F4FC',
                color: t.role === 'user' ? '#fff' : 'text.primary',
              }}>
                {t.role === 'assistant' ? <MarkdownLite text={t.text} /> : t.text}
              </Box>
            </Box>
          ))}
          {loading && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
              <CircularProgress size={16} /><Typography variant="caption">Thinking…</Typography>
            </Box>
          )}
          {error && <Typography variant="caption" color="error">{error}</Typography>}
        </Stack>
      </Box>

      {/* Input */}
      <Box sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
        {!programId && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            Select a program to ask about your scope.
          </Typography>
        )}
        <Stack direction="row" spacing={1} alignItems="flex-end">
          <TextField
            size="small" fullWidth multiline maxRows={4}
            placeholder="Ask about your compliance scope…"
            value={input}
            disabled={!programId || loading}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
            }}
          />
          <IconButton color="primary" disabled={!programId || loading || !input.trim()} onClick={() => send(input)} aria-label="Send">
            <SendIcon />
          </IconButton>
        </Stack>
        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>
          Explains scope &amp; next steps from your curated catalog — it doesn't change compliance status.
        </Typography>
      </Box>
    </Drawer>
  );
}
