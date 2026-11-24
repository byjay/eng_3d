import type { CoreSentence, ScenarioTemplate } from '../core/types';
import { SCENARIOS_300 } from './scenarios300';
import { SENTENCE_SEEDS_PART_A, hydrateSeeds } from './sentencesBankA';
import { SENTENCE_SEEDS_PART_B } from './sentencesBankB';

export const CORE_SENTENCES_500: CoreSentence[] = hydrateSeeds(
  [...SENTENCE_SEEDS_PART_A, ...SENTENCE_SEEDS_PART_B],
  1,
);

const SENTENCES_BY_DOMAIN = CORE_SENTENCES_500.reduce<Record<string, number[]>>((acc, item) => {
  if (!acc[item.domain]) acc[item.domain] = [];
  acc[item.domain].push(item.id);
  return acc;
}, {});

const SENTENCES_BY_SCENARIO = CORE_SENTENCES_500.reduce<Record<string, number[]>>((acc, item) => {
  if (!acc[item.scenarioId]) acc[item.scenarioId] = [];
  acc[item.scenarioId].push(item.id);
  return acc;
}, {});

export const SCENARIOS_300_LINKED: ScenarioTemplate[] = SCENARIOS_300.map((scenario) => {
  const direct = SENTENCES_BY_SCENARIO[scenario.id] ?? [];
  const domainPool = SENTENCES_BY_DOMAIN[scenario.category] ?? [];
  // Ensure every single one of the 300 scenarios links to 3+ relevant core sentences
  const fallbackIds = [
    domainPool[(scenario.index * 3) % domainPool.length],
    domainPool[(scenario.index * 3 + 1) % domainPool.length],
    domainPool[(scenario.index * 3 + 2) % domainPool.length],
  ].filter((id): id is number => typeof id === 'number');

  const merged = Array.from(new Set([...direct, ...fallbackIds])).slice(0, 5);
  return {
    ...scenario,
    coreSentenceIds: merged,
  };
});

export function getSentenceById(id: number): CoreSentence | undefined {
  return CORE_SENTENCES_500.find((s) => s.id === id);
}

export function getScenarioById(id: string): ScenarioTemplate | undefined {
  return SCENARIOS_300_LINKED.find((s) => s.id === id);
}
