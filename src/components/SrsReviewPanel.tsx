import { useState } from 'react';
import { CheckCircle2, Plus, RotateCw, Volume2 } from 'lucide-react';
import type { ReviewQuality, SrsCard } from '../core/types';
import { computeSm2Schedule, getDueCards } from '../core/srs';

interface SrsReviewPanelProps {
  cards: SrsCard[];
  onReviewCard: (cardId: string, quality: ReviewQuality) => void;
  onAddCustomCard: (frontText: string, backText: string) => void;
}

export function SrsReviewPanel({
  cards,
  onReviewCard,
  onAddCustomCard,
}: SrsReviewPanelProps) {
  const [revealed, setRevealed] = useState(false);
  const [frontInput, setFrontInput] = useState('');
  const [backInput, setBackInput] = useState('');

  const dueCards = getDueCards(cards);
  const activeCard = dueCards[0] ?? null;

  const speakPhrase = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      window.speechSynthesis.speak(u);
    }
  };

  const handleGrade = (quality: ReviewQuality) => {
    if (!activeCard) return;
    setRevealed(false);
    onReviewCard(activeCard.id, quality);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!frontInput.trim() || !backInput.trim()) return;
    onAddCustomCard(frontInput.trim(), backInput.trim());
    setFrontInput('');
    setBackInput('');
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 text-slate-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold text-white">
              Spaced Repetition Review (SM-2)
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Review tutor corrections and YouTube expressions at optimal forgetting-curve intervals
            </p>
          </div>
          <div className="text-sm text-slate-300 font-mono-tabular">
            Due now: <span className="text-sky-300 font-semibold">{dueCards.length}</span> / {cards.length} cards
          </div>
        </div>

        {/* Active Flashcard Deck */}
        {activeCard ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>
                {activeCard.sourceType === 'youtube_clip' ? 'YouTube Shadowing Clip' : 'Tutor Correction'}
                {activeCard.keyExpression ? ` · ${activeCard.keyExpression}` : ''}
              </span>
              <span className="font-mono-tabular">
                Interval: {activeCard.intervalDays}d · Ease: {activeCard.easeFactor.toFixed(2)}
              </span>
            </div>

            <div className="py-4 space-y-4">
              <p className="text-lg sm:text-xl text-slate-200 font-medium">{activeCard.frontText}</p>

              {revealed ? (
                <div className="pt-4 border-t border-slate-800 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <p className="font-display text-xl sm:text-2xl font-semibold text-white">
                      {activeCard.backText}
                    </p>
                    <button
                      type="button"
                      aria-label="Speak target phrase"
                      onClick={() => speakPhrase(activeCard.backText)}
                      className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 cursor-pointer shrink-0"
                    >
                      <Volume2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setRevealed(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-sky-400 hover:bg-sky-300 text-slate-950 font-semibold text-sm cursor-pointer"
                >
                  <RotateCw className="w-4 h-4" />
                  Reveal English Expression
                </button>
              )}
            </div>

            {revealed && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                {(
                  [
                    { q: 1 as ReviewQuality, label: 'Again', sub: 'Reset' },
                    { q: 3 as ReviewQuality, label: 'Hard', sub: '' },
                    { q: 4 as ReviewQuality, label: 'Good', sub: '' },
                    { q: 5 as ReviewQuality, label: 'Easy', sub: '' },
                  ] as const
                ).map((btn) => {
                  const preview = computeSm2Schedule(activeCard, btn.q);
                  return (
                    <button
                      key={btn.q}
                      type="button"
                      onClick={() => handleGrade(btn.q)}
                      className="px-4 py-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-colors cursor-pointer"
                    >
                      <p className="text-sm font-semibold text-white">{btn.label}</p>
                      <p className="text-xs text-slate-400 font-mono-tabular mt-0.5">
                        {preview.intervalDays} {preview.intervalDays === 1 ? 'day' : 'days'}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <h2 className="font-display text-lg font-semibold text-white">All caught up for now</h2>
            <p className="text-sm text-slate-400">
              You have completed every scheduled review card. Save more phrases from 3D Tutor or Shadowing.
            </p>
          </div>
        )}

        {/* Quick Add Card + Deck Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleCreate}
            className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3"
          >
            <h2 className="font-display text-base font-semibold text-white">Add Custom Card</h2>
            <div>
              <label htmlFor="srs-front" className="block text-xs text-slate-400 mb-1">
                Korean Cue / Situation
              </label>
              <input
                id="srs-front"
                type="text"
                value={frontInput}
                onChange={(e) => setFrontInput(e.target.value)}
                placeholder="예: 회의 일정을 다음 주 화요일로 미루고 싶을 때"
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white"
              />
            </div>
            <div>
              <label htmlFor="srs-back" className="block text-xs text-slate-400 mb-1">
                Target English Sentence
              </label>
              <input
                id="srs-back"
                type="text"
                value={backInput}
                onChange={(e) => setBackInput(e.target.value)}
                placeholder="e.g. Could we push the meeting back to next Tuesday?"
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white"
              />
            </div>
            <button
              type="submit"
              disabled={!frontInput.trim() || !backInput.trim()}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-sky-400 hover:bg-sky-300 disabled:opacity-45 text-slate-950 font-semibold text-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add to Review Queue
            </button>
          </form>

          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <h2 className="font-display text-base font-semibold text-white">
              Scheduled Deck ({cards.length})
            </h2>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {cards.map((c) => (
                <div
                  key={c.id}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-white font-medium truncate">{c.backText}</p>
                    <p className="text-xs text-slate-400 truncate">{c.frontText}</p>
                  </div>
                  <div className="text-right shrink-0 font-mono-tabular text-xs text-slate-400">
                    <div>{c.intervalDays}d interval</div>
                    <div>EF {c.easeFactor.toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
