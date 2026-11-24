import type {
  CoreSentence,
  DomainCategory,
  HabitProgress,
  ScenarioTemplate,
  SentenceFormMode,
} from './types';

export interface DomainInfo {
  id: DomainCategory;
  labelEn: string;
  labelKo: string;
  targetScenarioCount: number;
  summaryKo: string;
}

export const DOMAIN_LIST: DomainInfo[] = [
  {
    id: 'daily',
    labelEn: 'Daily Life',
    labelKo: '일상',
    targetScenarioCount: 45,
    summaryKo: '집·카페·병원·약속·이웃·스마트폰 등 매일 쓰는 생활 회화',
  },
  {
    id: 'travel',
    labelEn: 'Travel',
    labelKo: '여행',
    targetScenarioCount: 45,
    summaryKo: '공항·입국심사·호텔·식당·대중교통·분실물 등 해외여행 필수',
  },
  {
    id: 'work',
    labelEn: 'Work',
    labelKo: '업무',
    targetScenarioCount: 45,
    summaryKo: '미팅·이메일·보고·일정조율·협상·면접 등 실전 비즈니스',
  },
  {
    id: 'shopping',
    labelEn: 'Shopping',
    labelKo: '쇼핑',
    targetScenarioCount: 45,
    summaryKo: '사이즈·할인·교환·환불·영수증·온라인 배송 문의',
  },
  {
    id: 'driving',
    labelEn: 'Driving',
    labelKo: '운전',
    targetScenarioCount: 40,
    summaryKo: '렌터카·주유·주차·교통법규·내비게이션·사고·정비소',
  },
  {
    id: 'government',
    labelEn: 'Gov & Civic',
    labelKo: '관공서',
    targetScenarioCount: 40,
    summaryKo: '시청·비자·주민등록·우체국·세금·경찰·도서관 민원',
  },
  {
    id: 'banking',
    labelEn: 'Banking',
    labelKo: '은행',
    targetScenarioCount: 40,
    summaryKo: '계좌개설·카드분실·해외송금·환전·대출·수수료 확인',
  },
];

export const SENTENCE_FORM_META: Array<{
  mode: SentenceFormMode;
  labelKo: string;
  labelEn: string;
  descKo: string;
}> = [
  { mode: 'statement', labelKo: '평문', labelEn: 'Statement', descKo: '기본 평서문 패턴' },
  { mode: 'question', labelKo: '의문문', labelEn: 'Question', descKo: '질문·확인 어법 변환' },
  { mode: 'negative', labelKo: '부정문', labelEn: 'Negative', descKo: '거절·부정 어법 변환' },
  { mode: 'polite', labelKo: '공손표현', labelEn: 'Polite', descKo: '실전 완곡·정중 요청' },
  { mode: 'past', labelKo: '과거/완료', labelEn: 'Past', descKo: '과거·경험 시제 변환' },
];

export function fixIndefiniteArticles(text: string): string {
  // Replace "a <vowel-sound word>" -> "an <word>" and "an <consonant-sound word>" -> "a <word>"
  return text.replace(/\b(a|an)\s+([a-zA-Z][a-zA-Z0-9'-]*)/g, (full, art: string, word: string) => {
    const lowerWord = word.toLowerCase();
    // Common silent-h and special vowel-initial sound exceptions
    const silentH = /^(hour|honest|honor|honour|heir)/.test(lowerWord);
    const consonantU = /^(uni|use|user|usual|eu|one)/.test(lowerWord);
    const startsVowelSound = (silentH || /^[aeiou]/.test(lowerWord)) && !consonantU;
    const isUpper = art[0] === 'A';
    const nextArt = startsVowelSound ? (isUpper ? 'An' : 'an') : isUpper ? 'A' : 'a';
    return `${nextArt} ${word}`;
  });
}

export function renderSentenceWithSlots(
  sentence: CoreSentence,
  form: SentenceFormMode,
  selectedSlots: Record<string, string>,
): { text: string; parts: Array<{ text: string; slotId?: string }> } {
  const template = sentence[form] || sentence.statement;
  const tokenRegex = /\{([a-zA-Z0-9_]+)\}/g;
  const parts: Array<{ text: string; slotId?: string }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(template)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: template.slice(lastIndex, match.index) });
    }
    const slotId = match[1];
    const slotDef = sentence.slots.find((s) => s.id === slotId);
    const replacement = selectedSlots[slotId] ?? slotDef?.defaultWord ?? slotId;
    parts.push({ text: replacement, slotId });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < template.length) {
    parts.push({ text: template.slice(lastIndex) });
  }

  const rawJoined = parts.map((p) => p.text).join('');
  const normalized = fixIndefiniteArticles(rawJoined).replace(/\s{2,}/g, ' ').trim();
  // Capitalize very first character safely
  const finalText = normalized.charAt(0).toUpperCase() + normalized.slice(1);

  return { text: finalText, parts };
}

export function getDefaultSlotMap(sentence: CoreSentence): Record<string, string> {
  const map: Record<string, string> = {};
  for (const slot of sentence.slots) {
    map[slot.id] = slot.defaultWord;
  }
  return map;
}

export function filterScenarios(
  scenarios: ScenarioTemplate[],
  domain: DomainCategory | 'all',
  query: string,
): ScenarioTemplate[] {
  const q = query.trim().toLowerCase();
  return scenarios.filter((s) => {
    if (domain !== 'all' && s.category !== domain) return false;
    if (!q) return true;
    return (
      s.title.toLowerCase().includes(q) ||
      s.titleKo.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q) ||
      String(s.index) === q ||
      s.tutorOpening.toLowerCase().includes(q)
    );
  });
}

export function filterCoreSentences(
  sentences: CoreSentence[],
  domain: DomainCategory | 'all',
  query: string,
  scenarioId?: string,
): CoreSentence[] {
  const q = query.trim().toLowerCase();
  return sentences.filter((item) => {
    if (domain !== 'all' && item.domain !== domain) return false;
    if (scenarioId && item.scenarioId !== scenarioId) return false;
    if (!q) return true;
    return (
      item.patternTitle.toLowerCase().includes(q) ||
      item.korean.toLowerCase().includes(q) ||
      item.statement.toLowerCase().includes(q) ||
      item.keyWord.toLowerCase().includes(q) ||
      item.keyWordKo.toLowerCase().includes(q) ||
      item.code.toLowerCase().includes(q) ||
      item.slots.some(
        (slot) =>
          slot.defaultWord.toLowerCase().includes(q) ||
          slot.options.some(
            (opt) => opt.word.toLowerCase().includes(q) || opt.ko.toLowerCase().includes(q),
          ),
      )
    );
  });
}

export function getDailyHabitBatch(
  sentences: CoreSentence[],
  progress: HabitProgress,
  count = 5,
): CoreSentence[] {
  const completed = new Set(progress.completedSentenceIds);
  const remaining = sentences.filter((s) => !completed.has(s.id));
  if (remaining.length >= count) {
    return remaining.slice(0, count);
  }
  return [...remaining, ...sentences.slice(0, Math.max(0, count - remaining.length))];
}

export function markHabitSentenceCompleted(
  progress: HabitProgress,
  sentenceId: number,
  todayIsoDate: string,
): HabitProgress {
  const isNewDay = progress.lastPracticedDate !== todayIsoDate;
  const baseIds = isNewDay ? [] : progress.completedSentenceIds;
  const completedSentenceIds = baseIds.includes(sentenceId)
    ? baseIds
    : [...baseIds, sentenceId];
  return {
    ...progress,
    completedSentenceIds,
    shadowCompletedCount: progress.shadowCompletedCount + 1,
    lastPracticedDate: todayIsoDate,
  };
}
