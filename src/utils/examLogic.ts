export type ExamProfileId =
  | 'USMLE_STEP_1'
  | 'USMLE_STEP_2'
  | 'ABIM'
  | 'AMC'
  | 'MCPS'
  | 'CUSTOM';

export interface ExamProfile {
  id: ExamProfileId;
  name: string;
  shortCode: string;
  organization: string;
  description: string;
  standardTotalQuestions: number;
  questionsPerBlock: number;
  blockDurationMinutes: number;
  tutorialMinutes: number;
  standardBreakMinutes: number;
  standardBlocks: number;
  regulationSummary: string;
}

export interface BlockSpec {
  blockNumber: number;
  questionCount: number;
  durationMinutes: number;
  durationSeconds: number;
}

export interface CalculatedExamPlan {
  profile: ExamProfile;
  examTitle: string;
  totalQuestions: number;
  numBlocks: number;
  questionsPerBlock: number;
  blockDurationMinutes: number;
  tutorialMinutes: number;
  totalBreakMinutes: number;
  totalBlockMinutes: number;
  totalExamMinutes: number;
  totalExamHoursFormatted: string;
  secondsPerQuestion: number;
  recommendedBreakPerIntervalMinutes: number;
  blocks: BlockSpec[];
}

export const DEFAULT_DECISION_TIMEOUT_SECONDS = 60;

export const EXAM_PROFILES: Record<ExamProfileId, ExamProfile> = {
  USMLE_STEP_1: {
    id: 'USMLE_STEP_1',
    name: 'USMLE Step 1',
    shortCode: 'Step 1',
    organization: 'NBME / FSMB',
    description: 'Standard 8-hour simulation: 14 blocks of 30 minutes each, 5-minute tutorial, and 55-minute break pool.',
    standardTotalQuestions: 280,
    questionsPerBlock: 20,
    blockDurationMinutes: 30,
    tutorialMinutes: 5,
    standardBreakMinutes: 55,
    standardBlocks: 14,
    regulationSummary: '14 blocks × 30 min (420 min) + 5 min tutorial + 55 min break = 8h 00m total',
  },
  USMLE_STEP_2: {
    id: 'USMLE_STEP_2',
    name: 'USMLE Step 2 CK',
    shortCode: 'Step 2 CK',
    organization: 'NBME / FSMB',
    description: 'Clinical Knowledge 9-hour standard: up to 8 blocks of 60 minutes, 15-minute tutorial, and 45-minute break pool.',
    standardTotalQuestions: 320,
    questionsPerBlock: 40,
    blockDurationMinutes: 60,
    tutorialMinutes: 15,
    standardBreakMinutes: 45,
    standardBlocks: 8,
    regulationSummary: '8 blocks × 60 min (480 min) + 15 min tutorial + 45 min break = 9h 00m total',
  },
  ABIM: {
    id: 'ABIM',
    name: 'ABIM Internal Medicine',
    shortCode: 'ABIM',
    organization: 'American Board of Internal Medicine',
    description: 'Certification exam regulation: 4 sessions of up to 60 questions (120 min each), 10-minute tutorial, 100-minute break bank.',
    standardTotalQuestions: 240,
    questionsPerBlock: 60,
    blockDurationMinutes: 120,
    tutorialMinutes: 10,
    standardBreakMinutes: 100,
    standardBlocks: 4,
    regulationSummary: '4 blocks × 120 min (480 min) + 10 min tutorial + 100 min break = 9h 50m total',
  },
  AMC: {
    id: 'AMC',
    name: 'AMC CAT MCQ',
    shortCode: 'AMC CAT',
    organization: 'Australian Medical Council',
    description: 'Computer Adaptive Testing format: 150 scored MCQs segmented into 5 pacing blocks of 30 questions (42 min/block).',
    standardTotalQuestions: 150,
    questionsPerBlock: 30,
    blockDurationMinutes: 42,
    tutorialMinutes: 10,
    standardBreakMinutes: 20,
    standardBlocks: 5,
    regulationSummary: '5 blocks × 42 min (210 min) + 10 min tutorial + 20 min break = 4h 00m total',
  },
  MCPS: {
    id: 'MCPS',
    name: 'MCPS Written Exam',
    shortCode: 'MCPS',
    organization: 'CPSP Postgraduate Examination',
    description: 'Membership exam format: 200 single-best-answer questions across 4 timed blocks of 45 minutes with 30-minute break.',
    standardTotalQuestions: 200,
    questionsPerBlock: 50,
    blockDurationMinutes: 45,
    tutorialMinutes: 10,
    standardBreakMinutes: 30,
    standardBlocks: 4,
    regulationSummary: '4 blocks × 45 min (180 min) + 10 min tutorial + 30 min break = 3h 40m total',
  },
  CUSTOM: {
    id: 'CUSTOM',
    name: 'Custom / NBME Self-Assessment',
    shortCode: 'NBME / Custom',
    organization: 'Custom Pacing Protocol',
    description: 'Flexible block and break rules tailored for NBME Forms (e.g., NBME 30, NBME 31), UWorld blocks, or custom mock exams.',
    standardTotalQuestions: 200,
    questionsPerBlock: 50,
    blockDurationMinutes: 75,
    tutorialMinutes: 5,
    standardBreakMinutes: 40,
    standardBlocks: 4,
    regulationSummary: '4 blocks × 75 min (300 min) + 5 min tutorial + 40 min break = 5h 45m total',
  },
};

export interface CustomCalculationOptions {
  examTitle?: string;
  includeTutorial?: boolean;
  customQuestionsPerBlock?: number;
  customBlockDurationMinutes?: number;
  customBreakMinutes?: number;
  customTutorialMinutes?: number;
}

export function formatMinutesToHoursAndMinutes(totalMinutes: number): string {
  const safeMin = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(safeMin / 60);
  const mins = safeMin % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h 00m`;
  return `${hours}h ${mins.toString().padStart(2, '0')}m`;
}

export function formatSecondsToClock(totalSeconds: number): string {
  const safeSec = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSec / 3600);
  const mins = Math.floor((safeSec % 3600) / 60);
  const secs = safeSec % 60;
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function calculateExamPlan(
  profileId: ExamProfileId,
  requestedQuestions: number,
  options: CustomCalculationOptions = {}
): CalculatedExamPlan {
  const profile = EXAM_PROFILES[profileId] || EXAM_PROFILES.USMLE_STEP_1;
  const totalQuestions = Math.max(1, Math.round(requestedQuestions));

  const questionsPerBlock = Math.max(
    1,
    options.customQuestionsPerBlock ?? profile.questionsPerBlock
  );
  const blockDurationMinutes = Math.max(
    1,
    options.customBlockDurationMinutes ?? profile.blockDurationMinutes
  );

  const numBlocks = Math.max(1, Math.ceil(totalQuestions / questionsPerBlock));
  const includeTutorial = options.includeTutorial ?? true;
  const tutorialMinutes = includeTutorial
    ? Math.max(0, options.customTutorialMinutes ?? profile.tutorialMinutes)
    : 0;

  // Build individual blocks
  const blocks: BlockSpec[] = [];
  let remainingQuestions = totalQuestions;

  for (let i = 1; i <= numBlocks; i++) {
    const qCount = Math.min(questionsPerBlock, remainingQuestions);
    remainingQuestions -= qCount;
    // Standard blocks have full blockDurationMinutes; if the final block has fewer questions, scale proportionally (min 1 min)
    const isFullBlock = qCount === questionsPerBlock;
    const durationMinutes = isFullBlock
      ? blockDurationMinutes
      : Math.max(1, Math.round((qCount / questionsPerBlock) * blockDurationMinutes));

    blocks.push({
      blockNumber: i,
      questionCount: qCount,
      durationMinutes,
      durationSeconds: durationMinutes * 60,
    });
  }

  const totalBlockMinutes = blocks.reduce((acc, b) => acc + b.durationMinutes, 0);

  // Calculate regulation break time
  let totalBreakMinutes: number;
  if (typeof options.customBreakMinutes === 'number' && options.customBreakMinutes >= 0) {
    totalBreakMinutes = Math.round(options.customBreakMinutes);
  } else if (numBlocks <= 1) {
    totalBreakMinutes = 0;
  } else if (numBlocks === profile.standardBlocks) {
    totalBreakMinutes = profile.standardBreakMinutes;
  } else {
    // Proportional break calculation based on standard regulation ratio
    totalBreakMinutes = Math.max(
      5,
      Math.round((numBlocks / profile.standardBlocks) * profile.standardBreakMinutes)
    );
  }

  const totalExamMinutes = totalBlockMinutes + tutorialMinutes + totalBreakMinutes;
  const secondsPerQuestion = Math.round((blockDurationMinutes * 60) / questionsPerBlock);
  const breakIntervals = Math.max(1, numBlocks - 1);
  const recommendedBreakPerIntervalMinutes =
    numBlocks > 1 ? Math.round((totalBreakMinutes / breakIntervals) * 10) / 10 : 0;

  return {
    profile,
    examTitle: options.examTitle?.trim() || `${profile.shortCode} Practice Simulation`,
    totalQuestions,
    numBlocks,
    questionsPerBlock,
    blockDurationMinutes,
    tutorialMinutes,
    totalBreakMinutes,
    totalBlockMinutes,
    totalExamMinutes,
    totalExamHoursFormatted: formatMinutesToHoursAndMinutes(totalExamMinutes),
    secondsPerQuestion,
    recommendedBreakPerIntervalMinutes,
    blocks,
  };
}

export interface PacingEvaluation {
  expectedQuestion: number;
  questionDelta: number;
  secondsRemainingPerQuestion: number;
  status: 'ahead' | 'on_track' | 'behind';
  message: string;
}

export function evaluateBlockPacing(
  currentQuestion: number,
  totalBlockQuestions: number,
  remainingBlockSeconds: number,
  totalBlockSeconds: number
): PacingEvaluation {
  const safeTotalQ = Math.max(1, totalBlockQuestions);
  const safeCurrentQ = Math.min(safeTotalQ, Math.max(1, currentQuestion));
  const elapsedSeconds = Math.max(0, totalBlockSeconds - remainingBlockSeconds);
  const secondsPerQ = totalBlockSeconds / safeTotalQ;

  const expectedQuestion = Math.min(
    safeTotalQ,
    Math.max(1, Math.floor(elapsedSeconds / secondsPerQ) + 1)
  );
  const questionDelta = safeCurrentQ - expectedQuestion;
  const remainingQuestionsCount = Math.max(1, safeTotalQ - safeCurrentQ + 1);
  const secondsRemainingPerQuestion = Math.round(remainingBlockSeconds / remainingQuestionsCount);

  let status: 'ahead' | 'on_track' | 'behind' = 'on_track';
  let message = 'On standard exam pace';

  if (questionDelta >= 2) {
    status = 'ahead';
    message = `${questionDelta} questions ahead of target pace`;
  } else if (questionDelta <= -2) {
    status = 'behind';
    message = `${Math.abs(questionDelta)} questions behind target pace`;
  }

  return {
    expectedQuestion,
    questionDelta,
    secondsRemainingPerQuestion,
    status,
    message,
  };
}

export interface DecisionResolution {
  nextPhase: 'block' | 'break' | 'completed';
  nextBlockIndex: number;
  autoContinuedWithoutBreak: boolean;
}

export function resolvePostBlockDecision(
  choice: 'take_break' | 'continue_next_block' | 'timeout_auto_continue',
  currentBlockIndex: number,
  totalBlocks: number,
  remainingBreakPoolSeconds: number
): DecisionResolution {
  const isLastBlock = currentBlockIndex >= totalBlocks - 1;
  if (isLastBlock) {
    return {
      nextPhase: 'completed',
      nextBlockIndex: currentBlockIndex,
      autoContinuedWithoutBreak: false,
    };
  }

  if (choice === 'take_break' && remainingBreakPoolSeconds > 0) {
    return {
      nextPhase: 'break',
      nextBlockIndex: currentBlockIndex + 1,
      autoContinuedWithoutBreak: false,
    };
  }

  return {
    nextPhase: 'block',
    nextBlockIndex: currentBlockIndex + 1,
    autoContinuedWithoutBreak: choice === 'timeout_auto_continue',
  };
}
