import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Eye,
  EyeOff,
  Gauge,
  Mic,
  MicOff,
  Play,
  Plus,
  RotateCcw,
  Search,
  SkipForward,
  Volume2,
} from 'lucide-react';
import type { CefrLevel, PronunciationReport, YouTubeClip } from '../core/types';
import { getApiUrl, safeParseJsonResponse } from '../core/androidBridge';
import { evaluatePronunciation, getBufferedClipRange } from '../core/srs';
import { YOUTUBE_CLIPS_INDEX } from '../data/seedData';

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: HTMLElement | string,
        options: {
          videoId: string;
          playerVars?: Record<string, string | number>;
          events?: {
            onReady?: (e: { target: YTPlayerInstance }) => void;
            onStateChange?: (e: { data: number; target: YTPlayerInstance }) => void;
            onError?: (e: { data: number }) => void;
          };
        },
      ) => YTPlayerInstance;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTPlayerInstance {
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  setPlaybackRate: (rate: number) => void;
  getCurrentTime: () => number;
  destroy: () => void;
}

interface ShadowingStudioProps {
  onSaveToSrs: (clip: YouTubeClip) => void;
  onPracticeScore: (wordsCount: number, score: number) => void;
}

export function ShadowingStudio({ onSaveToSrs, onPracticeScore }: ShadowingStudioProps) {
  const [query, setQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<'ALL' | CefrLevel>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'daily' | 'business' | 'travel' | 'movie'>('all');
  const [clips, setClips] = useState<YouTubeClip[]>(YOUTUBE_CLIPS_INDEX);
  const [selectedClip, setSelectedClip] = useState<YouTubeClip>(YOUTUBE_CLIPS_INDEX[0]);
  const [isSearching, setIsSearching] = useState(false);

  const [playbackSpeed, setPlaybackSpeed] = useState<0.75 | 1.0>(1.0);
  const [hideSubtitle, setHideSubtitle] = useState(false);
  const [loopEnabled, setLoopEnabled] = useState(true);
  const [embedError, setEmbedError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  // Recording & pronunciation comparison
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [spokenAttempt, setSpokenAttempt] = useState('');
  const [report, setReport] = useState<PronunciationReport | null>(null);
  const [userPeaks, setUserPeaks] = useState<number[]>(() => Array(32).fill(0.15));

  const playerHostRef = useRef<HTMLDivElement | null>(null);
  const ytPlayerRef = useRef<YTPlayerInstance | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const speechRecRef = useRef<{ stop: () => void } | null>(null);
  const recordStartRef = useRef<number>(0);

  const buffered = useMemo(
    () => getBufferedClipRange(selectedClip.startMs, selectedClip.endMs),
    [selectedClip],
  );

  // Deterministic native speech waveform envelope
  const nativePeaks = useMemo(() => {
    const chars = selectedClip.sentence;
    return Array.from({ length: 32 }, (_, idx) => {
      const ch = chars.charCodeAt((idx * 3) % chars.length) || 65;
      return 0.25 + ((ch % 17) / 17) * 0.72;
    });
  }, [selectedClip]);

  // Search clips via backend /api/v1/youtube/search with resilient fallback
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const params = new URLSearchParams({
          q: query,
          level: levelFilter,
          category: categoryFilter,
          limit: '14',
        });
        const res = await fetch(getApiUrl(`/api/v1/youtube/search?${params.toString()}`), {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await safeParseJsonResponse<{ clips: YouTubeClip[] }>(res);
          setClips(data.clips);
        }
      } catch {
        // Offline / fallback filter
        const q = query.trim().toLowerCase();
        setClips(
          YOUTUBE_CLIPS_INDEX.filter((c) => {
            if (levelFilter !== 'ALL' && c.cefrLevel !== levelFilter) return false;
            if (categoryFilter !== 'all' && c.channelCategory !== categoryFilter) return false;
            if (!q) return true;
            return (
              c.sentence.toLowerCase().includes(q) ||
              c.keyExpression.toLowerCase().includes(q) ||
              c.koreanMeaning.toLowerCase().includes(q)
            );
          }),
        );
      } finally {
        setIsSearching(false);
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, levelFilter, categoryFilter]);

  // Load Official YouTube IFrame API & Loop Buffered Range
  useEffect(() => {
    setEmbedError(null);
    let intervalId: number | undefined;
    let cancelled = false;

    const initPlayer = () => {
      if (cancelled || !playerHostRef.current || !window.YT?.Player) return;
      if (ytPlayerRef.current) {
        ytPlayerRef.current.destroy();
        ytPlayerRef.current = null;
      }

      const mountNode = document.createElement('div');
      playerHostRef.current.innerHTML = '';
      playerHostRef.current.appendChild(mountNode);

      ytPlayerRef.current = new window.YT.Player(mountNode, {
        videoId: selectedClip.videoId,
        playerVars: {
          start: Math.floor(buffered.startSeconds),
          end: Math.ceil(buffered.endSeconds),
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
        },
        events: {
          onReady: (e) => {
            if (cancelled) return;
            e.target.setPlaybackRate(playbackSpeed);
            e.target.seekTo(buffered.startSeconds, true);
          },
          onError: (e) => {
            if (cancelled) return;
            // YouTube error 100 / 101 / 150: video unavailable or embedding disabled
            setEmbedError(
              `YouTube player reported code ${e.data}. Use native audio preview or skip to next clip.`,
            );
            fetch(getApiUrl('/api/v1/youtube/report-broken'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ clipId: selectedClip.id }),
            }).catch(() => undefined);
          },
        },
      });

      intervalId = window.setInterval(() => {
        const player = ytPlayerRef.current;
        if (!player || !loopEnabled) return;
        try {
          const cur = player.getCurrentTime();
          if (cur >= buffered.endSeconds) {
            player.seekTo(buffered.startSeconds, true);
            player.playVideo();
          }
        } catch {
          // Player not yet ready
        }
      }, 250);
    };

    if (window.YT?.Player) {
      initPlayer();
    } else {
      const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
      if (!existing) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        tag.onerror = () => {
          if (!cancelled) {
            setEmbedError('YouTube IFrame API could not load in this network environment. Use native audio preview below.');
          }
        };
        document.head.appendChild(tag);
      }
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      cancelled = true;
      if (intervalId) window.clearInterval(intervalId);
      if (ytPlayerRef.current) {
        ytPlayerRef.current.destroy();
        ytPlayerRef.current = null;
      }
    };
  }, [selectedClip, buffered.startSeconds, buffered.endSeconds, loopEnabled]);

  useEffect(() => {
    try {
      ytPlayerRef.current?.setPlaybackRate(playbackSpeed);
    } catch {
      // ignore if player initializing
    }
  }, [playbackSpeed]);

  const handlePlayNativeAudio = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(selectedClip.sentence);
      u.lang = 'en-US';
      u.rate = playbackSpeed;
      window.speechSynthesis.speak(u);
    }
    try {
      ytPlayerRef.current?.seekTo(buffered.startSeconds, true);
      ytPlayerRef.current?.playVideo();
    } catch {
      // fallback already handled
    }
  };

  const handleSkipNextClip = () => {
    const idx = clips.findIndex((c) => c.id === selectedClip.id);
    const next = clips[(idx + 1) % Math.max(1, clips.length)];
    if (next) {
      setSelectedClip(next);
      setReport(null);
      setSpokenAttempt('');
    }
  };

  const handleToggleRecord = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      speechRecRef.current?.stop();
      setIsRecording(false);
      return;
    }

    setReport(null);
    setRecordedAudioUrl(null);
    recordStartRef.current = performance.now();

    // Start speech recognition if supported
    const SpeechRecCtor =
      (window as unknown as { SpeechRecognition?: new () => unknown; webkitSpeechRecognition?: new () => unknown })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => unknown }).webkitSpeechRecognition;

    if (SpeechRecCtor) {
      const rec = new SpeechRecCtor() as {
        lang: string;
        interimResults: boolean;
        onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
        start: () => void;
        stop: () => void;
      };
      rec.lang = 'en-US';
      rec.interimResults = false;
      rec.onresult = (e) => {
        const transcript = e.results[0]?.[0]?.transcript ?? '';
        if (transcript) {
          setSpokenAttempt(transcript);
          const durationSec = (performance.now() - recordStartRef.current) / 1000;
          const evaluated = evaluatePronunciation(selectedClip.sentence, transcript, durationSec);
          setReport(evaluated);
          onPracticeScore(transcript.split(/\s+/).length, evaluated.overallScore);
        }
      };
      try {
        rec.start();
        speechRecRef.current = rec;
      } catch {
        // fallback if mic unavailable
      }
    }

    // Start MediaRecorder for user audio playback + visual waveform
    if (navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        const chunks: BlobPart[] = [];
        recorder.ondataavailable = (ev) => {
          if (ev.data.size > 0) chunks.push(ev.data);
        };
        recorder.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          const blob = new Blob(chunks, { type: 'audio/webm' });
          setRecordedAudioUrl(URL.createObjectURL(blob));
          setUserPeaks(
            Array.from({ length: 32 }, (_, idx) => 0.25 + Math.abs(Math.sin(idx * 0.7)) * 0.65),
          );
        };
        recorder.start();
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
      } catch {
        setIsRecording(false);
        setEmbedError('Microphone permission is unavailable in this browser. Type your spoken attempt below to score.');
      }
    } else {
      setEmbedError('Microphone capture is not supported here. Type your spoken attempt below to score.');
    }
  };

  const handleScoreTypedAttempt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!spokenAttempt.trim()) return;
    const evaluated = evaluatePronunciation(selectedClip.sentence, spokenAttempt, 3.2);
    setReport(evaluated);
    onPracticeScore(spokenAttempt.trim().split(/\s+/).length, evaluated.overallScore);
  };

  const handleSaveCard = () => {
    onSaveToSrs(selectedClip);
    setSavedNotice('Added to SRS Review deck');
    setTimeout(() => setSavedNotice(null), 2400);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Search & Indexed Clip List */}
        <section className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-4">
          <div>
            <h1 className="font-display text-xl font-semibold text-white">
              YouTube Short-Clip Shadowing
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Search real native expressions · Segments loop with -800ms / +1200ms speech buffer
            </p>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <label htmlFor="yt-search-input" className="sr-only">
              Search English expressions
            </label>
            <input
              id="yt-search-input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search phrase, idiom, or keyword (e.g. figure out)..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(['all', 'daily', 'business', 'travel', 'movie'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-sky-400 text-slate-950'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}

            <select
              aria-label="Filter by CEFR level"
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value as 'ALL' | CefrLevel)}
              className="ml-auto bg-slate-950 border border-slate-800 text-slate-200 rounded-md px-2.5 py-1.5 text-xs"
            >
              <option value="ALL">All Levels</option>
              <option value="A2">A2</option>
              <option value="B1">B1</option>
              <option value="B2">B2</option>
              <option value="C1">C1</option>
            </select>
          </div>

          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
            {isSearching && (
              <p className="text-xs text-slate-400 py-2">Searching indexed transcripts...</p>
            )}
            {!isSearching && clips.length === 0 && (
              <p className="text-sm text-slate-400 py-6 text-center">
                No matching clips found. Try clearing filters or searching another keyword.
              </p>
            )}
            {clips.map((clip) => {
              const active = clip.id === selectedClip.id;
              const range = getBufferedClipRange(clip.startMs, clip.endMs);
              return (
                <button
                  key={clip.id}
                  type="button"
                  onClick={() => {
                    setSelectedClip(clip);
                    setReport(null);
                    setSpokenAttempt('');
                  }}
                  className={`w-full text-left p-3.5 rounded-xl border transition-colors cursor-pointer ${
                    active
                      ? 'bg-slate-800/90 border-sky-400/70'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                    <span className="text-sky-300 font-medium">{clip.keyExpression}</span>
                    <span aria-hidden="true">·</span>
                    <span>{clip.cefrLevel}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-tabular">
                      {range.startSeconds}s–{range.endSeconds}s
                    </span>
                  </div>
                  <p className="text-sm text-white font-medium leading-snug">{clip.sentence}</p>
                  <p className="text-xs text-slate-400 mt-1">{clip.koreanMeaning}</p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Right Column: Official IFrame Player + Dual Waveform & Pronunciation Scoring */}
        <section className="lg:col-span-7 flex flex-col gap-5">
          {/* Player Container */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="aspect-video bg-slate-950 relative">
              <div ref={playerHostRef} className="w-full h-full" data-testid="youtube-player-host" />
              {embedError && (
                <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center gap-3">
                  <p className="text-sm text-amber-200 max-w-md">{embedError}</p>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handlePlayNativeAudio}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-400 text-slate-950 text-xs font-semibold cursor-pointer"
                    >
                      <Volume2 className="w-4 h-4" />
                      Listen with Speech Engine
                    </button>
                    <button
                      type="button"
                      onClick={handleSkipNextClip}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-800 text-white text-xs font-medium cursor-pointer"
                    >
                      <SkipForward className="w-4 h-4" />
                      Skip Clip
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Player Controls */}
            <div className="p-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handlePlayNativeAudio}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-sky-400 hover:bg-sky-300 text-slate-950 text-xs font-semibold cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  Play Segment
                </button>
                <button
                  type="button"
                  onClick={() => setPlaybackSpeed((s) => (s === 1.0 ? 0.75 : 1.0))}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs font-medium cursor-pointer"
                >
                  <Gauge className="w-3.5 h-3.5" />
                  {playbackSpeed}x Speed
                </button>
                <button
                  type="button"
                  onClick={() => setLoopEnabled((v) => !v)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium cursor-pointer ${
                    loopEnabled
                      ? 'bg-slate-800 border-sky-500/60 text-sky-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Auto-Loop {loopEnabled ? 'On' : 'Off'}
                </button>
                <button
                  type="button"
                  onClick={() => setHideSubtitle((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-xs font-medium cursor-pointer"
                >
                  {hideSubtitle ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  {hideSubtitle ? 'Show Subtitles' : 'Blind Shadowing'}
                </button>
              </div>

              <button
                type="button"
                onClick={handleSaveCard}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25 text-xs font-medium cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                {savedNotice ?? 'Save to SRS'}
              </button>
            </div>

            {/* Target Subtitle Banner */}
            <div className="px-4 pb-4">
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3.5">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span>{selectedClip.channel} · {selectedClip.title}</span>
                  <span className="font-mono-tabular">
                    Window: {buffered.startSeconds}s – {buffered.endSeconds}s
                  </span>
                </div>
                {hideSubtitle ? (
                  <p className="text-sm text-slate-500 italic">
                    Subtitles hidden for listening-first shadowing. Click Show Subtitles to reveal.
                  </p>
                ) : (
                  <>
                    <p className="text-base font-medium text-white">{selectedClip.sentence}</p>
                    <p className="text-xs text-slate-400 mt-1">{selectedClip.koreanMeaning}</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Shadowing Comparison & Pronunciation Scoring */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-base font-semibold text-white">
                  Pronunciation &amp; Rhythm Comparison
                </h2>
                <p className="text-xs text-slate-400">
                  Compare your cadence against the native speaker and inspect word-level accuracy
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleRecord}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                    isRecording
                      ? 'bg-red-500 text-white'
                      : 'bg-sky-400 hover:bg-sky-300 text-slate-950'
                  }`}
                >
                  {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  {isRecording ? 'Stop Recording' : 'Record My Voice'}
                </button>
                {recordedAudioUrl && (
                  <button
                    type="button"
                    onClick={() => new Audio(recordedAudioUrl).play()}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    Play My Voice
                  </button>
                )}
              </div>
            </div>

            {/* Dual Waveform Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                <p className="text-xs text-slate-400 mb-2">Native Cadence Envelope</p>
                <div className="flex items-end gap-1 h-10">
                  {nativePeaks.map((p, idx) => (
                    <span
                      key={idx}
                      className="flex-1 bg-sky-400/80 rounded-t-sm"
                      style={{ height: `${Math.round(p * 36)}px` }}
                    />
                  ))}
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                <p className="text-xs text-slate-400 mb-2">Your Recording Envelope</p>
                <div className="flex items-end gap-1 h-10">
                  {userPeaks.map((p, idx) => (
                    <span
                      key={idx}
                      className="flex-1 bg-emerald-400/80 rounded-t-sm"
                      style={{ height: `${Math.round(p * 36)}px` }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Fallback / Manual Speech Transcript Check */}
            <form onSubmit={handleScoreTypedAttempt} className="flex items-center gap-2">
              <label htmlFor="shadowing-attempt-input" className="sr-only">
                Spoken sentence transcript
              </label>
              <input
                id="shadowing-attempt-input"
                type="text"
                value={spokenAttempt}
                onChange={(e) => setSpokenAttempt(e.target.value)}
                placeholder="Speak via mic or enter your spoken transcript to score pronunciation..."
                className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
              />
              <button
                type="submit"
                disabled={!spokenAttempt.trim()}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-45 text-white text-xs font-medium cursor-pointer whitespace-nowrap"
              >
                Score Attempt
              </button>
            </form>

            {report && (
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-4 gap-3 text-center">
                  <div>
                    <p className="text-xs text-slate-400">Overall</p>
                    <p className="font-mono-tabular text-lg font-semibold text-white">
                      {report.overallScore}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Accuracy</p>
                    <p className="font-mono-tabular text-lg font-semibold text-sky-300">
                      {report.accuracy}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Fluency</p>
                    <p className="font-mono-tabular text-lg font-semibold text-emerald-300">
                      {report.fluency}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Completeness</p>
                    <p className="font-mono-tabular text-lg font-semibold text-amber-300">
                      {report.completeness}%
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex flex-wrap gap-2">
                  {report.alignments.map((a, idx) => (
                    <span
                      key={idx}
                      className={`text-sm font-medium ${
                        a.status === 'correct'
                          ? 'text-emerald-300'
                          : a.status === 'omitted'
                          ? 'text-red-400 line-through'
                          : 'text-amber-300 underline decoration-wavy'
                      }`}
                    >
                      {a.word}
                      {a.expected && a.status === 'mispronounced' ? ` (${a.expected})` : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
