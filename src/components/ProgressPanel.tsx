import { Flame, ShieldCheck, Target, TrendingUp } from 'lucide-react';
import type { LearningStats } from '../core/types';

interface ProgressPanelProps {
  stats: LearningStats;
  onChangeDailyGoal: (minutes: 5 | 10 | 15) => void;
  onUseStreakFreeze: () => void;
}

export function ProgressPanel({
  stats,
  onChangeDailyGoal,
  onUseStreakFreeze,
}: ProgressPanelProps) {
  const maxWords = Math.max(...stats.weeklyWords.map((d) => d.words), 100);
  const goalPct = Math.min(100, Math.round((stats.todayMinutes / stats.dailyGoalMinutes) * 100));

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 text-slate-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div>
          <h1 className="font-display text-2xl font-semibold text-white">
            Weekly Fluency &amp; Retention Analytics
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Track daily speaking volume, pronunciation score progression, and recurring grammar patterns
          </p>
        </div>

        {/* 4-Column KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Daily Speaking Goal</span>
              <Target className="w-4 h-4 text-sky-400" />
            </div>
            <p className="font-mono-tabular text-2xl font-semibold text-white">
              {stats.todayMinutes} / {stats.dailyGoalMinutes} min
            </p>
            <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
              <div className="h-full bg-sky-400 rounded-full" style={{ width: `${goalPct}%` }} />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Learning Streak</span>
              <Flame className="w-4 h-4 text-amber-400" />
            </div>
            <p className="font-mono-tabular text-2xl font-semibold text-white">
              {stats.streakCount} Days
            </p>
            <p className="text-xs text-slate-400">
              {stats.streakFreezeAvailable ? '1 Streak Freeze ready' : 'Streak Freeze active today'}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Weekly Words Spoken</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="font-mono-tabular text-2xl font-semibold text-white">
              {stats.totalWordsSpoken.toLocaleString()}
            </p>
            <p className="text-xs text-slate-400">Across 3D Tutor &amp; Shadowing</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Daily Goal Setting</span>
              <ShieldCheck className="w-4 h-4 text-sky-400" />
            </div>
            <div className="flex items-center gap-1.5 pt-1">
              {([5, 10, 15] as const).map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => onChangeDailyGoal(mins)}
                  className={`flex-1 py-1.5 rounded-md text-xs font-medium cursor-pointer ${
                    stats.dailyGoalMinutes === mins
                      ? 'bg-sky-400 text-slate-950 font-semibold'
                      : 'bg-slate-950 text-slate-300 border border-slate-800 hover:text-white'
                  }`}
                >
                  {mins}m
                </button>
              ))}
            </div>
            {stats.streakFreezeAvailable && (
              <button
                type="button"
                onClick={onUseStreakFreeze}
                className="text-xs text-amber-300 hover:text-amber-200 underline cursor-pointer"
              >
                Activate Streak Freeze
              </button>
            )}
          </div>
        </div>

        {/* Weekly Chart + Top Grammar Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-white">
                7-Day Spoken Word Volume &amp; Pronunciation Score
              </h2>
              <span className="text-xs text-slate-400">Words / Avg Score</span>
            </div>
            <div className="grid grid-cols-7 gap-3 items-end h-48 pt-6">
              {stats.weeklyWords.map((item) => {
                const heightPct = Math.max(14, Math.round((item.words / maxWords) * 100));
                return (
                  <div key={item.day} className="flex flex-col items-center h-full justify-end gap-1.5">
                    <span className="font-mono-tabular text-[11px] text-sky-300">
                      {item.score}%
                    </span>
                    <div className="w-full max-w-[38px] flex-1 flex items-end">
                      <div
                        className="w-full bg-sky-500/80 hover:bg-sky-400 rounded-t-md transition-colors"
                        style={{ height: `${heightPct}%` }}
                        title={`${item.words} words · ${item.score}%`}
                      />
                    </div>
                    <span className="text-xs text-slate-400">{item.day}</span>
                    <span className="font-mono-tabular text-[11px] text-slate-500">
                      {item.words}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h2 className="font-display text-base font-semibold text-white">
              Frequent Grammar Patterns (Top 3)
            </h2>
            <div className="space-y-3">
              {stats.topGrammarIssues.map((issue, idx) => (
                <div
                  key={issue.pattern}
                  className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 space-y-1"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">
                      {idx + 1}. {issue.pattern}
                    </span>
                    <span className="font-mono-tabular text-amber-300">{issue.count}x</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{issue.tip}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
