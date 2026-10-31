import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  Coffee,
  Bell,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Minus,
  FastForward,
  Flag,
  RotateCcw,
  Sliders,
  Moon,
  Sun,
  Maximize2,
  Minimize2,
  Smartphone,
  Move,
  Settings,
  X,
} from 'lucide-react';
import {
  EXAM_PROFILES,
  ExamProfileId,
  CalculatedExamPlan,
  calculateExamPlan,
  evaluateBlockPacing,
  formatSecondsToClock,
  formatMinutesToHoursAndMinutes,
  resolvePostBlockDecision,
  calculateAmoledBurnInProtection,
  DEFAULT_DECISION_TIMEOUT_SECONDS,
} from '../utils/examLogic';
import {
  AppSettings,
  ExamHistoryEntry,
} from '../utils/storageAndSeed';
import {
  playNotificationBell,
  triggerVibration,
  acquireScreenWakeLock,
  releaseScreenWakeLock,
} from '../utils/soundAndHardware';

interface ExamSetupAndTimerViewProps {
  settings: AppSettings;
  onUpdateSettings?: (next: AppSettings) => void;
  onSessionLockChange?: (locked: boolean) => void;
  onSaveSessionToHistory: (entry: ExamHistoryEntry) => void;
  onNavigateToHistory: () => void;
  initialPreset?: {
    profileId: ExamProfileId;
    examTitle: string;
    totalQuestions: number;
  } | null;
  onClearPreset?: () => void;
}

type SessionPhase =
  | 'setup'
  | 'tutorial'
  | 'block'
  | 'decision_prompt'
  | 'break'
  | 'percentile_entry';

export const ExamSetupAndTimerView: React.FC<ExamSetupAndTimerViewProps> = ({
  settings,
  onUpdateSettings,
  onSessionLockChange,
  onSaveSessionToHistory,
  onNavigateToHistory,
  initialPreset,
  onClearPreset,
}) => {
  // Configuration state
  const [selectedProfileId, setSelectedProfileId] = useState<ExamProfileId>('USMLE_STEP_1');
  const [examTitle, setExamTitle] = useState<string>('NBME 30');
  const [totalQuestions, setTotalQuestions] = useState<number>(280);
  const [includeTutorial, setIncludeTutorial] = useState<boolean>(true);
  const [showCustomOverrides, setShowCustomOverrides] = useState<boolean>(false);
  const [customBlockMinutes, setCustomBlockMinutes] = useState<string>('');
  const [customQuestionsPerBlock, setCustomQuestionsPerBlock] = useState<string>('');
  const [customBreakMinutes, setCustomBreakMinutes] = useState<string>('');

  // Apply preset from Study Schedule if clicked
  useEffect(() => {
    if (initialPreset) {
      setSelectedProfileId(initialPreset.profileId);
      setExamTitle(initialPreset.examTitle);
      setTotalQuestions(initialPreset.totalQuestions);
      setCustomBlockMinutes('');
      setCustomQuestionsPerBlock('');
      setCustomBreakMinutes('');
      if (onClearPreset) onClearPreset();
    }
  }, [initialPreset, onClearPreset]);

  // Calculate exam plan based on profile & question count
  const examPlan: CalculatedExamPlan = calculateExamPlan(selectedProfileId, totalQuestions, {
    examTitle,
    includeTutorial,
    customBlockDurationMinutes: customBlockMinutes ? Number(customBlockMinutes) : undefined,
    customQuestionsPerBlock: customQuestionsPerBlock ? Number(customQuestionsPerBlock) : undefined,
    customBreakMinutes: customBreakMinutes !== '' ? Number(customBreakMinutes) : undefined,
  });

  // Active simulation state
  const [phase, setPhase] = useState<SessionPhase>('setup');
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [currentBlockIndex, setCurrentBlockIndex] = useState<number>(0);
  const [phaseRemainingSeconds, setPhaseRemainingSeconds] = useState<number>(0);
  const [breakPoolSeconds, setBreakPoolSeconds] = useState<number>(0);
  const [initialBreakPoolSeconds, setInitialBreakPoolSeconds] = useState<number>(0);
  const [decisionRemainingSeconds, setDecisionRemainingSeconds] = useState<number>(
    DEFAULT_DECISION_TIMEOUT_SECONDS
  );
  const [currentQuestionInBlock, setCurrentQuestionInBlock] = useState<number>(1);
  const [blocksCompletedCount, setBlocksCompletedCount] = useState<number>(0);
  const [totalStudySecondsElapsed, setTotalStudySecondsElapsed] = useState<number>(0);
  const [autoContinuedCount, setAutoContinuedCount] = useState<number>(0);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [wakeLockActive, setWakeLockActive] = useState<boolean>(false);
  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState<boolean>(false);
  const [amoledShiftStep, setAmoledShiftStep] = useState<number>(0);
  const [isTimerSettingsModalOpen, setIsTimerSettingsModalOpen] = useState<boolean>(false);
  const amoledTickCounterRef = useRef<number>(0);

  // Sync lock state to parent App so navigation tabs are hidden whenever timer is active
  useEffect(() => {
    if (onSessionLockChange) {
      onSessionLockChange(phase !== 'setup');
    }
    if (phase === 'setup') {
      setIsTimerSettingsModalOpen(false);
      if (typeof document !== 'undefined' && document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      }
    }
  }, [phase, onSessionLockChange]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handleFsChange = () => {
      setIsBrowserFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleBrowserFullscreen = () => {
    if (typeof document === 'undefined') return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  // Post-exam percentile form state
  const [percentileInput, setPercentileInput] = useState<string>('82');
  const [percentCorrectInput, setPercentCorrectInput] = useState<string>('78');
  const [sessionNotesInput, setSessionNotesInput] = useState<string>('');
  const [percentileError, setPercentileError] = useState<string | null>(null);

  // Manage Screen Wake Lock while timer is active
  useEffect(() => {
    const isTimerRunning =
      (phase === 'tutorial' || phase === 'block' || phase === 'break' || phase === 'decision_prompt') &&
      !isPaused;

    if (isTimerRunning && settings.keepScreenAwake) {
      acquireScreenWakeLock().then((acquired) => setWakeLockActive(acquired));
    } else {
      releaseScreenWakeLock().then(() => setWakeLockActive(false));
    }

    return () => {
      releaseScreenWakeLock();
    };
  }, [phase, isPaused, settings.keepScreenAwake]);

  // Keep latest handlers in ref for clean 1-second interval tick
  const tickRef = useRef<() => void>(() => {});

  const handleProfileChange = (newProfileId: ExamProfileId) => {
    setSelectedProfileId(newProfileId);
    const p = EXAM_PROFILES[newProfileId];
    setTotalQuestions(p.standardTotalQuestions);
    setCustomBlockMinutes('');
    setCustomQuestionsPerBlock('');
    setCustomBreakMinutes('');
    if (newProfileId === 'USMLE_STEP_1' && !examTitle.trim()) {
      setExamTitle('NBME 30');
    }
  };

  const startExamSimulation = (skipTutorial: boolean = false) => {
    const startBreakSec = examPlan.totalBreakMinutes * 60;
    setBreakPoolSeconds(startBreakSec);
    setInitialBreakPoolSeconds(startBreakSec);
    setCurrentBlockIndex(0);
    setCurrentQuestionInBlock(1);
    setBlocksCompletedCount(0);
    setTotalStudySecondsElapsed(0);
    setAutoContinuedCount(0);
    setIsPaused(false);
    setStatusBanner(null);

    if (typeof document !== 'undefined' && !document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    }

    if (!skipTutorial && examPlan.tutorialMinutes > 0) {
      setPhase('tutorial');
      setPhaseRemainingSeconds(examPlan.tutorialMinutes * 60);
    } else {
      setPhase('block');
      setPhaseRemainingSeconds(examPlan.blocks[0].durationSeconds);
    }
  };

  const triggerBlockCompletion = (unusedSecondsRollover: number = 0) => {
    // Ring notification bell after every block
    playNotificationBell(settings.notificationTone, settings.notificationVolume);
    if (settings.vibrateDuringBreak) {
      triggerVibration([250, 120, 250]);
    }

    const updatedCompleted = blocksCompletedCount + 1;
    setBlocksCompletedCount(updatedCompleted);

    const newBreakPool = breakPoolSeconds + Math.max(0, unusedSecondsRollover);
    setBreakPoolSeconds(newBreakPool);

    const isLastBlock = currentBlockIndex >= examPlan.blocks.length - 1;
    if (isLastBlock) {
      setStatusBanner('All scheduled blocks completed. Log your percentile score below.');
      setPhase('percentile_entry');
      return;
    }

    // Prompt user whether they need a break or want to continue to next block (60s timeout)
    setDecisionRemainingSeconds(settings.autoContinueTimeoutSeconds || DEFAULT_DECISION_TIMEOUT_SECONDS);
    setPhase('decision_prompt');
    if (unusedSecondsRollover > 0) {
      setStatusBanner(
        `Block ${currentBlockIndex + 1} finished early. +${formatSecondsToClock(unusedSecondsRollover)} added to break bank.`
      );
    } else {
      setStatusBanner(`Block ${currentBlockIndex + 1} complete. Select Break or Continue within 60 seconds.`);
    }
  };

  const handleDecisionChoice = (
    choice: 'take_break' | 'continue_next_block' | 'timeout_auto_continue'
  ) => {
    const resolution = resolvePostBlockDecision(
      choice,
      currentBlockIndex,
      examPlan.blocks.length,
      breakPoolSeconds
    );

    if (resolution.nextPhase === 'completed') {
      setPhase('percentile_entry');
      return;
    }

    if (resolution.nextPhase === 'break') {
      setPhase('break');
      setIsPaused(false);
      if (settings.vibrateDuringBreak) {
        triggerVibration([150, 80, 150]);
      }
      setStatusBanner(
        `Break active before Block ${resolution.nextBlockIndex + 1}. Vibration feedback ${
          settings.vibrateDuringBreak ? 'enabled' : 'off'
        }.`
      );
      return;
    }

    // Continue directly to next block
    const nextIdx = resolution.nextBlockIndex;
    setCurrentBlockIndex(nextIdx);
    setCurrentQuestionInBlock(1);
    setPhaseRemainingSeconds(examPlan.blocks[nextIdx].durationSeconds);
    setPhase('block');
    setIsPaused(false);

    if (resolution.autoContinuedWithoutBreak) {
      setAutoContinuedCount((prev) => prev + 1);
      playNotificationBell(settings.notificationTone, settings.notificationVolume);
      setStatusBanner(
        `No response within 1 minute — automatically started Block ${nextIdx + 1} without break.`
      );
    } else {
      setStatusBanner(`Started Block ${nextIdx + 1} of ${examPlan.numBlocks}.`);
    }
  };

  const resumeBlockFromBreak = () => {
    const nextIdx = Math.min(examPlan.blocks.length - 1, currentBlockIndex + 1);
    setCurrentBlockIndex(nextIdx);
    setCurrentQuestionInBlock(1);
    setPhaseRemainingSeconds(examPlan.blocks[nextIdx].durationSeconds);
    setPhase('block');
    setIsPaused(false);
    playNotificationBell(settings.notificationTone, settings.notificationVolume);
    setStatusBanner(`Break ended. Block ${nextIdx + 1} of ${examPlan.numBlocks} is now active.`);
  };

  tickRef.current = () => {
    if (isPaused) return;

    if (settings.amoledAlwaysOnDisplay) {
      amoledTickCounterRef.current += 1;
      if (amoledTickCounterRef.current % 10 === 0) {
        setAmoledShiftStep((step) => step + 1);
      }
    }

    if (phase === 'tutorial') {
      if (phaseRemainingSeconds <= 1) {
        playNotificationBell(settings.notificationTone, settings.notificationVolume);
        setPhase('block');
        setCurrentBlockIndex(0);
        setCurrentQuestionInBlock(1);
        setPhaseRemainingSeconds(examPlan.blocks[0].durationSeconds);
        setStatusBanner('Tutorial complete. Block 1 has started.');
      } else {
        setPhaseRemainingSeconds((s) => s - 1);
      }
    } else if (phase === 'block') {
      setTotalStudySecondsElapsed((s) => s + 1);
      if (phaseRemainingSeconds <= 1) {
        triggerBlockCompletion(0);
      } else {
        setPhaseRemainingSeconds((s) => s - 1);
      }
    } else if (phase === 'decision_prompt') {
      if (decisionRemainingSeconds <= 1) {
        handleDecisionChoice('timeout_auto_continue');
      } else {
        setDecisionRemainingSeconds((s) => s - 1);
      }
    } else if (phase === 'break') {
      if (breakPoolSeconds <= 1) {
        setBreakPoolSeconds(0);
        if (settings.vibrateDuringBreak) {
          triggerVibration([300, 100, 300, 100, 300]);
        }
        resumeBlockFromBreak();
      } else {
        const nextBreakSec = breakPoolSeconds - 1;
        setBreakPoolSeconds(nextBreakSec);
        // Periodic gentle vibration pulse every 60s during break if enabled
        if (settings.vibrateDuringBreak && nextBreakSec % 60 === 0) {
          triggerVibration(120);
        }
      }
    }
  };

  useEffect(() => {
    if (phase === 'setup' || phase === 'percentile_entry') return;
    const interval = window.setInterval(() => {
      tickRef.current();
    }, 1000);
    return () => window.clearInterval(interval);
  }, [phase]);

  const handleSaveSessionScore = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedPercentile = Number(percentileInput);
    if (
      percentileInput.trim() === '' ||
      Number.isNaN(parsedPercentile) ||
      parsedPercentile < 1 ||
      parsedPercentile > 99
    ) {
      setPercentileError('Please enter a valid percentile score between 1 and 99.');
      return;
    }

    const parsedCorrect =
      percentCorrectInput.trim() !== '' && !Number.isNaN(Number(percentCorrectInput))
        ? Math.min(100, Math.max(0, Number(percentCorrectInput)))
        : undefined;

    const usedBreakMins = Math.max(
      0,
      Math.round((initialBreakPoolSeconds - breakPoolSeconds) / 60)
    );
    const studyMins = Math.max(
      1,
      Math.round(totalStudySecondsElapsed / 60) ||
        blocksCompletedCount * examPlan.blockDurationMinutes ||
        examPlan.blockDurationMinutes
    );

    const newEntry: ExamHistoryEntry = {
      id: `session-${Date.now()}`,
      examTitle: examPlan.examTitle,
      profileId: selectedProfileId,
      profileName: examPlan.profile.name,
      dateISO: new Date().toISOString().slice(0, 10),
      totalQuestions: examPlan.totalQuestions,
      blocksCompleted: Math.max(1, blocksCompletedCount),
      totalBlocksPlanned: examPlan.numBlocks,
      totalStudyMinutes: studyMins,
      breakMinutesUsed: usedBreakMins,
      percentileScore: Math.round(parsedPercentile),
      percentCorrect: parsedCorrect,
      autoContinuedBlocksCount: autoContinuedCount,
      notes:
        sessionNotesInput.trim() ||
        `Completed ${Math.max(1, blocksCompletedCount)}/${examPlan.numBlocks} blocks under ${examPlan.profile.shortCode} timing regulations.`,
    };

    onSaveSessionToHistory(newEntry);
    setPercentileError(null);
    setPhase('setup');
    onNavigateToHistory();
  };

  const activeBlock = examPlan.blocks[currentBlockIndex] || examPlan.blocks[0];
  const pacing = evaluateBlockPacing(
    currentQuestionInBlock,
    activeBlock.questionCount,
    phaseRemainingSeconds,
    activeBlock.durationSeconds
  );

  // Calculate SVG progress circle for active timer
  const currentPhaseTotalSec =
    phase === 'tutorial'
      ? Math.max(1, examPlan.tutorialMinutes * 60)
      : phase === 'break'
      ? Math.max(1, initialBreakPoolSeconds)
      : Math.max(1, activeBlock.durationSeconds);

  const currentClockSec = phase === 'break' ? breakPoolSeconds : phaseRemainingSeconds;
  const progressFraction = Math.min(1, Math.max(0, currentClockSec / currentPhaseTotalSec));
  const circleRadius = 108;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circleCircumference * (1 - progressFraction);

  const isAmoled = Boolean(settings.amoledAlwaysOnDisplay);
  const isAmoledBwTheme = settings.timerScreenTheme === 'amoled_bw';
  const isPitchBlackCanvas = isAmoled || isAmoledBwTheme;
  const amoledDimmingRatio = settings.amoledDimmingRatio ?? 45;
  const amoledState = calculateAmoledBurnInProtection(amoledShiftStep, amoledDimmingRatio);

  const handleToggleAmoledMode = () => {
    if (!onUpdateSettings) return;
    const nextAmoled = !isAmoled;
    onUpdateSettings({
      ...settings,
      amoledAlwaysOnDisplay: nextAmoled,
      keepScreenAwake: nextAmoled ? true : settings.keepScreenAwake,
    });
  };

  const handleChangeAmoledDimmingRatio = (nextRatio: number) => {
    if (!onUpdateSettings) return;
    onUpdateSettings({
      ...settings,
      amoledDimmingRatio: nextRatio,
    });
  };

  return (
    <div className="space-y-8">
      {/* SETUP VIEW */}
      {phase === 'setup' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Profile & Question Configuration */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
              <p className="text-xs font-medium text-teal-700 dark:text-teal-400">
                01. Simulation Configuration
              </p>
              <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Configure Medical Board Exam Timer
              </h1>
              <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
                Select your licensing exam profile, enter a custom assessment name (e.g., NBME 30), and set the question count to automatically compute blocks, tutorial, and break intervals.
              </p>
            </div>

            {/* 1. Exam Profile Selection */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                Select Exam Regulation Profile
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Exam Profile">
                {(Object.keys(EXAM_PROFILES) as ExamProfileId[]).map((pid) => {
                  const prof = EXAM_PROFILES[pid];
                  const isSelected = selectedProfileId === pid;
                  return (
                    <button
                      key={pid}
                      type="button"
                      onClick={() => handleProfileChange(pid)}
                      aria-pressed={isSelected}
                      className={`text-left p-4 rounded-xl border transition-colors cursor-pointer ${
                        isSelected
                          ? 'border-teal-600 bg-teal-50/60 dark:border-teal-400 dark:bg-teal-950/40'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/40 dark:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                          {prof.name}
                        </span>
                        <span className="text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap shrink-0">
                          {prof.standardBlocks} blk · {prof.blockDurationMinutes}m
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                        {prof.regulationSummary}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Custom Exam Name Input */}
            <div className="space-y-2">
              <label
                htmlFor="custom-exam-name-input"
                className="block text-sm font-semibold text-slate-900 dark:text-slate-100"
              >
                Custom Exam / Self-Assessment Name
              </label>
              <input
                id="custom-exam-name-input"
                type="text"
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
                placeholder="e.g., NBME 30, NBME 31, UWSA 2, Free 120"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-xs text-slate-500 dark:text-slate-400 mr-1">Quick presets:</span>
                {['NBME 30', 'NBME 31', 'UWSA 1', 'Free 120', 'AMC Trial 1', 'MCPS Mock A'].map(
                  (presetName) => (
                    <button
                      key={presetName}
                      type="button"
                      onClick={() => setExamTitle(presetName)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        examTitle === presetName
                          ? 'border-teal-600 bg-teal-600 text-white'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {presetName}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* 3. Number of Questions Input & Quick Presets */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="question-count-input"
                  className="block text-sm font-semibold text-slate-900 dark:text-slate-100"
                >
                  Total Number of Questions
                </label>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                  Standard for {examPlan.profile.shortCode}: {examPlan.profile.standardTotalQuestions} Qs
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  id="question-count-input"
                  type="number"
                  min={1}
                  max={600}
                  value={totalQuestions}
                  onChange={(e) => setTotalQuestions(Math.max(1, Number(e.target.value) || 1))}
                  className="w-36 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-base font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: '20 Qs (1 Blk)', val: 20 },
                    { label: '40 Qs (2 Blk)', val: 40 },
                    { label: '140 Qs (Half)', val: 140 },
                    { label: '200 Qs (NBME)', val: 200 },
                    { label: '280 Qs (Step 1 Full)', val: 280 },
                    { label: '320 Qs (Step 2 Full)', val: 320 },
                  ].map((qPreset) => (
                    <button
                      key={qPreset.val}
                      type="button"
                      onClick={() => setTotalQuestions(qPreset.val)}
                      className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        totalQuestions === qPreset.val
                          ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {qPreset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 4. Tutorial & Custom Overrides Toggle */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeTutorial}
                  onChange={(e) => setIncludeTutorial(e.target.checked)}
                  className="w-4 h-4 rounded accent-teal-600"
                />
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  Include {examPlan.profile.tutorialMinutes}-minute Exam Tutorial Block
                </span>
              </label>

              <button
                type="button"
                onClick={() => setShowCustomOverrides((prev) => !prev)}
                aria-expanded={showCustomOverrides}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline cursor-pointer whitespace-nowrap shrink-0"
              >
                <Sliders className="w-3.5 h-3.5" />
                {showCustomOverrides ? 'Hide Custom Block Overrides' : 'Customize Block Duration / Break'}
              </button>
            </div>

            {showCustomOverrides && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div>
                  <label
                    htmlFor="override-q-per-block"
                    className="block text-xs font-medium text-slate-600 dark:text-slate-400"
                  >
                    Questions per Block
                  </label>
                  <input
                    id="override-q-per-block"
                    type="number"
                    min={1}
                    max={200}
                    placeholder={`${examPlan.profile.questionsPerBlock} (Default)`}
                    value={customQuestionsPerBlock}
                    onChange={(e) => setCustomQuestionsPerBlock(e.target.value)}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label
                    htmlFor="override-block-mins"
                    className="block text-xs font-medium text-slate-600 dark:text-slate-400"
                  >
                    Block Duration (Minutes)
                  </label>
                  <input
                    id="override-block-mins"
                    type="number"
                    min={1}
                    max={240}
                    placeholder={`${examPlan.profile.blockDurationMinutes}m (Default)`}
                    value={customBlockMinutes}
                    onChange={(e) => setCustomBlockMinutes(e.target.value)}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label
                    htmlFor="override-break-mins"
                    className="block text-xs font-medium text-slate-600 dark:text-slate-400"
                  >
                    Total Break Pool (Minutes)
                  </label>
                  <input
                    id="override-break-mins"
                    type="number"
                    min={0}
                    max={300}
                    placeholder="Auto-Calculated"
                    value={customBreakMinutes}
                    onChange={(e) => setCustomBreakMinutes(e.target.value)}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono tabular-nums"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Automatic Regulation Breakdown & Start CTA */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
              <p className="text-xs font-medium text-teal-700 dark:text-teal-400">
                02. Automatic Regulation Calculation
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
                {examPlan.examTitle}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {examPlan.profile.name} · {examPlan.profile.organization}
              </p>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/80">
                <span className="text-xs text-slate-500 dark:text-slate-400">Calculated Blocks</span>
                <div className="mt-1 text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums">
                  {examPlan.numBlocks} {examPlan.numBlocks === 1 ? 'Block' : 'Blocks'}
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                  {examPlan.blockDurationMinutes} min / block ({examPlan.questionsPerBlock} Qs)
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/80">
                <span className="text-xs text-slate-500 dark:text-slate-400">Total Exam Duration</span>
                <div className="mt-1 text-2xl font-bold font-mono text-teal-700 dark:text-teal-400 tabular-nums">
                  {examPlan.totalExamHoursFormatted}
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                  {examPlan.totalExamMinutes} total minutes
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/80">
                <span className="text-xs text-slate-500 dark:text-slate-400">Allocated Break Pool</span>
                <div className="mt-1 text-xl font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums">
                  {examPlan.totalBreakMinutes} min
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                  {examPlan.tutorialMinutes} min tutorial included
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/80">
                <span className="text-xs text-slate-500 dark:text-slate-400">Question Cadence</span>
                <div className="mt-1 text-xl font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums">
                  {examPlan.secondsPerQuestion}s / Q
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                  {examPlan.totalBlockMinutes}m active testing
                </span>
              </div>
            </div>

            {/* Regulation Breakdown List */}
            <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-950/70 p-4 rounded-xl">
              <div className="font-semibold text-slate-900 dark:text-slate-200">
                Active Simulation Rules:
              </div>
              <p>
                1. <strong>Block Schedule</strong>: {examPlan.numBlocks} blocks of {examPlan.blockDurationMinutes}m each ({examPlan.totalBlockMinutes}m) + {examPlan.tutorialMinutes}m tutorial + {examPlan.totalBreakMinutes}m break = {examPlan.totalExamHoursFormatted}.
              </p>
              <p>
                2. <strong>Post-Block Bell & 1-Minute Auto-Advance</strong>: After every block, the notification bell rings and prompts whether to take a break or continue. If unanswered within 60 seconds, the next block starts automatically without a break.
              </p>
              <p>
                3. <strong>Hardware Protection</strong>: Screen Wake Lock ({settings.keepScreenAwake ? 'Enabled' : 'Disabled'}) and Break Vibration ({settings.vibrateDuringBreak ? 'Enabled' : 'Disabled'}).
              </p>
            </div>

            {/* Primary CTA Buttons */}
            <div className="space-y-3 pt-1">
              <button
                type="button"
                onClick={() => startExamSimulation(false)}
                className="w-full py-3.5 px-6 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                Start Exam Simulation ({examPlan.totalExamHoursFormatted})
              </button>

              {examPlan.tutorialMinutes > 0 && (
                <button
                  type="button"
                  onClick={() => startExamSimulation(true)}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  Skip {examPlan.tutorialMinutes}m Tutorial & Start Block 1 Immediately
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE EXAM TIMER VIEW (Full-Screen Locked Exam Mode — No Top Bar, Only Top-Right Controls) */}
      {(phase === 'tutorial' || phase === 'block' || phase === 'break' || phase === 'decision_prompt') && (
        <div
          data-testid="fullscreen-exam-timer"
          data-amoled-active={isAmoled ? 'true' : 'false'}
          data-timer-theme={settings.timerScreenTheme ?? 'default'}
          className={`min-h-screen w-full flex flex-col justify-center relative overflow-hidden transition-colors duration-300 ${
            isAmoledBwTheme
              ? 'bg-black text-white'
              : isAmoled
              ? 'bg-black text-zinc-200'
              : 'bg-slate-50 dark:bg-slate-950'
          }`}
        >
          {/* Sub-pixel alternating checkerboard anti-burn-in mask when AMOLED mode is active */}
          {isAmoled && (
            <div
              data-testid="amoled-subpixel-mask"
              aria-hidden="true"
              className="pointer-events-none fixed inset-0 z-20"
              style={{
                backgroundImage:
                  'radial-gradient(rgba(0, 0, 0, 0.88) 1px, transparent 0)',
                backgroundSize: '2px 2px',
                backgroundPosition: `${amoledState.subpixelPhase}px ${amoledState.subpixelPhase}px`,
                opacity: amoledState.pixelGridMaskOpacity,
              }}
            />
          )}

          {/* Top-Right Floating Controls ONLY (Settings Icon + Minimize/Maximize Icon — No Top Bar) */}
          <div
            data-testid="timer-top-right-controls"
            className="fixed top-4 right-4 z-30 flex items-center gap-2"
          >
            <button
              type="button"
              data-testid="timer-top-right-settings-btn"
              onClick={() => setIsTimerSettingsModalOpen(true)}
              aria-label="Open Question Pacing and Always-On Display Settings"
              title="Question Pacing Tracker & Always-On Display Settings"
              className={`p-2.5 rounded-xl border transition-colors cursor-pointer shadow-xs ${
                isAmoledBwTheme
                  ? 'bg-black border-white/60 text-white hover:bg-zinc-900'
                  : isAmoled
                  ? 'bg-black border-zinc-800 text-teal-400 hover:bg-zinc-900'
                  : 'bg-white/90 dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              type="button"
              data-testid="timer-top-right-fullscreen-btn"
              onClick={toggleBrowserFullscreen}
              aria-label={isBrowserFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              title={isBrowserFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              className={`p-2.5 rounded-xl border transition-colors cursor-pointer shadow-xs inline-flex items-center gap-1.5 ${
                isAmoledBwTheme
                  ? 'bg-black border-white/60 text-white hover:bg-zinc-900'
                  : isAmoled
                  ? 'bg-black border-zinc-800 text-zinc-200 hover:bg-zinc-900'
                  : 'bg-white/90 dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {isBrowserFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
          </div>

          <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-5 flex flex-col justify-center">
            {/* Status Banner if present */}
            {statusBanner && (
              <div
                role="status"
                className={`flex items-center justify-between gap-4 px-4 py-3 rounded-xl border text-xs sm:text-sm ${
                  isAmoledBwTheme
                    ? 'bg-black border-white/50 text-white'
                    : isAmoled
                    ? 'bg-black border-teal-900/70 text-teal-300'
                    : 'bg-teal-50 dark:bg-teal-950/60 border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Bell
                    className={`w-4 h-4 shrink-0 ${
                      isAmoledBwTheme
                        ? 'text-white'
                        : 'text-teal-600 dark:text-teal-400'
                    }`}
                  />
                  <span>{statusBanner}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setStatusBanner(null)}
                  className="text-xs font-semibold underline shrink-0 cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Primary Countdown Clock & Controls Card (Pixel-Shifted & Dimmed in AMOLED Mode) */}
            <div
              data-testid="amoled-pixel-shift-stage"
              style={{
                transform: isAmoled
                  ? `translate3d(${amoledState.offsetX}px, ${amoledState.offsetY}px, 0)`
                  : 'translate3d(0px, 0px, 0)',
                opacity: isAmoled ? amoledState.activeLuminanceOpacity : 1,
                transition:
                  'transform 800ms cubic-bezier(0.22, 1, 0.36, 1), opacity 250ms ease',
              }}
              className="w-full"
            >
              <div
                className={`border rounded-2xl p-6 sm:p-10 flex flex-col justify-between space-y-8 transition-colors ${
                  isAmoledBwTheme
                    ? 'bg-black border-white/40 text-white'
                    : isAmoled
                    ? 'bg-black border-zinc-900'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}
              >
                {/* Top Meta Row */}
                <div
                  className={`flex flex-wrap items-center justify-between gap-2 border-b pb-4 ${
                    isAmoledBwTheme
                      ? 'border-white/25'
                      : isAmoled
                      ? 'border-zinc-900'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div>
                    <div
                      className={`text-xs ${
                        isAmoledBwTheme
                          ? 'text-zinc-300'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <span>{examPlan.examTitle}</span>
                      <span aria-hidden="true"> · </span>
                      <span>{examPlan.profile.name}</span>
                      <span aria-hidden="true"> · </span>
                      <span>
                        {settings.keepScreenAwake
                          ? wakeLockActive
                            ? 'Screen Wake Lock Active'
                            : 'Keep Screen Awake Enabled'
                          : 'Standard Screen Timeout'}
                      </span>
                    </div>
                    <h2
                      className={`mt-1 text-xl sm:text-2xl font-bold ${
                        isAmoledBwTheme
                          ? 'text-white'
                          : isAmoled
                          ? 'text-zinc-100'
                          : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {phase === 'tutorial'
                        ? `Orientation Tutorial (${examPlan.tutorialMinutes}m)`
                        : phase === 'break'
                        ? `Scheduled Break Pool (Before Block ${currentBlockIndex + 2})`
                        : `Block ${currentBlockIndex + 1} of ${examPlan.numBlocks} (${activeBlock.questionCount} Questions)`}
                    </h2>
                  </div>

                  <div className="text-right font-mono tabular-nums">
                    <span
                      className={`text-xs block ${
                        isAmoledBwTheme
                          ? 'text-zinc-300'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      Available Break Pool
                    </span>
                    <span
                      className={`text-lg font-bold ${
                        isAmoledBwTheme
                          ? 'text-white'
                          : 'text-teal-600 dark:text-teal-400'
                      }`}
                    >
                      {formatSecondsToClock(breakPoolSeconds)}
                    </span>
                  </div>
                </div>

                {/* Center Circular Progress & Tabular Countdown */}
                <div className="flex flex-col items-center justify-center py-2">
                  <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 240 240">
                      <circle
                        cx="120"
                        cy="120"
                        r={circleRadius}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={isPitchBlackCanvas ? '4' : '10'}
                        className={
                          isAmoledBwTheme
                            ? 'text-zinc-800'
                            : isAmoled
                            ? 'text-zinc-900'
                            : 'text-slate-100 dark:text-slate-800'
                        }
                      />
                      <circle
                        cx="120"
                        cy="120"
                        r={circleRadius}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={isPitchBlackCanvas ? '5' : '10'}
                        strokeLinecap="round"
                        strokeDasharray={circleCircumference}
                        strokeDashoffset={strokeDashoffset}
                        className={
                          isAmoledBwTheme
                            ? 'text-white transition-all duration-300'
                            : phase === 'break'
                            ? 'text-amber-500 transition-all duration-300'
                            : phaseRemainingSeconds < 300
                            ? 'text-rose-600 transition-all duration-300'
                            : 'text-teal-500 dark:text-teal-400 transition-all duration-300'
                        }
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span
                        className={`text-xs uppercase tracking-wider font-semibold ${
                          isAmoledBwTheme
                            ? 'text-zinc-300'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {phase === 'tutorial'
                          ? 'Tutorial Remaining'
                          : phase === 'break'
                          ? 'Break Remaining'
                          : 'Block Time Left'}
                      </span>
                      <div
                        data-testid="active-timer-clock"
                        className={`mt-1 text-5xl sm:text-6xl font-bold font-mono tracking-tight tabular-nums ${
                          isAmoledBwTheme
                            ? 'text-white font-light'
                            : isAmoled
                            ? 'text-teal-400 font-light'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {formatSecondsToClock(currentClockSec)}
                      </div>
                      <span
                        className={`mt-1.5 text-xs font-mono tabular-nums ${
                          isAmoledBwTheme
                            ? 'text-zinc-300'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {isPaused
                          ? 'Timer Paused'
                          : isAmoled
                          ? `AMOLED Burn-In Safe · ${amoledState.onPixelBrightnessRatio}% Lum`
                          : isAmoledBwTheme
                          ? 'AMOLED Black & White Theme'
                          : 'Counting Down Live'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Controls Bar */}
                <div
                  className={`grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4 border-t ${
                    isAmoledBwTheme
                      ? 'border-white/25'
                      : isAmoled
                      ? 'border-zinc-900'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setIsPaused((p) => !p)}
                    className={`py-2.5 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                      isAmoledBwTheme
                        ? 'bg-white text-black hover:bg-zinc-200'
                        : 'bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900'
                    }`}
                  >
                    {isPaused ? (
                      <Play className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <Pause className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>{isPaused ? 'Resume Timer' : 'Pause Timer'}</span>
                  </button>

                  {phase === 'tutorial' && (
                    <button
                      type="button"
                      onClick={() => {
                        setBreakPoolSeconds((b) => b + phaseRemainingSeconds);
                        setPhase('block');
                        setCurrentBlockIndex(0);
                        setPhaseRemainingSeconds(examPlan.blocks[0].durationSeconds);
                        setStatusBanner(
                          `Tutorial ended early. +${formatSecondsToClock(
                            phaseRemainingSeconds
                          )} added to break bank.`
                        );
                      }}
                      className={`py-2.5 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                        isAmoledBwTheme
                          ? 'border border-white bg-black text-white hover:bg-zinc-900'
                          : 'bg-teal-600 hover:bg-teal-700 text-white'
                      }`}
                    >
                      <SkipForward className="w-3.5 h-3.5 shrink-0" />
                      <span>Start Block 1</span>
                    </button>
                  )}

                  {phase === 'block' && (
                    <button
                      type="button"
                      onClick={() => triggerBlockCompletion(phaseRemainingSeconds)}
                      className={`py-2.5 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                        isAmoledBwTheme
                          ? 'border border-white bg-black text-white hover:bg-zinc-900'
                          : 'bg-teal-600 hover:bg-teal-700 text-white'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Complete Block Early</span>
                    </button>
                  )}

                  {phase === 'break' && (
                    <button
                      type="button"
                      onClick={resumeBlockFromBreak}
                      className={`py-2.5 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                        isAmoledBwTheme
                          ? 'border border-white bg-black text-white hover:bg-zinc-900'
                          : 'bg-teal-600 hover:bg-teal-700 text-white'
                      }`}
                    >
                      <Play className="w-3.5 h-3.5 shrink-0" />
                      <span>Start Next Block</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      if (phase === 'break') {
                        setBreakPoolSeconds((s) => Math.max(3, s - 300));
                      } else {
                        setPhaseRemainingSeconds(3);
                      }
                    }}
                    title="Jump to final 3 seconds to test end-of-block bell and prompt"
                    className={`py-2.5 px-3 rounded-xl border font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                      isAmoledBwTheme
                        ? 'border-white/50 text-white hover:bg-zinc-900'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <FastForward className="w-3.5 h-3.5 shrink-0" />
                    <span>Jump to Final 3s</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playNotificationBell(
                        settings.notificationTone,
                        settings.notificationVolume
                      );
                      setPhase('percentile_entry');
                    }}
                    aria-label="Finish Exam & Log Score"
                    className={`py-2.5 px-3 rounded-xl border font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                      isAmoledBwTheme
                        ? 'border-white/50 text-white hover:bg-zinc-900'
                        : 'border-rose-200 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                    }`}
                  >
                    <Flag className="w-3.5 h-3.5 shrink-0" />
                    <span>Finish & Log Score</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* POPUP MODAL FOR QUESTION PACING TRACKER & ALWAYS-ON DISPLAY SETTINGS (Triggered by Top-Right Settings Icon) */}
          {isTimerSettingsModalOpen && (
            <div
              data-testid="timer-tools-popup-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="timer-tools-modal-title"
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto"
            >
              <div
                className={`w-full max-w-2xl rounded-2xl border p-6 sm:p-8 shadow-2xl space-y-6 my-8 ${
                  isPitchBlackCanvas
                    ? 'bg-black border-zinc-700 text-white'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100'
                }`}
              >
                {/* Modal Header */}
                <div
                  className={`flex items-center justify-between gap-4 border-b pb-4 ${
                    isPitchBlackCanvas
                      ? 'border-zinc-800'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div>
                    <span
                      className={`text-xs font-semibold ${
                        isAmoledBwTheme
                          ? 'text-zinc-300'
                          : 'text-teal-600 dark:text-teal-400'
                      }`}
                    >
                      In-Session Controls & Display Protection
                    </span>
                    <h3 id="timer-tools-modal-title" className="text-xl font-bold mt-0.5">
                      Question Pacing & Always-On AMOLED Settings
                    </h3>
                  </div>
                  <button
                    type="button"
                    data-testid="close-timer-tools-modal-btn"
                    onClick={() => setIsTimerSettingsModalOpen(false)}
                    aria-label="Close Settings Popup"
                    className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                      isPitchBlackCanvas
                        ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-900'
                        : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Card 1: Intuitive Question Pacing Tracker Card */}
                <div
                  data-testid="popup-question-pacing-card"
                  className={`rounded-2xl border p-5 space-y-4 ${
                    isPitchBlackCanvas
                      ? 'bg-black border-zinc-800'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div
                    className={`border-b pb-3 flex items-center justify-between gap-3 ${
                      isPitchBlackCanvas
                        ? 'border-zinc-800'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div>
                      <h4 className="text-base font-bold">
                        Intuitive Question Pacing Tracker
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Target cadence: {examPlan.secondsPerQuestion}s per question
                      </p>
                    </div>
                    <span className="text-xs font-mono font-semibold tabular-nums whitespace-nowrap shrink-0">
                      Q {currentQuestionInBlock} / {activeBlock.questionCount}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      Current Question
                    </span>
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                      <button
                        type="button"
                        aria-label="Previous question"
                        onClick={() => setCurrentQuestionInBlock((q) => Math.max(1, q - 1))}
                        className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-10 text-center font-mono font-bold text-base tabular-nums">
                        {currentQuestionInBlock}
                      </span>
                      <button
                        type="button"
                        aria-label="Next question"
                        onClick={() =>
                          setCurrentQuestionInBlock((q) =>
                            Math.min(activeBlock.questionCount, q + 1)
                          )
                        }
                        className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setCurrentQuestionInBlock((q) =>
                            Math.min(activeBlock.questionCount, q + 5)
                          )
                        }
                        className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        +5 Qs
                      </button>
                    </div>
                  </div>

                  <div
                    className={`grid grid-cols-2 gap-3 pt-2 border-t text-xs ${
                      isPitchBlackCanvas
                        ? 'border-zinc-800'
                        : 'border-slate-200/70 dark:border-slate-800'
                    }`}
                  >
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block">
                        Time Per Remaining Q
                      </span>
                      <span className="font-mono font-bold text-sm tabular-nums">
                        {pacing.secondsRemainingPerQuestion}s / question
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block">
                        Pacing Status
                      </span>
                      <span
                        className={`font-semibold ${
                          isAmoledBwTheme
                            ? 'text-white'
                            : pacing.status === 'behind'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-teal-700 dark:text-teal-400'
                        }`}
                      >
                        {pacing.message}
                      </span>
                    </div>
                  </div>

                  {/* Block Sequence Summary inside Pacing Card */}
                  <div
                    className={`pt-3 border-t space-y-2 ${
                      isPitchBlackCanvas
                        ? 'border-zinc-800'
                        : 'border-slate-200/70 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold">
                        Exam Block Sequence ({examPlan.numBlocks} Blocks)
                      </span>
                      <span className="font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                        {blocksCompletedCount} of {examPlan.numBlocks} completed
                      </span>
                    </div>
                    <div className="grid grid-cols-5 sm:grid-cols-7 gap-1.5 max-h-28 overflow-y-auto pr-1">
                      {examPlan.blocks.map((blk, idx) => {
                        const isCompleted =
                          idx < currentBlockIndex ||
                          (idx === currentBlockIndex && phase === 'decision_prompt');
                        const isCurrent = idx === currentBlockIndex && phase === 'block';
                        return (
                          <div
                            key={blk.blockNumber}
                            className={`p-1.5 rounded-lg border text-center font-mono text-[11px] tabular-nums ${
                              isCurrent
                                ? isAmoledBwTheme
                                  ? 'border-white bg-white text-black font-bold'
                                  : 'border-teal-600 bg-teal-50 dark:border-teal-400 dark:bg-teal-950/50 text-teal-900 dark:text-teal-200 font-bold'
                                : isCompleted
                                ? 'border-slate-200 dark:border-slate-800 opacity-60'
                                : 'border-slate-200/60 dark:border-slate-800/60 opacity-40'
                            }`}
                          >
                            B{blk.blockNumber} · {blk.durationMinutes}m
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Card 2: Always-On AMOLED Display Settings Card */}
                <div
                  data-testid="amoled-timer-control-bar"
                  className={`rounded-2xl border p-5 space-y-4 ${
                    isPitchBlackCanvas
                      ? 'bg-black border-zinc-800'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold">
                          Always-On AMOLED Display
                        </h4>
                        <span
                          className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                            isAmoled
                              ? isAmoledBwTheme
                                ? 'border-white text-white'
                                : 'border-teal-800/80 bg-teal-950/50 text-teal-300'
                              : 'border-slate-200 dark:border-slate-700 text-slate-500'
                          }`}
                        >
                          {isAmoled ? 'Burn-In Guard Active' : 'Off'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        True #000000 pixel-off canvas with 2D orbital pixel shifting and alternating sub-pixel interleaving to prevent OLED burn-in.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isAmoled}
                      aria-label="Always-On AMOLED Display"
                      data-testid="timer-amoled-toggle"
                      onClick={handleToggleAmoledMode}
                      className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                        isAmoled
                          ? isAmoledBwTheme
                            ? 'bg-white'
                            : 'bg-teal-600'
                          : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`block w-4 h-4 rounded-full transition-transform transform ${
                          isAmoled
                            ? isAmoledBwTheme
                              ? 'translate-x-7 bg-black'
                              : 'translate-x-7 bg-white'
                            : 'translate-x-1 bg-white'
                        }`}
                      />
                    </button>
                  </div>

                  {/* On-Pixels Dimming Ratio Slider */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-200/70 dark:border-slate-800">
                    <div className="flex items-center justify-between text-xs">
                      <label
                        htmlFor="running-timer-dimming-slider"
                        className="font-semibold"
                      >
                        On-Pixels Dimming Ratio
                      </label>
                      <span
                        data-testid="amoled-dimming-value"
                        className="font-mono font-bold tabular-nums"
                      >
                        {amoledState.clampedDimmingRatio}% dimmed ({amoledState.onPixelBrightnessRatio}% lit)
                      </span>
                    </div>
                    <input
                      id="running-timer-dimming-slider"
                      data-testid="timer-amoled-dimming-slider"
                      type="range"
                      min={10}
                      max={85}
                      step={5}
                      value={amoledState.clampedDimmingRatio}
                      onChange={(e) =>
                        handleChangeAmoledDimmingRatio(Number(e.target.value))
                      }
                      className="w-full accent-teal-600 cursor-pointer"
                    />
                  </div>

                  {/* Pixel Shift Controls */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-200/70 dark:border-slate-800">
                    <div
                      data-testid="amoled-pixel-offset-readout"
                      className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400"
                    >
                      Shift: {amoledState.offsetX >= 0 ? `+${amoledState.offsetX}` : amoledState.offsetX}px,{' '}
                      {amoledState.offsetY >= 0 ? `+${amoledState.offsetY}` : amoledState.offsetY}px · Subpixel P{amoledState.subpixelPhase}
                    </div>
                    <button
                      type="button"
                      data-testid="amoled-shift-pixels-btn"
                      onClick={() => setAmoledShiftStep((s) => s + 1)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <Move className="w-3.5 h-3.5" />
                      <span>Shift Pixels</span>
                    </button>
                  </div>
                </div>

                {/* Modal Footer Actions */}
                <div
                  className={`pt-3 border-t flex items-center justify-between gap-3 ${
                    isPitchBlackCanvas
                      ? 'border-zinc-800'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setIsTimerSettingsModalOpen(false);
                      setPhase('setup');
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reconfigure Exam
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsTimerSettingsModalOpen(false)}
                    className={`px-5 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                      isAmoledBwTheme
                        ? 'bg-white text-black hover:bg-zinc-200'
                        : 'bg-teal-600 hover:bg-teal-700 text-white'
                    }`}
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 60-SECOND POST-BLOCK BREAK OR CONTINUE PROMPT MODAL */}
          {phase === 'decision_prompt' && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="block-complete-modal-title"
            >
              <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-teal-700 dark:text-teal-400">
                      Notification Bell Alert · End of Block {currentBlockIndex + 1}
                    </span>
                    <h3
                      id="block-complete-modal-title"
                      className="text-xl font-bold text-slate-900 dark:text-slate-100"
                    >
                      Take a Scheduled Break or Continue to Block {currentBlockIndex + 2}?
                    </h3>
                  </div>
                  <div className="text-right font-mono tabular-nums shrink-0">
                    <span className="text-[11px] text-amber-600 dark:text-amber-400 block font-semibold">
                      Auto-Continue In
                    </span>
                    <span
                      data-testid="decision-countdown-seconds"
                      className="text-2xl font-bold text-amber-600 dark:text-amber-400"
                    >
                      {formatSecondsToClock(decisionRemainingSeconds)}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>1-Minute Regulation Auto-Advance Rule Active</span>
                  </div>
                  <p>
                    If you do not select an option within 1 minute ({decisionRemainingSeconds}s remaining), the timer will automatically start <strong>Block {currentBlockIndex + 2}</strong> without taking a break.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={breakPoolSeconds <= 0}
                    onClick={() => handleDecisionChoice('take_break')}
                    className="py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Coffee className="w-4 h-4" />
                    Take Break ({formatSecondsToClock(breakPoolSeconds)} pool)
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDecisionChoice('continue_next_block')}
                    className="py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Play className="w-4 h-4" />
                    Continue to Block {currentBlockIndex + 2} Now
                  </button>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleDecisionChoice('timeout_auto_continue')}
                    className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 underline cursor-pointer"
                  >
                    Simulate 1-Minute Unanswered Timeout
                  </button>

                  <button
                    type="button"
                    onClick={() => setPhase('percentile_entry')}
                    className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                  >
                    End Exam Session Here
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* POST-SESSION PERCENTILE SCORE ENTRY VIEW */}
      {phase === 'percentile_entry' && (
        <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-8 bg-slate-50 dark:bg-slate-950">
          <div className="max-w-2xl w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
            <span className="text-xs font-semibold text-teal-700 dark:text-teal-400">
              Session Completed · Record Outcome
            </span>
            <h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
              Enter Your Exam Percentile Score
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Save your result for <strong>{examPlan.examTitle}</strong> ({examPlan.profile.name}) to track your longitudinal readiness and percentile trajectory.
            </p>
          </div>

          <form onSubmit={handleSaveSessionScore} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="percentile-score-input"
                  className="block text-sm font-semibold text-slate-900 dark:text-slate-100"
                >
                  Percentile Rank (1–99th) *
                </label>
                <input
                  id="percentile-score-input"
                  type="number"
                  min={1}
                  max={99}
                  required
                  value={percentileInput}
                  onChange={(e) => {
                    setPercentileInput(e.target.value);
                    setPercentileError(null);
                  }}
                  className="mt-1.5 w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums"
                />
              </div>

              <div>
                <label
                  htmlFor="percent-correct-input"
                  className="block text-sm font-semibold text-slate-900 dark:text-slate-100"
                >
                  Correct Percentage (0–100%)
                </label>
                <input
                  id="percent-correct-input"
                  type="number"
                  min={0}
                  max={100}
                  value={percentCorrectInput}
                  onChange={(e) => setPercentCorrectInput(e.target.value)}
                  className="mt-1.5 w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums"
                />
              </div>
            </div>

            {percentileError && (
              <p role="alert" className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                {percentileError}
              </p>
            )}

            <div>
              <label
                htmlFor="session-notes-input"
                className="block text-sm font-semibold text-slate-900 dark:text-slate-100"
              >
                Pacing & Block Performance Notes
              </label>
              <textarea
                id="session-notes-input"
                rows={3}
                value={sessionNotesInput}
                onChange={(e) => setSessionNotesInput(e.target.value)}
                placeholder="Note block fatigue, break usage, or specific organ systems to review..."
                className="mt-1.5 w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setPhase('setup')}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Discard & Return to Setup
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Save Score & View Progress Analytics
              </button>
            </div>
          </form>
          </div>
        </div>
      )}
    </div>
  );
};
