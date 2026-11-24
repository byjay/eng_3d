import {
  buildDomainSeeds,
  type CompactSentenceSeed,
  type DomainSeedAtom,
} from './sentencesBankA';

const DRIVING_ATOMS: DomainSeedAtom[] = [
  { scenarioId: 'oil_change_shop', action: 'inspect', actionPast: 'inspected', actionIng: 'inspecting', koreanBase: '차량 부품을 점검하다', keyWord: 'inspect', keyWordKo: '점검하다', objectSlot: 'carPart', prep: 'at', extraSlot: 'drivingSpot' },
  { scenarioId: 'flat_tire_help', action: 'replace', actionPast: 'replaced', actionIng: 'replacing', koreanBase: '타이어나 소모품을 교체하다', keyWord: 'replace', keyWordKo: '교체하다', objectSlot: 'carPart', prep: 'at', extraSlot: 'drivingSpot' },
  { scenarioId: 'gas_station_pump', action: 'add', actionPast: 'added', actionIng: 'adding', koreanBase: '주유나 렌트 옵션을 추가하다', keyWord: 'add', keyWordKo: '추가하다', objectSlot: 'fuelType', prep: 'at', extraSlot: 'drivingSpot' },
  { scenarioId: 'rental_car_pickup', action: 'arrange', actionPast: 'arranged', actionIng: 'arranging', koreanBase: '렌터카 및 주유 옵션을 신청하다', keyWord: 'arrange', keyWordKo: '준비·신청하다', objectSlot: 'fuelType', prep: '', extraSlot: 'dailyTime' },
  { scenarioId: 'parking_garage_lost_ticket', action: 'reach', actionPast: 'reached', actionIng: 'reaching', koreanBase: '정비소나 주차장에 진입하다', keyWord: 'reach', keyWordKo: '도착·진입하다', objectSlot: 'drivingSpot', prep: '', extraSlot: 'dailyTime' },
];

const GOVERNMENT_ATOMS: DomainSeedAtom[] = [
  { scenarioId: 'residency_certificate', action: 'apply for', actionPast: 'applied for', actionIng: 'applying for', koreanBase: '관공서 민원 서류를 신청하다', keyWord: 'apply for', keyWordKo: '신청하다', objectSlot: 'govDocument', prep: 'at', extraSlot: 'govOffice' },
  { scenarioId: 'visa_extension', action: 'submit', actionPast: 'submitted', actionIng: 'submitting', koreanBase: '심사용 서류를 제출하다', keyWord: 'submit', keyWordKo: '제출하다', objectSlot: 'govDocument', prep: 'at', extraSlot: 'govOffice' },
  { scenarioId: 'passport_renewal', action: 'pick up', actionPast: 'picked up', actionIng: 'picking up', koreanBase: '발급된 증명서를 수령하다', keyWord: 'pick up', keyWordKo: '수령하다', objectSlot: 'govDocument', prep: 'at', extraSlot: 'govOffice' },
  { scenarioId: 'notary_public', action: 'notarize', actionPast: 'notarized', actionIng: 'notarizing', koreanBase: '공식 문서의 공증을 받다', keyWord: 'notarize', keyWordKo: '공증받다', objectSlot: 'govDocument', prep: '', extraSlot: 'dailyTime' },
  { scenarioId: 'city_hall_queue', action: 'visit', actionPast: 'visited', actionIng: 'visiting', koreanBase: '관공서 민원 창구를 방문하다', keyWord: 'visit', keyWordKo: '방문하다', objectSlot: 'govOffice', prep: '', extraSlot: 'dailyTime' },
];

const BANKING_ATOMS: DomainSeedAtom[] = [
  { scenarioId: 'open_checking', action: 'open', actionPast: 'opened', actionIng: 'opening', koreanBase: '신규 계좌나 금융 서비스를 개설하다', keyWord: 'open', keyWordKo: '개설하다', objectSlot: 'bankProduct', prep: '', extraSlot: 'dailyTime' },
  { scenarioId: 'wire_transfer_intl', action: 'process', actionPast: 'processed', actionIng: 'processing', koreanBase: '해외 송금이나 증명서 발급을 처리하다', keyWord: 'process', keyWordKo: '처리하다', objectSlot: 'bankProduct', prep: 'without', extraSlot: 'bankIssue' },
  { scenarioId: 'overdraft_fee', action: 'waive', actionPast: 'waived', actionIng: 'waiving', koreanBase: '수수료 면제나 한도 조정을 요청하다', keyWord: 'waive', keyWordKo: '면제하다', objectSlot: 'bankIssue', prep: 'for', extraSlot: 'bankProduct' },
  { scenarioId: 'monthly_fee_check', action: 'check', actionPast: 'checked', actionIng: 'checking', koreanBase: '계좌 수수료와 한도를 확인하다', keyWord: 'check', keyWordKo: '확인하다', objectSlot: 'bankIssue', prep: 'on', extraSlot: 'bankProduct' },
  { scenarioId: 'lost_debit_card', action: 'activate', actionPast: 'activated', actionIng: 'activating', koreanBase: '재발급 카드나 금융 상품을 활성화하다', keyWord: 'activate', keyWordKo: '활성화하다', objectSlot: 'bankProduct', prep: '', extraSlot: 'dailyTime' },
];

export const SENTENCE_SEEDS_PART_B: CompactSentenceSeed[] = [
  ...buildDomainSeeds('driving', DRIVING_ATOMS, 65),
  ...buildDomainSeeds('government', GOVERNMENT_ATOMS, 65),
  ...buildDomainSeeds('banking', BANKING_ATOMS, 70),
];
