import { Box, Button, Typography } from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import type { CascadeMove } from '../hooks/useCascadeLeverage';

/**
 * The guided "Next best action" bar — a single condensed strip above the KPI
 * row: bold title + one-sentence why + a stage-aware CTA. The content recomputes
 * per journey stage (set up → scope → surface → close gaps → audit-ready).
 */

const PURPLE = '#534AB7';
const PURPLE_DK = '#3C3489';
const AUDIT_THRESHOLD = 95;

interface JourneyGuideProps {
  hasFrameworks: boolean;
  hasSurface: boolean;
  posture: number;
  covered: number;
  total: number;
  gapsOpen: number;
  topMove: CascadeMove | null;
  moveCount: number;
  onSetupScope: () => void;
  onStartMove: (move: CascadeMove) => void;
  onViewAllMoves: () => void;
  onGenerateReport: () => void;
}

/** Where the org is on the journey. Set up is always done. */
function currentStage(p: JourneyGuideProps): number {
  if (!p.hasFrameworks) return 1;            // Scope frameworks
  if (!p.hasSurface) return 2;               // Surface obligations
  if (p.posture < AUDIT_THRESHOLD) return 3; // Close gaps
  return 4;                                  // Audit-ready
}

interface Hero { title: string; why: string; ctaLabel: string; onCta: () => void; }

function buildHero(stage: number, p: JourneyGuideProps): Hero {
  if (stage === 1) return {
    title: 'Set up your compliance scope',
    why: "we can't tell you what you owe until we know your frameworks and contract requirements.",
    ctaLabel: 'Set up scope', onCta: p.onSetupScope,
  };
  if (stage === 2) return {
    title: 'Confirm your obligations',
    why: 'your frameworks are set — review the obligations they trigger and start closing them.',
    ctaLabel: 'View requirements', onCta: p.onViewAllMoves,
  };
  if (stage === 3 && p.topMove) {
    const m = p.topMove;
    const obl = `${m.obligationsCleared} ${m.obligationsCleared === 1 ? 'requirement' : 'requirements'}`;
    const auth = `${m.authoritiesCount} ${m.authoritiesCount === 1 ? 'authority' : 'authorities'}`;
    return {
      title: m.mechanismLabel,
      why: `your highest-leverage move — one action clears ${obl} across ${auth}.`,
      ctaLabel: 'Start this move', onCta: () => p.onStartMove(m),
    };
  }
  if (stage === 4) return {
    title: "You're audit-ready — keep it that way",
    why: `${p.posture}% of your obligations are covered; export your package and set renewals.`,
    ctaLabel: 'Generate report', onCta: p.onGenerateReport,
  };
  // Close-gaps with no ranked move yet.
  return {
    title: 'Work your open requirements',
    why: `${p.gapsOpen} ${p.gapsOpen === 1 ? 'requirement remains' : 'requirements remain'} open — mark satisfaction and attach evidence.`,
    ctaLabel: 'View requirements', onCta: p.onViewAllMoves,
  };
}

export default function JourneyGuide(props: JourneyGuideProps) {
  const stage = currentStage(props);
  const hero = buildHero(stage, props);

  return (
    <Box sx={{
      mb: 2, display: 'flex', alignItems: 'center', gap: 1.75, flexWrap: 'wrap',
      bgcolor: '#F5F4FC', border: '1px solid #D9D5F0', borderRadius: 2, p: '12px 16px',
    }}>
      <BoltIcon sx={{ fontSize: 22, color: PURPLE, flexShrink: 0 }} />
      <Box sx={{ flex: 1, minWidth: 240 }}>
        <Typography sx={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: PURPLE_DK }}>
          Next best action
        </Typography>
        <Typography sx={{ fontSize: 14, lineHeight: 1.4 }}>
          <Box component="span" sx={{ fontWeight: 700 }}>{hero.title}</Box>
          <Box component="span" sx={{ color: 'text.secondary' }}> — {hero.why}</Box>
        </Typography>
      </Box>
      {stage === 3 && props.topMove && props.moveCount > 1 && (
        <Typography
          sx={{ fontSize: 12.5, color: PURPLE_DK, cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 500 }}
          onClick={props.onViewAllMoves}
        >
          See all {props.moveCount} actions
        </Typography>
      )}
      <Button
        variant="contained" size="small"
        sx={{ bgcolor: PURPLE, textTransform: 'none', fontWeight: 600, whiteSpace: 'nowrap', boxShadow: 'none', '&:hover': { bgcolor: '#433a9e' } }}
        endIcon={<ArrowForwardIcon />}
        onClick={hero.onCta}
      >
        {hero.ctaLabel}
      </Button>
    </Box>
  );
}
