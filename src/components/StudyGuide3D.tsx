import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BookmarkPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MessageSquarePlus,
  Repeat,
  RotateCcw,
  Search,
  Sparkles,
  Volume2,
} from 'lucide-react';
import {
  DOMAIN_LIST,
  SENTENCE_FORM_META,
  filterCoreSentences,
  filterScenarios,
  getDailyHabitBatch,
  getDefaultSlotMap,
  renderSentenceWithSlots,
} from '../core/sentenceEngine';
import { CORE_SENTENCES_500, SCENARIOS_300_LINKED } from '../data/sentences500';
import type {
  CefrLevel,
  CoreSentence,
  DomainCategory,
  GestureDefinition,
  HabitProgress,
  ScenarioTemplate,
  SentenceFormMode,
  TutorExpressionPhoto,
  TutorMood,
  TutorProfile,
  VisemeId,
} from '../core/types';
import { resolveAssetUrl } from '../core/androidBridge';
import { TutorStage3D, type PlaybackTimeline } from './TutorStage3D';

interface StudyGuide3DProps {
  tutors: TutorProfile[];
  activeTutor: TutorProfile;
  onSelectTutor: (t: TutorProfile) => void;
  mood: TutorMood;
  activeGestureDef: GestureDefinition;
  gestureNonce: number;
  isSpeaking: boolean;
  playbackRef: React.MutableRefObject<PlaybackTimeline>;
  fallback2D: boolean;
  onWebGlLost: () => void;
  tutorExpressions: TutorExpressionPhoto[];
  previewExpression: TutorExpressionPhoto | null;
  onPreviewExpression: (exp: TutorExpressionPhoto | null) => void;
  onSpeakText: (text: string, speed?: number, mood?: TutorMood, gestureSlug?: string) => void;
  onStopSpeech: () => void;
  habitProgress: HabitProgress;
  onCompleteHabitSentence: (sentence: CoreSentence, renderedText: string, formMode: SentenceFormMode) => void;
  onRecordTransformation: () => void;
  onSyncWordAndSentence: (sentence: CoreSentence, renderedText: string) => void;
  onLaunchActiveAiChat: (scenario: ScenarioTemplate, seedSentence: string) => void;
  initialDomain?: DomainCategory;
  initialSentenceId?: number;
  cefrLevel: CefrLevel;
}

export function StudyGuide3D({
  tutors,
  activeTutor,
  onSelectTutor,
  mood,
  activeGestureDef,
  gestureNonce,
  isSpeaking,
  playbackRef,
  fallback2D,
  onWebGlLost,
  tutorExpressions,
  previewExpression,
  onPreviewExpression,
  onSpeakText,
  onStopSpeech,
  habitProgress,
  onCompleteHabitSentence,
  onRecordTransformation,
  onSyncWordAndSentence,
  onLaunchActiveAiChat,
  initialDomain,
  initialSentenceId,
}: StudyGuide3DProps) {
  const initialMatchedSentence = useMemo(() => {
    if (initialSentenceId) {
      const exact = CORE_SENTENCES_500.find((s) => s.id === initialSentenceId);
      if (exact) return exact;
    }
    if (initialDomain) {
      return CORE_SENTENCES_500.find((s) => s.domain === initialDomain) ?? CORE_SENTENCES_500[0];
    }
    return CORE_SENTENCES_500[0];
  }, [initialDomain, initialSentenceId]);

  const [selectedDomain, setSelectedDomain] = useState<DomainCategory | 'all'>(() => {
    if (initialSentenceId) return initialMatchedSentence.domain;
    return initialDomain ?? 'all';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(
    () => initialMatchedSentence.scenarioId,
  );

  const [selectedSentenceId, setSelectedSentenceId] = useState<number>(
    () => initialMatchedSentence.id,
  );
  const [formMode, setFormMode] = useState<SentenceFormMode>('statement');
  const [slotValues, setSlotValues] = useState<Record<string, string>>(() =>
    getDefaultSlotMap(initialMatchedSentence),
  );
  const [practiceSpeed, setPracticeSpeed] = useState<number>(0.92);
  const [autoShadowLoop, setAutoShadowLoop] = useState(false);
  const [shadowPromptBanner, setShadowPromptBanner] = useState<string | null>(null);
  const [showDialogues, setShowDialogues] = useState(false);
  const [showExpressionDb, setShowExpressionDb] = useState(false);
  const [visemeFilter, setVisemeFilter] = useState<VisemeId | 'ALL'>('ALL');
  const [expressionQuery, setExpressionQuery] = useState('');
  const [habitOnlyMode, setHabitOnlyMode] = useState(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const filteredTutorExpressions = useMemo(() => {
    const q = expressionQuery.trim().toLowerCase();
    return tutorExpressions.filter((item) => {
      if (visemeFilter !== 'ALL' && item.visemeId !== visemeFilter) return false;
      if (!q) return true;
      return (
        item.photoCode.toLowerCase().includes(q) ||
        item.expressionCode.toLowerCase().includes(q) ||
        item.ipa.toLowerCase().includes(q) ||
        item.sampleWord.toLowerCase().includes(q) ||
        item.nameKo.toLowerCase().includes(q)
      );
    });
  }, [tutorExpressions, visemeFilter, expressionQuery]);

  const filteredScenarios = useMemo(
    () => filterScenarios(SCENARIOS_300_LINKED, selectedDomain, searchQuery),
    [selectedDomain, searchQuery],
  );

  const activeScenario = useMemo(
    () =>
      SCENARIOS_300_LINKED.find((s) => s.id === selectedScenarioId) ??
      filteredScenarios[0] ??
      SCENARIOS_300_LINKED[0],
    [selectedScenarioId, filteredScenarios],
  );

  const habitBatch = useMemo(
    () => getDailyHabitBatch(CORE_SENTENCES_500, habitProgress, 10),
    [habitProgress],
  );

  const visibleSentences = useMemo(() => {
    if (habitOnlyMode) return habitBatch;
    const matched = filterCoreSentences(CORE_SENTENCES_500, selectedDomain, searchQuery);
    return matched.length > 0 ? matched : CORE_SENTENCES_500;
  }, [habitOnlyMode, habitBatch, selectedDomain, searchQuery]);

  const activeSentence = useMemo(
    () =>
      CORE_SENTENCES_500.find((s) => s.id === selectedSentenceId) ??
      visibleSentences[0] ??
      CORE_SENTENCES_500[0],
    [selectedSentenceId, visibleSentences],
  );

  const activeIndexInList = Math.max(
    0,
    visibleSentences.findIndex((s) => s.id === activeSentence.id),
  );

  const selectSentence = (sentence: CoreSentence) => {
    setSelectedSentenceId(sentence.id);
    setSelectedScenarioId(sentence.scenarioId);
    setSlotValues(getDefaultSlotMap(sentence));
    setShadowPromptBanner(null);
  };

  useEffect(() => {
    if (initialSentenceId) {
      const target = CORE_SENTENCES_500.find((s) => s.id === initialSentenceId);
      if (target) {
        setSelectedDomain(target.domain);
        setSelectedSentenceId(target.id);
        setSelectedScenarioId(target.scenarioId);
        setSlotValues(getDefaultSlotMap(target));
      }
    } else if (initialDomain) {
      const firstInDom = CORE_SENTENCES_500.find((s) => s.domain === initialDomain);
      if (firstInDom) {
        setSelectedDomain(initialDomain);
        setSelectedSentenceId(firstInDom.id);
        setSelectedScenarioId(firstInDom.scenarioId);
        setSlotValues(getDefaultSlotMap(firstInDom));
      }
    }
  }, [initialDomain, initialSentenceId]);

  const rendered = useMemo(
    () => renderSentenceWithSlots(activeSentence, formMode, slotValues),
    [activeSentence, formMode, slotValues],
  );

  // Auto Listen -> Pause -> Shadow 3-step Habit Loop
  useEffect(() => {
    if (!autoShadowLoop) return;
    let cancelled = false;
    let timerId = 0;

    const runStep = () => {
      if (cancelled) return;
      const gestureSlug = formMode === 'question' ? 'curious_head_cock' : 'articulate_enunciation';
      const targetMood: TutorMood = formMode === 'question' ? 'surprised' : 'encouraging';
      setShadowPromptBanner('1단계: 3D 튜터 발음을 집중해서 들으세요...');
      onSpeakText(rendered.text, practiceSpeed, targetMood, gestureSlug);

      timerId = window.setTimeout(() => {
        if (cancelled) return;
        setShadowPromptBanner('2단계: 지금 큰 소리로 따라 말해보세요! (Shadow Now)');
        timerId = window.setTimeout(() => {
          if (cancelled) return;
          runStep();
        }, 3200);
      }, 3600);
    };

    runStep();
    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [autoShadowLoop, rendered.text, formMode, practiceSpeed, onSpeakText]);

  const handleSwapSlotWord = (slotId: string, newWord: string) => {
    const nextSlots = { ...slotValues, [slotId]: newWord };
    setSlotValues(nextSlots);
    onRecordTransformation();
    const nextRendered = renderSentenceWithSlots(activeSentence, formMode, nextSlots);
    onSpeakText(
      nextRendered.text,
      practiceSpeed,
      formMode === 'question' ? 'surprised' : 'happy',
      'key_point_stress',
    );
  };

  const handleChangeForm = (nextForm: SentenceFormMode) => {
    setFormMode(nextForm);
    onRecordTransformation();
    const nextRendered = renderSentenceWithSlots(activeSentence, nextForm, slotValues);
    const gestureMap: Record<SentenceFormMode, string> = {
      statement: 'warm_welcome_nod',
      question: 'curious_head_cock',
      negative: 'thoughtful_brow_nod',
      polite: 'affirming_double_nod',
      past: 'story_recall_tilt',
    };
    onSpeakText(
      nextRendered.text,
      practiceSpeed,
      nextForm === 'question' ? 'surprised' : 'encouraging',
      gestureMap[nextForm],
    );
  };

  const handlePrevSentence = () => {
    const prevIdx = (activeIndexInList - 1 + visibleSentences.length) % visibleSentences.length;
    selectSentence(visibleSentences[prevIdx]);
  };

  const handleNextSentence = () => {
    const nextIdx = (activeIndexInList + 1) % visibleSentences.length;
    selectSentence(visibleSentences[nextIdx]);
  };

  const isCompletedToday = habitProgress.completedSentenceIds.includes(activeSentence.id);
  const habitPct = Math.min(
    100,
    Math.round((habitProgress.completedSentenceIds.length / habitProgress.dailyTarget) * 100),
  );

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-950 text-slate-100">
      {/* Left/Top Zone: Live Moving 3D Tutor Stage */}
      <section className="relative h-60 sm:h-72 lg:h-full lg:w-[42%] shrink-0 overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-800/80 bg-[#0c111d]">
        <TutorStage3D
          tutor={activeTutor}
          mood={mood}
          activeGestureDef={activeGestureDef}
          gestureNonce={gestureNonce}
          isSpeaking={isSpeaking}
          playbackRef={playbackRef}
          fallback2D={fallback2D}
          onWebGlLost={onWebGlLost}
          cameraPreset="portrait"
          previewExpression={previewExpression}
        />

        {/* Compact Top Tutor Switcher */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-1 bg-slate-950/85 border border-slate-800 rounded-lg p-1 backdrop-blur-sm max-w-full overflow-x-auto">
            {tutors.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onSelectTutor(t)}
                className={`px-2 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTutor.id === t.id
                    ? 'bg-sky-400 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {t.name.split(' ')[0]}
              </button>
            ))}
          </div>

          <span className="hidden sm:inline-flex text-[11px] text-slate-300 bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1 whitespace-nowrap truncate max-w-[220px]">
            {activeTutor.name} · {activeGestureDef.nameKo}
          </span>
        </div>

        {/* Live Spoken Caption Over Stage */}
        <div className="absolute bottom-3 left-3 right-3 bg-slate-950/88 border border-slate-800 rounded-xl px-4 py-2.5 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-2 text-xs text-slate-400 mb-1">
            <span>
              {activeSentence.code} · {activeScenario.titleKo}
            </span>
            <span className="tabular-nums">
              {isSpeaking ? 'Speaking & Lip-Syncing' : 'Ready to Speak'}
            </span>
          </div>
          <p className="text-sm sm:text-base font-medium text-white leading-snug">{rendered.text}</p>
          {shadowPromptBanner && (
            <p className="text-xs text-sky-300 mt-1">{shadowPromptBanner}</p>
          )}
        </div>
      </section>

      {/* Right/Bottom Zone: 300 Scenarios · 500 Sentences · Grammar & Word Swapper · Habit Builder */}
      <section className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-5">
        {/* Daily Habit Loop Bar */}
        <div className="bg-slate-900/75 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-400">
              <span className="text-slate-200 font-semibold whitespace-nowrap">오늘의 핵심 문장 습관 루틴</span>
              <span aria-hidden="true" className="hidden sm:inline">·</span>
              <span className="tabular-nums text-sky-300 whitespace-nowrap">
                {habitProgress.completedSentenceIds.length} / {habitProgress.dailyTarget} 문장 완료 ({habitPct}%)
              </span>
              <span aria-hidden="true" className="hidden sm:inline">·</span>
              <span className="tabular-nums whitespace-nowrap">변형 연습 {habitProgress.transformedCount}회</span>
            </div>
            <div className="w-full sm:w-80 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-400 transition-all duration-300"
                style={{ width: `${habitPct}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setHabitOnlyMode((v) => !v)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap cursor-pointer ${
                habitOnlyMode
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                  : 'bg-slate-950 text-slate-200 border-slate-700 hover:border-slate-500'
              }`}
            >
              {habitOnlyMode ? '오늘 10문장 집중 모드 ON' : '오늘 10문장 습관 코스'}
            </button>
            <button
              type="button"
              onClick={() => onLaunchActiveAiChat(activeScenario, rendered.text)}
              className="px-3 py-1.5 text-xs font-semibold bg-sky-400 hover:bg-sky-300 text-slate-950 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              AI 능동 대화 시작
            </button>
          </div>
        </div>

        {/* 7 Domain Filter Tabs + Search */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => {
                setSelectedDomain('all');
                setHabitOnlyMode(false);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                selectedDomain === 'all'
                  ? 'bg-sky-400 text-slate-950 border-sky-400'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white'
              }`}
            >
              전체 300상황 · 500문장
            </button>
            {DOMAIN_LIST.map((dom) => (
              <button
                key={dom.id}
                type="button"
                onClick={() => {
                  setSelectedDomain(dom.id);
                  setHabitOnlyMode(false);
                  const firstScenario = SCENARIOS_300_LINKED.find((s) => s.category === dom.id);
                  const firstSentence = CORE_SENTENCES_500.find((s) => s.domain === dom.id);
                  if (firstScenario) setSelectedScenarioId(firstScenario.id);
                  if (firstSentence) selectSentence(firstSentence);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedDomain === dom.id
                    ? 'bg-sky-400 text-slate-950 border-sky-400'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white'
                }`}
              >
                {dom.labelKo} ({dom.targetScenarioCount})
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <label className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="300개 상황·500문장·단어 검색 (예: 은행, 타이어, coffee)..."
                aria-label="Search scenarios and sentences"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
              />
            </label>

            <div className="flex items-center gap-2">
              <select
                aria-label="Select one of 300 real-life scenarios"
                value={activeScenario.id}
                onChange={(e) => {
                  const found = SCENARIOS_300_LINKED.find((s) => s.id === e.target.value);
                  if (!found) return;
                  setSelectedScenarioId(found.id);
                  const linkedSentence = CORE_SENTENCES_500.find((sent) =>
                    found.coreSentenceIds.includes(sent.id),
                  );
                  if (linkedSentence) selectSentence(linkedSentence);
                }}
                className="flex-1 min-w-0 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-sky-400"
              >
                {filteredScenarios.map((s) => (
                  <option key={s.id} value={s.id}>
                    #{String(s.index).padStart(3, '0')} {s.titleKo} ({s.title})
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setShowDialogues((v) => !v)}
                className={`px-3 py-2 text-xs font-medium rounded-lg border whitespace-nowrap shrink-0 cursor-pointer ${
                  showDialogues
                    ? 'bg-sky-400 text-slate-950 border-sky-400'
                    : 'bg-slate-900 text-slate-200 border-slate-800 hover:border-slate-600'
                }`}
              >
                상황 대화 {activeScenario.dialogues.length}턴
              </button>

              <button
                type="button"
                onClick={() => setShowExpressionDb((v) => !v)}
                className={`px-3 py-2 text-xs font-medium rounded-lg border whitespace-nowrap shrink-0 cursor-pointer ${
                  showExpressionDb
                    ? 'bg-amber-400 text-slate-950 border-amber-300 font-semibold'
                    : 'bg-slate-900 text-amber-200 border-slate-800 hover:border-amber-400/60'
                }`}
              >
                발음·표정 DB ({tutorExpressions.length})
              </button>
            </div>
          </div>
        </div>

        {/* Per-Tutor 52 Gemini Banana Pronunciation Mouth & Expression Photo DB Explorer */}
        {showExpressionDb && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3" data-testid="expression-db-panel">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  {activeTutor.name} · Gemini Banana 발음 입모양 & 표정 사진 DB ({filteredTutorExpressions.length} / {tutorExpressions.length})
                </h3>
                <p className="text-xs text-slate-400">
                  카드를 누르면 해당 튜터의 실사 입모양·표정으로 전환되고 영어 단어를 발음합니다.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {previewExpression && (
                  <button
                    type="button"
                    onClick={() => onPreviewExpression(null)}
                    className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 text-slate-200 hover:text-white cursor-pointer"
                  >
                    미리보기 해제
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowExpressionDb(false)}
                  className="text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  닫기
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <input
                type="text"
                value={expressionQuery}
                onChange={(e) => setExpressionQuery(e.target.value)}
                placeholder="음소·단어 검색 (예: thank, /θ/, latte)..."
                aria-label="Search tutor mouth expressions"
                className="w-56 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
              />
              {(['ALL', 'PP', 'FF', 'TH', 'DD', 'kk', 'CH', 'SS', 'nn', 'RR', 'aa', 'E', 'I', 'O', 'U', 'sil'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVisemeFilter(v)}
                  className={`px-2 py-1 text-[11px] font-mono rounded-lg border cursor-pointer ${
                    visemeFilter === v
                      ? 'bg-sky-400 text-slate-950 border-sky-400 font-semibold'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-600'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>

            <div className="max-h-72 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pr-1">
              {filteredTutorExpressions.map((item) => {
                const isSelected = previewExpression?.photoCode === item.photoCode;
                const bgPosX = `${(item.tileCol / 3) * 100}%`;
                const bgPosY = `${(item.tileRow / 3) * 100}%`;
                return (
                  <button
                    key={item.photoCode}
                    type="button"
                    onClick={() => onPreviewExpression(item)}
                    data-photo-code={item.photoCode}
                    className={`text-left rounded-lg border p-2.5 flex items-start gap-2.5 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-sky-950/70 border-sky-400'
                        : 'bg-slate-950/80 border-slate-800 hover:border-sky-500/60'
                    }`}
                  >
                    <div
                      aria-hidden="true"
                      className="w-12 h-12 rounded-lg shrink-0 border border-slate-700 bg-[#0c111d] bg-no-repeat"
                      style={{
                        backgroundImage: `url("${resolveAssetUrl(item.atlasUrl)}")`,
                        backgroundSize: '400% 400%',
                        backgroundPosition: `${bgPosX} ${bgPosY}`,
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1 text-[11px]">
                        <span className="font-mono font-semibold text-sky-300">{item.photoCode}</span>
                        <span className="font-mono text-amber-300">{item.ipa} · {item.visemeId}</span>
                      </div>
                      <p className="text-xs font-semibold text-white truncate mt-0.5">
                        {item.sampleWord} · {item.mood}
                      </p>
                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5 leading-snug">
                        {item.articulatoryCueKo}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 10+ Dialogue Turns Panel for the Active Scenario */}
        {showDialogues && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  #{String(activeScenario.index).padStart(3, '0')} {activeScenario.titleKo} · 실전 {activeScenario.dialogues.length}턴 대화
                </h3>
                <p className="text-xs text-slate-400">
                  문장을 누르면 3D 튜터가 즉시 발음·립싱크로 시범을 보여줍니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDialogues(false)}
                className="text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                닫기
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {activeScenario.dialogues.map((line) => (
                <button
                  key={line.turn}
                  type="button"
                  onClick={() =>
                    onSpeakText(
                      line.english,
                      practiceSpeed,
                      line.speaker === 'tutor' ? 'encouraging' : 'happy',
                      line.speaker === 'tutor' ? 'warm_welcome_nod' : 'affirming_double_nod',
                    )
                  }
                  className="w-full text-left rounded-lg border border-slate-800 bg-slate-950/70 hover:border-sky-500/60 px-3 py-2 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                    <span>
                      Turn {line.turn} · {line.speaker === 'tutor' ? activeTutor.name : 'Learner'} · {line.grammarFocus}
                    </span>
                    <Volume2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  </div>
                  <p className="text-xs sm:text-sm text-white mt-0.5">{line.english}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{line.korean}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Active Core Sentence Transformation Card */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-xs text-slate-400 flex items-center gap-2 flex-wrap">
              <span className="font-mono font-semibold text-sky-300 tabular-nums">
                {activeSentence.code} / 500
              </span>
              <span aria-hidden="true">·</span>
              <span className="text-slate-200">{activeSentence.patternTitle}</span>
              <span aria-hidden="true">·</span>
              <span>
                핵심단어: <strong className="text-amber-300">{activeSentence.keyWord}</strong> ({activeSentence.keyWordKo})
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrevSentence}
                aria-label="Previous sentence"
                className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-white cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-slate-400 tabular-nums px-1">
                {activeIndexInList + 1} / {visibleSentences.length}
              </span>
              <button
                type="button"
                onClick={handleNextSentence}
                aria-label="Next sentence"
                className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-white cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 5 Grammar Form Controls: 평문 / 의문문 / 부정문 / 공손표현 / 과거 */}
          <div role="tablist" aria-label="Sentence grammar transformations" className="grid grid-cols-5 gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
            {SENTENCE_FORM_META.map((item) => {
              const active = formMode === item.mode;
              return (
                <button
                  key={item.mode}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => handleChangeForm(item.mode)}
                  className={`py-2 px-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    active
                      ? 'bg-sky-400 text-slate-950 font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  {item.labelKo}
                </button>
              );
            })}
          </div>

          {/* Rendered English Sentence with Highlighted Swappable Word Tokens */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-2">
            <p className="text-lg sm:text-xl font-display font-semibold text-white leading-relaxed">
              {rendered.text}
            </p>
            <p className="text-sm text-slate-300">{activeSentence.korean}</p>
            <p className="text-xs text-amber-300/95 pt-1 border-t border-slate-800/80">
              어법 가이드: {activeSentence.grammarTipKo}
            </p>
          </div>

          {/* Dynamic Word Substitution Slots */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>단어 교체 연습 (클릭하면 즉시 문장·어법 변환 + 3D 튜터 발음)</span>
              <button
                type="button"
                onClick={() => setSlotValues(getDefaultSlotMap(activeSentence))}
                className="flex items-center gap-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                기본 단어 복원
              </button>
            </div>

            {activeSentence.slots.map((slot) => (
              <div key={slot.id} className="space-y-1.5">
                <div className="text-xs text-slate-400">
                  {slot.labelKo} ({slot.label})
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {slot.options.map((opt) => {
                    const selected = slotValues[slot.id] === opt.word;
                    return (
                      <button
                        key={opt.word}
                        type="button"
                        onClick={() => handleSwapSlotWord(slot.id, opt.word)}
                        className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors text-left cursor-pointer ${
                          selected
                            ? 'bg-sky-400/20 border-sky-400 text-sky-200 font-medium'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        <span>{opt.word}</span>
                        <span className="text-[11px] text-slate-400 ml-1.5">({opt.ko})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Listen, Speed, Shadow Loop & Habit Check Actions */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                if (isSpeaking) {
                  onStopSpeech();
                } else {
                  onSpeakText(
                    rendered.text,
                    practiceSpeed,
                    formMode === 'question' ? 'surprised' : 'encouraging',
                    'articulate_enunciation',
                  );
                }
              }}
              className="px-3.5 py-2 text-xs font-semibold bg-sky-400 hover:bg-sky-300 text-slate-950 rounded-lg flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Volume2 className="w-4 h-4" />
              {isSpeaking ? 'Stop Audio' : '3D 튜터 듣기'}
            </button>

            <button
              type="button"
              onClick={() => setAutoShadowLoop((v) => !v)}
              className={`px-3 py-2 text-xs font-medium rounded-lg border flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                autoShadowLoop
                  ? 'bg-amber-400 text-slate-950 border-amber-300 font-semibold'
                  : 'bg-slate-950 text-slate-200 border-slate-700 hover:border-slate-500'
              }`}
            >
              <Repeat className="w-3.5 h-3.5" />
              {autoShadowLoop ? '반복 쉐도잉 중지' : '자동 듣고 따라하기'}
            </button>

            <button
              type="button"
              onClick={() => setPracticeSpeed((s) => (s === 0.92 ? 0.78 : s === 0.78 ? 1.05 : 0.92))}
              className="px-2.5 py-2 text-xs bg-slate-950 border border-slate-800 text-slate-300 rounded-lg hover:text-white tabular-nums cursor-pointer whitespace-nowrap"
            >
              속도 {practiceSpeed}x
            </button>

            <button
              type="button"
              onClick={() => {
                onCompleteHabitSentence(activeSentence, rendered.text, formMode);
                setSavedNotice('오늘의 습관 1문장 완료! 모체 단어앱에도 학습 기록이 전송되었습니다.');
                window.setTimeout(() => setSavedNotice(null), 2600);
              }}
              className={`px-3 py-2 text-xs font-semibold rounded-lg border flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                isCompletedToday
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-emerald-400'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              {isCompletedToday ? '오늘 따라 말하기 완료' : '따라 말했어요 (+습관)'}
            </button>

            <button
              type="button"
              onClick={() => {
                onSyncWordAndSentence(activeSentence, rendered.text);
                setSavedNotice(`"${activeSentence.keyWord}" + 현재 변형 문장을 단어앱 & SRS에 저장했습니다.`);
                window.setTimeout(() => setSavedNotice(null), 2600);
              }}
              className="px-3 py-2 text-xs bg-slate-950 border border-slate-700 hover:border-sky-400 text-slate-200 rounded-lg flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <BookmarkPlus className="w-3.5 h-3.5 text-sky-400" />
              단어앱·SRS 연동
            </button>
          </div>

          {savedNotice && (
            <p className="text-xs text-emerald-300 font-medium">{savedNotice}</p>
          )}
        </div>

        {/* Quick Sentence List (Next in Domain / Habit Queue) */}
        <div className="space-y-2 pb-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>
              {habitOnlyMode
                ? '오늘의 습관 추천 10문장'
                : `핵심 패턴 목록 (${visibleSentences.length}개 표시 중)`}
            </span>
            <button
              type="button"
              onClick={() => onLaunchActiveAiChat(activeScenario, rendered.text)}
              className="text-sky-300 hover:text-sky-200 flex items-center gap-1 cursor-pointer"
            >
              <MessageSquarePlus className="w-3.5 h-3.5" />
              이 문장으로 3D AI와 응용 대화
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {visibleSentences.slice(0, 12).map((item) => {
              const isCurrent = item.id === activeSentence.id;
              const done = habitProgress.completedSentenceIds.includes(item.id);
              const preview = renderSentenceWithSlots(item, 'statement', getDefaultSlotMap(item)).text;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectSentence(item)}
                  className={`text-left rounded-lg border px-3 py-2.5 transition-colors cursor-pointer ${
                    isCurrent
                      ? 'bg-sky-950/60 border-sky-400 text-white'
                      : 'bg-slate-900/60 border-slate-800 text-slate-200 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-0.5">
                    <span className="font-mono tabular-nums">
                      {item.code} · {item.keyWord}
                    </span>
                    <span className={done ? 'text-emerald-400' : 'text-slate-500'}>
                      {done ? '완료' : item.domain}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-white line-clamp-1">{preview}</p>
                  <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{item.korean}</p>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
