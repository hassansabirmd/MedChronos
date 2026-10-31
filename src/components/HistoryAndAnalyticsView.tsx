import React, { useState } from 'react';
import { Plus, Trash2, TrendingUp, Calendar, Award, BookOpen } from 'lucide-react';
import { EXAM_PROFILES, ExamProfileId, formatMinutesToHoursAndMinutes } from '../utils/examLogic';
import { ExamHistoryEntry } from '../utils/storageAndSeed';

interface HistoryAndAnalyticsViewProps {
  history: ExamHistoryEntry[];
  targetPercentileGoal: number;
  onAddManualEntry: (entry: ExamHistoryEntry) => void;
  onDeleteEntry: (id: string) => void;
}

export const HistoryAndAnalyticsView: React.FC<HistoryAndAnalyticsViewProps> = ({
  history,
  targetPercentileGoal,
  onAddManualEntry,
  onDeleteEntry,
}) => {
  const [filterProfile, setFilterProfile] = useState<string>('ALL');
  const [showAddForm, setShowAddForm] = useState<boolean>(false);

  // Manual past exam form state
  const [examTitle, setExamTitle] = useState<string>('');
  const [profileId, setProfileId] = useState<ExamProfileId>('USMLE_STEP_1');
  const [dateISO, setDateISO] = useState<string>(new Date().toISOString().slice(0, 10));
  const [totalQuestions, setTotalQuestions] = useState<string>('200');
  const [blocksCompleted, setBlocksCompleted] = useState<string>('10');
  const [studyMinutes, setStudyMinutes] = useState<string>('300');
  const [percentileScore, setPercentileScore] = useState<string>('');
  const [percentCorrect, setPercentCorrect] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  const filteredHistory = history.filter((item) =>
    filterProfile === 'ALL' ? true : item.profileId === filterProfile
  );

  // Sort chronologically for the chart (oldest to newest)
  const chronological = [...filteredHistory].sort((a, b) =>
    a.dateISO.localeCompare(b.dateISO)
  );

  // Summary metrics
  const latestPercentile =
    chronological.length > 0 ? chronological[chronological.length - 1].percentileScore : 0;
  const averagePercentile =
    chronological.length > 0
      ? Math.round(
          chronological.reduce((acc, item) => acc + item.percentileScore, 0) /
            chronological.length
        )
      : 0;
  const totalQuestionsLogged = filteredHistory.reduce(
    (acc, item) => acc + item.totalQuestions,
    0
  );
  const totalMinutesLogged = filteredHistory.reduce(
    (acc, item) => acc + item.totalStudyMinutes,
    0
  );

  const handleLogPreviousExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!examTitle.trim()) {
      setFormError('Please enter an exam name (e.g., NBME 27, UWSA 2).');
      return;
    }
    const pct = Number(percentileScore);
    if (!percentileScore.trim() || Number.isNaN(pct) || pct < 1 || pct > 99) {
      setFormError('Please enter a valid percentile score between 1 and 99.');
      return;
    }

    const prof = EXAM_PROFILES[profileId];
    const newEntry: ExamHistoryEntry = {
      id: `manual-${Date.now()}`,
      examTitle: examTitle.trim(),
      profileId,
      profileName: prof.name,
      dateISO: dateISO || new Date().toISOString().slice(0, 10),
      totalQuestions: Math.max(1, Number(totalQuestions) || prof.standardTotalQuestions),
      blocksCompleted: Math.max(1, Number(blocksCompleted) || prof.standardBlocks),
      totalBlocksPlanned: Math.max(1, Number(blocksCompleted) || prof.standardBlocks),
      totalStudyMinutes: Math.max(1, Number(studyMinutes) || 240),
      breakMinutesUsed: 30,
      percentileScore: Math.round(pct),
      percentCorrect: percentCorrect ? Math.min(100, Math.max(0, Number(percentCorrect))) : undefined,
      autoContinuedBlocksCount: 0,
      notes: notes.trim() || 'Logged historical practice assessment.',
    };

    onAddManualEntry(newEntry);
    setExamTitle('');
    setPercentileScore('');
    setPercentCorrect('');
    setNotes('');
    setFormError(null);
    setShowAddForm(false);
  };

  return (
    <div className="space-y-8">
      {/* Header & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <p className="text-xs font-medium text-teal-700 dark:text-teal-400">
            Longitudinal Performance & Percentile Analytics
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Exam History & Percentile Trajectory
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setShowAddForm((prev) => !prev)}
          className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          {showAddForm ? 'Close Score Logger' : 'Log Previous Exam Score'}
        </button>
      </div>

      {/* Add Previous Test History Form */}
      {showAddForm && (
        <form
          onSubmit={handleLogPreviousExam}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5"
        >
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Save Previous Test History & Percentile Score
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Import past NBME, UWorld, ABIM, AMC, or MCPS assessments
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label
                htmlFor="manual-exam-title"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Assessment Name *
              </label>
              <input
                id="manual-exam-title"
                type="text"
                placeholder="e.g., NBME 31"
                value={examTitle}
                onChange={(e) => {
                  setExamTitle(e.target.value);
                  setFormError(null);
                }}
                className="mt-1 w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="manual-exam-profile"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Exam Profile
              </label>
              <select
                id="manual-exam-profile"
                value={profileId}
                onChange={(e) => setProfileId(e.target.value as ExamProfileId)}
                className="mt-1 w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              >
                {(Object.keys(EXAM_PROFILES) as ExamProfileId[]).map((pid) => (
                  <option key={pid} value={pid}>
                    {EXAM_PROFILES[pid].name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="manual-percentile"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Percentile Score (1–99) *
              </label>
              <input
                id="manual-percentile"
                type="number"
                min={1}
                max={99}
                placeholder="e.g., 86"
                value={percentileScore}
                onChange={(e) => {
                  setPercentileScore(e.target.value);
                  setFormError(null);
                }}
                className="mt-1 w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono tabular-nums"
              />
            </div>

            <div>
              <label
                htmlFor="manual-date"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Test Date
              </label>
              <input
                id="manual-date"
                type="date"
                value={dateISO}
                onChange={(e) => setDateISO(e.target.value)}
                className="mt-1 w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono tabular-nums"
              />
            </div>

            <div>
              <label
                htmlFor="manual-questions"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Total Questions
              </label>
              <input
                id="manual-questions"
                type="number"
                min={1}
                max={600}
                value={totalQuestions}
                onChange={(e) => setTotalQuestions(e.target.value)}
                className="mt-1 w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono tabular-nums"
              />
            </div>

            <div>
              <label
                htmlFor="manual-blocks"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Blocks Completed
              </label>
              <input
                id="manual-blocks"
                type="number"
                min={1}
                max={30}
                value={blocksCompleted}
                onChange={(e) => setBlocksCompleted(e.target.value)}
                className="mt-1 w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono tabular-nums"
              />
            </div>

            <div>
              <label
                htmlFor="manual-duration"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Duration (Minutes)
              </label>
              <input
                id="manual-duration"
                type="number"
                min={1}
                max={1000}
                value={studyMinutes}
                onChange={(e) => setStudyMinutes(e.target.value)}
                className="mt-1 w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono tabular-nums"
              />
            </div>

            <div>
              <label
                htmlFor="manual-correct"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                % Correct (Optional)
              </label>
              <input
                id="manual-correct"
                type="number"
                min={0}
                max={100}
                placeholder="e.g., 82"
                value={percentCorrect}
                onChange={(e) => setPercentCorrect(e.target.value)}
                className="mt-1 w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono tabular-nums"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="manual-notes"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Notes & Weak Areas
            </label>
            <input
              id="manual-notes"
              type="text"
              placeholder="e.g., Improved cardiology timing; 6 minutes spare break time."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>

          {formError && (
            <p role="alert" className="text-xs font-semibold text-rose-600 dark:text-rose-400">
              {formError}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold cursor-pointer"
            >
              Save Record to History
            </button>
          </div>
        </form>
      )}

      {/* 4 KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Latest Percentile</span>
            <Award className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="mt-2 text-3xl font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums">
            {latestPercentile}th
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            Target goal: {targetPercentileGoal}th percentile
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Mean Percentile</span>
            <TrendingUp className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="mt-2 text-3xl font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums">
            {averagePercentile}th
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            Across {filteredHistory.length} recorded exams
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Questions Simulated</span>
            <BookOpen className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="mt-2 text-3xl font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums">
            {totalQuestionsLogged.toLocaleString()}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            Timed board vignettes
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Total Timed Stamina</span>
            <Calendar className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="mt-2 text-3xl font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums">
            {formatMinutesToHoursAndMinutes(totalMinutesLogged)}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            Cumulative exam block time
          </p>
        </div>
      </div>

      {/* Percentile Trajectory Visualization Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Percentile Progression Curve
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Visualizing exam percentile scores over time relative to your {targetPercentileGoal}th percentile target line
            </p>
          </div>

          {/* Interactive Profile Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            {(['ALL', 'USMLE_STEP_1', 'USMLE_STEP_2', 'ABIM', 'AMC', 'MCPS'] as const).map(
              (tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilterProfile(tab)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    filterProfile === tab
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {tab === 'ALL' ? 'All Exams' : EXAM_PROFILES[tab].shortCode}
                </button>
              )
            )}
          </div>
        </div>

        {chronological.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No exam records match the selected filter.
            </p>
            <button
              type="button"
              onClick={() => setFilterProfile('ALL')}
              className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              Show All Recorded Exams
            </button>
          </div>
        ) : (
          <div className="space-y-6 pt-2">
            {/* Visual Bar Trajectory Chart with Target Threshold Line */}
            <div className="relative pt-6 pb-2 px-4 rounded-xl bg-slate-50/80 dark:bg-slate-950/60">
              {/* Target Percentile Reference Line */}
              <div
                className="absolute left-4 right-4 border-t border-dashed border-teal-600/60 dark:border-teal-400/60 pointer-events-none flex justify-end"
                style={{
                  bottom: `${Math.min(92, Math.max(12, targetPercentileGoal * 0.72 + 16))}%`,
                }}
              >
                <span className="-mt-4 text-[11px] font-mono font-semibold text-teal-700 dark:text-teal-400 bg-slate-50 dark:bg-slate-950 px-1.5 tabular-nums">
                  Goal: {targetPercentileGoal}th
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 items-end min-h-[150px]">
                {chronological.map((item) => {
                  const meetsGoal = item.percentileScore >= targetPercentileGoal;
                  return (
                    <div
                      key={item.id}
                      className="flex flex-col justify-end h-full space-y-2"
                    >
                      <div className="flex items-baseline justify-between font-mono tabular-nums">
                        <span
                          className={`text-lg font-bold ${
                            meetsGoal
                              ? 'text-teal-700 dark:text-teal-400'
                              : 'text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          {item.percentileScore}th
                        </span>
                        {item.percentCorrect !== undefined && (
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            {item.percentCorrect}%
                          </span>
                        )}
                      </div>

                      <div className="w-full h-24 bg-slate-200/70 dark:bg-slate-800/70 rounded-lg flex items-end p-1">
                        <div
                          className={`w-full rounded-md transition-all ${
                            meetsGoal
                              ? 'bg-teal-600 dark:bg-teal-500'
                              : 'bg-slate-600 dark:bg-slate-400'
                          }`}
                          style={{ height: `${Math.min(100, Math.max(10, item.percentileScore))}%` }}
                        />
                      </div>

                      <div className="pt-1">
                        <div className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                          {item.examTitle}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums whitespace-nowrap truncate">
                          {item.dateISO} · {EXAM_PROFILES[item.profileId]?.shortCode || item.profileName}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detailed Historical Log Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Saved Practice Exams & Percentile Log
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            {filteredHistory.length} entries
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/60 dark:bg-slate-950/50">
                <th className="py-3 px-6">Exam Name & Notes</th>
                <th className="py-3 px-4">Profile</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Questions / Blocks</th>
                <th className="py-3 px-4 text-right">Duration</th>
                <th className="py-3 px-4 text-right">Percentile</th>
                <th className="py-3 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
              {filteredHistory.map((entry) => (
                <tr
                  key={entry.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3.5 px-6">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {entry.examTitle}
                    </div>
                    {entry.notes && (
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-md truncate">
                        {entry.notes}
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {entry.profileName}
                  </td>
                  <td className="py-3.5 px-4 text-xs font-mono text-slate-600 dark:text-slate-400 tabular-nums whitespace-nowrap">
                    {entry.dateISO}
                  </td>
                  <td className="py-3.5 px-4 text-xs font-mono text-right text-slate-700 dark:text-slate-300 tabular-nums whitespace-nowrap">
                    {entry.totalQuestions} Qs · {entry.blocksCompleted}/{entry.totalBlocksPlanned} blk
                  </td>
                  <td className="py-3.5 px-4 text-xs font-mono text-right text-slate-700 dark:text-slate-300 tabular-nums whitespace-nowrap">
                    {formatMinutesToHoursAndMinutes(entry.totalStudyMinutes)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                    <span className="font-bold text-teal-700 dark:text-teal-400">
                      {entry.percentileScore}th
                    </span>
                    {entry.percentCorrect !== undefined && (
                      <span className="text-xs text-slate-500 dark:text-slate-400 ml-1.5">
                        ({entry.percentCorrect}%)
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-6 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => onDeleteEntry(entry.id)}
                      aria-label={`Delete ${entry.examTitle}`}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
