import { Box, Button, Stack, Typography } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import LockIcon from '@mui/icons-material/Lock';
import CircleIcon from '@mui/icons-material/Circle';
import BoltIcon from '@mui/icons-material/Bolt';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import type { CascadeMove } from '../hooks/useCascadeLeverage';

/**
 * The guided layer above Posture/Gaps/Moves: a journey spine (where the org is
 * on the path) + a condensed "Next best action" bar (bold title, one-sentence
 * why, stage-aware CTA). Content recomputes per stage.
 */

const PURPLE = '#534AB7';
const PURPLE_DK = '#3C3489';
const GREEN = '#639922';
const LINE_FUTURE = 'rgba(0,0,0,0.10)';
const AUDIT_THRESHOLD = 95;

const STAGES = ['Set up', 'Scope frameworks', 'Surface obligations', 'Close gaps', 'Audit-ready'] as const;

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

/** Where the org is on the journey (index into STAGES). Set up is always done. */
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

type NodeStatus = 'done' | 'current' | 'future';

function SpineNode({ label, status, leftGreen, rightGreen, showLeft, showRight }: {
  label: string; status: NodeStatus; leftGreen: boolean; rightGreen: boolean; showLeft: boolean; showRight: boolean;
}) {
  const circleSx = {
    width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    position: 'relative', zIndex: 1, color: '#fff',
    ...(status === 'done' ? { bgcolor: GREEN }
      : status === 'current' ? { bgcolor: PURPLE, boxShadow: '0 0 0 4px #EDEBF7' }
        : { bgcolor: 'rgba(0,0,0,0.10)', color: 'text.disabled' }),
  } as const;
  const line = (green: boolean, side: 'left' | 'right') => ({
    position: 'absolute', top: 11, [side]: '50%', width: '100%', height: 2,
    bgcolor: green ? GREEN : LINE_FUTURE,
  } as const);
  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
      {showLeft && <Box sx={line(leftGreen, 'left')} />}
      {showRight && <Box sx={line(rightGreen, 'right')} />}
      <Box sx={circleSx}>
        {status === 'done' ? <CheckIcon sx={{ fontSize: 14 }} />
          : status === 'current' ? <CircleIcon sx={{ fontSize: 10 }} />
            : <LockIcon sx={{ fontSize: 12 }} />}
      </Box>
      <Typography sx={{
        fontSize: 11, mt: 0.75, textAlign: 'center',
        color: status === 'current' ? PURPLE_DK : 'text.secondary',
        fontWeight: status === 'current' ? 600 : 400,
      }}>{label}</Typography>
      {status === 'current' && <Typography sx={{ fontSize: 10, color: PURPLE_DK }}>you are here</Typography>}
    </Box>
  );
}

export default function JourneyGuide(props: JourneyGuideProps) {
  const stage = currentStage(props);
  const hero = buildHero(stage, props);

  return (
    <Box sx={{ mb: 2 }}>
      {/* Journey spine */}
      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: '16px 18px 14px', mb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
          {STAGES.map((label, i) => {
            const status: NodeStatus = i < stage ? 'done' : i === stage ? 'current' : 'future';
            return (
              <SpineNode
                key={label}
                label={label}
                status={status}
                showLeft={i > 0}
                showRight={i < STAGES.length - 1}
                leftGreen={i <= stage}
                rightGreen={i < stage}
              />
            );
          })}
        </Box>
      </Box>

      {/* Condensed next-best-action bar */}
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1.75, flexWrap: 'wrap',
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
    </Box>
  );
}
