import type {
  PronunciationReport,
  RawTranscriptSegment,
  ReviewQuality,
  SrsCard,
  WordAlignment,
} from './types';

/**
 * Computes next SM-2 review interval, ease factor, repetitions, and ISO due timestamp.
 * Quality scale: 1 (Again), 3 (Hard), 4 (Good), 5 (Easy).
 */
export function computeSm2Schedule(
  card: Pick<SrsCard, 'intervalDays' | 'easeFactor' | 'repetitions'>,
  quality: ReviewQuality,
  nowMs: number = Date.now(),
): Pick<SrsCard, 'intervalDays' | 'easeFactor' | 'repetitions' | 'nextReviewAt' | 'lastReviewedAt'> {
  let { intervalDays, easeFactor, repetitions } = card;

  if (quality < 3) {
    repetitions = 0;
    intervalDays = 1;
  } else {
    if (repetitions === 0) {
      intervalDays = 1;
    } else if (repetitions === 1) {
      intervalDays = 6;
    } else {
      intervalDays = Math.round(intervalDays * easeFactor);
    }
    repetitions += 1;
  }

  const nextEase = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  easeFactor = Number(Math.max(1.3, nextEase).toFixed(2));

  // Hard adjustments shorten interval slightly; Easy adds bonus
  if (quality === 3 && repetitions > 1) {
    intervalDays = Math.max(1, Math.round(intervalDays * 0.8));
  } else if (quality === 5 && repetitions > 1) {
    intervalDays = Math.round(intervalDays * 1.25);
  }

  const nextReviewAt = new Date(nowMs + intervalDays * 24 * 60 * 60 * 1000).toISOString();
  const lastReviewedAt = new Date(nowMs).toISOString();

  return {
    intervalDays,
    easeFactor,
    repetitions,
    nextReviewAt,
    lastReviewedAt,
  };
}

export function getDueCards(cards: SrsCard[], nowMs: number = Date.now()): SrsCard[] {
  return cards.filter((c) => new Date(c.nextReviewAt).getTime() <= nowMs);
}

function normalizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Evaluates pronunciation accuracy, completeness, and fluency using word-level Levenshtein alignment.
 */
export function evaluatePronunciation(
  targetSentence: string,
  spokenText: string,
  durationSeconds?: number,
): PronunciationReport {
  const targetWords = normalizeWords(targetSentence);
  const spokenWords = normalizeWords(spokenText);

  if (targetWords.length === 0) {
    return {
      accuracy: 0,
      fluency: 0,
      completeness: 0,
      overallScore: 0,
      spokenText,
      alignments: [],
    };
  }

  if (spokenWords.length === 0) {
    return {
      accuracy: 0,
      fluency: 0,
      completeness: 0,
      overallScore: 0,
      spokenText,
      alignments: targetWords.map((w) => ({ word: w, status: 'omitted', expected: w })),
    };
  }

  const m = targetWords.length;
  const n = spokenWords.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = targetWords[i - 1] === spokenWords[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }

  // Backtrack alignment
  const alignmentsReversed: WordAlignment[] = [];
  let i = m;
  let j = n;
  let correctCount = 0;
  let omittedCount = 0;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && targetWords[i - 1] === spokenWords[j - 1]) {
      alignmentsReversed.push({ word: targetWords[i - 1], status: 'correct' });
      correctCount += 1;
      i -= 1;
      j -= 1;
    } else if (
      i > 0 &&
      j > 0 &&
      dp[i][j] === dp[i - 1][j - 1] + 1
    ) {
      alignmentsReversed.push({
        word: spokenWords[j - 1],
        status: 'mispronounced',
        expected: targetWords[i - 1],
      });
      i -= 1;
      j -= 1;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      alignmentsReversed.push({
        word: targetWords[i - 1],
        status: 'omitted',
        expected: targetWords[i - 1],
      });
      omittedCount += 1;
      i -= 1;
    } else {
      alignmentsReversed.push({
        word: spokenWords[j - 1],
        status: 'inserted',
      });
      j -= 1;
    }
  }

  const alignments = alignmentsReversed.reverse();
  const editDistance = dp[m][n];
  const accuracy = Math.max(0, Math.min(100, Math.round((1 - editDistance / Math.max(m, n)) * 100)));
  const completeness = Math.max(0, Math.min(100, Math.round(((m - omittedCount) / m) * 100)));

  // Fluency considers speaking pace (~2.3 words/sec natural English) + accuracy
  let fluency = accuracy;
  if (durationSeconds && durationSeconds > 0.2) {
    const wps = spokenWords.length / durationSeconds;
    const pacePenalty = Math.min(25, Math.abs(wps - 2.3) * 10);
    fluency = Math.max(0, Math.min(100, Math.round(accuracy * 0.8 + (100 - pacePenalty * 3) * 0.2)));
  } else {
    fluency = Math.max(0, Math.min(100, Math.round((correctCount / m) * 100)));
  }

  const overallScore = Math.round(accuracy * 0.5 + fluency * 0.25 + completeness * 0.25);

  return {
    accuracy,
    fluency,
    completeness,
    overallScore,
    spokenText,
    alignments,
  };
}

/**
 * Merges fragmented 2-3s YouTube transcript chunks into complete punctuation-terminated sentences,
 * preserving accurate [startMs, endMs] intervals.
 */
export function mergeTranscriptSegments(
  segments: RawTranscriptSegment[],
): Array<{ sentence: string; startMs: number; endMs: number }> {
  const merged: Array<{ sentence: string; startMs: number; endMs: number }> = [];
  let bufferText: string[] = [];
  let blockStartMs: number | null = null;
  let blockEndMs = 0;

  for (const seg of segments) {
    const text = seg.text.replace(/\s+/g, ' ').trim();
    if (!text) continue;

    const segStartMs = Math.round(seg.start * 1000);
    const segEndMs = Math.round((seg.start + seg.duration) * 1000);

    if (blockStartMs === null) {
      blockStartMs = segStartMs;
    }
    bufferText.push(text);
    blockEndMs = Math.max(blockEndMs, segEndMs);

    if (/[.!?]["']?$/.test(text)) {
      merged.push({
        sentence: bufferText.join(' '),
        startMs: blockStartMs,
        endMs: blockEndMs,
      });
      bufferText = [];
      blockStartMs = null;
      blockEndMs = 0;
    }
  }

  if (bufferText.length > 0 && blockStartMs !== null) {
    merged.push({
      sentence: bufferText.join(' '),
      startMs: blockStartMs,
      endMs: blockEndMs,
    });
  }

  return merged;
}

/**
 * Applies safety buffer around YouTube clip timestamps: start - 800ms (clamped at 0), end + 1200ms.
 */
export function getBufferedClipRange(startMs: number, endMs: number): {
  startSeconds: number;
  endSeconds: number;
} {
  const bufferedStartMs = Math.max(0, startMs - 800);
  const bufferedEndMs = Math.max(bufferedStartMs + 1000, endMs + 1200);
  return {
    startSeconds: Number((bufferedStartMs / 1000).toFixed(2)),
    endSeconds: Number((bufferedEndMs / 1000).toFixed(2)),
  };
}
