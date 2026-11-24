import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TopBar } from './components/TopBar';
import { TutorStage3D, type PlaybackTimeline } from './components/TutorStage3D';
import { TutorDock } from './components/TutorDock';
import { StudyGuide3D } from './components/StudyGuide3D';
import { ShadowingStudio } from './components/ShadowingStudio';
import { SrsReviewPanel } from './components/SrsReviewPanel';
import { ProgressPanel } from './components/ProgressPanel';
import { PrivacyModal } from './components/PrivacyModal';
import { computeSm2Schedule, getDueCards } from './core/srs';
import { findVisemeTimeForCharIndex, generateVisemeTimeline } from './core/viseme';
import { markHabitSentenceCompleted } from './core/sentenceEngine';
import {
  emitToAndroidHost,
  extractReadableErrorMessage,
  getApiUrl,
  parseEmbedConfigFromSearch,
  safeParseJsonResponse,
  setRuntimeApiBase,
} from './core/androidBridge';
import {
  INITIAL_SRS_CARDS,
  INITIAL_STATS,
  SCENARIO_TEMPLATES,
  TUTOR_PROFILES,
} from './data/seedData';
import { CORE_SENTENCES_500 } from './data/sentences500';
import { getTutorExpressionPhotos } from './data/tutorExpressionPhotos';
import { resolveGestureForTutor, TUTOR_GESTURES_BY_ID } from './data/gestures';
import type {
  ActiveTab,
  CefrLevel,
  ChatTurn,
  CoreSentence,
  DomainCategory,
  HabitProgress,
  HintSuggestion,
  LearningStats,
  ReviewQuality,
  ScenarioTemplate,
  SentenceFormMode,
  SrsCard,
  TutorExpressionPhoto,
  TutorGesture,
  TutorMood,
  TutorProfile,
  YouTubeClip,
} from './core/types';

const STORAGE_KEYS = {
  srs: 'fluentstage_srs_v1',
  stats: 'fluentstage_stats_v1',
  habit: 'fluentstage_habit_v1',
};

function loadStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function nowTimeLabel(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function App() {
  const initialEmbedCfg = useMemo(
    () =>
      typeof window !== 'undefined'
        ? parseEmbedConfigFromSearch(window.location.search)
        : { embed: false, apiBase: '', initialTab: 'tutor' as ActiveTab },
    [],
  );

  const initialTutor = useMemo(
    () =>
      TUTOR_PROFILES.find((t) => t.id === initialEmbedCfg.initialTutorId) ?? TUTOR_PROFILES[0],
    [initialEmbedCfg.initialTutorId],
  );
  const initialScenario = useMemo(
    () =>
      SCENARIO_TEMPLATES.find((s) => s.id === initialEmbedCfg.initialScenarioId) ??
      SCENARIO_TEMPLATES[0],
    [initialEmbedCfg.initialScenarioId],
  );

  const [embedMode, setEmbedMode] = useState<boolean>(initialEmbedCfg.embed);
  const [activeTab, setActiveTab] = useState<ActiveTab>(initialEmbedCfg.initialTab);
  const [activeTutor, setActiveTutor] = useState<TutorProfile>(initialTutor);
  const [activeScenario, setActiveScenario] = useState<ScenarioTemplate>(initialScenario);
  const [cefrLevel, setCefrLevel] = useState<CefrLevel>(
    initialEmbedCfg.initialCefr ?? initialScenario.cefr,
  );
  const [fallback2D, setFallback2D] = useState(false);
  const [cameraPreset, setCameraPreset] = useState<'portrait' | 'desk' | 'side'>('portrait');
  const [privacyOpen, setPrivacyOpen] = useState(false);

  const [mood, setMood] = useState<TutorMood>('encouraging');
  const [gesture, setGesture] = useState<TutorGesture>('warm_welcome_nod');
  const [gestureNonce, setGestureNonce] = useState(1);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [latestHints, setLatestHints] = useState<HintSuggestion[]>([]);
  const [tutorExpressions, setTutorExpressions] = useState<TutorExpressionPhoto[]>(() =>
    getTutorExpressionPhotos(initialTutor.id),
  );
  const [previewExpression, setPreviewExpression] = useState<TutorExpressionPhoto | null>(null);

  const [turns, setTurns] = useState<ChatTurn[]>(() => [
    {
      id: 'welcome-turn',
      role: 'assistant',
      content: initialScenario.tutorOpening,
      mood: 'encouraging',
      gesture: 'warm_welcome_nod',
      visemes: generateVisemeTimeline(initialScenario.tutorOpening, 1.0),
      timestamp: nowTimeLabel(),
    },
  ]);

  const [srsCards, setSrsCards] = useState<SrsCard[]>(() =>
    loadStored(STORAGE_KEYS.srs, INITIAL_SRS_CARDS),
  );
  const [stats, setStats] = useState<LearningStats>(() =>
    loadStored(STORAGE_KEYS.stats, INITIAL_STATS),
  );
  const todayIsoDate = new Date().toISOString().slice(0, 10);
  const [habitProgress, setHabitProgress] = useState<HabitProgress>(() => {
    const stored = loadStored<HabitProgress>(STORAGE_KEYS.habit, {
      dailyTarget: 10,
      completedSentenceIds: [],
      transformedCount: 0,
      shadowCompletedCount: 0,
      lastPracticedDate: todayIsoDate,
    });
    if (stored.lastPracticedDate !== todayIsoDate) {
      return { ...stored, completedSentenceIds: [], lastPracticedDate: todayIsoDate };
    }
    return stored;
  });
  const [guideDomainOverride, setGuideDomainOverride] = useState<DomainCategory | undefined>(
    initialEmbedCfg.initialDomain,
  );
  const [guideSentenceOverride, setGuideSentenceOverride] = useState<number | undefined>(
    initialEmbedCfg.initialSentenceId,
  );

  const playbackRef = useRef<PlaybackTimeline>({
    startedAtMs: 0,
    frames: [],
    active: false,
  });
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const speechFallbackTimerRef = useRef<number | null>(null);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.srs, JSON.stringify(srsCards));
    } catch {
      // ignore storage quota errors
    }
  }, [srsCards]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.stats, JSON.stringify(stats));
    } catch {
      // ignore storage quota errors
    }
  }, [stats]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.habit, JSON.stringify(habitProgress));
    } catch {
      // ignore storage quota errors
    }
  }, [habitProgress]);

  useEffect(() => {
    let cancelled = false;
    setPreviewExpression(null);
    setTutorExpressions(getTutorExpressionPhotos(activeTutor.id));
    fetch(getApiUrl(`/api/v1/visemes/tutors/${activeTutor.id}/expressions`))
      .then((res) => (res.ok ? safeParseJsonResponse<{ photos?: TutorExpressionPhoto[] }>(res) : null))
      .then((data) => {
        if (!cancelled && data?.photos && data.photos.length >= 50) {
          setTutorExpressions(data.photos);
        }
      })
      .catch(() => {
        // Fallback to local 52-photo catalog already set above
      });
    return () => {
      cancelled = true;
    };
  }, [activeTutor.id]);

  const dueSrsCount = useMemo(() => getDueCards(srsCards).length, [srsCards]);
  const tutorGestures = TUTOR_GESTURES_BY_ID[activeTutor.id];
  const activeGestureDef = useMemo(
    () => resolveGestureForTutor(activeTutor.id, gesture),
    [activeTutor.id, gesture],
  );

  const speedForCefr = (lvl: CefrLevel) => {
    if (lvl === 'A1') return 0.85;
    if (lvl === 'A2') return 0.92;
    return 1.0;
  };

  const stopOngoingSpeech = useCallback(() => {
    if (speechFallbackTimerRef.current !== null) {
      window.clearTimeout(speechFallbackTimerRef.current);
      speechFallbackTimerRef.current = null;
    }
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    playbackRef.current.active = false;
    playbackRef.current.audioElement = null;
    setIsSpeaking(false);
  }, []);

  const playTutorVoice = useCallback(
    async (
      text: string,
      visemes?: ReturnType<typeof generateVisemeTimeline>,
      existingBase64?: string,
      customSpeed?: number,
    ) => {
      stopOngoingSpeech();
      const speed = customSpeed ?? speedForCefr(cefrLevel);
      const frames = visemes && visemes.length > 0 ? visemes : generateVisemeTimeline(text, speed);
      const totalMs = Math.max(1200, frames.reduce((acc, f) => Math.max(acc, f.t + f.d), 0) + 180);

      const startVisemePlayback = (audioEl?: HTMLAudioElement | null) => {
        playbackRef.current = {
          startedAtMs: performance.now(),
          frames,
          active: true,
          audioElement: audioEl ?? null,
        };
        setIsSpeaking(true);
        emitToAndroidHost({ type: 'speech_started', text });
      };

      const finishVisemePlayback = () => {
        if (speechFallbackTimerRef.current !== null) {
          window.clearTimeout(speechFallbackTimerRef.current);
          speechFallbackTimerRef.current = null;
        }
        playbackRef.current.active = false;
        playbackRef.current.audioElement = null;
        setIsSpeaking(false);
        emitToAndroidHost({ type: 'speech_ended' });
      };

      const speakWithWebSpeechFallback = () => {
        if (window.AndroidTutorBridge?.speak) {
          startVisemePlayback(null);
          window.AndroidTutorBridge.speak(text, activeTutor.accent.includes('British') ? 'en-GB' : 'en-US', speed);
          speechFallbackTimerRef.current = window.setTimeout(finishVisemePlayback, totalMs);
          return;
        }
        emitToAndroidHost({
          type: 'request_native_tts',
          text,
          lang: activeTutor.accent.includes('British') ? 'en-GB' : 'en-US',
          rate: speed,
        });

        startVisemePlayback(null);
        // Guarantee lip-sync finishes cleanly even if browser/WebView suppresses speechSynthesis events
        speechFallbackTimerRef.current = window.setTimeout(finishVisemePlayback, totalMs);

        if ('speechSynthesis' in window) {
          try {
            window.speechSynthesis.cancel();
            window.setTimeout(() => {
              try {
                const u = new SpeechSynthesisUtterance(text);
                const targetLang = activeTutor.accent.includes('British') ? 'en-GB' : 'en-US';
                u.lang = targetLang;
                u.rate = speed;
                const voices = window.speechSynthesis.getVoices();
                const matchedVoice =
                  voices.find((v) => v.lang.toLowerCase().startsWith(targetLang.toLowerCase())) ??
                  voices.find((v) => v.lang.toLowerCase().startsWith('en'));
                if (matchedVoice) u.voice = matchedVoice;
                u.onboundary = (ev) => {
                  const targetMs = findVisemeTimeForCharIndex(frames, ev.charIndex);
                  if (targetMs !== null) {
                    playbackRef.current.startedAtMs = performance.now() - targetMs;
                  }
                };
                u.onend = finishVisemePlayback;
                u.onerror = () => {
                  // Keep viseme animation running for natural visual duration even if audio policy blocked TTS
                };
                window.speechSynthesis.speak(u);
              } catch {
                // ignore Web Speech runtime errors
              }
            }, 35);
          } catch {
            // ignore Web Speech errors
          }
        }
      };

      try {
        let base64Audio = existingBase64;
        if (!base64Audio) {
          const ttsRes = await fetch(getApiUrl('/api/v1/tts'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text,
              voiceName: activeTutor.voiceName,
              speed,
            }),
          });
          if (ttsRes.ok) {
            const ttsJson = await safeParseJsonResponse<{ audioBase64?: string | null }>(ttsRes);
            if (ttsJson.audioBase64) {
              base64Audio = ttsJson.audioBase64;
            }
          }
        }

        if (base64Audio) {
          const audio = new Audio(`data:audio/wav;base64,${base64Audio}`);
          activeAudioRef.current = audio;
          audio.onplay = () => startVisemePlayback(audio);
          audio.onended = finishVisemePlayback;
          audio.onerror = () => speakWithWebSpeechFallback();
          await audio.play();
          return;
        }
      } catch {
        // Defensive fallback to Android native TTS / Web Speech + client visemes
      }

      speakWithWebSpeechFallback();
    },
    [activeTutor.accent, activeTutor.voiceName, cefrLevel, stopOngoingSpeech],
  );

  const handleSelectScenario = (scenario: ScenarioTemplate) => {
    stopOngoingSpeech();
    setActiveScenario(scenario);
    setCefrLevel(scenario.cefr);
    setMood('encouraging');
    setGesture('wave');
    setGestureNonce((n) => n + 1);
    setErrorMsg(null);
    setLatestHints([]);
    const openingTurn: ChatTurn = {
      id: `open-${Date.now()}`,
      role: 'assistant',
      content: scenario.tutorOpening,
      mood: 'encouraging',
      gesture: 'wave',
      visemes: generateVisemeTimeline(scenario.tutorOpening, speedForCefr(scenario.cefr)),
      timestamp: nowTimeLabel(),
    };
    setTurns([openingTurn]);
  };

  const handleSendMessage = async (overrideText?: string, targetPattern?: string) => {
    const textToSend = (overrideText ?? inputText).trim();
    if (!textToSend || isLoading) return;

    setErrorMsg(null);
    if (!overrideText) setInputText('');

    const userTurnId = `user-${Date.now()}`;
    const userTurn: ChatTurn = {
      id: userTurnId,
      role: 'user',
      content: textToSend,
      timestamp: nowTimeLabel(),
    };

    const nextTurns = [...turns, userTurn];
    setTurns(nextTurns);
    setIsLoading(true);
    setMood('thinking');
    setGesture('tilt_head');
    setGestureNonce((n) => n + 1);

    const wordsAdded = textToSend.split(/\s+/).filter(Boolean).length;
    setStats((prev) => ({
      ...prev,
      totalWordsSpoken: prev.totalWordsSpoken + wordsAdded,
      todayMinutes: Math.min(60, prev.todayMinutes + 1),
      weeklyWords: prev.weeklyWords.map((d, i) =>
        i === prev.weeklyWords.length - 1 ? { ...d, words: d.words + wordsAdded } : d,
      ),
    }));

    try {
      emitToAndroidHost({ type: 'user_message', text: textToSend });
      const res = await fetch(getApiUrl('/api/v1/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userText: textToSend,
          scenarioTitle: activeScenario.title,
          scenarioContext: activeScenario.contextPrompt,
          cefrLevel,
          tutorName: activeTutor.name,
          history: nextTurns.slice(-6).map((t) => ({ role: t.role, content: t.content })),
          speechSpeed: speedForCefr(cefrLevel),
          proactiveMode: true,
          targetPattern: targetPattern || '',
        }),
      });

      const data = await safeParseJsonResponse<{
        replyText?: string;
        mood?: TutorMood;
        gesture?: TutorGesture;
        correctedContent?: string;
        feedbackNoteKo?: string;
        proactiveChallenge?: string;
        hints?: HintSuggestion[];
        visemes?: ReturnType<typeof generateVisemeTimeline>;
        error?: string;
      }>(res);

      if (!res.ok) {
        throw new Error(extractReadableErrorMessage(data.error, res.status));
      }

      const replyText = data.replyText || "That's interesting! Tell me more about that.";
      const nextMood: TutorMood = data.mood || 'encouraging';
      const nextGesture: TutorGesture = data.gesture || 'affirming_double_nod';

      setMood(nextMood);
      setGesture(nextGesture);
      setGestureNonce((n) => n + 1);
      setLatestHints(data.hints ?? []);

      emitToAndroidHost({
        type: 'tutor_reply',
        replyText,
        correctedContent: data.correctedContent || undefined,
        feedbackNoteKo: data.feedbackNoteKo || undefined,
        proactiveChallenge: data.proactiveChallenge || undefined,
        mood: nextMood,
        gesture: nextGesture,
      });

      const assistantTurn: ChatTurn = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: replyText,
        proactiveChallenge: data.proactiveChallenge || undefined,
        mood: nextMood,
        gesture: nextGesture,
        visemes: data.visemes,
        timestamp: nowTimeLabel(),
      };

      setTurns((prev) =>
        prev
          .map((t) =>
            t.id === userTurnId
              ? {
                  ...t,
                  correctedContent: data.correctedContent || undefined,
                  feedbackNoteKo: data.feedbackNoteKo || undefined,
                }
              : t,
          )
          .concat(assistantTurn),
      );

      void playTutorVoice(replyText, data.visemes);
    } catch (err: unknown) {
      const rawMessage = err instanceof Error ? err.message : 'Unable to reach tutor server.';
      const message = extractReadableErrorMessage(rawMessage);
      setErrorMsg(message);
      emitToAndroidHost({ type: 'error', message });
      setMood('neutral');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTriggerProactivePrompt = async () => {
    if (isLoading) return;
    setErrorMsg(null);
    setIsLoading(true);
    setMood('encouraging');
    setGesture('curious_head_cock');
    setGestureNonce((n) => n + 1);

    try {
      const res = await fetch(getApiUrl('/api/v1/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userText: `Please initiate a fresh proactive question for the "${activeScenario.title}" scenario and ask me to reply using a useful variation.`,
          scenarioTitle: activeScenario.title,
          scenarioContext: activeScenario.contextPrompt,
          cefrLevel,
          tutorName: activeTutor.name,
          history: turns.slice(-4).map((t) => ({ role: t.role, content: t.content })),
          speechSpeed: speedForCefr(cefrLevel),
          proactiveMode: true,
        }),
      });
      const data = await safeParseJsonResponse<{
        replyText?: string;
        mood?: TutorMood;
        gesture?: TutorGesture;
        proactiveChallenge?: string;
        hints?: HintSuggestion[];
        visemes?: ReturnType<typeof generateVisemeTimeline>;
        error?: string;
      }>(res);

      if (!res.ok) {
        throw new Error(extractReadableErrorMessage(data.error, res.status));
      }

      const replyText = data.replyText || activeScenario.tutorOpening;
      const nextMood: TutorMood = data.mood || 'encouraging';
      const nextGesture: TutorGesture = data.gesture || 'warm_welcome_nod';
      setMood(nextMood);
      setGesture(nextGesture);
      setGestureNonce((n) => n + 1);
      setLatestHints(data.hints ?? []);

      setTurns((prev) => [
        ...prev,
        {
          id: `proactive-${Date.now()}`,
          role: 'assistant',
          content: replyText,
          proactiveChallenge: data.proactiveChallenge || undefined,
          mood: nextMood,
          gesture: nextGesture,
          visemes: data.visemes,
          timestamp: nowTimeLabel(),
        },
      ]);
      void playTutorVoice(replyText, data.visemes);
    } catch (err: unknown) {
      const message = extractReadableErrorMessage(
        err instanceof Error ? err.message : 'Unable to start proactive prompt.',
      );
      setErrorMsg(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleMic = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecCtor =
      (window as unknown as { SpeechRecognition?: new () => unknown; webkitSpeechRecognition?: new () => unknown })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => unknown }).webkitSpeechRecognition;

    if (!SpeechRecCtor) {
      if (window.AndroidTutorBridge?.startSpeechRecognition) {
        window.AndroidTutorBridge.startSpeechRecognition('en-US');
        emitToAndroidHost({ type: 'request_native_stt', lang: 'en-US' });
        return;
      }
      emitToAndroidHost({ type: 'request_native_stt', lang: 'en-US' });
      setErrorMsg('Browser speech recognition is unavailable here. Please type your English response.');
      return;
    }

    const rec = new SpeechRecCtor() as {
      lang: string;
      interimResults: boolean;
      onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
      onerror: () => void;
      onend: () => void;
      start: () => void;
      stop: () => void;
    };
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.onresult = (e) => {
      const transcript = e.results[0]?.[0]?.transcript ?? '';
      if (transcript) {
        setInputText(transcript);
        void handleSendMessage(transcript);
      }
    };
    rec.onerror = () => {
      setIsListening(false);
      setErrorMsg('Microphone capture was blocked or unavailable. You can type your response anytime.');
    };
    rec.onend = () => setIsListening(false);

    try {
      rec.start();
      recognitionRef.current = rec;
      setIsListening(true);
      setErrorMsg(null);
    } catch {
      setIsListening(false);
      setErrorMsg('Could not start speech recognition.');
    }
  };

  const handleSaveCorrectionToSrs = (userTurn: ChatTurn) => {
    if (!userTurn.correctedContent) return;
    const newCard: SrsCard = {
      id: `srs-chat-${Date.now()}`,
      sourceType: 'chat_correction',
      frontText: userTurn.feedbackNoteKo || `더 자연스럽게 말하기: "${userTurn.content}"`,
      backText: userTurn.correctedContent,
      intervalDays: 1,
      easeFactor: 2.5,
      repetitions: 0,
      nextReviewAt: new Date().toISOString(),
    };
    setSrsCards((prev) => [newCard, ...prev]);
  };

  const handleSaveClipToSrs = (clip: YouTubeClip) => {
    setSrsCards((prev) => {
      if (prev.some((c) => c.youtubeClipId === clip.id)) return prev;
      const newCard: SrsCard = {
        id: `srs-yt-${clip.id}-${Date.now()}`,
        sourceType: 'youtube_clip',
        frontText: clip.koreanMeaning,
        backText: clip.sentence,
        keyExpression: clip.keyExpression,
        youtubeClipId: clip.id,
        intervalDays: 1,
        easeFactor: 2.5,
        repetitions: 0,
        nextReviewAt: new Date().toISOString(),
      };
      return [newCard, ...prev];
    });
  };

  const handleReviewSrsCard = (cardId: string, quality: ReviewQuality) => {
    setSrsCards((prev) =>
      prev.map((card) => {
        if (card.id !== cardId) return card;
        const next = computeSm2Schedule(card, quality);
        return { ...card, ...next };
      }),
    );
  };

  const handleAddCustomSrsCard = (frontText: string, backText: string) => {
    const card: SrsCard = {
      id: `srs-custom-${Date.now()}`,
      sourceType: 'chat_correction',
      frontText,
      backText,
      intervalDays: 1,
      easeFactor: 2.5,
      repetitions: 0,
      nextReviewAt: new Date().toISOString(),
    };
    setSrsCards((prev) => [card, ...prev]);
  };

  const handleReportTurn = async (turnId: string) => {
    setTurns((prev) => prev.map((t) => (t.id === turnId ? { ...t, reported: true } : t)));
    await fetch(getApiUrl('/api/v1/reports/ai-response'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ turnId, reason: 'User flagged AI response from conversation view' }),
    }).catch(() => undefined);
  };

  const handleDeleteAllData = async () => {
    await fetch(getApiUrl('/api/v1/users/me'), { method: 'DELETE' }).catch(() => undefined);
    localStorage.removeItem(STORAGE_KEYS.srs);
    localStorage.removeItem(STORAGE_KEYS.stats);
    setSrsCards(INITIAL_SRS_CARDS);
    setStats(INITIAL_STATS);
    handleSelectScenario(SCENARIO_TEMPLATES[0]);
  };

  const handleCompleteHabitSentence = (
    sentence: CoreSentence,
    renderedText: string,
    formMode: SentenceFormMode,
  ) => {
    const nextHabit = markHabitSentenceCompleted(habitProgress, sentence.id, todayIsoDate);
    setHabitProgress(nextHabit);
    setStats((prev) => ({
      ...prev,
      totalWordsSpoken: prev.totalWordsSpoken + renderedText.split(/\s+/).filter(Boolean).length,
      todayMinutes: Math.min(60, prev.todayMinutes + 1),
    }));
    emitToAndroidHost({
      type: 'sentence_practiced',
      sentenceId: sentence.id,
      code: sentence.code,
      domain: sentence.domain,
      formMode,
      text: renderedText,
      keyWord: sentence.keyWord,
    });
    emitToAndroidHost({
      type: 'habit_progress',
      completedCount: nextHabit.completedSentenceIds.length,
      dailyTarget: nextHabit.dailyTarget,
      transformedCount: nextHabit.transformedCount,
    });
  };

  const handleSyncWordAndSentence = (sentence: CoreSentence, renderedText: string) => {
    const newCard: SrsCard = {
      id: `srs-core-${sentence.id}-${Date.now()}`,
      sourceType: 'core_sentence',
      frontText: `${sentence.korean} (${sentence.keyWord}: ${sentence.keyWordKo})`,
      backText: renderedText,
      keyExpression: sentence.keyWord,
      intervalDays: 1,
      easeFactor: 2.5,
      repetitions: 0,
      nextReviewAt: new Date().toISOString(),
    };
    setSrsCards((prev) => [newCard, ...prev]);
    emitToAndroidHost({
      type: 'word_book_sync',
      keyWord: sentence.keyWord,
      keyWordKo: sentence.keyWordKo,
      sentence: renderedText,
      korean: sentence.korean,
      domain: sentence.domain,
      scenarioId: sentence.scenarioId,
    });
    emitToAndroidHost({ type: 'srs_card_saved', cardId: newCard.id, backText: renderedText });
  };

  const handleLaunchActiveAiChat = (scenario: ScenarioTemplate, seedSentence: string) => {
    handleSelectScenario(scenario);
    setActiveTab('tutor');
    void handleSendMessage(seedSentence, seedSentence);
  };

  // Expose bidirectional Android / Flutter WebView JavaScript Bridge (window.FluentStageBridge)
  const bridgeActionsRef = useRef<{
    sendMessage: (text: string) => Promise<void>;
    triggerProactivePrompt: () => Promise<void>;
    playTutorVoice: (
      text: string,
      visemes?: ReturnType<typeof generateVisemeTimeline>,
      existingBase64?: string,
      customSpeed?: number,
    ) => Promise<void>;
    selectScenario: (s: ScenarioTemplate) => void;
    stopOngoingSpeech: () => void;
    activeTutor: TutorProfile;
  }>({
    sendMessage: handleSendMessage,
    triggerProactivePrompt: handleTriggerProactivePrompt,
    playTutorVoice,
    selectScenario: handleSelectScenario,
    stopOngoingSpeech,
    activeTutor,
  });

  bridgeActionsRef.current = {
    sendMessage: handleSendMessage,
    triggerProactivePrompt: handleTriggerProactivePrompt,
    playTutorVoice,
    selectScenario: handleSelectScenario,
    stopOngoingSpeech,
    activeTutor,
  };

  useEffect(() => {
    window.FluentStageBridge = {
      setApiBase: (url: string) => setRuntimeApiBase(url),
      setEmbedMode: (enabled: boolean) => setEmbedMode(Boolean(enabled)),
      setTab: (tab: ActiveTab) => {
        if (tab !== 'tutor' && tab !== 'guide') bridgeActionsRef.current.stopOngoingSpeech();
        setActiveTab(tab);
      },
      setTutor: (tutorId: string) => {
        const found = TUTOR_PROFILES.find((t) => t.id === tutorId);
        if (found) {
          setActiveTutor(found);
          setMood('happy');
          setGesture(`${found.id}_warm_welcome_nod`);
          setGestureNonce((n) => n + 1);
          emitToAndroidHost({ type: 'tutor_changed', tutorId: found.id, tutorName: found.name });
        }
      },
      setDomain: (domain: DomainCategory) => {
        setGuideDomainOverride(domain);
        const found = SCENARIO_TEMPLATES.find((s) => s.category === domain);
        if (found) bridgeActionsRef.current.selectScenario(found);
      },
      setScenario: (scenarioId: string) => {
        const found = SCENARIO_TEMPLATES.find((s) => s.id === scenarioId);
        if (found) bridgeActionsRef.current.selectScenario(found);
      },
      setSentence: (sentenceId: number) => {
        const found = CORE_SENTENCES_500.find((s) => s.id === sentenceId);
        if (found) {
          setGuideDomainOverride(found.domain);
          setGuideSentenceOverride(found.id);
          setActiveTab('guide');
        }
      },
      setCefrLevel: (level: CefrLevel) => setCefrLevel(level),
      sendMessage: (text: string) => bridgeActionsRef.current.sendMessage(text),
      triggerProactivePrompt: () => bridgeActionsRef.current.triggerProactivePrompt(),
      triggerGesture: (gestureIdOrSlug: string) => {
        const currentTutor = bridgeActionsRef.current.activeTutor;
        const resolved = resolveGestureForTutor(currentTutor.id, gestureIdOrSlug);
        setMood(resolved.mood);
        setGesture(resolved.id);
        setGestureNonce((n) => n + 1);
        emitToAndroidHost({
          type: 'gesture_triggered',
          tutorId: currentTutor.id,
          gestureId: resolved.id,
          gestureName: resolved.name,
          mood: resolved.mood,
        });
        return resolved;
      },
      speak: async (text: string, customMood?: TutorMood, customGesture?: string) => {
        const clean = String(text ?? '').trim();
        if (!clean) return;
        const resolved = resolveGestureForTutor(
          bridgeActionsRef.current.activeTutor.id,
          customGesture || 'affirming_double_nod',
        );
        setMood(customMood || resolved.mood);
        setGesture(resolved.id);
        setGestureNonce((n) => n + 1);
        setTurns((prev) => [
          ...prev,
          {
            id: `bridge-${Date.now()}`,
            role: 'assistant',
            content: clean,
            mood: customMood || resolved.mood,
            gesture: resolved.id,
            timestamp: nowTimeLabel(),
          },
        ]);
        await bridgeActionsRef.current.playTutorVoice(clean);
      },
      stopSpeech: () => bridgeActionsRef.current.stopOngoingSpeech(),
    };

    emitToAndroidHost({
      type: 'ready',
      tutorId: activeTutor.id,
      scenarioId: activeScenario.id,
      cefrLevel,
      embed: embedMode,
    });

    return () => {
      delete window.FluentStageBridge;
    };
  }, []);

  return (
    <div
      className="h-screen w-screen overflow-hidden flex flex-col bg-slate-950 text-slate-100"
      data-active-tab={activeTab}
      data-embed-mode={embedMode ? 'true' : 'false'}
    >
      {!embedMode && (
        <TopBar
          activeTab={activeTab}
          onSelectTab={(tab) => {
            if (tab !== 'tutor') stopOngoingSpeech();
            setActiveTab(tab);
          }}
          dueSrsCount={dueSrsCount}
          onOpenSettings={() => setPrivacyOpen(true)}
        />
      )}

      {activeTab === 'tutor' && (
        <main className="relative flex-1 w-full overflow-hidden">
          <TutorStage3D
            tutor={activeTutor}
            mood={mood}
            activeGestureDef={activeGestureDef}
            gestureNonce={gestureNonce}
            isSpeaking={isSpeaking}
            playbackRef={playbackRef}
            fallback2D={fallback2D}
            onWebGlLost={() => setFallback2D(true)}
            cameraPreset={cameraPreset}
            previewExpression={previewExpression}
          />

          <TutorDock
            tutors={TUTOR_PROFILES}
            activeTutor={activeTutor}
            onSelectTutor={(t) => {
              setActiveTutor(t);
              setMood('happy');
              setGesture(`${t.id}_warm_welcome_nod`);
              setGestureNonce((n) => n + 1);
              emitToAndroidHost({ type: 'tutor_changed', tutorId: t.id, tutorName: t.name });
            }}
            activeGesture={activeGestureDef}
            tutorGestures={tutorGestures}
            onTriggerGesture={(g) => {
              setMood(g.mood);
              setGesture(g.id);
              setGestureNonce((n) => n + 1);
              emitToAndroidHost({
                type: 'gesture_triggered',
                tutorId: activeTutor.id,
                gestureId: g.id,
                gestureName: g.name,
                mood: g.mood,
              });
            }}
            scenarios={SCENARIO_TEMPLATES}
            activeScenario={activeScenario}
            onSelectScenario={handleSelectScenario}
            cefrLevel={cefrLevel}
            onChangeCefr={setCefrLevel}
            fallback2D={fallback2D}
            onToggleFallback2D={() => setFallback2D((v) => !v)}
            cameraPreset={cameraPreset}
            onChangeCameraPreset={setCameraPreset}
            turns={turns}
            latestHints={latestHints}
            isLoading={isLoading}
            isListening={isListening}
            isSpeaking={isSpeaking}
            inputText={inputText}
            onChangeInput={setInputText}
            onSendMessage={(txt) => void handleSendMessage(txt)}
            onTriggerProactivePrompt={() => void handleTriggerProactivePrompt()}
            onToggleMic={handleToggleMic}
            onReplayTurn={(t) => void playTutorVoice(t.content, t.visemes, t.audioBase64)}
            onSaveCorrectionToSrs={handleSaveCorrectionToSrs}
            onReportTurn={(id) => void handleReportTurn(id)}
            errorMsg={errorMsg}
          />
        </main>
      )}

      {activeTab === 'guide' && (
        <StudyGuide3D
          tutors={TUTOR_PROFILES}
          activeTutor={activeTutor}
          onSelectTutor={(t) => {
            setActiveTutor(t);
            setMood('happy');
            setGesture(`${t.id}_warm_welcome_nod`);
            setGestureNonce((n) => n + 1);
            emitToAndroidHost({ type: 'tutor_changed', tutorId: t.id, tutorName: t.name });
          }}
          mood={mood}
          activeGestureDef={activeGestureDef}
          gestureNonce={gestureNonce}
          isSpeaking={isSpeaking}
          playbackRef={playbackRef}
          fallback2D={fallback2D}
          onWebGlLost={() => setFallback2D(true)}
          tutorExpressions={tutorExpressions}
          previewExpression={previewExpression}
          onPreviewExpression={(exp) => {
            setPreviewExpression(exp);
            if (exp) {
              setMood(exp.mood);
              setGesture(`${activeTutor.id}_articulate_enunciation`);
              setGestureNonce((n) => n + 1);
              void playTutorVoice(exp.sampleWord, undefined, undefined, 0.78);
            }
          }}
          onSpeakText={(text, speed, targetMood, gestureSlug) => {
            setPreviewExpression(null);
            if (targetMood) setMood(targetMood);
            if (gestureSlug) {
              setGesture(`${activeTutor.id}_${gestureSlug}`);
              setGestureNonce((n) => n + 1);
            }
            void playTutorVoice(text, undefined, undefined, speed);
          }}
          onStopSpeech={stopOngoingSpeech}
          habitProgress={habitProgress}
          onCompleteHabitSentence={handleCompleteHabitSentence}
          onRecordTransformation={() =>
            setHabitProgress((prev) => ({
              ...prev,
              transformedCount: prev.transformedCount + 1,
            }))
          }
          onSyncWordAndSentence={handleSyncWordAndSentence}
          onLaunchActiveAiChat={handleLaunchActiveAiChat}
          initialDomain={guideDomainOverride}
          initialSentenceId={guideSentenceOverride}
          cefrLevel={cefrLevel}
        />
      )}

      {activeTab === 'shadowing' && (
        <ShadowingStudio
          onSaveToSrs={handleSaveClipToSrs}
          onPracticeScore={(wordsCount, score) => {
            setStats((prev) => ({
              ...prev,
              totalWordsSpoken: prev.totalWordsSpoken + wordsCount,
              todayMinutes: Math.min(60, prev.todayMinutes + 1),
              weeklyWords: prev.weeklyWords.map((d, i) =>
                i === prev.weeklyWords.length - 1
                  ? { ...d, words: d.words + wordsCount, score: Math.round((d.score + score) / 2) }
                  : d,
              ),
            }));
          }}
        />
      )}

      {activeTab === 'srs' && (
        <SrsReviewPanel
          cards={srsCards}
          onReviewCard={handleReviewSrsCard}
          onAddCustomCard={handleAddCustomSrsCard}
        />
      )}

      {activeTab === 'progress' && (
        <ProgressPanel
          stats={stats}
          onChangeDailyGoal={(minutes) => setStats((prev) => ({ ...prev, dailyGoalMinutes: minutes }))}
          onUseStreakFreeze={() =>
            setStats((prev) => ({ ...prev, streakFreezeAvailable: false }))
          }
        />
      )}

      <PrivacyModal
        open={privacyOpen}
        onClose={() => setPrivacyOpen(false)}
        onConfirmDeleteAllData={handleDeleteAllData}
      />
    </div>
  );
}
