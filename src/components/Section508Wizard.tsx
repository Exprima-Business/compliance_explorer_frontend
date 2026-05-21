import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Step,
  StepLabel,
  Stepper,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import {
  applyScoping,
  saveScoping,
  type ProgramScoping,
  type ScopingAnswers,
  type ScopingApplyResult,
} from '../services/controlService';
import { extractErrorMessage } from '../utils/errorUtils';

// ─────────────────────────────────────────────────────────────────────────────
// Question definitions — every question cites the CFR paragraph that
// authorizes it (standing principle #1: we never invent scoping).
// ─────────────────────────────────────────────────────────────────────────────

type QuestionKind = 'yes_no' | 'multi_select';

interface MultiOption {
  /** Condition key this option toggles when selected. */
  key: string;
  label: string;
}

interface WizardQuestion {
  id: string;
  /** Plain-text question shown to the user. */
  prompt: string;
  /** Verbatim CFR text shown in the "why are we asking?" tooltip + expand. */
  cfrText: string;
  cfrCite: string;
  kind: QuestionKind;
  /** For yes_no — which condition key the answer sets. */
  conditionKey?: string;
  /** For multi_select — the available choices, each setting its own key. */
  options?: MultiOption[];
  /**
   * Only show this question when the predicate over the current answers
   * passes. Used for hardware sub-questions that are only relevant when
   * Q1 = yes.
   */
  showWhen?: (answers: ScopingAnswers) => boolean;
}

const QUESTIONS: WizardQuestion[] = [
  {
    id: 'hardware',
    prompt: 'Does your ICT include any hardware components with a user interface or that transmit information?',
    cfrText: '"Where components of ICT are hardware and transmit information or have a user interface, such components shall conform to the requirements in Chapter 4."',
    cfrCite: '36 CFR §1194 Appendix B, E206.1',
    kind: 'yes_no',
    conditionKey: 'hardware',
  },
  {
    id: 'software_ui',
    prompt: 'Does your ICT include software components with a user interface or that transmit information?',
    cfrText: '"Where components of ICT are software and transmit information or have a user interface, such components shall conform to E207 and the requirements in Chapter 5."',
    cfrCite: '36 CFR §1194 Appendix B, E207.1',
    kind: 'yes_no',
    conditionKey: 'software_ui',
  },
  {
    id: 'electronic_content',
    prompt: 'Does your ICT include electronic content? Select all that apply.',
    cfrText: '"Electronic content that is public facing shall conform to the accessibility requirements specified in E205.4." (E205.2)\n\n"Electronic content that is not public facing shall conform to the accessibility requirements specified in E205.4 when such content constitutes official business and is communicated by an agency through emergency notifications, administrative decisions, program/policy announcements, notices of benefits, formal acknowledgements, surveys, templates/forms, educational materials, or intranet pages designed as Web pages." (E205.3)',
    cfrCite: '36 CFR §1194 Appendix B, E205.2 / E205.3',
    kind: 'multi_select',
    options: [
      { key: 'electronic_content_public', label: 'Public-facing content (websites, public apps, public documents)' },
      { key: 'electronic_content_official', label: 'Internal / official agency communications (intranet, official notices, training materials)' },
    ],
  },
  {
    id: 'support_docs_or_services',
    prompt: 'Will your contract include support documentation (manuals, help, FAQs) or support services (help desk, training, automated self-service)?',
    cfrText: '"Where an agency provides support documentation or services for ICT, such documentation and services shall conform to the requirements in Chapter 6."',
    cfrCite: '36 CFR §1194 Appendix B, E208.1',
    kind: 'yes_no',
    conditionKey: 'support_docs_or_services',
  },
  {
    id: 'authoring_tool',
    prompt: 'Is any of your ICT an authoring tool (an application used to create or edit content)?',
    cfrText: '"Where an application is an authoring tool, the application shall conform to 504 to the extent that information required for accessibility is supported by the destination format."',
    cfrCite: '36 CFR §1194 Appendix C, 504.1',
    kind: 'yes_no',
    conditionKey: 'authoring_tool',
  },
  // ── Hardware sub-questions (Q1 = yes only) ────────────────────────────────
  {
    id: 'two_way_voice',
    prompt: 'Does your hardware include two-way voice communication (phones, video calls, intercoms)?',
    cfrText: '"ICT that provides two-way voice communication shall conform to 412."',
    cfrCite: '36 CFR §1194 Appendix C, 412.1',
    kind: 'yes_no',
    conditionKey: 'two_way_voice',
    showWhen: (a) => a.hardware === true,
  },
  {
    id: 'video_with_sync_audio',
    prompt: 'Does your hardware display or process video with synchronized audio (media playback, captioned video, DTV tuners)?',
    cfrText: '"Where ICT displays or processes video with synchronized audio, ICT shall provide closed caption processing technology..." (413.1)\n"...audio description processing technology..." (414.1)\n"...user controls for closed captions and audio descriptions..." (415.1)',
    cfrCite: '36 CFR §1194 Appendix C, 413.1 / 414.1 / 415.1',
    kind: 'yes_no',
    conditionKey: 'video_with_sync_audio',
    showWhen: (a) => a.hardware === true,
  },
  {
    id: 'closed_functionality',
    prompt: 'Does your hardware have closed functionality — meaning users cannot attach or install their own assistive technology (e.g. ATMs, kiosks, ticket machines)?',
    cfrText: '"ICT with closed functionality shall be operable without requiring the user to attach or install assistive technology other than personal headsets or other audio couplers, and shall conform to 402."',
    cfrCite: '36 CFR §1194 Appendix C, 402.1',
    kind: 'yes_no',
    conditionKey: 'closed_functionality',
    showWhen: (a) => a.hardware === true,
  },
  {
    id: 'biometrics',
    prompt: 'Does your hardware use biometrics (fingerprint, face, voice) for identification or control?',
    cfrText: '"Where provided, biometrics shall not be the only means for user identification or control."',
    cfrCite: '36 CFR §1194 Appendix C, 403.1',
    kind: 'yes_no',
    conditionKey: 'biometrics',
    showWhen: (a) => a.hardware === true,
  },
  {
    id: 'data_connections',
    prompt: 'Does your hardware include data connections (USB, network, peripheral ports) used for input or output?',
    cfrText: '"Where data connections used for input and output are provided, at least one of each type of connection shall conform to industry standard non-proprietary formats."',
    cfrCite: '36 CFR §1194 Appendix C, 406.1',
    kind: 'yes_no',
    conditionKey: 'data_connections',
    showWhen: (a) => a.hardware === true,
  },
  {
    id: 'display_screens',
    prompt: 'Does your hardware have display screens?',
    cfrText: '"Where provided, display screens shall conform to 408."',
    cfrCite: '36 CFR §1194 Appendix C, 408.1',
    kind: 'yes_no',
    conditionKey: 'display_screens',
    showWhen: (a) => a.hardware === true,
  },
  {
    id: 'stationary_hardware',
    prompt: 'Is the hardware stationary (mounted to a fixed location), as opposed to portable or handheld?',
    cfrText: '"At least one of each type of operable part of stationary ICT shall be at a height conforming to 407.8.2 or 407.8.3 ... for a side reach or a forward reach."',
    cfrCite: '36 CFR §1194 Appendix C, 407.8',
    kind: 'yes_no',
    conditionKey: 'stationary_hardware',
    showWhen: (a) => a.hardware === true,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface Section508WizardProps {
  open: boolean;
  frameworkId: string;
  /** Existing saved answers, if any — pre-populates the form on re-runs. */
  initialAnswers?: ScopingAnswers | null;
  onClose: () => void;
  /** Called after a successful apply with the change summary. */
  onApplied: (result: ScopingApplyResult) => void;
}

export const Section508Wizard: React.FC<Section508WizardProps> = ({
  open,
  frameworkId,
  initialAnswers,
  onClose,
  onApplied,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [answers, setAnswers] = useState<ScopingAnswers>(() => initialAnswers ?? {});
  const [stepIdx, setStepIdx] = useState(0);
  const [showCfr, setShowCfr] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state every time the dialog re-opens.
  React.useEffect(() => {
    if (open) {
      setAnswers(initialAnswers ?? {});
      setStepIdx(0);
      setError(null);
      setShowCfr(false);
    }
  }, [open, initialAnswers]);

  // Visible questions — filter by showWhen predicate on current answers.
  const visibleQuestions = useMemo(
    () => QUESTIONS.filter(q => !q.showWhen || q.showWhen(answers)),
    [answers],
  );

  // Total step count = visible questions + 1 summary step.
  const totalSteps = visibleQuestions.length + 1;
  const isSummaryStep = stepIdx === visibleQuestions.length;
  const currentQuestion = !isSummaryStep ? visibleQuestions[stepIdx] : null;

  // ── Answer handlers ─────────────────────────────────────────────────────
  const setYesNo = (key: string, value: boolean) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  };
  const toggleMulti = (key: string) => {
    setAnswers(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const currentAnswered = useMemo(() => {
    if (!currentQuestion) return true;
    if (currentQuestion.kind === 'yes_no') {
      const k = currentQuestion.conditionKey!;
      return answers[k] === true || answers[k] === false;
    }
    // multi_select: "answered" just means user clicked Continue — selecting nothing
    // is a valid answer (meaning none of the categories apply).
    return true;
  }, [currentQuestion, answers]);

  // ── Submit ──────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      // Normalise: every condition key referenced by the visible questions
      // should be a boolean. Missing keys (e.g. hardware sub-questions when
      // hardware=false) default to false.
      const normalised: ScopingAnswers = {};
      for (const q of QUESTIONS) {
        if (q.kind === 'yes_no' && q.conditionKey) {
          normalised[q.conditionKey] = answers[q.conditionKey] === true;
        } else if (q.kind === 'multi_select' && q.options) {
          for (const opt of q.options) normalised[opt.key] = answers[opt.key] === true;
        }
      }

      const saved = await saveScoping(frameworkId, normalised);
      if (!saved) {
        setError('Could not save scoping. Try again.');
        return;
      }
      const result = await applyScoping(frameworkId);
      if (!result) {
        setError('Saved your answers, but could not apply them to your controls. Try again.');
        return;
      }
      onApplied(result);
    } catch (err: any) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render helpers ──────────────────────────────────────────────────────
  const renderQuestion = (q: WizardQuestion) => (
    <Box>
      <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
        Question {stepIdx + 1} of {visibleQuestions.length}
      </Typography>
      <Typography variant={isMobile ? 'h6' : 'h5'} sx={{ fontWeight: 600, mb: 2 }}>
        {q.prompt}
      </Typography>

      {/* Why we ask — collapsible quote of the CFR paragraph */}
      <Box sx={{
        bgcolor: 'action.hover',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        p: 1.5,
        mb: 3,
      }}>
        <Box
          sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }}
          onClick={() => setShowCfr(v => !v)}
        >
          <InfoOutlinedIcon fontSize="small" color="action" />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Why we ask this — {q.cfrCite}
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Typography variant="caption" color="primary">
            {showCfr ? 'Hide' : 'Show'}
          </Typography>
        </Box>
        {showCfr && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 1, whiteSpace: 'pre-wrap', fontStyle: 'italic', pl: 3 }}
          >
            {q.cfrText}
          </Typography>
        )}
      </Box>

      {/* Answer controls */}
      {q.kind === 'yes_no' && (
        <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
          {(['yes', 'no'] as const).map(label => {
            const value = label === 'yes';
            const selected = answers[q.conditionKey!] === value;
            return (
              <Button
                key={label}
                variant={selected ? 'contained' : 'outlined'}
                color={selected ? 'primary' : 'inherit'}
                size="large"
                onClick={() => setYesNo(q.conditionKey!, value)}
                sx={{ minWidth: 140, py: 1.5, fontSize: '1rem' }}
              >
                {label === 'yes' ? 'Yes' : 'No'}
              </Button>
            );
          })}
        </Box>
      )}

      {q.kind === 'multi_select' && q.options && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {q.options.map(opt => {
            const selected = answers[opt.key] === true;
            return (
              <Button
                key={opt.key}
                variant={selected ? 'contained' : 'outlined'}
                color={selected ? 'primary' : 'inherit'}
                onClick={() => toggleMulti(opt.key)}
                sx={{ justifyContent: 'flex-start', textAlign: 'left', textTransform: 'none', py: 1.25 }}
                startIcon={
                  <Box
                    sx={{
                      width: 18, height: 18, borderRadius: 0.5,
                      border: '2px solid',
                      borderColor: selected ? 'primary.contrastText' : 'divider',
                      bgcolor: selected ? 'primary.contrastText' : 'transparent',
                    }}
                  />
                }
              >
                {opt.label}
              </Button>
            );
          })}
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
            Select all that apply, or none if your ICT does not include electronic content.
          </Typography>
        </Box>
      )}
    </Box>
  );

  const renderSummary = () => {
    const positiveAnswers = QUESTIONS
      .flatMap(q => {
        if (q.kind === 'yes_no' && q.conditionKey && answers[q.conditionKey]) {
          return [{ key: q.conditionKey, label: shortLabel(q.conditionKey) }];
        }
        if (q.kind === 'multi_select' && q.options) {
          return q.options.filter(o => answers[o.key]).map(o => ({ key: o.key, label: o.label }));
        }
        return [];
      });
    return (
      <Box>
        <Typography variant={isMobile ? 'h6' : 'h5'} sx={{ fontWeight: 600, mb: 2 }}>
          Review &amp; apply
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          We will use your answers to mark controls that don't apply to your ICT
          as <strong>Not Applicable</strong>. Controls you've already evaluated
          (Supports / Partially Supports / Does Not Support) are not touched —
          your evidence is preserved.
        </Typography>
        <Divider sx={{ my: 1.5 }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
          Your ICT includes:
        </Typography>
        {positiveAnswers.length === 0 ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            You answered "no" to every question — applying will mark essentially
            every Section 508 control Not Applicable. Double-check your answers
            before continuing.
          </Alert>
        ) : (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2 }}>
            {positiveAnswers.map(p => (
              <Chip key={p.key} label={p.label} color="primary" size="small" />
            ))}
          </Box>
        )}
        <Alert severity="info" sx={{ mt: 1 }}>
          You can re-run the wizard anytime to update your scoping. Existing
          assessments are preserved across re-runs.
        </Alert>
      </Box>
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', pr: 6 }}>
        <Box sx={{ flex: 1 }}>
          Section 508 Applicability
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 400 }}>
            Determine which Revised 508 Standards apply to your ICT
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          disabled={submitting}
          sx={{ position: 'absolute', right: 8, top: 12 }}
          aria-label="Close wizard"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {/* Stepper — collapsed to dots on mobile */}
        {!isMobile && (
          <Stepper activeStep={stepIdx} alternativeLabel sx={{ mb: 3, mt: 1 }}>
            {visibleQuestions.map(q => (
              <Step key={q.id}>
                <StepLabel></StepLabel>
              </Step>
            ))}
            <Step key="summary">
              <StepLabel>Review</StepLabel>
            </Step>
          </Stepper>
        )}
        {isMobile && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2, textAlign: 'center' }}>
            Step {stepIdx + 1} of {totalSteps}
          </Typography>
        )}

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {currentQuestion ? renderQuestion(currentQuestion) : renderSummary()}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button
          onClick={() => setStepIdx(i => Math.max(0, i - 1))}
          disabled={stepIdx === 0 || submitting}
        >
          Back
        </Button>
        <Box sx={{ flex: 1 }} />
        {!isSummaryStep ? (
          <Button
            variant="contained"
            onClick={() => setStepIdx(i => i + 1)}
            disabled={!currentAnswered}
          >
            Continue
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {submitting ? 'Applying…' : 'Apply scoping'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

/** Friendly chip label for a condition key, used in the summary step. */
function shortLabel(key: string): string {
  switch (key) {
    case 'hardware': return 'Hardware';
    case 'software_ui': return 'Software with UI';
    case 'electronic_content_public': return 'Public-facing content';
    case 'electronic_content_official': return 'Official communications';
    case 'support_docs_or_services': return 'Support docs / services';
    case 'authoring_tool': return 'Authoring tool';
    case 'two_way_voice': return 'Two-way voice';
    case 'video_with_sync_audio': return 'Video with synced audio';
    case 'closed_functionality': return 'Closed functionality';
    case 'biometrics': return 'Biometrics';
    case 'data_connections': return 'Data connections';
    case 'display_screens': return 'Display screens';
    case 'stationary_hardware': return 'Stationary hardware';
    default: return key;
  }
}
