import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  IconButton,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import ReplayIcon from '@mui/icons-material/Replay';
import ListAltIcon from '@mui/icons-material/ListAlt';
import type { CuratedBundle } from '../services/onboardingService';

/**
 * FrameworkQuestionnaire — a 6-question guided picker for SMB federal
 * contractors who don't know which bundle applies to them.
 *
 * UX: one question per step (yes / no / skip), explainer expandable on each
 * question, scoring map computed on the fly. Results step shows the
 * recommended bundle(s) ranked, with a one-click apply or fall-back to the
 * manual browse view.
 *
 * Scoring: each "yes" adds points to relevant bundles. The bundle with the
 * highest score is the recommendation; ties show all top scorers. If the
 * user says no/skip to everything, we fall back to suggesting the catch-all
 * cyber-program-baseline.
 *
 * Data source: receives bundles from the parent (already loaded via
 * onboardingService.listBundles). No new BE call needed.
 *
 * Question-to-bundle mapping is hardcoded here rather than derived from
 * bundle.signals to keep the recommendation logic precise and reviewable.
 * Changing it = product decision, not data-config.
 */

interface FrameworkQuestionnaireProps {
  bundles: CuratedBundle[];
  /** Called when the user picks a recommended bundle to apply. */
  onPickBundle: (bundleId: string) => void;
  /** Called when the user wants to switch to manual browse mode. */
  onSwitchToBrowse: () => void;
  /** True while a bundle apply is in flight (parent-managed). */
  applying: boolean;
}

type Answer = 'yes' | 'no' | 'skip';

interface Question {
  id: string;
  text: string;
  explainer: string;
  /** Bundle IDs to award points to on "yes", with weight. */
  awards: Array<{ bundleId: string; weight: number }>;
}

const QUESTIONS: Question[] = [
  {
    id: 'dod',
    text: 'Do you sell to or contract with the U.S. Department of Defense (or a DoD prime)?',
    explainer:
      'DoD contracts almost always carry DFARS cyber clauses (252.204-7012/7019/7020/7021). Most DoD work eventually requires CMMC Level 2 certification by the 2026 cutoff.',
    awards: [
      { bundleId: 'defense-sub-starter', weight: 2 },
    ],
  },
  {
    id: 'cui',
    text: 'Do you handle Controlled Unclassified Information (CUI) for any federal customer?',
    explainer:
      'CUI is unclassified-but-sensitive federal information. Handling CUI triggers NIST 800-171 obligations and, for DoD work, CMMC L2 certification. If your contracts say "FCI" or "CUI" — yes.',
    awards: [
      { bundleId: 'defense-sub-starter', weight: 3 },
    ],
  },
  {
    id: 'phi',
    text: 'Do you handle Protected Health Information (PHI) or sign Business Associate Agreements (BAAs)?',
    explainer:
      'PHI handling triggers the HIPAA Security Rule. Common scenarios: health-IT vendors, EHR providers, claims processors, anyone with an HHS / VA / IHS customer. If you have a BAA — yes.',
    awards: [
      { bundleId: 'health-it-contractor', weight: 3 },
    ],
  },
  {
    id: 'gsa-civilian',
    text: 'Do you have a GSA Schedule contract, or sell ICT products to federal civilian agencies?',
    explainer:
      'GSA Schedule contracts and federal civilian ICT sales trigger Section 508 accessibility obligations and typically a FISMA-Moderate posture (NIST 800-53 Moderate baseline).',
    awards: [
      { bundleId: 'gsa-schedule-holder', weight: 2 },
    ],
  },
  {
    id: 'software-fed',
    text: 'Do you develop or sell software to federal customers?',
    explainer:
      'EO 14028 and OMB M-22-18 require federal software vendors to self-attest to the NIST Secure Software Development Framework (SSDF). The CISA Secure Software Development Attestation Form is the artifact.',
    awards: [
      { bundleId: 'software-developer-ssdf', weight: 2 },
    ],
  },
  {
    id: 'enterprise-baseline',
    text: 'Are you building an enterprise cybersecurity program before pursuing specific federal verticals?',
    explainer:
      'If you don\'t have a federal contract yet but want to be ready, the NIST Cybersecurity Framework v2.0 organizes a baseline you can build against. Useful for pre-CMMC posture-building or general FISMA-Moderate readiness.',
    awards: [
      { bundleId: 'cyber-program-baseline', weight: 2 },
    ],
  },
];

const FALLBACK_BUNDLE_ID = 'cyber-program-baseline';

export const FrameworkQuestionnaire: React.FC<FrameworkQuestionnaireProps> = ({
  bundles,
  onPickBundle,
  onSwitchToBrowse,
  applying,
}) => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const total = QUESTIONS.length;
  const isDone = step >= total;
  const progress = Math.min((step / total) * 100, 100);

  const toggleExplainer = (qId: string) =>
    setExpanded(prev => ({ ...prev, [qId]: !prev[qId] }));

  const answerAndAdvance = (answer: Answer) => {
    const current = QUESTIONS[step];
    if (!current) return;
    setAnswers(prev => ({ ...prev, [current.id]: answer }));
    setStep(s => s + 1);
  };

  const restart = () => {
    setStep(0);
    setAnswers({});
    setExpanded({});
  };

  // ── Scoring ────────────────────────────────────────────────────────────────
  const scores = useMemo(() => {
    const map: Record<string, number> = {};
    for (const q of QUESTIONS) {
      if (answers[q.id] === 'yes') {
        for (const award of q.awards) {
          map[award.bundleId] = (map[award.bundleId] ?? 0) + award.weight;
        }
      }
    }
    return map;
  }, [answers]);

  const ranked = useMemo(() => {
    const withScore = bundles
      .map(b => ({ bundle: b, score: scores[b.id] ?? 0 }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score);
    if (withScore.length > 0) return withScore;
    // Nothing matched — recommend the catch-all + offer browse.
    const fallback = bundles.find(b => b.id === FALLBACK_BUNDLE_ID);
    return fallback ? [{ bundle: fallback, score: 0 }] : [];
  }, [bundles, scores]);

  const allNo = Object.values(answers).every(a => a !== 'yes') && Object.keys(answers).length === total;

  // ── Render ─────────────────────────────────────────────────────────────────
  if (!isDone) {
    const q = QUESTIONS[step];
    return (
      <Card variant="outlined">
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Stack spacing={2}>
            <Box>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                  Question {step + 1} of {total}
                </Typography>
                <Button
                  size="small"
                  startIcon={<ListAltIcon />}
                  onClick={onSwitchToBrowse}
                  sx={{ textTransform: 'none' }}
                >
                  Skip to browse all bundles
                </Button>
              </Stack>
              <LinearProgress variant="determinate" value={progress} sx={{ borderRadius: 1, height: 6 }} />
            </Box>

            <Stack direction="row" alignItems="flex-start" spacing={1}>
              <Typography variant="h6" sx={{ flex: 1, fontWeight: 600 }}>
                {q.text}
              </Typography>
              <IconButton
                size="small"
                onClick={() => toggleExplainer(q.id)}
                aria-label="Why we ask"
              >
                <HelpOutlineIcon fontSize="small" />
              </IconButton>
            </Stack>

            <Collapse in={!!expanded[q.id]}>
              <Alert severity="info" variant="outlined" sx={{ mb: 1 }}>
                {q.explainer}
              </Alert>
            </Collapse>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button
                variant="contained"
                color="primary"
                size="large"
                onClick={() => answerAndAdvance('yes')}
                sx={{ flex: 1, py: 1.5 }}
              >
                Yes
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={() => answerAndAdvance('no')}
                sx={{ flex: 1, py: 1.5 }}
              >
                No
              </Button>
              <Button
                variant="text"
                size="large"
                onClick={() => answerAndAdvance('skip')}
                sx={{ flex: { xs: 1, sm: 0.5 }, py: 1.5 }}
              >
                Not sure
              </Button>
            </Stack>

            {step > 0 && (
              <Box>
                <Button
                  size="small"
                  onClick={() => setStep(s => Math.max(0, s - 1))}
                  sx={{ textTransform: 'none' }}
                >
                  ← Back
                </Button>
              </Box>
            )}
          </Stack>
        </CardContent>
      </Card>
    );
  }

  // Results
  const topScore = ranked[0]?.score ?? 0;
  const topTier = ranked.filter(r => r.score === topScore && r.score > 0);
  const others = ranked.filter(r => !topTier.includes(r));

  return (
    <Stack spacing={2}>
      <Card variant="outlined">
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <CheckCircleIcon color="success" />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {allNo
                ? 'No specific federal vertical matched yet'
                : topTier.length === 1
                  ? 'Recommended bundle'
                  : `${topTier.length} bundles look right`}
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {allNo
              ? "We'll recommend a general cybersecurity baseline you can build on. You can refine your selection later."
              : 'Based on your answers, the bundle(s) below activate the frameworks you need. Click Apply to track them.'}
          </Typography>
        </CardContent>
      </Card>

      {topTier.map(({ bundle, score }) => (
        <BundleRecommendationCard
          key={bundle.id}
          bundle={bundle}
          score={score}
          tier="primary"
          onApply={() => onPickBundle(bundle.id)}
          applying={applying}
        />
      ))}

      {others.length > 0 && (
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, mt: 2 }}>
            Other bundles that partially matched
          </Typography>
          <Stack spacing={1}>
            {others.map(({ bundle, score }) => (
              <BundleRecommendationCard
                key={bundle.id}
                bundle={bundle}
                score={score}
                tier="secondary"
                onApply={() => onPickBundle(bundle.id)}
                applying={applying}
              />
            ))}
          </Stack>
        </Box>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1 }}>
        <Button
          variant="outlined"
          startIcon={<ReplayIcon />}
          onClick={restart}
          sx={{ textTransform: 'none' }}
        >
          Take quiz again
        </Button>
        <Button
          variant="outlined"
          startIcon={<ListAltIcon />}
          onClick={onSwitchToBrowse}
          sx={{ textTransform: 'none' }}
        >
          Browse all bundles
        </Button>
      </Stack>
    </Stack>
  );
};

// ─── Sub-component ────────────────────────────────────────────────────────────

interface RecCardProps {
  bundle: CuratedBundle;
  score: number;
  tier: 'primary' | 'secondary';
  onApply: () => void;
  applying: boolean;
}

const BundleRecommendationCard: React.FC<RecCardProps> = ({ bundle, score, tier, onApply, applying }) => (
  <Card
    variant="outlined"
    sx={{
      borderColor: tier === 'primary' ? 'primary.main' : 'divider',
      borderWidth: tier === 'primary' ? 2 : 1,
    }}
  >
    <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'flex-start' }}>
        <Box sx={{ flex: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5, flexWrap: 'wrap' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {bundle.title}
            </Typography>
            {score > 0 && (
              <Chip
                size="small"
                label={`Match score: ${score}`}
                color={tier === 'primary' ? 'primary' : 'default'}
                variant={tier === 'primary' ? 'filled' : 'outlined'}
              />
            )}
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            {bundle.persona}
          </Typography>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            {bundle.description}
          </Typography>
          <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
            {bundle.resolvedFrameworks.map(f => (
              <Chip
                key={`${f.name}-${f.version}`}
                size="small"
                label={f.shortLabel}
                variant="outlined"
                // Grey out frameworks not yet loaded in this environment
                color={f.frameworkId ? 'default' : 'default'}
                sx={{ opacity: f.frameworkId ? 1 : 0.5 }}
              />
            ))}
          </Stack>
        </Box>
        <Button
          variant={tier === 'primary' ? 'contained' : 'outlined'}
          onClick={onApply}
          disabled={applying}
          startIcon={applying ? <CircularProgress size={16} color="inherit" /> : undefined}
          sx={{ alignSelf: { sm: 'center' }, minWidth: 140 }}
        >
          {applying ? 'Applying…' : 'Apply this bundle'}
        </Button>
      </Stack>
    </CardContent>
  </Card>
);
