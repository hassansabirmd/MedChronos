import React, { useState } from 'react';
import {
  Volume2,
  Moon,
  Sun,
  Smartphone,
  Monitor,
  Calendar,
  Plus,
  Play,
  Trash2,
  Bell,
} from 'lucide-react';
import { EXAM_PROFILES, ExamProfileId } from '../utils/examLogic';
import { AppSettings, StudyScheduleItem } from '../utils/storageAndSeed';
import {
  NotificationTone,
  TONE_LABELS,
  playNotificationBell,
  triggerVibration,
  isWakeLockSupported,
} from '../utils/soundAndHardware';

interface SettingsAndScheduleViewProps {
  settings: AppSettings;
  onUpdateSettings: (next: AppSettings) => void;
  schedule: StudyScheduleItem[];
  onUpdateSchedule: (next: StudyScheduleItem[]) => void;
  onLaunchScheduledSession: (item: StudyScheduleItem) => void;
}

export const SettingsAndScheduleView: React.FC<SettingsAndScheduleViewProps> = ({
  settings,
  onUpdateSettings,
  schedule,
  onUpdateSchedule,
  onLaunchScheduledSession,
}) => {
  const [newDay, setNewDay] = useState<StudyScheduleItem['dayOfWeek']>('Mon');
  const [newTitle, setNewTitle] = useState<string>('');
  const [newProfileId, setNewProfileId] = useState<ExamProfileId>('USMLE_STEP_1');
  const [newQuestions, setNewQuestions] = useState<string>('80');
  const [newStartTime, setNewStartTime] = useState<string>('08:00');

  const handleAddScheduleBlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const prof = EXAM_PROFILES[newProfileId];
    const qCount = Math.max(1, Number(newQuestions) || 40);
    const blocks = Math.max(1, Math.ceil(qCount / prof.questionsPerBlock));

    const newItem: StudyScheduleItem = {
      id: `sched-${Date.now()}`,
      dayOfWeek: newDay,
      activityTitle: newTitle.trim(),
      profileId: newProfileId,
      targetQuestions: qCount,
      targetBlocks: blocks,
      startTime: newStartTime || '08:00',
      enabled: true,
    };

    onUpdateSchedule([...schedule, newItem]);
    setNewTitle('');
  };

  const toggleScheduleItem = (id: string) => {
    onUpdateSchedule(
      schedule.map((item) =>
        item.id === id ? { ...item, enabled: !item.enabled } : item
      )
    );
  };

  const deleteScheduleItem = (id: string) => {
    onUpdateSchedule(schedule.filter((item) => item.id !== id));
  };

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <p className="text-xs font-medium text-teal-700 dark:text-teal-400">
          Preferences, Hardware Controls & Weekly Study Planner
        </p>
        <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Settings & Study Schedule
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 6 Cols: App Settings (Dark Mode, Sound, Vibration, Screen Wake Lock) */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-3">
            Timer Hardware, Display & Audio Settings
          </h2>

          {/* 1. Dark Mode Toggle */}
          <div className="flex items-center justify-between gap-4 py-2">
            <div className="flex items-start gap-3">
              {settings.darkMode ? (
                <Moon className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" />
              ) : (
                <Sun className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Dark Mode Interface
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Reduce eye strain during 8-hour full-length USMLE and ABIM mock sessions.
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.darkMode}
              aria-label="Enable Dark Mode"
              onClick={() =>
                onUpdateSettings({ ...settings, darkMode: !settings.darkMode })
              }
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                settings.darkMode ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition-transform ${
                  settings.darkMode ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* 2. Do Not Turn Off Screen During Timer (Wake Lock) */}
          <div className="flex items-center justify-between gap-4 py-2 border-t border-slate-200/70 dark:border-slate-800">
            <div className="flex items-start gap-3">
              <Monitor className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Do Not Turn Off Screen During Timer
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Acquires Screen Wake Lock while blocks or breaks are counting down ({isWakeLockSupported() ? 'Supported on this device' : 'Managed via browser power policy'}).
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.keepScreenAwake}
              aria-label="Do not turn off screen during timer"
              onClick={() =>
                onUpdateSettings({
                  ...settings,
                  keepScreenAwake: !settings.keepScreenAwake,
                })
              }
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                settings.keepScreenAwake ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition-transform ${
                  settings.keepScreenAwake ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* 3. Vibration Feedback During Break Timer */}
          <div className="flex items-center justify-between gap-4 py-2 border-t border-slate-200/70 dark:border-slate-800">
            <div className="flex items-start gap-3">
              <Smartphone className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Vibration Feedback During Break Timer
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Triggers tactile haptic pulses at block completion, break intervals, and break expiration.
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.vibrateDuringBreak}
              aria-label="Enable vibration feedback during break timer"
              onClick={() => {
                const nextVal = !settings.vibrateDuringBreak;
                if (nextVal) triggerVibration([120, 60, 120]);
                onUpdateSettings({
                  ...settings,
                  vibrateDuringBreak: nextVal,
                });
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                settings.vibrateDuringBreak ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition-transform ${
                  settings.vibrateDuringBreak ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* 3b. Always-On AMOLED Display & Pixel Burn-In Protection */}
          <div className="space-y-3 py-3 border-t border-slate-200/70 dark:border-slate-800">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Always-On AMOLED Display (Running Timer)
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Uses a true #000000 black pixel-off canvas, 2D orbital pixel shifting, and sub-pixel checkerboard interleaving to prevent OLED burn-in.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.amoledAlwaysOnDisplay}
                aria-label="Enable Always-On AMOLED Display"
                onClick={() =>
                  onUpdateSettings({
                    ...settings,
                    amoledAlwaysOnDisplay: !settings.amoledAlwaysOnDisplay,
                  })
                }
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  settings.amoledAlwaysOnDisplay ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition-transform ${
                    settings.amoledAlwaysOnDisplay ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-400">
                <label htmlFor="settings-amoled-dimming-range">
                  On-Pixels Dimming Ratio ({settings.amoledDimmingRatio ?? 45}% dimmed · {100 - (settings.amoledDimmingRatio ?? 45)}% active luminance)
                </label>
              </div>
              <input
                id="settings-amoled-dimming-range"
                type="range"
                min={10}
                max={85}
                step={5}
                value={settings.amoledDimmingRatio ?? 45}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    amoledDimmingRatio: Number(e.target.value),
                  })
                }
                className="mt-2 w-full accent-teal-600 cursor-pointer"
              />
            </div>
          </div>

          {/* 4. Notification Sound Settings */}
          <div className="space-y-4 pt-3 border-t border-slate-200/70 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Block Notification Bell Sound
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  playNotificationBell(
                    settings.notificationTone,
                    settings.notificationVolume
                  )
                }
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5" />
                Test Bell Sound
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="notification-tone-select"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-400"
                >
                  Bell Tone Profile
                </label>
                <select
                  id="notification-tone-select"
                  value={settings.notificationTone}
                  onChange={(e) => {
                    const nextTone = e.target.value as NotificationTone;
                    onUpdateSettings({ ...settings, notificationTone: nextTone });
                    playNotificationBell(nextTone, settings.notificationVolume);
                  }}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                >
                  {(Object.keys(TONE_LABELS) as NotificationTone[]).map((t) => (
                    <option key={t} value={t}>
                      {TONE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="notification-volume-range"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-400"
                >
                  Bell Volume ({settings.notificationVolume}%)
                </label>
                <input
                  id="notification-volume-range"
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={settings.notificationVolume}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      notificationVolume: Number(e.target.value),
                    })
                  }
                  className="mt-2.5 w-full accent-teal-600 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* 5. Target Exam Goal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-200/70 dark:border-slate-800">
            <div>
              <label
                htmlFor="target-exam-date"
                className="block text-xs font-medium text-slate-600 dark:text-slate-400"
              >
                Target Board Exam Date
              </label>
              <input
                id="target-exam-date"
                type="date"
                value={settings.targetExamDate}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, targetExamDate: e.target.value })
                }
                className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono tabular-nums"
              />
            </div>

            <div>
              <label
                htmlFor="target-percentile-goal"
                className="block text-xs font-medium text-slate-600 dark:text-slate-400"
              >
                Target Percentile Goal (1–99th)
              </label>
              <input
                id="target-percentile-goal"
                type="number"
                min={1}
                max={99}
                value={settings.targetPercentileGoal}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    targetPercentileGoal: Math.min(99, Math.max(1, Number(e.target.value) || 80)),
                  })
                }
                className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono tabular-nums"
              />
            </div>
          </div>
        </div>

        {/* Right 6 Cols: Customizable Study Schedule Planner */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Custom Weekly Study Schedule
              </h2>
            </div>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums">
              {schedule.filter((s) => s.enabled).length} active days
            </span>
          </div>

          {/* Add Schedule Item Form */}
          <form
            onSubmit={handleAddScheduleBlock}
            className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3"
          >
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Add Scheduled Exam Block Session
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <select
                aria-label="Day of week"
                value={newDay}
                onChange={(e) => setNewDay(e.target.value as StudyScheduleItem['dayOfWeek'])}
                className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
              >
                {(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              <select
                aria-label="Scheduled exam profile"
                value={newProfileId}
                onChange={(e) => setNewProfileId(e.target.value as ExamProfileId)}
                className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
              >
                {(Object.keys(EXAM_PROFILES) as ExamProfileId[]).map((pid) => (
                  <option key={pid} value={pid}>
                    {EXAM_PROFILES[pid].shortCode}
                  </option>
                ))}
              </select>

              <input
                type="number"
                min={10}
                max={400}
                aria-label="Scheduled question count"
                value={newQuestions}
                onChange={(e) => setNewQuestions(e.target.value)}
                placeholder="Questions"
                className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono tabular-nums"
              />
            </div>

            <div className="flex items-center gap-2.5">
              <input
                type="text"
                placeholder="Session title (e.g., NBME 31 Morning Blocks)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
              />
              <input
                type="time"
                aria-label="Start time"
                value={newStartTime}
                onChange={(e) => setNewStartTime(e.target.value)}
                className="w-28 px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono tabular-nums"
              />
              <button
                type="submit"
                className="px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
          </form>

          {/* Schedule List */}
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {schedule.map((item) => (
              <div
                key={item.id}
                className={`py-3.5 flex items-center justify-between gap-3 ${
                  item.enabled ? '' : 'opacity-50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <input
                    type="checkbox"
                    checked={item.enabled}
                    onChange={() => toggleScheduleItem(item.id)}
                    aria-label={`Enable ${item.activityTitle}`}
                    className="w-4 h-4 rounded accent-teal-600 cursor-pointer shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                      <span className="font-bold text-teal-700 dark:text-teal-400">
                        {item.dayOfWeek} · {item.startTime}
                      </span>
                      <span>·</span>
                      <span>{EXAM_PROFILES[item.profileId]?.shortCode}</span>
                      <span>·</span>
                      <span>
                        {item.targetQuestions} Qs ({item.targetBlocks} blk)
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {item.activityTitle}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onLaunchScheduledSession(item)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-teal-600 hover:text-white dark:hover:bg-teal-600 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Play className="w-3 h-3" />
                    Load
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteScheduleItem(item.id)}
                    aria-label={`Delete schedule ${item.activityTitle}`}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
