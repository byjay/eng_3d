import type { WordSlot } from '../core/types';

export const SLOT_POOLS: Record<string, WordSlot> = {
  // Daily pools
  drinkItem: {
    id: 'drinkItem',
    label: 'Drink / Item',
    labelKo: '음료·메뉴',
    defaultWord: 'an iced Americano',
    options: [
      { word: 'an iced Americano', ko: '아이스 아메리카노' },
      { word: 'a hot oat latte', ko: '따뜻한 오트 라떼' },
      { word: 'a green tea latte', ko: '그린티 라떼' },
      { word: 'a sparkling water', ko: '탄산수' },
      { word: 'a blueberry muffin', ko: '블루베리 머핀' },
    ],
  },
  dailyTime: {
    id: 'dailyTime',
    label: 'Time',
    labelKo: '시간',
    defaultWord: 'this evening',
    options: [
      { word: 'this evening', ko: '오늘 저녁에' },
      { word: 'tomorrow morning', ko: '내일 아침에' },
      { word: 'this weekend', ko: '이번 주말에' },
      { word: 'right after work', ko: '퇴근 직후에' },
      { word: 'in twenty minutes', ko: '20분 뒤에' },
    ],
  },
  dailyPlace: {
    id: 'dailyPlace',
    label: 'Place',
    labelKo: '장소',
    defaultWord: 'the grocery store',
    options: [
      { word: 'the grocery store', ko: '식료품점' },
      { word: 'the neighborhood pharmacy', ko: '동네 약국' },
      { word: 'the dry cleaner', ko: '세탁소' },
      { word: 'the community gym', ko: '동네 헬스장' },
      { word: 'the local library', ko: '동네 도서관' },
    ],
  },
  homeIssue: {
    id: 'homeIssue',
    label: 'Home Issue',
    labelKo: '집안 문제',
    defaultWord: 'the kitchen sink leak',
    options: [
      { word: 'the kitchen sink leak', ko: '주방 싱크대 누수' },
      { word: 'the broken air conditioner', ko: '고장 난 에어컨' },
      { word: 'the slow Wi-Fi router', ko: '느린 와이파이 공유기' },
      { word: 'the flickering hallway light', ko: '깜빡이는 복도 조명' },
      { word: 'the jammed front lock', ko: '걸린 현관 자물쇠' },
    ],
  },
  symptomType: {
    id: 'symptomType',
    label: 'Symptom',
    labelKo: '증상',
    defaultWord: 'a sore throat',
    options: [
      { word: 'a sore throat', ko: '목 통증' },
      { word: 'a mild fever', ko: '미열' },
      { word: 'a stuffy nose', ko: '코막힘' },
      { word: 'a splitting headache', ko: '심한 두통' },
      { word: 'an upset stomach', ko: '속쓰림/배탈' },
    ],
  },
  dailyFavor: {
    id: 'dailyFavor',
    label: 'Request',
    labelKo: '부탁 내용',
    defaultWord: 'take a quick photo',
    options: [
      { word: 'take a quick photo', ko: '사진 한 장 찍어주다' },
      { word: 'hold the elevator', ko: '엘리베이터를 잡아주다' },
      { word: 'watch my bag for a second', ko: '잠시 가방을 봐주다' },
      { word: 'lower the music slightly', ko: '음악 소리를 조금 줄이다' },
      { word: 'check the delivery locker', ko: '택배 보관함을 확인하다' },
    ],
  },

  // Travel pools
  travelDoc: {
    id: 'travelDoc',
    label: 'Travel Item',
    labelKo: '여행 서류·물품',
    defaultWord: 'my boarding pass',
    options: [
      { word: 'my boarding pass', ko: '탑승권' },
      { word: 'my passport', ko: '여권' },
      { word: 'my hotel voucher', ko: '호텔 바우처' },
      { word: 'my luggage claim tag', ko: '수하물 보관증' },
      { word: 'my return ticket', ko: '귀국 항공권' },
    ],
  },
  travelRoomOpt: {
    id: 'travelRoomOpt',
    label: 'Travel Upgrade',
    labelKo: '숙소·좌석 옵션',
    defaultWord: 'a quiet upper-floor room',
    options: [
      { word: 'a quiet upper-floor room', ko: '조용한 고층 객실' },
      { word: 'a window seat', ko: '창가 좌석' },
      { word: 'late check-out at two', ko: '오후 2시 레이트 체크아웃' },
      { word: 'early baggage storage', ko: '체크인 전 짐 보관' },
      { word: 'a non-smoking double room', ko: '금연 더블룸' },
    ],
  },
  transitSpot: {
    id: 'transitSpot',
    label: 'Destination',
    labelKo: '이동 장소',
    defaultWord: 'the downtown express platform',
    options: [
      { word: 'the downtown express platform', ko: '시내 급행 승강장' },
      { word: 'Terminal 2 departures', ko: '제2터미널 출발층' },
      { word: 'the rideshare pickup zone', ko: '공유차량 픽업 구역' },
      { word: 'the currency exchange desk', ko: '환전소 창구' },
      { word: 'the museum main entrance', ko: '박물관 정문' },
    ],
  },
  travelPlan: {
    id: 'travelPlan',
    label: 'Duration',
    labelKo: '체류 기간',
    defaultWord: 'five days',
    options: [
      { word: 'five days', ko: '5일' },
      { word: 'one week', ko: '1주일' },
      { word: 'ten days', ko: '10일' },
      { word: 'two weeks', ko: '2주일' },
      { word: 'three nights', ko: '3박' },
    ],
  },

  // Work pools
  workDeliverable: {
    id: 'workDeliverable',
    label: 'Deliverable',
    labelKo: '업무 산출물',
    defaultWord: 'the Q3 budget deck',
    options: [
      { word: 'the Q3 budget deck', ko: '3분기 예산 발표자료' },
      { word: 'the API rollout plan', ko: 'API 배포 계획서' },
      { word: 'the client proposal', ko: '클라이언트 제안서' },
      { word: 'the weekly KPI summary', ko: '주간 KPI 요약서' },
      { word: 'the release checklist', ko: '출시 최종 체크리스트' },
    ],
  },
  workDeadline: {
    id: 'workDeadline',
    label: 'Deadline',
    labelKo: '마감 일정',
    defaultWord: 'Friday afternoon',
    options: [
      { word: 'Friday afternoon', ko: '금요일 오후' },
      { word: 'tomorrow morning', ko: '내일 오전' },
      { word: 'the end of the week', ko: '이번 주 말' },
      { word: 'Wednesday noon', ko: '수요일 정오' },
      { word: 'next Monday', ko: '다음 주 월요일' },
    ],
  },
  workAction: {
    id: 'workAction',
    label: 'Team Action',
    labelKo: '협업 동작',
    defaultWord: 'reschedule the sync call',
    options: [
      { word: 'reschedule the sync call', ko: '동기화 미팅 일정을 변경하다' },
      { word: 'share my screen first', ko: '먼저 화면을 공유하다' },
      { word: 'review the pull request', ko: '코드 PR을 검토하다' },
      { word: 'escalate this blocker', ko: '이 장애 요인을 보고하다' },
      { word: 'send a recap email', ko: '요약 메일을 발송하다' },
    ],
  },

  // Shopping pools
  shopItem: {
    id: 'shopItem',
    label: 'Product',
    labelKo: '상품',
    defaultWord: 'this linen jacket',
    options: [
      { word: 'this linen jacket', ko: '이 리넨 재킷' },
      { word: 'these running shoes', ko: '이 러닝화' },
      { word: 'this wireless headset', ko: '이 무선 헤드셋' },
      { word: 'this hydrating serum', ko: '이 수분 세럼' },
      { word: 'this travel backpack', ko: '이 여행용 백팩' },
    ],
  },
  shopOption: {
    id: 'shopOption',
    label: 'Size / Color',
    labelKo: '사이즈·색상',
    defaultWord: 'a medium size',
    options: [
      { word: 'a medium size', ko: '미디엄 사이즈' },
      { word: 'a smaller fit', ko: '더 작은 핏' },
      { word: 'navy blue', ko: '네이비 색상' },
      { word: 'matte black', ko: '매트 블랙' },
      { word: 'a gift box', ko: '선물용 박스' },
    ],
  },
  payMethod: {
    id: 'payMethod',
    label: 'Payment',
    labelKo: '결제 수단',
    defaultWord: 'mobile tap pay',
    options: [
      { word: 'mobile tap pay', ko: '모바일 비접촉 결제' },
      { word: 'a credit card', ko: '신용카드' },
      { word: 'cash and card split', ko: '현금·카드 분할 결제' },
      { word: 'loyalty store points', ko: '적립 포인트' },
      { word: 'a gift card', ko: '기프트카드' },
    ],
  },

  // Driving pools
  carPart: {
    id: 'carPart',
    label: 'Vehicle Item',
    labelKo: '차량·부품',
    defaultWord: 'the rear left tire',
    options: [
      { word: 'the rear left tire', ko: '왼쪽 뒷타이어' },
      { word: 'the windshield wiper', ko: '앞유리 와이퍼' },
      { word: 'the side mirror', ko: '사이드 미러' },
      { word: 'the rental transponder', ko: '렌터카 통행료 단말기' },
      { word: 'the car battery', ko: '차량 배터리' },
    ],
  },
  drivingSpot: {
    id: 'drivingSpot',
    label: 'Road Spot',
    labelKo: '도로·주차장',
    defaultWord: 'the nearest service bay',
    options: [
      { word: 'the nearest service bay', ko: '가장 가까운 정비소' },
      { word: 'the underground garage', ko: '지하 주차장' },
      { word: 'the EV charging station', ko: '전기차 충전소' },
      { word: 'the highway exit ramp', ko: '고속도로 출구 램프' },
      { word: 'the rental drop-off lane', ko: '렌터카 반납 차선' },
    ],
  },
  fuelType: {
    id: 'fuelType',
    label: 'Fuel / Tier',
    labelKo: '주유·렌트 옵션',
    defaultWord: 'regular unleaded gas',
    options: [
      { word: 'regular unleaded gas', ko: '일반 휘발유' },
      { word: 'full collision coverage', ko: '완전자차 보험' },
      { word: 'an express car wash', ko: '빠른 자동 세차' },
      { word: 'a child booster seat', ko: '어린이용 부스터 시트' },
      { word: 'a second driver pass', ko: '추가 운전자 등록' },
    ],
  },

  // Government pools
  govDocument: {
    id: 'govDocument',
    label: 'Official Doc',
    labelKo: '민원 서류',
    defaultWord: 'a residency certificate',
    options: [
      { word: 'a residency certificate', ko: '거주 증명서' },
      { word: 'a visa extension form', ko: '비자 연장 신청서' },
      { word: 'an international driving permit', ko: '국제운전면허증' },
      { word: 'a tax clearance record', ko: '납세 증명서' },
      { word: 'a notarized power of attorney', ko: '공증 위임장' },
    ],
  },
  govOffice: {
    id: 'govOffice',
    label: 'Civic Office',
    labelKo: '관공서·창구',
    defaultWord: 'the immigration counter',
    options: [
      { word: 'the immigration counter', ko: '출입국·비자 창구' },
      { word: 'the city hall records desk', ko: '시청 민원 서류 창구' },
      { word: 'the local post office', ko: '동네 우체국' },
      { word: 'the DMV licensing window', ko: '운전면허 민원 창구' },
      { word: 'the police lost-property desk', ko: '경찰서 유실물 창구' },
    ],
  },

  // Banking pools
  bankProduct: {
    id: 'bankProduct',
    label: 'Bank Service',
    labelKo: '금융 상품·업무',
    defaultWord: 'a personal checking account',
    options: [
      { word: 'a personal checking account', ko: '개인 입출금 계좌' },
      { word: 'a high-yield savings account', ko: '고금리 예금 계좌' },
      { word: 'a replacement debit card', ko: '재발급 체크카드' },
      { word: 'an international wire transfer', ko: '해외 송금' },
      { word: 'a stamped balance statement', ko: '직인 영문 잔고증명서' },
    ],
  },
  bankIssue: {
    id: 'bankIssue',
    label: 'Fee / Limit',
    labelKo: '수수료·한도',
    defaultWord: 'the monthly maintenance fee',
    options: [
      { word: 'the monthly maintenance fee', ko: '월 계좌유지 수수료' },
      { word: 'the daily transfer limit', ko: '일일 이체 한도' },
      { word: 'the overdraft charge', ko: '초과인출 수수료' },
      { word: 'the foreign transaction fee', ko: '해외 결제 수수료' },
      { word: 'the wire processing delay', ko: '송금 처리 지연' },
    ],
  },
};
