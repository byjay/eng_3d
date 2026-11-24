import type {
  ActiveTab,
  CefrLevel,
  DomainCategory,
  GestureDefinition,
  SentenceFormMode,
  TutorMood,
} from './types';

export interface AndroidEmbedConfig {
  embed: boolean;
  apiBase: string;
  initialTab: ActiveTab;
  initialTutorId?: string;
  initialScenarioId?: string;
  initialDomain?: DomainCategory;
  initialSentenceId?: number;
  initialCefr?: CefrLevel;
}

export type TutorBridgeEvent =
  | { type: 'ready'; tutorId: string; scenarioId: string; cefrLevel: CefrLevel; embed: boolean }
  | { type: 'tutor_changed'; tutorId: string; tutorName: string }
  | { type: 'gesture_triggered'; tutorId: string; gestureId: string; gestureName: string; mood: TutorMood }
  | { type: 'user_message'; text: string }
  | {
      type: 'tutor_reply';
      replyText: string;
      correctedContent?: string;
      feedbackNoteKo?: string;
      proactiveChallenge?: string;
      mood: TutorMood;
      gesture: string;
    }
  | { type: 'speech_started'; text: string }
  | { type: 'speech_ended' }
  | { type: 'request_native_stt'; lang: string }
  | { type: 'request_native_tts'; text: string; lang: string; rate: number }
  | {
      type: 'sentence_practiced';
      sentenceId: number;
      code: string;
      domain: DomainCategory;
      formMode: SentenceFormMode;
      text: string;
      keyWord: string;
    }
  | {
      type: 'word_book_sync';
      keyWord: string;
      keyWordKo: string;
      sentence: string;
      korean: string;
      domain: DomainCategory;
      scenarioId: string;
    }
  | {
      type: 'habit_progress';
      completedCount: number;
      dailyTarget: number;
      transformedCount: number;
    }
  | { type: 'srs_card_saved'; cardId: string; backText: string }
  | { type: 'pronunciation_scored'; clipId: number; overallScore: number }
  | { type: 'error'; message: string };

export interface FluentStageBridgeApi {
  setApiBase: (url: string) => void;
  setEmbedMode: (enabled: boolean) => void;
  setTab: (tab: ActiveTab) => void;
  setTutor: (tutorId: string) => void;
  setDomain: (domain: DomainCategory) => void;
  setScenario: (scenarioId: string) => void;
  setSentence: (sentenceId: number) => void;
  setCefrLevel: (level: CefrLevel) => void;
  sendMessage: (text: string) => Promise<void>;
  triggerProactivePrompt: () => Promise<void>;
  triggerGesture: (gestureIdOrSlug: string) => GestureDefinition | null;
  speak: (text: string, mood?: TutorMood, gesture?: string) => Promise<void>;
  stopSpeech: () => void;
}

declare global {
  interface Window {
    AndroidTutorBridge?: {
      onTutorEvent?: (payloadJson: string) => void;
      speak?: (text: string, lang: string, rate: number) => void;
      startSpeechRecognition?: (lang: string) => void;
    };
    flutter_inappwebview?: {
      callHandler?: (handlerName: string, ...args: unknown[]) => Promise<unknown>;
    };
    ReactNativeWebView?: {
      postMessage?: (data: string) => void;
    };
    FluentStageBridge?: FluentStageBridgeApi;
  }
}

let runtimeApiBase = '';

export function normalizeBaseUrl(raw: string | null | undefined): string {
  if (!raw) return '';
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return '';
}

export function parseEmbedConfigFromSearch(search: string): AndroidEmbedConfig {
  const params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`);
  const embedFlag = params.get('embed') || params.get('mode');
  const embed = embedFlag === '1' || embedFlag === 'true' || embedFlag === 'embed';

  const apiBase = normalizeBaseUrl(params.get('apiBase'));
  if (apiBase) {
    runtimeApiBase = apiBase;
  }

  const rawTab = params.get('tab');
  const validTabs: ActiveTab[] = ['tutor', 'guide', 'shadowing', 'srs', 'progress'];
  const initialTab: ActiveTab = validTabs.includes(rawTab as ActiveTab)
    ? (rawTab as ActiveTab)
    : 'tutor';

  const rawCefr = params.get('cefr')?.toUpperCase();
  const validCefr: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1'];
  const initialCefr = validCefr.includes(rawCefr as CefrLevel)
    ? (rawCefr as CefrLevel)
    : undefined;

  const rawDomain = params.get('domain')?.toLowerCase();
  const validDomains: DomainCategory[] = [
    'daily',
    'travel',
    'work',
    'shopping',
    'driving',
    'government',
    'banking',
  ];
  const initialDomain = validDomains.includes(rawDomain as DomainCategory)
    ? (rawDomain as DomainCategory)
    : undefined;

  const parsedSentence = Number(params.get('sentence'));
  const initialSentenceId =
    Number.isInteger(parsedSentence) && parsedSentence >= 1 && parsedSentence <= 500
      ? parsedSentence
      : undefined;

  return {
    embed,
    apiBase,
    initialTab,
    initialTutorId: params.get('tutor') || undefined,
    initialScenarioId: params.get('scenario') || undefined,
    initialDomain,
    initialSentenceId,
    initialCefr,
  };
}

export function setRuntimeApiBase(url: string): void {
  runtimeApiBase = normalizeBaseUrl(url);
}

export function getApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return runtimeApiBase ? `${runtimeApiBase}${normalizedPath}` : normalizedPath;
}

export function resolveAssetUrl(assetPath: string): string {
  if (/^https?:\/\//i.test(assetPath) || assetPath.startsWith('data:')) return assetPath;
  const normalized = assetPath.startsWith('/') ? assetPath : `/${assetPath}`;
  return runtimeApiBase ? `${runtimeApiBase}${normalized}` : normalized;
}

export function emitToAndroidHost(event: TutorBridgeEvent): void {
  if (typeof window === 'undefined') return;
  const json = JSON.stringify(event);

  try {
    window.AndroidTutorBridge?.onTutorEvent?.(json);
  } catch {
    // ignore host callback exceptions
  }

  try {
    void window.flutter_inappwebview?.callHandler?.('onTutorEvent', event);
  } catch {
    // ignore flutter bridge exceptions
  }

  try {
    window.ReactNativeWebView?.postMessage?.(json);
  } catch {
    // ignore RN WebView bridge exceptions
  }

  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ source: 'fluentstage-3d', ...event }, '*');
    }
  } catch {
    // ignore cross-origin parent frame restrictions
  }
}

export function extractReadableErrorMessage(raw: string | undefined, status?: number): string {
  if (!raw) {
    return status === 503
      ? 'AI tutor server is temporarily busy. Please try again in a moment.'
      : 'Unable to reach tutor server.';
  }
  const trimmed = raw.trim();
  if (/^<!doctype/i.test(trimmed) || /^<html/i.test(trimmed)) {
    return 'API endpoint returned HTML instead of JSON. Check backend URL or ?apiBase= setting for Android WebView.';
  }
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as { error?: { message?: string; code?: number } | string; message?: string };
      if (typeof parsed.error === 'string') {
        return extractReadableErrorMessage(parsed.error, status);
      }
      if (parsed.error && typeof parsed.error === 'object' && parsed.error.message) {
        return parsed.error.message;
      }
      if (parsed.message) return parsed.message;
    } catch {
      // fall through
    }
  }
  return trimmed;
}

export async function safeParseJsonResponse<T>(res: Response): Promise<T> {
  const rawText = await res.text();
  const trimmed = rawText.trim();
  if (!trimmed) {
    return {} as T;
  }
  if (/^<!doctype/i.test(trimmed) || /^<html/i.test(trimmed) || trimmed.startsWith('<')) {
    throw new Error(
      'API server returned an HTML page instead of JSON. Please verify the API server is running or configure ?apiBase=https://your-server.',
    );
  }
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    throw new Error(extractReadableErrorMessage(trimmed, res.status));
  }
}
