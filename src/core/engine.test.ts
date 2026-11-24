import test from 'node:test';
import assert from 'node:assert/strict';
import { generateVisemeTimeline, sampleVisemeAt } from './viseme';
import {
  computeSm2Schedule,
  evaluatePronunciation,
  getBufferedClipRange,
  getDueCards,
  mergeTranscriptSegments,
} from './srs';
import type { SrsCard } from './types';

test('viseme timeline generates synchronized frames and returns to silence', () => {
  const frames = generateVisemeTimeline('Hello, how are you?', 1.0);
  assert.ok(frames.length > 5);
  assert.equal(frames[frames.length - 1].v, 'sil');

  const slowFrames = generateVisemeTimeline('Hello', 0.8);
  const fastFrames = generateVisemeTimeline('Hello', 1.2);
  const slowTotal = slowFrames[slowFrames.length - 1].t + slowFrames[slowFrames.length - 1].d;
  const fastTotal = fastFrames[fastFrames.length - 1].t + fastFrames[fastFrames.length - 1].d;
  assert.ok(slowTotal > fastTotal, 'Slower speed should yield longer viseme duration');

  const active = sampleVisemeAt(frames, frames[0].t + 5);
  assert.ok(typeof active.jawOpen === 'number');
});

test('SM-2 spaced repetition updates intervals and resets on Again', () => {
  const now = Date.parse('2026-11-23T12:00:00Z');
  const initial = { intervalDays: 1, easeFactor: 2.5, repetitions: 0 };

  const step1 = computeSm2Schedule(initial, 4, now);
  assert.equal(step1.repetitions, 1);
  assert.equal(step1.intervalDays, 1);

  const step2 = computeSm2Schedule(step1, 4, now);
  assert.equal(step2.repetitions, 2);
  assert.equal(step2.intervalDays, 6);

  const step3 = computeSm2Schedule(step2, 5, now);
  assert.equal(step3.repetitions, 3);
  assert.ok(step3.intervalDays > 6);

  const lapse = computeSm2Schedule(step3, 1, now);
  assert.equal(lapse.repetitions, 0);
  assert.equal(lapse.intervalDays, 1);
  assert.ok(lapse.easeFactor >= 1.3);
});

test('getDueCards filters cards due at or before current timestamp', () => {
  const now = Date.parse('2026-11-23T12:00:00Z');
  const cards: SrsCard[] = [
    {
      id: 'c1',
      sourceType: 'chat_correction',
      frontText: '지금 출발할게요',
      backText: 'I am heading out now.',
      intervalDays: 1,
      easeFactor: 2.5,
      repetitions: 1,
      nextReviewAt: '2026-11-22T12:00:00Z',
    },
    {
      id: 'c2',
      sourceType: 'youtube_clip',
      frontText: '요점을 말씀드리자면',
      backText: 'To get straight to the point.',
      intervalDays: 6,
      easeFactor: 2.5,
      repetitions: 2,
      nextReviewAt: '2026-11-25T12:00:00Z',
    },
  ];
  const due = getDueCards(cards, now);
  assert.equal(due.length, 1);
  assert.equal(due[0].id, 'c1');
});

test('evaluatePronunciation scores exact match 100 and highlights omissions/substitutions', () => {
  const exact = evaluatePronunciation('Could I get an iced oat latte?', 'Could I get an iced oat latte');
  assert.equal(exact.accuracy, 100);
  assert.equal(exact.completeness, 100);
  assert.ok(exact.alignments.every((a) => a.status === 'correct'));

  const partial = evaluatePronunciation('I would like to check in early', 'I like to check early', 2.0);
  assert.ok(partial.accuracy < 100);
  assert.ok(partial.completeness < 100);
  assert.ok(partial.alignments.some((a) => a.status === 'omitted'));
});

test('mergeTranscriptSegments merges fragmented captions into punctuated sentences', () => {
  const raw = [
    { text: 'When you want to', start: 10.2, duration: 1.8 },
    { text: 'break the ice at work,', start: 12.0, duration: 2.1 },
    { text: 'ask an open question.', start: 14.1, duration: 2.0 },
    { text: 'It works every time!', start: 16.5, duration: 1.5 },
  ];
  const merged = mergeTranscriptSegments(raw);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].sentence, 'When you want to break the ice at work, ask an open question.');
  assert.equal(merged[0].startMs, 10200);
  assert.equal(merged[0].endMs, 16100);
  assert.equal(merged[1].sentence, 'It works every time!');
});

import { TUTOR_PROFILES } from '../data/seedData';
import { ALL_TUTOR_GESTURES, TUTOR_GESTURES_BY_ID, resolveGestureForTutor } from '../data/gestures';

test('getBufferedClipRange applies -800ms start clamp and +1200ms end buffer', () => {
  const nearZero = getBufferedClipRange(400, 3000);
  assert.equal(nearZero.startSeconds, 0);
  assert.equal(nearZero.endSeconds, 4.2);

  const mid = getBufferedClipRange(12000, 15500);
  assert.equal(mid.startSeconds, 11.2);
  assert.equal(mid.endSeconds, 16.7);
});

test('5 human tutors each have 50 distinct gestures (250 total)', () => {
  assert.equal(TUTOR_PROFILES.length, 5);
  assert.equal(ALL_TUTOR_GESTURES.length, 250);

  for (const tutor of TUTOR_PROFILES) {
    const list = TUTOR_GESTURES_BY_ID[tutor.id];
    assert.equal(list.length, 50, `${tutor.id} must have 50 gestures`);
    const uniqueIds = new Set(list.map((g) => g.id));
    assert.equal(uniqueIds.size, 50, `${tutor.id} gesture IDs must be unique`);

    const resolved = resolveGestureForTutor(tutor.id, 'nod');
    assert.equal(resolved.tutorId, tutor.id);
  }
});
