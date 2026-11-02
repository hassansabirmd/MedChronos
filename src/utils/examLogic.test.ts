import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateExamPlan,
  evaluateBlockPacing,
  resolvePostBlockDecision,
  formatMinutesToHoursAndMinutes,
  formatSecondsToClock,
  calculateAmoledBurnInProtection,
  advanceSessionByElapsedTime,
  applyUndoSnapshotWithTimeAdjustment,
  ActiveSessionRuntimeState,
  SessionUndoSnapshot,
  DEFAULT_DECISION_TIMEOUT_SECONDS,
} from './examLogic';

test('USMLE Step 1 standard 280 questions calculates 14 blocks of 30m, 5m tutorial, 55m break = 8 hours (480m)', () => {
  const plan = calculateExamPlan('USMLE_STEP_1', 280, {
    examTitle: 'NBME 30',
    includeTutorial: true,
  });

  assert.equal(plan.examTitle, 'NBME 30');
  assert.equal(plan.numBlocks, 14);
  assert.equal(plan.blockDurationMinutes, 30);
  assert.equal(plan.tutorialMinutes, 5);
  assert.equal(plan.totalBreakMinutes, 55);
  assert.equal(plan.totalBlockMinutes, 420);
  assert.equal(plan.totalExamMinutes, 480);
  assert.equal(plan.totalExamHoursFormatted, '8h 00m');
  assert.equal(plan.blocks.length, 14);
  assert.equal(plan.blocks[0].durationMinutes, 30);
  assert.equal(plan.blocks[0].questionCount, 20);
});

test('USMLE Step 1 partial question selection scales blocks and break time proportionally', () => {
  const plan = calculateExamPlan('USMLE_STEP_1', 140, {
    examTitle: 'Half Step 1 Sim',
    includeTutorial: true,
  });

  assert.equal(plan.numBlocks, 7);
  assert.equal(plan.totalBlockMinutes, 210);
  assert.equal(plan.tutorialMinutes, 5);
  assert.equal(plan.totalBreakMinutes, 28); // 7/14 of 55m = 27.5 -> 28m
});

test('Post-block 60-second timeout automatically continues to second block without break', () => {
  assert.equal(DEFAULT_DECISION_TIMEOUT_SECONDS, 60);

  const res = resolvePostBlockDecision('timeout_auto_continue', 0, 14, 55 * 60);
  assert.equal(res.nextPhase, 'block');
  assert.equal(res.nextBlockIndex, 1);
  assert.equal(res.autoContinuedWithoutBreak, true);
});

test('Post-block explicit break selection enters break phase when break pool is available', () => {
  const res = resolvePostBlockDecision('take_break', 0, 14, 55 * 60);
  assert.equal(res.nextPhase, 'break');
  assert.equal(res.nextBlockIndex, 1);
  assert.equal(res.autoContinuedWithoutBreak, false);
});

test('evaluateBlockPacing accurately detects ahead, on_track, and behind states', () => {
  // 20 questions in 1800 seconds (90s per question)
  // After 900 seconds elapsed (900s remaining), expected question is 11
  const onTrack = evaluateBlockPacing(11, 20, 900, 1800);
  assert.equal(onTrack.status, 'on_track');

  const ahead = evaluateBlockPacing(15, 20, 900, 1800);
  assert.equal(ahead.status, 'ahead');

  const behind = evaluateBlockPacing(6, 20, 900, 1800);
  assert.equal(behind.status, 'behind');
});

test('Clock and duration formatting utilities format accurately', () => {
  assert.equal(formatMinutesToHoursAndMinutes(480), '8h 00m');
  assert.equal(formatMinutesToHoursAndMinutes(55), '55m');
  assert.equal(formatSecondsToClock(1800), '30:00');
  assert.equal(formatSecondsToClock(3665), '01:01:05');
});

test('AMOLED burn-in protection shifts pixel coordinates and computes dimming ratios', () => {
  const step0 = calculateAmoledBurnInProtection(0, 50);
  const step3 = calculateAmoledBurnInProtection(3, 50);

  assert.equal(step0.clampedDimmingRatio, 50);
  assert.equal(step0.onPixelBrightnessRatio, 50);
  assert.equal(step0.activeLuminanceOpacity, 0.5);
  assert.equal(step0.subpixelPhase, 0);
  assert.equal(step3.subpixelPhase, 1);
  // Coordinates shift between steps so pixels never stay static
  assert.notEqual(step0.offsetX, step3.offsetX);
  assert.notEqual(step0.offsetY, step3.offsetY);

  // Clamping works for extreme dimming inputs
  const clampedHigh = calculateAmoledBurnInProtection(1, 99);
  assert.equal(clampedHigh.clampedDimmingRatio, 85);
  assert.equal(clampedHigh.activeLuminanceOpacity, 0.15);
});

test('advanceSessionByElapsedTime catches up wall-clock elapsed time across background/closed app transitions', () => {
  const plan = calculateExamPlan('USMLE_STEP_1', 280, {
    examTitle: 'NBME 30',
    includeTutorial: false,
  });

  const baseMs = 1700000000000;
  const initialState: ActiveSessionRuntimeState = {
    phase: 'block',
    isPaused: false,
    currentBlockIndex: 0,
    phaseRemainingSeconds: 120, // 2 minutes left in Block 1
    breakPoolSeconds: 3300,
    initialBreakPoolSeconds: 3300,
    decisionRemainingSeconds: 60,
    currentQuestionInBlock: 18,
    blocksCompletedCount: 0,
    totalStudySecondsElapsed: 1680,
    autoContinuedCount: 0,
    sessionStartedAtISO: new Date(baseMs - 1680000).toISOString(),
    sessionStartedAtMs: baseMs - 1680000,
    currentPhaseStartedAtMs: baseMs - 1680000,
    lastTickTimestampMs: baseMs,
    eventLog: [],
  };

  // Simulate user closing the app for 5 minutes (300 seconds):
  // - 120s finishes Block 1
  // - 60s expires the post-block decision prompt and auto-continues to Block 2
  // - 120s elapses inside Block 2 (leaving 1800 - 120 = 1680s in Block 2)
  const result = advanceSessionByElapsedTime(initialState, plan, baseMs + 300 * 1000, 60);

  assert.equal(result.state.phase, 'block');
  assert.equal(result.state.currentBlockIndex, 1);
  assert.equal(result.state.blocksCompletedCount, 1);
  assert.equal(result.state.autoContinuedCount, 1);
  assert.equal(result.state.phaseRemainingSeconds, 1680);
  assert.equal(result.bellTriggered, true);
  assert.equal(result.state.eventLog.length, 3); // block_ended, auto_continued, block_started
});

test('applyUndoSnapshotWithTimeAdjustment restores break timer when user mistakenly ends break and starts block', () => {
  const actionTimeMs = 1700000500000;
  const breakStateBeforeMistake: ActiveSessionRuntimeState = {
    phase: 'break',
    isPaused: false,
    currentBlockIndex: 0,
    phaseRemainingSeconds: 0,
    breakPoolSeconds: 3000, // 50:00 remaining in break pool
    initialBreakPoolSeconds: 3300,
    decisionRemainingSeconds: 60,
    currentQuestionInBlock: 1,
    blocksCompletedCount: 1,
    totalStudySecondsElapsed: 1800,
    autoContinuedCount: 0,
    sessionStartedAtISO: new Date(actionTimeMs - 2100000).toISOString(),
    sessionStartedAtMs: actionTimeMs - 2100000,
    currentPhaseStartedAtMs: actionTimeMs - 300000,
    lastTickTimestampMs: actionTimeMs,
    eventLog: [],
  };

  const snapshot: SessionUndoSnapshot = {
    id: 'undo-1',
    actionDescription: 'Ended Break & Started Block 2',
    actionTimestampMs: actionTimeMs,
    previousState: breakStateBeforeMistake,
  };

  // User clicks Undo 18 seconds after accidentally starting Block 2
  const restored = applyUndoSnapshotWithTimeAdjustment(
    snapshot,
    actionTimeMs + 18 * 1000,
    false
  );

  assert.equal(restored.phase, 'break');
  assert.equal(restored.currentBlockIndex, 0);
  // Break pool should be properly adjusted for the 18 seconds that passed
  assert.equal(restored.breakPoolSeconds, 2982);
  assert.equal(restored.eventLog[restored.eventLog.length - 1].type, 'undo_applied');
});


