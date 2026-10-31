import { ExamProfileId } from './examLogic';
import { NotificationTone } from './soundAndHardware';

export interface ExamHistoryEntry {
  id: string;
  examTitle: string;
  profileId: ExamProfileId;
  profileName: string;
  dateISO: string;
  totalQuestions: number;
  blocksCompleted: number;
  totalBlocksPlanned: number;
  totalStudyMinutes: number;
  breakMinutesUsed: number;
  percentileScore: number;
  percentCorrect?: number;
  autoContinuedBlocksCount: number;
  notes?: string;
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

export interface AppSettings {
  darkMode: boolean;
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
};

export const DEFAULT_SETTINGS: AppSettings = {
  darkMode: false,
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
    totalQuestions: 200,
    blocksCompleted: 10,
    totalBlocksPlanned: 10,
    totalStudyMinutes: 300,
    breakMinutesUsed: 32,
    percentileScore: 64,
    percentCorrect: 68,
    autoContinuedBlocksCount: 0,
    notes: 'Solid physiology pacing; needed faster recall on microbiology vignettes in Block 7.',
  },
  {
    id: 'seed-nbme-29',
    examTitle: 'NBME 29 Self-Assessment',
    profileId: 'USMLE_STEP_1',
    profileName: 'USMLE Step 1',
    dateISO: '2026-10-10',
    totalQuestions: 200,
    blocksCompleted: 10,
    totalBlocksPlanned: 10,
    totalStudyMinutes: 295,
    breakMinutesUsed: 35,
    percentileScore: 73,
    percentCorrect: 74,
    autoContinuedBlocksCount: 1,
    notes: 'Finished 5 minutes early overall; added unused block time to break bank.',
  },
  {
    id: 'seed-uwsa-1',
    examTitle: 'UWSA 1 Full Simulation',
    profileId: 'USMLE_STEP_2',
    profileName: 'USMLE Step 2 CK',
    dateISO: '2026-10-19',
    totalQuestions: 160,
    blocksCompleted: 4,
    totalBlocksPlanned: 4,
    totalStudyMinutes: 240,
    breakMinutesUsed: 20,
    percentileScore: 79,
    percentCorrect: 77,
    autoContinuedBlocksCount: 0,
    notes: 'Maintained 90s/question cadence across all 4 blocks.',
  },
  {
    id: 'seed-nbme-30',
    examTitle: 'NBME 30 Full Length Sim',
    profileId: 'USMLE_STEP_1',
    profileName: 'USMLE Step 1',
    dateISO: '2026-10-27',
    totalQuestions: 280,
    blocksCompleted: 14,
    totalBlocksPlanned: 14,
    totalStudyMinutes: 420,
    breakMinutesUsed: 50,
    percentileScore: 84,
    percentCorrect: 81,
    autoContinuedBlocksCount: 0,
    notes: 'Full 8-hour 14-block simulation completed with 5m spare break pool.',
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
