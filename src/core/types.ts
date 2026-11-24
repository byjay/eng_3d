export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';

export type TutorMood = 'neutral' | 'happy' | 'thinking' | 'encouraging' | 'surprised';

export type TutorGesture = string;

export type TutorId = 'amy' | 'marcus' | 'elena' | 'oliver' | 'sofia';

export type GestureCategory =
  | 'greeting'
  | 'encouragement'
  | 'thinking'
  | 'explanation'
  | 'reaction';

export interface GestureKinematics {
  headPitch: number;
  headYaw: number;
  headRoll: number;
  leanZ: number;
  bounceY: number;
  swayX: number;
  freqHz: number;
  durationMs: number;
  smileBoost: number;
  browLift: number;
  jawPulse: number;
  zoomDelta: number;
}

export interface GestureDefinition {
  id: string;
  tutorId: TutorId;
  index: number;
  name: string;
  nameKo: string;
  category: GestureCategory;
  mood: TutorMood;
  kinematics: GestureKinematics;
}

export type VisemeId =
  | 'sil'
  | 'PP'
  | 'FF'
  | 'TH'
  | 'DD'
  | 'kk'
  | 'CH'
  | 'SS'
  | 'nn'
  | 'RR'
  | 'aa'
  | 'E'
  | 'I'
  | 'O'
  | 'U';

export interface VisemeFrame {
  v: VisemeId;
  t: number; // start time in ms
  d: number; // duration in ms
  charStart?: number; // character index in source text for speech boundary sync
  charEnd?: number;
  phoneme?: string; // ARPAbet/IPA hint for unit tests & diagnostics
  expressionCode?: string; // M01..M50 link to viseme_expressions DB
}

export interface MouthExpression {
  id: number;
  code: string; // M01..M50
  visemeId: VisemeId;
  ipa: string;
  arpabet: string;
  name: string;
  nameKo: string;
  articulatoryCueKo: string;
  sampleWord: string;
  jawOpen: number;
  lipRound: number;
  lipWidth: number;
  lipPress: number;
  tongueTip: number;
  teethVisible: number;
  cheekLift: number;
  browLift: number;
  smileBias: number;
  mood: TutorMood;
}

export interface TutorExpressionPhoto {
  id: number;
  tutorId: TutorId;
  photoCode: string; // e.g., AMY-M01 .. AMY-E52
  expressionCode: string; // M01..M50, E51, E52
  visemeId: VisemeId;
  ipa: string;
  arpabet: string;
  name: string;
  nameKo: string;
  articulatoryCueKo: string;
  sampleWord: string;
  sampleSentence: string;
  atlasUrl: string;
  tileCol: number;
  tileRow: number;
  blendTileCol: number;
  blendTileRow: number;
  blendRatio: number;
  jawOpen: number;
  lipRound: number;
  lipWidth: number;
  lipPress: number;
  tongueTip: number;
  teethVisible: number;
  cheekLift: number;
  browLift: number;
  smileBias: number;
  mood: TutorMood;
}

export interface FacialAnchors {
  mouthUV: [number, number];
  leftEyeUV: [number, number];
  rightEyeUV: [number, number];
}

export interface TutorProfile {
  id: TutorId;
  name: string;
  role: string;
  accent: string;
  voiceName: 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';
  portraitUrl: string;
  visemeAtlasUrl: string;
  facialAnchors: FacialAnchors;
  blazerColor: number;
  shirtColor: number;
  hairColor: number;
  skinColor: number;
  hasGlasses: boolean;
}

export type DomainCategory =
  | 'daily'
  | 'travel'
  | 'work'
  | 'shopping'
  | 'driving'
  | 'government'
  | 'banking';

export type SentenceFormMode = 'statement' | 'question' | 'negative' | 'polite' | 'past';

export interface WordSlotOption {
  word: string;
  ko: string;
}

export interface WordSlot {
  id: string;
  label: string;
  labelKo: string;
  defaultWord: string;
  options: WordSlotOption[];
}

export interface CoreSentence {
  id: number;
  code: string;
  domain: DomainCategory;
  scenarioId: string;
  patternTitle: string;
  korean: string;
  statement: string;
  question: string;
  negative: string;
  polite: string;
  past: string;
  grammarTipKo: string;
  keyWord: string;
  keyWordKo: string;
  slots: WordSlot[];
}

export interface ScenarioDialogueLine {
  turn: number;
  speaker: 'tutor' | 'learner';
  english: string;
  korean: string;
  grammarFocus: string;
}

export interface ScenarioTemplate {
  id: string;
  index: number;
  title: string;
  titleKo: string;
  category: DomainCategory;
  cefr: CefrLevel;
  tutorOpening: string;
  contextPrompt: string;
  coreSentenceIds: number[];
  dialogues: ScenarioDialogueLine[];
}

export interface HintSuggestion {
  english: string;
  korean: string;
}

export interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  correctedContent?: string;
  feedbackNoteKo?: string;
  proactiveChallenge?: string;
  mood?: TutorMood;
  gesture?: TutorGesture;
  gestureLabel?: string;
  visemes?: VisemeFrame[];
  audioBase64?: string;
  timestamp: string;
  reported?: boolean;
}

export interface RawTranscriptSegment {
  text: string;
  start: number; // seconds
  duration: number; // seconds
}

export interface YouTubeClip {
  id: number;
  videoId: string;
  title: string;
  channel: string;
  sentence: string;
  koreanMeaning: string;
  startMs: number;
  endMs: number;
  cefrLevel: CefrLevel;
  channelCategory: 'travel' | 'business' | 'daily' | 'movie';
  keyExpression: string;
}

export interface WordAlignment {
  word: string;
  status: 'correct' | 'mispronounced' | 'omitted' | 'inserted';
  expected?: string;
}

export interface PronunciationReport {
  accuracy: number; // 0-100
  fluency: number; // 0-100
  completeness: number; // 0-100
  overallScore: number; // 0-100
  spokenText: string;
  alignments: WordAlignment[];
}

export type ReviewQuality = 1 | 3 | 4 | 5; // Again=1, Hard=3, Good=4, Easy=5

export interface SrsCard {
  id: string;
  sourceType: 'chat_correction' | 'youtube_clip' | 'core_sentence';
  frontText: string; // Korean prompt / meaning
  backText: string; // Target English sentence
  keyExpression?: string;
  youtubeClipId?: number;
  intervalDays: number;
  easeFactor: number;
  repetitions: number;
  nextReviewAt: string; // ISO string
  lastReviewedAt?: string;
}

export interface HabitProgress {
  dailyTarget: number;
  completedSentenceIds: number[];
  transformedCount: number;
  shadowCompletedCount: number;
  lastPracticedDate: string; // YYYY-MM-DD
}

export interface LearningStats {
  dailyGoalMinutes: 5 | 10 | 15;
  todayMinutes: number;
  streakCount: number;
  streakFreezeAvailable: boolean;
  totalWordsSpoken: number;
  weeklyWords: { day: string; words: number; score: number }[];
  topGrammarIssues: { pattern: string; count: number; tip: string }[];
}

export type ActiveTab = 'tutor' | 'guide' | 'shadowing' | 'srs' | 'progress';
