import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Flag,
  Lightbulb,
  MessageSquareText,
  Mic,
  MicOff,
  Plus,
  Send,
  Sparkles,
  Volume2,
} from 'lucide-react';
import type {
  CefrLevel,
  ChatTurn,
  DomainCategory,
  GestureCategory,
  GestureDefinition,
  HintSuggestion,
  ScenarioTemplate,
  TutorProfile,
} from '../core/types';
import { DOMAIN_LIST } from '../core/sentenceEngine';

interface TutorDockProps {
  tutors: TutorProfile[];
  activeTutor: TutorProfile;
  onSelectTutor: (t: TutorProfile) => void;
  activeGesture: GestureDefinition;
  tutorGestures: GestureDefinition[];
  onTriggerGesture: (g: GestureDefinition) => void;
  scenarios: ScenarioTemplate[];
  activeScenario: ScenarioTemplate;
  onSelectScenario: (s: ScenarioTemplate) => void;
  cefrLevel: CefrLevel;
  onChangeCefr: (level: CefrLevel) => void;
  fallback2D: boolean;
  onToggleFallback2D: () => void;
  cameraPreset: 'portrait' | 'desk' | 'side';
  onChangeCameraPreset: (p: 'portrait' | 'desk' | 'side') => void;
  turns: ChatTurn[];
  latestHints: HintSuggestion[];
  isLoading: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  inputText: string;
  onChangeInput: (val: string) => void;
  onSendMessage: (text?: string) => void;
  onTriggerProactivePrompt: () => void;
  onToggleMic: () => void;
  onReplayTurn: (turn: ChatTurn) => void;
  onSaveCorrectionToSrs: (userTurn: ChatTurn) => void;
  onReportTurn: (turnId: string) => void;
  errorMsg: string | null;
}

const CEFR_LEVELS: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1'];

const GESTURE_CATEGORIES: Array<{ id: 'all' | GestureCategory; label: string }> = [
  { id: 'all', label: 'All (50)' },
  { id: 'greeting', label: 'Greeting' },
  { id: 'encouragement', label: 'Praise' },
  { id: 'thinking', label: 'Thinking' },
  { id: 'explanation', label: 'Explain' },
  { id: 'reaction', label: 'Reaction' },
];

export function TutorDock({
  tutors,
  activeTutor,
  onSelectTutor,
  activeGesture,
  tutorGestures,
  onTriggerGesture,
  scenarios,
  activeScenario,
  onSelectScenario,
  cefrLevel,
  onChangeCefr,
  fallback2D,
  onToggleFallback2D,
  cameraPreset,
  onChangeCameraPreset,
  turns,
  latestHints,
  isLoading,
  isListening,
  isSpeaking,
  inputText,
  onChangeInput,
  onSendMessage,
  onTriggerProactivePrompt,
  onToggleMic,
  onReplayTurn,
  onSaveCorrectionToSrs,
  onReportTurn,
  errorMsg,
}: TutorDockProps) {
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [hintsOpen, setHintsOpen] = useState(false);
  const [gesturesOpen, setGesturesOpen] = useState(false);
  const [gestureCategory, setGestureCategory] = useState<'all' | GestureCategory>('all');
  const [scenarioDomainFilter, setScenarioDomainFilter] = useState<DomainCategory | 'all'>('all');
  const [showCorrection, setShowCorrection] = useState(true);

  const visibleScenarios =
    scenarioDomainFilter === 'all'
      ? scenarios
      : scenarios.filter((s) => s.category === scenarioDomainFilter);

  const latestAssistant = [...turns].reverse().find((t) => t.role === 'assistant');
  const latestUserWithCorrection = [...turns]
    .reverse()
    .find((t) => t.role === 'user' && t.correctedContent);

  const filteredGestures =
    gestureCategory === 'all'
      ? tutorGestures
      : tutorGestures.filter((g) => g.category === gestureCategory);

  return (
    <>
      {/* Expandable Full Conversation Transcript Sheet */}
      {transcriptOpen && (
        <div
          role="dialog"
          aria-label="Conversation transcript"
          className="pointer-events-auto fixed inset-x-4 sm:inset-x-auto sm:right-6 top-16 bottom-48 sm:w-[420px] z-30 bg-slate-900/98 border border-slate-800 rounded-xl flex flex-col shadow-2xl overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <span className="text-sm font-semibold text-white">
              Session Transcript · {activeScenario.title}
            </span>
            <button
              type="button"
              onClick={() => setTranscriptOpen(false)}
              className="text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              Close
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {turns.map((turn) => (
              <div
                key={turn.id}
                className={`rounded-lg px-3.5 py-2.5 text-sm ${
                  turn.role === 'user'
                    ? 'bg-sky-950/70 border border-sky-800/60 text-sky-50 ml-6'
                    : 'bg-slate-950 border border-slate-800 text-slate-100 mr-6'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span>{turn.role === 'user' ? 'You' : activeTutor.name}</span>
                  <span>{turn.timestamp}</span>
                </div>
                <p>{turn.content}</p>
                {turn.correctedContent && (
                  <div className="mt-2 pt-2 border-t border-sky-800/40 text-xs">
                    <p className="text-amber-300 font-medium">Better: {turn.correctedContent}</p>
                    {turn.feedbackNoteKo && (
                      <p className="text-slate-300 mt-0.5">{turn.feedbackNoteKo}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expandable 50-Gesture Choreography Side Drawer (keeps tutor face unobstructed) */}
      {gesturesOpen && (
        <div
          role="region"
          aria-label="Tutor 50 gestures palette"
          data-testid="gestures-drawer"
          className="pointer-events-auto fixed inset-x-3 sm:inset-x-auto sm:right-6 top-16 bottom-[230px] sm:bottom-48 sm:w-[410px] z-30 bg-slate-900/98 border border-slate-700 rounded-xl flex flex-col shadow-2xl overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-slate-800 flex items-start justify-between gap-2 shrink-0">
            <div>
              <h3 className="text-sm font-semibold text-white">
                {activeTutor.name} · {tutorGestures.length} Gestures
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                #{String(activeGesture.index).padStart(2, '0')} {activeGesture.name} ({activeGesture.nameKo})
              </p>
            </div>
            <button
              type="button"
              onClick={() => setGesturesOpen(false)}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 cursor-pointer shrink-0"
            >
              Close
            </button>
          </div>

          <div className="px-3 py-2 border-b border-slate-800/80 flex flex-wrap items-center gap-1.5 shrink-0">
            {GESTURE_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setGestureCategory(cat.id)}
                className={`px-2 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  gestureCategory === cat.id
                    ? 'bg-sky-500 text-slate-950'
                    : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3 grid grid-cols-1 gap-1.5">
            {filteredGestures.map((g) => {
              const isActive = g.id === activeGesture.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  data-testid={`gesture-item-${g.index}`}
                  onClick={() => onTriggerGesture(g)}
                  className={`text-left px-3 py-2 rounded-lg border transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-sky-500/20 border-sky-400 text-white'
                      : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs font-medium">
                    <span className="truncate">
                      {String(g.index).padStart(2, '0')}. {g.name}
                    </span>
                    <span className="text-[11px] text-slate-400 capitalize shrink-0">{g.mood}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">{g.nameKo}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Unified Collapsible Bottom Control Stack (Zero Overlap, Solid rgba) */}
      <div className="pointer-events-none fixed bottom-3 left-1/2 -translate-x-1/2 w-[min(980px,96vw)] z-20 flex flex-col items-center gap-2">

        {/* Hints Popover */}
        {!dockCollapsed && hintsOpen && (
          <div className="pointer-events-auto w-full max-w-[660px] bg-slate-900 border border-slate-700 rounded-xl p-4 shadow-2xl">
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-sm font-semibold text-white">Suggested English Replies</h3>
              <button
                type="button"
                onClick={() => setHintsOpen(false)}
                className="text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Close
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {(latestHints.length > 0
                ? latestHints
                : [
                    { english: 'Could you repeat that a bit slower?', korean: '조금만 천천히 다시 말씀해 주시겠어요?' },
                    { english: "I'm doing well, thanks! How about you?", korean: '잘 지내고 있어요, 감사합니다! 선생님은 어떠세요?' },
                    { english: "Let's try a slightly more challenging topic.", korean: '조금 더 도전적인 주제로 이야기해 봐요.' },
                  ]
              ).map((h, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setHintsOpen(false);
                    onSendMessage(h.english);
                  }}
                  className="text-left px-3 py-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 transition-colors cursor-pointer"
                >
                  <p className="text-sm text-white font-medium">{h.english}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{h.korean}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error Banner */}
        {!dockCollapsed && errorMsg && (
          <div
            role="alert"
            className="pointer-events-auto w-full max-w-[820px] bg-red-950/95 border border-red-700/80 text-red-100 px-4 py-2 rounded-xl text-xs"
          >
            {errorMsg}
          </div>
        )}

        {/* Shadow Feedback Banner */}
        {!dockCollapsed && latestUserWithCorrection && showCorrection && (
          <div className="pointer-events-auto w-full max-w-[820px] bg-slate-900/95 border border-amber-500/40 rounded-xl px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="min-w-0 flex-1">
              <span className="text-amber-300 font-medium">더 자연스러운 표현: </span>
              <span className="text-white font-medium">{latestUserWithCorrection.correctedContent}</span>
              {latestUserWithCorrection.feedbackNoteKo && (
                <span className="text-slate-300 ml-2">· {latestUserWithCorrection.feedbackNoteKo}</span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onSaveCorrectionToSrs(latestUserWithCorrection)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-medium cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                Save to SRS
              </button>
              <button
                type="button"
                onClick={() => setShowCorrection(false)}
                className="text-slate-400 hover:text-slate-200 px-1.5 py-1 cursor-pointer"
              >
                Hide
              </button>
            </div>
          </div>
        )}

        {/* Subtitle Card */}
        {!dockCollapsed && latestAssistant && (
          <div className="pointer-events-auto w-full max-w-[820px] bg-slate-950/94 border border-slate-800 rounded-xl px-4 py-2.5 flex items-start justify-between gap-4 shadow-xl">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mb-0.5">
                <span className="font-medium text-sky-300">{activeTutor.name}</span>
                <span aria-hidden="true">·</span>
                <span>{activeGesture.name}</span>
                <span aria-hidden="true">·</span>
                <span>{isSpeaking ? 'Speaking' : `CEFR ${cefrLevel}`}</span>
              </div>
              <p className="text-sm sm:text-base text-slate-100 leading-snug">
                {latestAssistant.content}
              </p>
              {latestAssistant.proactiveChallenge && (
                <p className="text-xs text-amber-300/95 mt-1">
                  응용 미션: {latestAssistant.proactiveChallenge}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                aria-label="Replay tutor audio"
                onClick={() => onReplayTurn(latestAssistant)}
                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <Volume2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="Report AI response"
                onClick={() => onReportTurn(latestAssistant.id)}
                className={`p-2 rounded-lg transition-colors cursor-pointer ${
                  latestAssistant.reported
                    ? 'bg-red-900/40 text-red-300'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Flag className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Collapse / Expand Toggle + Main Control Dock */}
        <div className="w-full flex flex-col items-center">
          <button
            type="button"
            onClick={() => setDockCollapsed((v) => !v)}
            className="pointer-events-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-t-lg bg-slate-900/95 border border-b-0 border-slate-800 text-xs font-medium text-slate-300 hover:text-white cursor-pointer"
          >
            {dockCollapsed ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                Show Controls
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                Hide Controls
              </>
            )}
          </button>

          {!dockCollapsed && (
            <div className="pointer-events-auto w-full bg-slate-900/96 border border-slate-800 rounded-xl p-3 shadow-2xl flex flex-col gap-2.5">
              {/* Row 1: Compact Control Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="sr-only" htmlFor="scenario-domain-filter">
                    Domain
                  </label>
                  <select
                    id="scenario-domain-filter"
                    value={scenarioDomainFilter}
                    onChange={(e) => {
                      const nextDomain = e.target.value as DomainCategory | 'all';
                      setScenarioDomainFilter(nextDomain);
                      const firstMatch =
                        nextDomain === 'all'
                          ? scenarios[0]
                          : scenarios.find((s) => s.category === nextDomain);
                      if (firstMatch) onSelectScenario(firstMatch);
                    }}
                    className="bg-slate-950 border border-slate-700 text-sky-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-sky-400"
                  >
                    <option value="all">전체 300상황</option>
                    {DOMAIN_LIST.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.labelKo} ({d.targetScenarioCount})
                      </option>
                    ))}
                  </select>

                  <label className="sr-only" htmlFor="scenario-select">
                    Scenario
                  </label>
                  <select
                    id="scenario-select"
                    value={activeScenario.id}
                    onChange={(e) => {
                      const found = scenarios.find((s) => s.id === e.target.value);
                      if (found) onSelectScenario(found);
                    }}
                    className="max-w-[230px] sm:max-w-[280px] bg-slate-950 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-sky-400"
                  >
                    {visibleScenarios.map((s) => (
                      <option key={s.id} value={s.id}>
                        #{String(s.index).padStart(3, '0')} {s.titleKo} ({s.title})
                      </option>
                    ))}
                  </select>

                  {/* CEFR Segmented Selector */}
                  <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
                    {CEFR_LEVELS.map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => onChangeCefr(lvl)}
                        className={`px-2 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                          cefrLevel === lvl
                            ? 'bg-sky-500 text-slate-950'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>

                  {/* 5 Human Tutor Switcher */}
                  <div
                    className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 overflow-x-auto max-w-full"
                    role="group"
                    aria-label="Select human tutor"
                  >
                    {tutors.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        data-testid={`tutor-select-${t.id}`}
                        onClick={() => onSelectTutor(t)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                          activeTutor.id === t.id
                            ? 'bg-slate-800 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {t.name.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {(['portrait', 'desk', 'side'] as const).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => onChangeCameraPreset(preset)}
                      className={`px-2 py-1 rounded-md text-xs capitalize transition-colors cursor-pointer ${
                        cameraPreset === preset
                          ? 'bg-slate-800 text-sky-300 border border-slate-700'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setHintsOpen(false);
                      setTranscriptOpen(false);
                      setGesturesOpen((v) => !v);
                    }}
                    data-testid="toggle-gestures-btn"
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs border transition-colors cursor-pointer whitespace-nowrap ${
                      gesturesOpen
                        ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                        : 'bg-slate-950 border-slate-800 text-slate-200 hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                    Gestures ({tutorGestures.length})
                  </button>
                  <button
                    type="button"
                    onClick={onToggleFallback2D}
                    className={`px-2.5 py-1 rounded-md text-xs border transition-colors cursor-pointer whitespace-nowrap ${
                      fallback2D
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-200'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    {fallback2D ? '3D Mode' : '2D Fallback'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGesturesOpen(false);
                      setTranscriptOpen((v) => !v);
                    }}
                    aria-label="Toggle transcript"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 text-slate-300 hover:text-white cursor-pointer whitespace-nowrap"
                  >
                    <MessageSquareText className="w-3.5 h-3.5" />
                    Transcript ({turns.length})
                  </button>
                </div>
              </div>

              {/* Row 2: Voice + Hint + Input Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <button
                  type="button"
                  onClick={onToggleMic}
                  aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
                  className={`h-10 px-3 rounded-lg flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                    isListening
                      ? 'bg-red-500 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-100'
                  }`}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  <span className="hidden sm:inline">{isListening ? 'Listening' : 'Speak'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setGesturesOpen(false);
                    setHintsOpen((v) => !v);
                  }}
                  aria-label="Show reply hints"
                  className="h-10 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer shrink-0"
                >
                  <Lightbulb className="w-4 h-4" />
                  <span className="hidden sm:inline">Hints</span>
                </button>

                <button
                  type="button"
                  onClick={onTriggerProactivePrompt}
                  disabled={isLoading}
                  aria-label="Ask AI tutor to proactively initiate"
                  className="h-10 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-45 text-sky-300 flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                >
                  <Sparkles className="w-4 h-4" />
                  <span className="hidden md:inline">AI 질문</span>
                </button>

                <label className="sr-only" htmlFor="tutor-chat-input">
                  Speak or type in English
                </label>
                <input
                  id="tutor-chat-input"
                  type="text"
                  maxLength={500}
                  value={inputText}
                  onChange={(e) => onChangeInput(e.target.value)}
                  placeholder="Type or speak your English response..."
                  className="flex-1 min-w-0 h-10 px-3.5 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
                />

                <button
                  type="submit"
                  disabled={isLoading || !inputText.trim()}
                  aria-label="Send message"
                  className="h-10 px-4 rounded-lg bg-sky-400 hover:bg-sky-300 disabled:opacity-45 disabled:cursor-not-allowed text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isLoading ? 'Thinking...' : 'Send'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
