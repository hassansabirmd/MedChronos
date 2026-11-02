/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Timer, BarChart3, Settings } from 'lucide-react';
import { ExamSetupAndTimerView } from './components/ExamSetupAndTimerView';
import { HistoryAndAnalyticsView } from './components/HistoryAndAnalyticsView';
import { SettingsAndScheduleView } from './components/SettingsAndScheduleView';
import { PWAInstallButton, OfflineIndicator } from './components/PWAInstallButton';
import {
  AppSettings,
  ExamHistoryEntry,
  StudyScheduleItem,
  loadHistory,
  saveHistory,
  loadSettings,
  saveSettings,
  loadSchedule,
  saveSchedule,
  loadActiveSession,
} from './utils/storageAndSeed';
import { ExamProfileId } from './utils/examLogic';

type ActiveTab = 'simulator' | 'history' | 'settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('simulator');
  const [isExamTimerLocked, setIsExamTimerLocked] = useState<boolean>(() =>
    Boolean(loadActiveSession())
  );
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [history, setHistory] = useState<ExamHistoryEntry[]>(() => loadHistory());
  const [schedule, setSchedule] = useState<StudyScheduleItem[]>(() => loadSchedule());
  const [activePreset, setActivePreset] = useState<{
    profileId: ExamProfileId;
    examTitle: string;
    totalQuestions: number;
  } | null>(null);

  // Sync Dark Mode class with <html> element
  useEffect(() => {
    const root = document.documentElement;
    if (settings.darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.darkMode]);

  const handleUpdateSettings = (next: AppSettings) => {
    setSettings(next);
    saveSettings(next);
  };

  const handleAddHistoryEntry = (entry: ExamHistoryEntry) => {
    const next = [entry, ...history];
    setHistory(next);
    saveHistory(next);
  };

  const handleDeleteHistoryEntry = (id: string) => {
    const next = history.filter((item) => item.id !== id);
    setHistory(next);
    saveHistory(next);
  };

  const handleUpdateSchedule = (next: StudyScheduleItem[]) => {
    setSchedule(next);
    saveSchedule(next);
  };

  const handleLaunchScheduledSession = (item: StudyScheduleItem) => {
    setActivePreset({
      profileId: item.profileId,
      examTitle: item.activityTitle,
      totalQuestions: item.targetQuestions,
    });
    setActiveTab('simulator');
  };

  return (
    <div
      className={`min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 ${
        isExamTimerLocked ? 'pb-0' : 'pb-20 md:pb-8'
      }`}
    >
      {/* Top Bar Contract: Hidden when in Full-Screen Exam Simulation Timer Mode */}
      {!isExamTimerLocked && (
        <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border-b border-slate-200 dark:border-slate-800">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-4 sm:px-6 lg:px-8 h-14">
            {/* Zone 1: Single text element wordmark */}
            <a
              href="#simulator"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('simulator');
              }}
              className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0"
            >
              MedChronos
            </a>

            {/* Zone 2: Concise single-line navigation links */}
            <nav
              aria-label="Primary Navigation"
              className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400"
            >
              <a
                href="#simulator"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab('simulator');
                }}
                className={`py-1 transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'simulator'
                    ? 'text-teal-700 dark:text-teal-400 font-semibold underline underline-offset-8 decoration-2'
                    : 'hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                Exam Simulator
              </a>
              <a
                href="#history"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab('history');
                }}
                className={`py-1 transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'history'
                    ? 'text-teal-700 dark:text-teal-400 font-semibold underline underline-offset-8 decoration-2'
                    : 'hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                History & Percentile
              </a>
              <a
                href="#settings"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab('settings');
                }}
                className={`py-1 transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'settings'
                    ? 'text-teal-700 dark:text-teal-400 font-semibold underline underline-offset-8 decoration-2'
                    : 'hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                Schedule & Settings
              </a>
            </nav>

            {/* Zone 3: 1 Primary Action (PWA Install) */}
            <div className="flex items-center shrink-0">
              <PWAInstallButton />
            </div>
          </div>
        </header>
      )}

      {/* Main Content Area */}
      <main
        className={
          isExamTimerLocked
            ? 'flex-1 w-full flex flex-col'
            : 'flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8'
        }
      >
        {(activeTab === 'simulator' || isExamTimerLocked) && (
          <ExamSetupAndTimerView
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onSessionLockChange={setIsExamTimerLocked}
            onSaveSessionToHistory={handleAddHistoryEntry}
            onNavigateToHistory={() => {
              setIsExamTimerLocked(false);
              setActiveTab('history');
            }}
            initialPreset={activePreset}
            onClearPreset={() => setActivePreset(null)}
          />
        )}

        {!isExamTimerLocked && activeTab === 'history' && (
          <HistoryAndAnalyticsView
            history={history}
            targetPercentileGoal={settings.targetPercentileGoal}
            onAddManualEntry={handleAddHistoryEntry}
            onDeleteEntry={handleDeleteHistoryEntry}
          />
        )}

        {!isExamTimerLocked && activeTab === 'settings' && (
          <SettingsAndScheduleView
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            schedule={schedule}
            onUpdateSchedule={handleUpdateSchedule}
            onLaunchScheduledSession={handleLaunchScheduledSession}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar: Hidden when in Full-Screen Exam Simulation Timer Mode */}
      {!isExamTimerLocked && (
        <nav
          aria-label="Mobile Navigation"
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border-t border-slate-200 dark:border-slate-800 grid grid-cols-3 items-center h-14"
        >
          <button
            type="button"
            onClick={() => setActiveTab('simulator')}
            className={`flex flex-col items-center justify-center h-full text-[11px] font-medium cursor-pointer ${
              activeTab === 'simulator'
                ? 'text-teal-700 dark:text-teal-400 font-bold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Timer className="w-4 h-4 mb-0.5" />
            <span>Simulator</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center justify-center h-full text-[11px] font-medium cursor-pointer ${
              activeTab === 'history'
                ? 'text-teal-700 dark:text-teal-400 font-bold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <BarChart3 className="w-4 h-4 mb-0.5" />
            <span>History</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center justify-center h-full text-[11px] font-medium cursor-pointer ${
              activeTab === 'settings'
                ? 'text-teal-700 dark:text-teal-400 font-bold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Settings className="w-4 h-4 mb-0.5" />
            <span>Settings</span>
          </button>
        </nav>
      )}

      <OfflineIndicator />
    </div>
  );
}
