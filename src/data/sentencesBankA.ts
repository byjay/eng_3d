import type { CoreSentence, DomainCategory } from '../core/types';
import { SLOT_POOLS } from './slotPools';

export interface CompactSentenceSeed {
  domain: DomainCategory;
  scenarioId: string;
  patternTitle: string;
  korean: string;
  keyWord: string;
  keyWordKo: string;
  grammarTipKo: string;
  forms: [string, string, string, string, string]; // statement, question, negative, polite, past
  slotIds: string[];
}

export interface GrammarBlueprint {
  title: string;
  grammarTipKo: string;
  build: (ctx: {
    action: string;
    actionPast: string;
    actionIng: string;
    objectSlot: string;
    extraPhrase: string;
  }) => [string, string, string, string, string];
}

export const GRAMMAR_BLUEPRINTS: GrammarBlueprint[] = [
  {
    title: "I'd like to + 동사원형 (정중한 희망)",
    grammarTipKo: "'I want' 대신 'I would like to'를 쓰면 부탁이나 주문이 훨씬 부드럽고 정중해집니다.",
    build: ({ action, actionPast, objectSlot, extraPhrase }) => [
      `I would like to ${action} {${objectSlot}} ${extraPhrase}.`,
      `Would you like me to ${action} {${objectSlot}} ${extraPhrase}?`,
      `I would not like to ${action} {${objectSlot}} ${extraPhrase}.`,
      `Could I possibly ${action} {${objectSlot}} ${extraPhrase}, please?`,
      `I wanted to ${action} {${objectSlot}} ${extraPhrase}, so I ${actionPast} it early.`,
    ],
  },
  {
    title: 'Could you help me + 동사원형 (도움 요청)',
    grammarTipKo: 'help 목적어 뒤에 동사원형을 써서 상대방에게 바로 도움을 요청하는 실전 표현입니다.',
    build: ({ action, actionPast, objectSlot, extraPhrase }) => [
      `You can help me ${action} {${objectSlot}} ${extraPhrase}.`,
      `Could you help me ${action} {${objectSlot}} ${extraPhrase}?`,
      `You do not need to help me ${action} {${objectSlot}} ${extraPhrase}.`,
      `Would you mind helping me ${action} {${objectSlot}} ${extraPhrase}?`,
      `Thank you—you helped me ${action} {${objectSlot}} ${extraPhrase}, and I ${actionPast} it right away.`,
    ],
  },
  {
    title: 'I need to + 동사원형 (필요·의무)',
    grammarTipKo: '당장 처리해야 할 일을 말할 때 쓰며, 의문·부정에서는 do/does/did 조동사를 앞에 둡니다.',
    build: ({ action, actionPast, objectSlot, extraPhrase }) => [
      `I need to ${action} {${objectSlot}} ${extraPhrase}.`,
      `Do I need to ${action} {${objectSlot}} ${extraPhrase}?`,
      `I do not need to ${action} {${objectSlot}} ${extraPhrase}.`,
      `Would I need to ${action} {${objectSlot}} ${extraPhrase}, by any chance?`,
      `I needed to ${action} {${objectSlot}} ${extraPhrase}, so I ${actionPast} it earlier.`,
    ],
  },
  {
    title: 'Is there any way to ~ (가능 여부 문의)',
    grammarTipKo: '직설적인 질문 대신 "혹시 ~할 방법이 있을까요?"로 가능성을 정중하게 타진할 때 씁니다.',
    build: ({ action, actionPast, objectSlot, extraPhrase }) => [
      `There is a simple way to ${action} {${objectSlot}} ${extraPhrase}.`,
      `Is there any way to ${action} {${objectSlot}} ${extraPhrase}?`,
      `There is no easy way to ${action} {${objectSlot}} ${extraPhrase}.`,
      `Would there be any way to ${action} {${objectSlot}} ${extraPhrase}, please?`,
      `There was a way to ${action} {${objectSlot}} ${extraPhrase}, and I ${actionPast} it smoothly.`,
    ],
  },
  {
    title: 'I was wondering if ~ (완곡한 문의)',
    grammarTipKo: '과거진행형(was wondering) + if절을 결합해 초면이나 공적 창구에서 가장 공손하게 묻습니다.',
    build: ({ action, actionPast, objectSlot, extraPhrase }) => [
      `I am hoping we can ${action} {${objectSlot}} ${extraPhrase}.`,
      `Can we ${action} {${objectSlot}} ${extraPhrase}?`,
      `We cannot ${action} {${objectSlot}} ${extraPhrase} right now.`,
      `I was wondering if we could ${action} {${objectSlot}} ${extraPhrase}.`,
      `I wondered if we could ${action} {${objectSlot}} ${extraPhrase}, so I ${actionPast} it first.`,
    ],
  },
  {
    title: 'Have you already + 과거분사 (완료 확인)',
    grammarTipKo: '이미 처리했는지 여부를 확인할 때 현재완료(have + p.p.) 어법을 사용합니다.',
    build: ({ actionPast, objectSlot, extraPhrase }) => [
      `I have already ${actionPast} {${objectSlot}} ${extraPhrase}.`,
      `Have you already ${actionPast} {${objectSlot}} ${extraPhrase}?`,
      `I have not ${actionPast} {${objectSlot}} ${extraPhrase} yet.`,
      `May I ask if you have ${actionPast} {${objectSlot}} ${extraPhrase}?`,
      `I ${actionPast} {${objectSlot}} ${extraPhrase} before leaving.`,
    ],
  },
  {
    title: 'Make sure to + 동사원형 (당부·재확인)',
    grammarTipKo: '빠뜨리지 말고 꼭 확인하라고 안내하거나 스스로 다짐할 때 자주 쓰는 표현입니다.',
    build: ({ action, actionPast, objectSlot, extraPhrase }) => [
      `We should make sure to ${action} {${objectSlot}} ${extraPhrase}.`,
      `Did you make sure to ${action} {${objectSlot}} ${extraPhrase}?`,
      `Do not forget to ${action} {${objectSlot}} ${extraPhrase}.`,
      `Please make sure to ${action} {${objectSlot}} ${extraPhrase} when possible.`,
      `I made sure to ${action} {${objectSlot}} ${extraPhrase} and checked it twice.`,
    ],
  },
  {
    title: 'Let me + 동사원형 (즉각 응대)',
    grammarTipKo: '상대의 요청을 받아 "제가 바로 ~해 드릴게요"라고 응대할 때 쓰는 대표 구어 패턴입니다.',
    build: ({ action, actionPast, objectSlot, extraPhrase }) => [
      `Let me ${action} {${objectSlot}} ${extraPhrase}.`,
      `Should I ${action} {${objectSlot}} ${extraPhrase} for you?`,
      `I should not ${action} {${objectSlot}} ${extraPhrase} without checking.`,
      `Allow me to ${action} {${objectSlot}} ${extraPhrase} right away.`,
      `I already ${actionPast} {${objectSlot}} ${extraPhrase} a moment ago.`,
    ],
  },
  {
    title: 'How long does it take to ~ (소요 시간)',
    grammarTipKo: '비인칭 주어 it과 take를 사용해 처리나 이동에 걸리는 시간을 정확히 묻고 답합니다.',
    build: ({ action, actionPast, objectSlot, extraPhrase }) => [
      `It takes ten minutes to ${action} {${objectSlot}} ${extraPhrase}.`,
      `How long does it take to ${action} {${objectSlot}} ${extraPhrase}?`,
      `It does not take long to ${action} {${objectSlot}} ${extraPhrase}.`,
      `Could you tell me how long it takes to ${action} {${objectSlot}} ${extraPhrase}?`,
      `It took less than an hour to ${action} {${objectSlot}} ${extraPhrase}, and I ${actionPast} it.`,
    ],
  },
  {
    title: 'Where can I + 동사원형 (장소·창구 질문)',
    grammarTipKo: '의문사 where + 조동사 can + 주어 + 동사원형 어순으로 어디서 해야 하는지 묻습니다.',
    build: ({ action, actionPast, objectSlot, extraPhrase }) => [
      `You can ${action} {${objectSlot}} ${extraPhrase} right over there.`,
      `Where can I ${action} {${objectSlot}} ${extraPhrase}?`,
      `You cannot ${action} {${objectSlot}} ${extraPhrase} at this desk.`,
      `Could you point me to where I can ${action} {${objectSlot}} ${extraPhrase}?`,
      `I found where to ${action} {${objectSlot}} ${extraPhrase} and ${actionPast} it easily.`,
    ],
  },
  {
    title: 'Do you happen to ~ (혹시 ~하시나요)',
    grammarTipKo: 'happen to를 넣으면 상대에게 부담 없이 "혹시 ~인가요?"라고 정중히 묻는 뉘앙스가 됩니다.',
    build: ({ action, actionPast, objectSlot, extraPhrase }) => [
      `I happen to ${action} {${objectSlot}} ${extraPhrase}.`,
      `Do you happen to ${action} {${objectSlot}} ${extraPhrase}?`,
      `I do not happen to ${action} {${objectSlot}} ${extraPhrase}.`,
      `Would you happen to ${action} {${objectSlot}} ${extraPhrase}, please?`,
      `I happened to ${action} {${objectSlot}} ${extraPhrase} yesterday.`,
    ],
  },
  {
    title: 'I forgot to + 동사원형 (실수·누락 수습)',
    grammarTipKo: 'forget + to부정사는 "해야 할 일을 깜빡하다"라는 뜻으로 누락된 절차를 설명할 때 필수입니다.',
    build: ({ action, actionPast, objectSlot, extraPhrase }) => [
      `I almost forgot to ${action} {${objectSlot}} ${extraPhrase}.`,
      `Did you forget to ${action} {${objectSlot}} ${extraPhrase}?`,
      `Do not worry—I did not forget to ${action} {${objectSlot}} ${extraPhrase}.`,
      `Excuse me, I accidentally forgot to ${action} {${objectSlot}} ${extraPhrase}.`,
      `I forgot to ${action} {${objectSlot}} ${extraPhrase}, so I ${actionPast} it just now.`,
    ],
  },
  {
    title: 'I am planning to + 동사원형 (예정·계획)',
    grammarTipKo: '진행형 be planning to로 앞으로의 구체적 계획이나 일정을 자연스럽게 알립니다.',
    build: ({ action, actionPast, objectSlot, extraPhrase }) => [
      `I am planning to ${action} {${objectSlot}} ${extraPhrase}.`,
      `Are you planning to ${action} {${objectSlot}} ${extraPhrase}?`,
      `I am not planning to ${action} {${objectSlot}} ${extraPhrase}.`,
      `Would it be fine if I plan to ${action} {${objectSlot}} ${extraPhrase}?`,
      `I planned to ${action} {${objectSlot}} ${extraPhrase}, so I ${actionPast} it ahead of time.`,
    ],
  },
  {
    title: 'Would you prefer to ~ (선호도 확인)',
    grammarTipKo: '상대방의 선택을 존중하며 의향을 물을 때 "Do you want"보다 훨씬 세련된 표현입니다.',
    build: ({ action, actionPast, objectSlot, extraPhrase }) => [
      `I prefer to ${action} {${objectSlot}} ${extraPhrase}.`,
      `Would you prefer to ${action} {${objectSlot}} ${extraPhrase}?`,
      `I would prefer not to ${action} {${objectSlot}} ${extraPhrase}.`,
      `Would it be better if we ${action} {${objectSlot}} ${extraPhrase}?`,
      `I preferred to ${action} {${objectSlot}} ${extraPhrase}, so I ${actionPast} that option.`,
    ],
  },
  {
    title: 'Please let me know if ~ (사후 안내)',
    grammarTipKo: '조건절 if 뒤에 현재시제를 써서 "혹시 ~해야 하면 알려주세요"라고 매끄럽게 마무리합니다.',
    build: ({ action, actionPast, actionIng, objectSlot, extraPhrase }) => [
      `Please let me know if I should ${action} {${objectSlot}} ${extraPhrase}.`,
      `Will you let me know if we need to ${action} {${objectSlot}} ${extraPhrase}?`,
      `You do not need to notify me unless you are ${actionIng} {${objectSlot}} ${extraPhrase}.`,
      `Could you please let me know if I can ${action} {${objectSlot}} ${extraPhrase}?`,
      `They let me know right away, so I ${actionPast} {${objectSlot}} ${extraPhrase}.`,
    ],
  },
];

export interface DomainSeedAtom {
  scenarioId: string;
  action: string;
  actionPast: string;
  actionIng: string;
  koreanBase: string;
  keyWord: string;
  keyWordKo: string;
  objectSlot: string;
  prep: string;
  extraSlot: string;
}

const DAILY_ATOMS: DomainSeedAtom[] = [
  { scenarioId: 'cafe_order', action: 'order', actionPast: 'ordered', actionIng: 'ordering', koreanBase: '음료나 베이커리를 주문하다', keyWord: 'order', keyWordKo: '주문하다', objectSlot: 'drinkItem', prep: '', extraSlot: 'dailyTime' },
  { scenarioId: 'cafe_order', action: 'pick up', actionPast: 'picked up', actionIng: 'picking up', koreanBase: '주문한 메뉴를 매장에서 수령하다', keyWord: 'pick up', keyWordKo: '수령하다', objectSlot: 'drinkItem', prep: 'at', extraSlot: 'dailyPlace' },
  { scenarioId: 'wifi_setup', action: 'fix', actionPast: 'fixed', actionIng: 'fixing', koreanBase: '집안 고장이나 불편을 수리하다', keyWord: 'fix', keyWordKo: '수리하다', objectSlot: 'homeIssue', prep: '', extraSlot: 'dailyTime' },
  { scenarioId: 'pharmacy_visit', action: 'treat', actionPast: 'treated', actionIng: 'treating', koreanBase: '가벼운 감기 증상을 완화하다', keyWord: 'treat', keyWordKo: '완화·치료하다', objectSlot: 'symptomType', prep: '', extraSlot: 'dailyTime' },
  { scenarioId: 'free_talk', action: 'visit', actionPast: 'visited', actionIng: 'visiting', koreanBase: '동네 편의시설에 들르다', keyWord: 'visit', keyWordKo: '방문하다', objectSlot: 'dailyPlace', prep: '', extraSlot: 'dailyTime' },
];

const TRAVEL_ATOMS: DomainSeedAtom[] = [
  { scenarioId: 'airport_immigration', action: 'present', actionPast: 'presented', actionIng: 'presenting', koreanBase: '여권과 탑승 서류를 제시하다', keyWord: 'present', keyWordKo: '제시하다', objectSlot: 'travelDoc', prep: 'at', extraSlot: 'transitSpot' },
  { scenarioId: 'hotel_checkin', action: 'request', actionPast: 'requested', actionIng: 'requesting', koreanBase: '객실이나 좌석 옵션을 요청하다', keyWord: 'request', keyWordKo: '요청하다', objectSlot: 'travelRoomOpt', prep: 'for', extraSlot: 'travelPlan' },
  { scenarioId: 'subway_directions', action: 'reach', actionPast: 'reached', actionIng: 'reaching', koreanBase: '목적지나 탑승장에 도착하다', keyWord: 'reach', keyWordKo: '도착하다', objectSlot: 'transitSpot', prep: '', extraSlot: 'dailyTime' },
  { scenarioId: 'lost_luggage', action: 'verify', actionPast: 'verified', actionIng: 'verifying', koreanBase: '여행 서류와 수하물표를 확인하다', keyWord: 'verify', keyWordKo: '확인하다', objectSlot: 'travelDoc', prep: 'for', extraSlot: 'travelPlan' },
  { scenarioId: 'hotel_late_checkout', action: 'confirm', actionPast: 'confirmed', actionIng: 'confirming', koreanBase: '숙박·좌석 옵션을 확정하다', keyWord: 'confirm', keyWordKo: '확정하다', objectSlot: 'travelRoomOpt', prep: '', extraSlot: 'dailyTime' },
];

const WORK_ATOMS: DomainSeedAtom[] = [
  { scenarioId: 'tech_standup', action: 'finalize', actionPast: 'finalized', actionIng: 'finalizing', koreanBase: '업무 산출물을 최종 확정하다', keyWord: 'finalize', keyWordKo: '최종 확정하다', objectSlot: 'workDeliverable', prep: 'by', extraSlot: 'workDeadline' },
  { scenarioId: 'client_pitch', action: 'review', actionPast: 'reviewed', actionIng: 'reviewing', koreanBase: '제안서와 핵심 지표를 검토하다', keyWord: 'review', keyWordKo: '검토하다', objectSlot: 'workDeliverable', prep: 'before', extraSlot: 'workDeadline' },
  { scenarioId: 'schedule_meeting', action: 'prepare', actionPast: 'prepared', actionIng: 'preparing', koreanBase: '미팅 자료와 일정을 준비하다', keyWord: 'prepare', keyWordKo: '준비하다', objectSlot: 'workDeliverable', prep: '', extraSlot: 'dailyTime' },
  { scenarioId: 'status_delay', action: 'update', actionPast: 'updated', actionIng: 'updating', koreanBase: '진행 상황과 마감일을 업데이트하다', keyWord: 'update', keyWordKo: '갱신하다', objectSlot: 'workDeliverable', prep: 'before', extraSlot: 'workDeadline' },
  { scenarioId: 'feedback_review', action: 'share', actionPast: 'shared', actionIng: 'sharing', koreanBase: '초안과 피드백을 공유하다', keyWord: 'share', keyWordKo: '공유하다', objectSlot: 'workDeliverable', prep: '', extraSlot: 'dailyTime' },
];

const SHOPPING_ATOMS: DomainSeedAtom[] = [
  { scenarioId: 'size_fitting_room', action: 'try on', actionPast: 'tried on', actionIng: 'trying on', koreanBase: '상품 사이즈나 핏을 입어보다', keyWord: 'try on', keyWordKo: '입어보다', objectSlot: 'shopItem', prep: 'in', extraSlot: 'shopOption' },
  { scenarioId: 'defective_exchange', action: 'exchange', actionPast: 'exchanged', actionIng: 'exchanging', koreanBase: '상품을 다른 옵션으로 교환하다', keyWord: 'exchange', keyWordKo: '교환하다', objectSlot: 'shopItem', prep: 'for', extraSlot: 'shopOption' },
  { scenarioId: 'split_payment', action: 'pay for', actionPast: 'paid for', actionIng: 'paying for', koreanBase: '원하는 수단으로 상품을 결제하다', keyWord: 'pay for', keyWordKo: '지불하다', objectSlot: 'shopItem', prep: 'with', extraSlot: 'payMethod' },
  { scenarioId: 'return_no_receipt', action: 'return', actionPast: 'returned', actionIng: 'returning', koreanBase: '상품을 반품하고 환불받다', keyWord: 'return', keyWordKo: '반품하다', objectSlot: 'shopItem', prep: 'with', extraSlot: 'payMethod' },
  { scenarioId: 'discount_promo', action: 'reserve', actionPast: 'reserved', actionIng: 'reserving', koreanBase: '원하는 옵션의 재고를 확보하다', keyWord: 'reserve', keyWordKo: '예약하다', objectSlot: 'shopItem', prep: 'in', extraSlot: 'shopOption' },
];

export function buildDomainSeeds(
  domain: DomainCategory,
  atoms: DomainSeedAtom[],
  maxCount?: number,
): CompactSentenceSeed[] {
  const result: CompactSentenceSeed[] = [];
  for (let bIdx = 0; bIdx < GRAMMAR_BLUEPRINTS.length; bIdx++) {
    const bp = GRAMMAR_BLUEPRINTS[bIdx];
    for (let aIdx = 0; aIdx < atoms.length; aIdx++) {
      const atom = atoms[aIdx];
      const extraPhrase = atom.prep ? `${atom.prep} {${atom.extraSlot}}` : `{${atom.extraSlot}}`;
      const forms = bp.build({
        action: atom.action,
        actionPast: atom.actionPast,
        actionIng: atom.actionIng,
        objectSlot: atom.objectSlot,
        extraPhrase,
      });
      result.push({
        domain,
        scenarioId: atom.scenarioId,
        patternTitle: bp.title,
        korean: `${atom.koreanBase} (${bp.title.split(' (')[1]?.replace(')', '') ?? bp.title})`,
        keyWord: atom.keyWord,
        keyWordKo: atom.keyWordKo,
        grammarTipKo: bp.grammarTipKo,
        forms,
        slotIds: [atom.objectSlot, atom.extraSlot],
      });
      if (maxCount && result.length >= maxCount) return result;
    }
  }
  return result;
}

export const SENTENCE_SEEDS_PART_A: CompactSentenceSeed[] = [
  ...buildDomainSeeds('daily', DAILY_ATOMS),
  ...buildDomainSeeds('travel', TRAVEL_ATOMS),
  ...buildDomainSeeds('work', WORK_ATOMS),
  ...buildDomainSeeds('shopping', SHOPPING_ATOMS),
];

export function hydrateSeeds(seeds: CompactSentenceSeed[], startId: number): CoreSentence[] {
  return seeds.map((seed, offset) => {
    const id = startId + offset;
    const slots = seed.slotIds
      .map((slotId) => SLOT_POOLS[slotId])
      .filter((s): s is NonNullable<typeof s> => Boolean(s));
    return {
      id,
      code: `S${String(id).padStart(3, '0')}`,
      domain: seed.domain,
      scenarioId: seed.scenarioId,
      patternTitle: seed.patternTitle,
      korean: seed.korean,
      statement: seed.forms[0],
      question: seed.forms[1],
      negative: seed.forms[2],
      polite: seed.forms[3],
      past: seed.forms[4],
      grammarTipKo: seed.grammarTipKo,
      keyWord: seed.keyWord,
      keyWordKo: seed.keyWordKo,
      slots,
    };
  });
}
