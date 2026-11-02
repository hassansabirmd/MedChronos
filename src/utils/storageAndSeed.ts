import {
  ExamProfileId,
  SessionTimelineEvent,
  ActiveSessionRuntimeState,
  SessionUndoSnapshot,
} from './examLogic';
import { NotificationTone } from './soundAndHardware';

export interface ExamHistoryEntry {
  id: string;
  examTitle: string;
  profileId: ExamProfileId;
  profileName: string;
  dateISO: string;
  sessionStartedAtISO?: string;
  sessionEndedAtISO?: string;
  totalQuestions: number;
  blocksCompleted: number;
  totalBlocksPlanned: number;
  totalStudyMinutes: number;
  breakMinutesUsed: number;
  percentileScore: number;
  percentCorrect?: number;
  autoContinuedBlocksCount: number;
  notes?: string;
  eventLog?: SessionTimelineEvent[];
}

export interface PersistedActiveExamSession {
  selectedProfileId: ExamProfileId;
  examTitle: string;
  totalQuestions: number;
  includeTutorial: boolean;
  customBlockMinutes: string;
  customQuestionsPerBlock: string;
  customBreakMinutes: string;
  runtimeState: ActiveSessionRuntimeState;
  undoStack: SessionUndoSnapshot[];
}

export interface StudyScheduleItem {
  id: string;
  dayOfWeek: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  activityTitle: string;
  profileId: ExamProfileId;
  targetQuestions: number;
  targetBlocks: number;
  startTime: string;
  enabled: boolean;
}

export type TimerScreenTheme = 'default' | 'amoled_bw';

export interface AppSettings {
  darkMode: boolean;
  timerScreenTheme: TimerScreenTheme;
  enablePauseTimerButton: boolean;
  enableJumpToFinal3sButton: boolean;
  notificationTone: NotificationTone;
  notificationVolume: number; // 0 - 100
  vibrateDuringBreak: boolean;
  keepScreenAwake: boolean;
  amoledAlwaysOnDisplay: boolean;
  amoledDimmingRatio: number; // 10 - 85 (% dimming applied to on-pixels)
  autoContinueTimeoutSeconds: number; // default 60s per USMLE regulation prompt
  targetExamDate: string;
  targetPercentileGoal: number;
}

const STORAGE_KEYS = {
  HISTORY: 'medchronos_exam_history_v1',
  SETTINGS: 'medchronos_settings_v1',
  SCHEDULE: 'medchronos_schedule_v1',
  ACTIVE_SESSION: 'medchronos_active_session_v1',
};

export const DEFAULT_SETTINGS: AppSettings = {
  darkMode: false,
  timerScreenTheme: 'default',
  enablePauseTimerButton: false,
  enableJumpToFinal3sButton: false,
  notificationTone: 'clinical_bell',
  notificationVolume: 85,
  vibrateDuringBreak: true,
  keepScreenAwake: true,
  amoledAlwaysOnDisplay: false,
  amoledDimmingRatio: 45,
  autoContinueTimeoutSeconds: 60,
  targetExamDate: '2026-12-15',
  targetPercentileGoal: 85,
};

export const SEED_HISTORY: ExamHistoryEntry[] = [
  {
    id: 'seed-nbme-28',
    examTitle: 'NBME 28 Comprehensive Form',
    profileId: 'USMLE_STEP_1',
    profileName: 'USMLE Step 1',
    dateISO: '2026-09-28',
    sessionStartedAtISO: '2026-09-28T08:00:00.000Z',
    sessionEndedAtISO: '2026-09-28T13:32:00.000Z',
    totalQuestions: 200,
    blocksCompleted: 10,
    totalBlocksPlanned: 10,
    totalStudyMinutes: 300,
    breakMinutesUsed: 32,
    percentileScore: 64,
    percentCorrect: 68,
    autoContinuedBlocksCount: 0,
    notes: 'Solid physiology pacing; needed faster recall on microbiology vignettes in Block 7.',
    eventLog: [
      {
        id: 'seed-28-1',
        type: 'session_started',
        label: 'Exam Session Started (NBME 28 Comprehensive Form)',
        timestampISO: '2026-09-28T08:00:00.000Z',
        timestampMs: Date.parse('2026-09-28T08:00:00.000Z'),
        details: 'USMLE Step 1 · 10 blocks planned (200 questions).',
      },
      {
        id: 'seed-28-2',
        type: 'block_started',
        label: 'Block 1 of 10 Started',
        timestampISO: '2026-09-28T08:00:00.000Z',
        timestampMs: Date.parse('2026-09-28T08:00:00.000Z'),
        blockNumber: 1,
        details: 'Started Block 1 (20 questions, 30m).',
      },
      {
        id: 'seed-28-3',
        type: 'block_ended',
        label: 'Block 1 of 10 Ended',
        timestampISO: '2026-09-28T08:30:00.000Z',
        timestampMs: Date.parse('2026-09-28T08:30:00.000Z'),
        blockNumber: 1,
        durationSeconds: 1800,
        details: 'Completed Block 1 in 30:00.',
      },
      {
        id: 'seed-28-4',
        type: 'break_started',
        label: 'Break Availed After Block 1',
        timestampISO: '2026-09-28T08:30:12.000Z',
        timestampMs: Date.parse('2026-09-28T08:30:12.000Z'),
        blockNumber: 1,
        details: 'Entered scheduled break pool (40:00 available).',
      },
      {
        id: 'seed-28-5',
        type: 'break_ended',
        label: 'Break Ended Before Block 2',
        timestampISO: '2026-09-28T08:38:12.000Z',
        timestampMs: Date.parse('2026-09-28T08:38:12.000Z'),
        blockNumber: 2,
        durationSeconds: 480,
        details: 'Break ended after 08:00. Remaining break pool: 32:00.',
      },
      {
        id: 'seed-28-6',
        type: 'session_completed',
        label: 'Exam Session Completed (10/10 Blocks)',
        timestampISO: '2026-09-28T13:32:00.000Z',
        timestampMs: Date.parse('2026-09-28T13:32:00.000Z'),
        durationSeconds: 19920,
        details: 'Completed 10 blocks with 32m total break time used.',
      },
    ],
  },
  {
    id: 'seed-nbme-29',
    examTitle: 'NBME 29 Self-Assessment',
    profileId: 'USMLE_STEP_1',
    profileName: 'USMLE Step 1',
    dateISO: '2026-10-10',
    sessionStartedAtISO: '2026-10-10T08:30:00.000Z',
    sessionEndedAtISO: '2026-10-10T14:00:00.000Z',
    totalQuestions: 200,
    blocksCompleted: 10,
    totalBlocksPlanned: 10,
    totalStudyMinutes: 295,
    breakMinutesUsed: 35,
    percentileScore: 73,
    percentCorrect: 74,
    autoContinuedBlocksCount: 1,
    notes: 'Finished 5 minutes early overall; added unused block time to break bank.',
    eventLog: [
      {
        id: 'seed-29-1',
        type: 'session_started',
        label: 'Exam Session Started (NBME 29 Self-Assessment)',
        timestampISO: '2026-10-10T08:30:00.000Z',
        timestampMs: Date.parse('2026-10-10T08:30:00.000Z'),
        details: 'USMLE Step 1 · 10 blocks planned (200 questions).',
      },
      {
        id: 'seed-29-2',
        type: 'block_started',
        label: 'Block 1 of 10 Started',
        timestampISO: '2026-10-10T08:30:00.000Z',
        timestampMs: Date.parse('2026-10-10T08:30:00.000Z'),
        blockNumber: 1,
        details: 'Started Block 1 (20 questions, 30m).',
      },
      {
        id: 'seed-29-3',
        type: 'block_ended',
        label: 'Block 1 of 10 Ended Early',
        timestampISO: '2026-10-10T08:57:00.000Z',
        timestampMs: Date.parse('2026-10-10T08:57:00.000Z'),
        blockNumber: 1,
        durationSeconds: 1620,
        details: 'Completed Block 1 in 27:00 (+03:00 added to break pool).',
      },
      {
        id: 'seed-29-4',
        type: 'auto_continued',
        label: '1-Minute Decision Timeout — Auto-Continued to Block 2',
        timestampISO: '2026-10-10T08:58:00.000Z',
        timestampMs: Date.parse('2026-10-10T08:58:00.000Z'),
        blockNumber: 2,
        durationSeconds: 60,
        details: 'No break response within 60s; automatically started Block 2.',
      },
      {
        id: 'seed-29-5',
        type: 'session_completed',
        label: 'Exam Session Completed (10/10 Blocks)',
        timestampISO: '2026-10-10T14:00:00.000Z',
        timestampMs: Date.parse('2026-10-10T14:00:00.000Z'),
        durationSeconds: 19800,
        details: 'Completed 10 blocks with 35m total break time used.',
      },
    ],
  },
  {
    id: 'seed-uwsa-1',
    examTitle: 'UWSA 1 Full Simulation',
    profileId: 'USMLE_STEP_2',
    profileName: 'USMLE Step 2 CK',
    dateISO: '2026-10-19',
    sessionStartedAtISO: '2026-10-19T09:00:00.000Z',
    sessionEndedAtISO: '2026-10-19T13:20:00.000Z',
    totalQuestions: 160,
    blocksCompleted: 4,
    totalBlocksPlanned: 4,
    totalStudyMinutes: 240,
    breakMinutesUsed: 20,
    percentileScore: 79,
    percentCorrect: 77,
    autoContinuedBlocksCount: 0,
    notes: 'Maintained 90s/question cadence across all 4 blocks.',
    eventLog: [
      {
        id: 'seed-uwsa-1-start',
        type: 'session_started',
        label: 'Exam Session Started (UWSA 1 Full Simulation)',
        timestampISO: '2026-10-19T09:00:00.000Z',
        timestampMs: Date.parse('2026-10-19T09:00:00.000Z'),
        details: 'USMLE Step 2 CK · 4 blocks planned (160 questions).',
      },
      {
        id: 'seed-uwsa-1-b1',
        type: 'block_started',
        label: 'Block 1 of 4 Started',
        timestampISO: '2026-10-19T09:00:00.000Z',
        timestampMs: Date.parse('2026-10-19T09:00:00.000Z'),
        blockNumber: 1,
        details: 'Started Block 1 (40 questions, 60m).',
      },
      {
        id: 'seed-uwsa-1-b1-end',
        type: 'block_ended',
        label: 'Block 1 of 4 Ended',
        timestampISO: '2026-10-19T10:00:00.000Z',
        timestampMs: Date.parse('2026-10-19T10:00:00.000Z'),
        blockNumber: 1,
        durationSeconds: 3600,
        details: 'Completed Block 1 in 01:00:00.',
      },
      {
        id: 'seed-uwsa-1-brk',
        type: 'break_started',
        label: 'Break Availed After Block 1',
        timestampISO: '2026-10-19T10:00:10.000Z',
        timestampMs: Date.parse('2026-10-19T10:00:10.000Z'),
        blockNumber: 1,
        details: 'Availed scheduled break before Block 2.',
      },
      {
        id: 'seed-uwsa-1-brk-end',
        type: 'break_ended',
        label: 'Break Ended Before Block 2',
        timestampISO: '2026-10-19T10:10:10.000Z',
        timestampMs: Date.parse('2026-10-19T10:10:10.000Z'),
        blockNumber: 2,
        durationSeconds: 600,
        details: 'Break ended after 10:00.',
      },
      {
        id: 'seed-uwsa-1-end',
        type: 'session_completed',
        label: 'Exam Session Completed (4/4 Blocks)',
        timestampISO: '2026-10-19T13:20:00.000Z',
        timestampMs: Date.parse('2026-10-19T13:20:00.000Z'),
        durationSeconds: 15600,
        details: 'Completed all 4 blocks with 20m total break time used.',
      },
    ],
  },
  {
    id: 'seed-nbme-30',
    examTitle: 'NBME 30 Full Length Sim',
    profileId: 'USMLE_STEP_1',
    profileName: 'USMLE Step 1',
    dateISO: '2026-10-27',
    sessionStartedAtISO: '2026-10-27T08:00:00.000Z',
    sessionEndedAtISO: '2026-10-27T15:55:00.000Z',
    totalQuestions: 280,
    blocksCompleted: 14,
    totalBlocksPlanned: 14,
    totalStudyMinutes: 420,
    breakMinutesUsed: 50,
    percentileScore: 84,
    percentCorrect: 81,
    autoContinuedBlocksCount: 0,
    notes: 'Full 8-hour 14-block simulation completed with 5m spare break pool.',
    eventLog: [
      {
        id: 'seed-30-1',
        type: 'session_started',
        label: 'Exam Session Started (NBME 30 Full Length Sim)',
        timestampISO: '2026-10-27T08:00:00.000Z',
        timestampMs: Date.parse('2026-10-27T08:00:00.000Z'),
        details: 'USMLE Step 1 · 14 blocks planned (280 questions) + 5m tutorial + 55m break.',
      },
      {
        id: 'seed-30-2',
        type: 'tutorial_started',
        label: 'Orientation Tutorial Started',
        timestampISO: '2026-10-27T08:00:00.000Z',
        timestampMs: Date.parse('2026-10-27T08:00:00.000Z'),
        details: '5-minute orientation tutorial started.',
      },
      {
        id: 'seed-30-3',
        type: 'tutorial_ended',
        label: 'Orientation Tutorial Completed',
        timestampISO: '2026-10-27T08:05:00.000Z',
        timestampMs: Date.parse('2026-10-27T08:05:00.000Z'),
        durationSeconds: 300,
        details: 'Completed 5m tutorial.',
      },
      {
        id: 'seed-30-4',
        type: 'block_started',
        label: 'Block 1 of 14 Started',
        timestampISO: '2026-10-27T08:05:00.000Z',
        timestampMs: Date.parse('2026-10-27T08:05:00.000Z'),
        blockNumber: 1,
        details: 'Started Block 1 (20 questions, 30m).',
      },
      {
        id: 'seed-30-5',
        type: 'block_ended',
        label: 'Block 1 of 14 Ended',
        timestampISO: '2026-10-27T08:35:00.000Z',
        timestampMs: Date.parse('2026-10-27T08:35:00.000Z'),
        blockNumber: 1,
        durationSeconds: 1800,
        details: 'Completed Block 1 in 30:00.',
      },
      {
        id: 'seed-30-6',
        type: 'break_started',
        label: 'Break Availed After Block 1',
        timestampISO: '2026-10-27T08:35:08.000Z',
        timestampMs: Date.parse('2026-10-27T08:35:08.000Z'),
        blockNumber: 1,
        details: 'Availed scheduled break (55:00 pool available).',
      },
      {
        id: 'seed-30-7',
        type: 'break_ended',
        label: 'Break Ended Before Block 2',
        timestampISO: '2026-10-27T08:40:08.000Z',
        timestampMs: Date.parse('2026-10-27T08:40:08.000Z'),
        blockNumber: 2,
        durationSeconds: 300,
        details: 'Break ended after 05:00. Remaining break pool: 50:00.',
      },
      {
        id: 'seed-30-8',
        type: 'session_completed',
        label: 'Exam Session Completed (14/14 Blocks)',
        timestampISO: '2026-10-27T15:55:00.000Z',
        timestampMs: Date.parse('2026-10-27T15:55:00.000Z'),
        durationSeconds: 28500,
        details: 'Completed all 14 blocks with 50m break used and 5m break remaining.',
      },
    ],
  },
];

export const SEED_SCHEDULE: StudyScheduleItem[] = [
  {
    id: 'sched-mon',
    dayOfWeek: 'Mon',
    activityTitle: 'USMLE Step 1 Timed Morning Blocks',
    profileId: 'USMLE_STEP_1',
    targetQuestions: 80,
    targetBlocks: 4,
    startTime: '08:00',
    enabled: true,
  },
  {
    id: 'sched-tue',
    dayOfWeek: 'Tue',
    activityTitle: 'Pathology & Pharmacology Pacing Drills',
    profileId: 'USMLE_STEP_1',
    targetQuestions: 60,
    targetBlocks: 3,
    startTime: '08:30',
    enabled: true,
  },
  {
    id: 'sched-wed',
    dayOfWeek: 'Wed',
    activityTitle: 'Step 2 CK Clinical Vignette Marathon',
    profileId: 'USMLE_STEP_2',
    targetQuestions: 120,
    targetBlocks: 3,
    startTime: '09:00',
    enabled: true,
  },
  {
    id: 'sched-thu',
    dayOfWeek: 'Thu',
    activityTitle: 'ABIM Internal Medicine Case Blocks',
    profileId: 'ABIM',
    targetQuestions: 60,
    targetBlocks: 1,
    startTime: '14:00',
    enabled: true,
  },
  {
    id: 'sched-fri',
    dayOfWeek: 'Fri',
    activityTitle: 'AMC / MCPS Rapid Recall Blocks',
    profileId: 'AMC',
    targetQuestions: 90,
    targetBlocks: 3,
    startTime: '08:30',
    enabled: true,
  },
  {
    id: 'sched-sat',
    dayOfWeek: 'Sat',
    activityTitle: 'Full 8-Hour NBME 31 Mock Day (14 Blocks)',
    profileId: 'USMLE_STEP_1',
    targetQuestions: 280,
    targetBlocks: 14,
    startTime: '08:00',
    enabled: true,
  },
  {
    id: 'sched-sun',
    dayOfWeek: 'Sun',
    activityTitle: 'Incorrects Review & Light Pacing Block',
    profileId: 'CUSTOM',
    targetQuestions: 40,
    targetBlocks: 1,
    startTime: '10:00',
    enabled: false,
  },
];

export function loadSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadHistory(): ExamHistoryEntry[] {
  if (typeof window === 'undefined') return SEED_HISTORY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.HISTORY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(SEED_HISTORY));
      return SEED_HISTORY;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : SEED_HISTORY;
  } catch {
    return SEED_HISTORY;
  }
}

export function saveHistory(entries: ExamHistoryEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(entries));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadSchedule(): StudyScheduleItem[] {
  if (typeof window === 'undefined') return SEED_SCHEDULE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.SCHEDULE);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEYS.SCHEDULE, JSON.stringify(SEED_SCHEDULE));
      return SEED_SCHEDULE;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : SEED_SCHEDULE;
  } catch {
    return SEED_SCHEDULE;
  }
}

export function saveSchedule(items: StudyScheduleItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEYS.SCHEDULE, JSON.stringify(items));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadActiveSession(): PersistedActiveExamSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedActiveExamSession;
    if (!parsed || !parsed.runtimeState || !parsed.runtimeState.phase) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveActiveSession(session: PersistedActiveExamSession | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!session) {
      window.localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
    } else {
      window.localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, JSON.stringify(session));
    }
  } catch {
    // Ignore storage quota errors
  }
}

export function clearActiveSession(): void {
  saveActiveSession(null);
}

