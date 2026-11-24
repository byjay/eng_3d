import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENARIOS_300_LINKED, CORE_SENTENCES_500 } from '../data/sentences500';
import {
  DOMAIN_LIST,
  filterCoreSentences,
  filterScenarios,
  fixIndefiniteArticles,
  getDailyHabitBatch,
  getDefaultSlotMap,
  markHabitSentenceCompleted,
  renderSentenceWithSlots,
} from './sentenceEngine';
import type { HabitProgress, SentenceFormMode } from './types';

test('300 scenarios cover all 7 requested domains with 10+ dialogues each', () => {
  assert.equal(SCENARIOS_300_LINKED.length, 300);

  const counts = new Map<string, number>();
  for (const s of SCENARIOS_300_LINKED) {
    counts.set(s.category, (counts.get(s.category) ?? 0) + 1);
    assert.ok(s.dialogues.length >= 10, `Scenario ${s.id} should have >=10 dialogues`);
    assert.ok(s.coreSentenceIds.length >= 3, `Scenario ${s.id} should link >=3 core sentences`);
  }

  for (const dom of DOMAIN_LIST) {
    assert.equal(
      counts.get(dom.id),
      dom.targetScenarioCount,
      `Domain ${dom.id} count mismatch`,
    );
  }
});

test('500 unique core sentences support all 5 grammar forms and valid word slots', () => {
  assert.equal(CORE_SENTENCES_500.length, 500);
  const uniqueStatements = new Set(CORE_SENTENCES_500.map((s) => s.statement));
  assert.equal(uniqueStatements.size, 500);

  const forms: SentenceFormMode[] = ['statement', 'question', 'negative', 'polite', 'past'];
  for (const sentence of CORE_SENTENCES_500) {
    assert.ok(sentence.slots.length >= 2, `${sentence.code} must have >=2 slots`);
    assert.ok(sentence.keyWord.length > 0, `${sentence.code} must have keyWord`);
    assert.ok(sentence.grammarTipKo.length > 0, `${sentence.code} must have grammarTipKo`);

    const defaults = getDefaultSlotMap(sentence);
    for (const form of forms) {
      const rendered = renderSentenceWithSlots(sentence, form, defaults);
      assert.ok(!rendered.text.includes('{'), `Unresolved token in ${sentence.code} (${form}): ${rendered.text}`);
      assert.ok(!rendered.text.includes('}'), `Unresolved brace in ${sentence.code} (${form}): ${rendered.text}`);
    }
  }
});

test('fixIndefiniteArticles adjusts a/an cleanly when swapping nouns', () => {
  assert.equal(fixIndefiniteArticles('I want a iced coffee'), 'I want an iced coffee');
  assert.equal(fixIndefiniteArticles('Need an uniform today'), 'Need a uniform today');
  assert.equal(fixIndefiniteArticles('Wait a hour please'), 'Wait an hour please');
});

test('word slot substitution updates rendered sentence accurately', () => {
  const first = CORE_SENTENCES_500[0];
  const slot0 = first.slots[0];
  const altWord = slot0.options[1].word;
  const rendered = renderSentenceWithSlots(first, 'question', {
    ...getDefaultSlotMap(first),
    [slot0.id]: altWord,
  });
  assert.ok(rendered.text.includes(altWord));
  assert.ok(rendered.text.endsWith('?'));
});

test('filtering and daily habit progression work deterministically', () => {
  const bankingScenarios = filterScenarios(SCENARIOS_300_LINKED, 'banking', 'wire');
  assert.ok(bankingScenarios.length >= 1);

  const drivingSentences = filterCoreSentences(CORE_SENTENCES_500, 'driving', 'tire');
  assert.ok(drivingSentences.length >= 1);

  let progress: HabitProgress = {
    dailyTarget: 5,
    completedSentenceIds: [],
    transformedCount: 0,
    shadowCompletedCount: 0,
    lastPracticedDate: '2026-11-23',
  };
  const batch1 = getDailyHabitBatch(CORE_SENTENCES_500, progress, 5);
  assert.equal(batch1.length, 5);
  progress = markHabitSentenceCompleted(progress, batch1[0].id, '2026-11-23');
  assert.deepEqual(progress.completedSentenceIds, [batch1[0].id]);
  const batch2 = getDailyHabitBatch(CORE_SENTENCES_500, progress, 5);
  assert.equal(batch2[0].id, batch1[1].id);
});
