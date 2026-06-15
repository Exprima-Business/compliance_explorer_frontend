import { useState } from 'react';
import {
  Box, Button, Card, CardContent, Chip, CircularProgress, Collapse, Stack, Typography,
} from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useNavigate } from 'react-router-dom';
import { useCascadeLeverage, type CascadeMove } from '../hooks/useCascadeLeverage';
import { useCascadeMoveObligations } from '../hooks/useCascadeMoveObligations';

// Cascade-leverage accent (matches the dashboard mockups' "leverage" purple).
const LEVERAGE = '#534AB7';

/**
 * One ranked move row — click to expand its drill-in: the specific obligations
 * it would clear, each linking to that obligation's clause detail page (where
 * the per-program satisfaction status is marked). This is the "DO" layer.
 */
function MoveRow({ move, rank }: { move: CascadeMove; rank: number }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: obligations, isLoading } = useCascadeMoveObligations(move.mechanismTypeId, open);

  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
      {/* Clickable move header */}
      <Box
        onClick={() => setOpen(o => !o)}
        sx={{
          cursor: 'pointer',
          p: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          '&:hover': { bgcolor: 'action.hover' },
        }}
      >
        <Box
          sx={{
            flexShrink: 0,
            width: 26,
            height: 26,
            borderRadius: '50%',
            bgcolor: 'rgba(83,74,183,0.12)',
            color: LEVERAGE,
            fontSize: 13,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {rank}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>
            {move.mechanismLabel}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            across {move.authoritiesCount} {move.authoritiesCount === 1 ? 'authority' : 'authorities'}
          </Typography>
        </Box>
        <Chip
          label={`unlocks ${move.obligationsCleared}`}
          size="small"
          sx={{ bgcolor: 'rgba(83,74,183,0.10)', color: LEVERAGE, fontWeight: 600, height: 22 }}
        />
        {open
          ? <ExpandLessIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
          : <ExpandMoreIcon sx={{ fontSize: 18, color: 'text.secondary' }} />}
      </Box>

      {/* Drill-in: the obligations this move clears, each linking to its clause */}
      <Collapse in={open} timeout="auto" unmountOnExit>
        <Box sx={{ p: 1.5, pt: 0.5, bgcolor: 'action.hover' }}>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 1.5 }}>
              <CircularProgress size={18} />
            </Box>
          ) : obligations && obligations.length > 0 ? (
            <>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                Open each to mark it satisfied:
              </Typography>
              <Stack spacing={0.5}>
                {obligations.map(o => (
                  <Stack
                    key={o.artifactId}
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    onClick={() => navigate(`/clauses/${encodeURIComponent(o.identifier)}`)}
                    sx={{
                      cursor: 'pointer',
                      p: 0.5,
                      borderRadius: 1,
                      '&:hover': { bgcolor: 'background.paper' },
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 500, color: LEVERAGE, flexShrink: 0 }}>
                      {o.identifier}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ flex: 1, minWidth: 0 }}
                      noWrap
                      title={o.title}
                    >
                      {o.title}
                    </Typography>
                    <Chip
                      label={o.sourceAuthority}
                      size="small"
                      sx={{ height: 18, fontSize: 11, bgcolor: 'background.paper' }}
                    />
                    <OpenInNewIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
                  </Stack>
                ))}
              </Stack>
            </>
          ) : (
            <Typography variant="caption" color="text.secondary">
              No open obligations for this move.
            </Typography>
          )}
        </Box>
      </Collapse>
    </Box>
  );
}

/**
 * Cascade dashboard — "Moves" widget. Ranked satisfaction-mechanism actions for
 * the active program, each scored by the obligations it would clear. Click a
 * move to drill into the specific obligations and jump to where you work them.
 */
export default function CascadeLeverageWidget() {
  const { data, isLoading, error } = useCascadeLeverage();
  const [showAll, setShowAll] = useState(false);

  const moves = data ?? [];
  const visible = showAll ? moves : moves.slice(0, 5);

  return (
    <Card sx={{ mb: { xs: 2, md: 3 }, border: '1px solid', borderColor: 'divider' }}>
      <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.25 }}>
          <BoltIcon fontSize="small" sx={{ color: LEVERAGE }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1 }}>
            Moves
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Ranked by what they unlock — click a move to see what it clears and work it.
        </Typography>

        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={24} />
          </Box>
        )}

        {!isLoading && error && (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            Couldn't load your moves right now.
          </Typography>
        )}

        {!isLoading && !error && moves.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            No moves yet — activate a framework and we'll rank your highest-leverage
            actions here, each scored by how many obligations it clears.
          </Typography>
        )}

        {!isLoading && !error && visible.length > 0 && (
          <Stack spacing={1}>
            {visible.map((m, i) => (
              <MoveRow key={m.mechanismTypeId} move={m} rank={i + 1} />
            ))}
          </Stack>
        )}

        {!isLoading && !error && moves.length > 5 && (
          <Button
            size="small"
            onClick={() => setShowAll(s => !s)}
            sx={{ mt: 1, textTransform: 'none' }}
          >
            {showAll ? 'Show fewer' : `Show all ${moves.length} moves`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
