import type { VisemeFrame, VisemeId } from './types';

export interface VisemeWeights {
  jawOpen: number; // 0..1
  lipRound: number; // 0..1
  lipWidth: number; // 0..1
  lipPress: number; // 0..1
  tongueTip: number; // 0..1
}

/**
 * Articulatory Oculus / ARKit-calibrated viseme shapes for English pronunciation.
 * - PP (/p, b, m/): Bilabial seal with lip press
 * - FF (/f, v/): Labiodental lower-lip tuck under upper teeth
 * - TH (/θ, ð/): Interdental tongue-tip between parted lips
 * - DD (/t, d/): Alveolar stop with crisp tongue-tip lift
 * - kk (/k, g, ŋ/): Velar opening at back of mouth
 * - CH (/tʃ, dʒ, ʃ, ʒ/): Postalveolar rounded protrusion
 * - SS (/s, z/): Narrow dental slit with wide lip spread
 * - nn (/n, l/): Alveolar nasal/lateral tongue contact
 * - RR (/r, ɜːr/): Retroflex/bunched R with mild lip rounding
 * - aa (/ɑː, æ, ʌ, aɪ-onset/): Open jaw low vowel
 * - E  (/ɛ, eɪ-onset/): Mid front spread vowel
 * - I  (/iː, ɪ, j/): High front wide smile vowel
 * - O  (/ɔː, oʊ-onset/): Mid-back rounded vowel
 * - U  (/uː, ʊ, w/): High-back tight lip protrusion
 */
export const VISEME_SHAPES: Record<VisemeId, VisemeWeights> = {
  sil: { jawOpen: 0.0, lipRound: 0.0, lipWidth: 0.14, lipPress: 0.0, tongueTip: 0.0 },
  PP: { jawOpen: 0.0, lipRound: 0.0, lipWidth: 0.08, lipPress: 0.96, tongueTip: 0.0 },
  FF: { jawOpen: 0.11, lipRound: 0.04, lipWidth: 0.36, lipPress: 0.62, tongueTip: 0.08 },
  TH: { jawOpen: 0.22, lipRound: 0.04, lipWidth: 0.44, lipPress: 0.06, tongueTip: 0.94 },
  DD: { jawOpen: 0.20, lipRound: 0.06, lipWidth: 0.40, lipPress: 0.08, tongueTip: 0.72 },
  kk: { jawOpen: 0.28, lipRound: 0.08, lipWidth: 0.34, lipPress: 0.0, tongueTip: 0.16 },
  CH: { jawOpen: 0.24, lipRound: 0.54, lipWidth: 0.18, lipPress: 0.08, tongueTip: 0.40 },
  SS: { jawOpen: 0.12, lipRound: 0.04, lipWidth: 0.74, lipPress: 0.14, tongueTip: 0.46 },
  nn: { jawOpen: 0.18, lipRound: 0.06, lipWidth: 0.36, lipPress: 0.08, tongueTip: 0.80 },
  RR: { jawOpen: 0.22, lipRound: 0.60, lipWidth: 0.14, lipPress: 0.0, tongueTip: 0.52 },
  aa: { jawOpen: 0.88, lipRound: 0.12, lipWidth: 0.48, lipPress: 0.0, tongueTip: 0.0 },
  E: { jawOpen: 0.50, lipRound: 0.04, lipWidth: 0.76, lipPress: 0.0, tongueTip: 0.18 },
  I: { jawOpen: 0.26, lipRound: 0.0, lipWidth: 0.92, lipPress: 0.0, tongueTip: 0.28 },
  O: { jawOpen: 0.56, lipRound: 0.88, lipWidth: 0.05, lipPress: 0.0, tongueTip: 0.0 },
  U: { jawOpen: 0.24, lipRound: 0.96, lipWidth: 0.02, lipPress: 0.0, tongueTip: 0.0 },
};

interface PhonemeUnit {
  v: VisemeId;
  d: number;
  p: string;
}

const P = (v: VisemeId, d: number, p: string): PhonemeUnit => ({ v, d, p });

/**
 * High-frequency English pronunciation lexicon (General American / standard conversational)
 * handling irregular spellings, silent letters, diphthongs, and contractions accurately.
 */
const ENGLISH_WORD_LEXICON: Record<string, PhonemeUnit[]> = {
  // Pronouns & function words
  i: [P('aa', 95, 'AY1'), P('I', 75, 'AY2')],
  "i'm": [P('aa', 85, 'AY1'), P('I', 60, 'AY2'), P('PP', 72, 'M')],
  "i'd": [P('aa', 85, 'AY1'), P('I', 60, 'AY2'), P('DD', 58, 'D')],
  "i'll": [P('aa', 85, 'AY1'), P('I', 58, 'AY2'), P('nn', 65, 'L')],
  "i've": [P('aa', 85, 'AY1'), P('I', 58, 'AY2'), P('FF', 68, 'V')],
  you: [P('I', 55, 'Y'), P('U', 110, 'UW')],
  "you're": [P('I', 50, 'Y'), P('U', 80, 'UH'), P('RR', 72, 'R')],
  "you'll": [P('I', 50, 'Y'), P('U', 90, 'UW'), P('nn', 65, 'L')],
  "you've": [P('I', 50, 'Y'), P('U', 85, 'UW'), P('FF', 68, 'V')],
  your: [P('I', 52, 'Y'), P('O', 85, 'AO'), P('RR', 72, 'R')],
  he: [P('aa', 38, 'HH'), P('I', 95, 'IY')],
  she: [P('CH', 78, 'SH'), P('I', 95, 'IY')],
  we: [P('U', 60, 'W'), P('I', 95, 'IY')],
  "we're": [P('U', 55, 'W'), P('I', 75, 'IH'), P('RR', 70, 'R')],
  they: [P('TH', 72, 'DH'), P('E', 85, 'EY1'), P('I', 68, 'EY2')],
  their: [P('TH', 72, 'DH'), P('E', 85, 'EH'), P('RR', 70, 'R')],
  there: [P('TH', 72, 'DH'), P('E', 85, 'EH'), P('RR', 70, 'R')],
  the: [P('TH', 70, 'DH'), P('E', 64, 'AH')],
  this: [P('TH', 74, 'DH'), P('I', 72, 'IH'), P('SS', 74, 'S')],
  that: [P('TH', 74, 'DH'), P('aa', 90, 'AE'), P('DD', 58, 'T')],
  these: [P('TH', 72, 'DH'), P('I', 95, 'IY'), P('SS', 74, 'Z')],
  those: [P('TH', 72, 'DH'), P('O', 86, 'OW1'), P('U', 60, 'OW2'), P('SS', 74, 'Z')],
  a: [P('E', 72, 'AH')],
  an: [P('aa', 78, 'AE'), P('nn', 62, 'N')],
  and: [P('aa', 76, 'AE'), P('nn', 54, 'N'), P('DD', 52, 'D')],
  or: [P('O', 88, 'AO'), P('RR', 70, 'R')],
  are: [P('aa', 95, 'AA'), P('RR', 72, 'R')],
  were: [P('U', 58, 'W'), P('RR', 95, 'ER')],
  was: [P('U', 58, 'W'), P('aa', 82, 'AH'), P('SS', 72, 'Z')],
  is: [P('I', 74, 'IH'), P('SS', 72, 'Z')],
  "it's": [P('I', 70, 'IH'), P('DD', 48, 'T'), P('SS', 72, 'S')],
  to: [P('DD', 56, 'T'), P('U', 92, 'UW')],
  too: [P('DD', 56, 'T'), P('U', 105, 'UW')],
  two: [P('DD', 56, 'T'), P('U', 105, 'UW')],
  one: [P('U', 60, 'W'), P('aa', 84, 'AH'), P('nn', 64, 'N')],
  once: [P('U', 60, 'W'), P('aa', 82, 'AH'), P('nn', 56, 'N'), P('SS', 74, 'S')],
  four: [P('FF', 68, 'F'), P('O', 88, 'AO'), P('RR', 70, 'R')],
  five: [P('FF', 68, 'F'), P('aa', 88, 'AY1'), P('I', 62, 'AY2'), P('FF', 68, 'V')],
  eight: [P('E', 86, 'EY1'), P('I', 65, 'EY2'), P('DD', 58, 'T')],
  ten: [P('DD', 58, 'T'), P('E', 86, 'EH'), P('nn', 65, 'N')],

  // Modal & high-frequency silent-letter verbs
  would: [P('U', 64, 'W'), P('U', 84, 'UH'), P('DD', 60, 'D')],
  could: [P('kk', 62, 'K'), P('U', 84, 'UH'), P('DD', 60, 'D')],
  should: [P('CH', 76, 'SH'), P('U', 84, 'UH'), P('DD', 60, 'D')],
  can: [P('kk', 62, 'K'), P('aa', 88, 'AE'), P('nn', 62, 'N')],
  "can't": [P('kk', 62, 'K'), P('aa', 95, 'AE'), P('nn', 54, 'N'), P('DD', 55, 'T')],
  "don't": [P('DD', 58, 'D'), P('O', 84, 'OW1'), P('U', 56, 'OW2'), P('nn', 52, 'N'), P('DD', 52, 'T')],
  "doesn't": [P('DD', 58, 'D'), P('aa', 78, 'AH'), P('SS', 66, 'Z'), P('nn', 62, 'N'), P('DD', 52, 'T')],
  "didn't": [P('DD', 58, 'D'), P('I', 72, 'IH'), P('DD', 54, 'D'), P('nn', 60, 'N'), P('DD', 50, 'T')],
  "won't": [P('U', 60, 'W'), P('O', 84, 'OW1'), P('U', 56, 'OW2'), P('nn', 52, 'N'), P('DD', 52, 'T')],
  have: [P('aa', 40, 'HH'), P('aa', 88, 'AE'), P('FF', 72, 'V')],
  has: [P('aa', 40, 'HH'), P('aa', 86, 'AE'), P('SS', 72, 'Z')],
  had: [P('aa', 40, 'HH'), P('aa', 88, 'AE'), P('DD', 60, 'D')],
  do: [P('DD', 58, 'D'), P('U', 98, 'UW')],
  does: [P('DD', 58, 'D'), P('aa', 84, 'AH'), P('SS', 72, 'Z')],
  done: [P('DD', 58, 'D'), P('aa', 86, 'AH'), P('nn', 64, 'N')],
  know: [P('nn', 64, 'N'), P('O', 86, 'OW1'), P('U', 68, 'OW2')],
  knew: [P('nn', 62, 'N'), P('I', 45, 'Y'), P('U', 98, 'UW')],
  known: [P('nn', 62, 'N'), P('O', 86, 'OW1'), P('U', 62, 'OW2'), P('nn', 64, 'N')],
  write: [P('RR', 68, 'R'), P('aa', 88, 'AY1'), P('I', 62, 'AY2'), P('DD', 58, 'T')],
  wrong: [P('RR', 68, 'R'), P('O', 92, 'AO'), P('kk', 64, 'NG')],
  walk: [P('U', 60, 'W'), P('O', 96, 'AO'), P('kk', 64, 'K')],
  talk: [P('DD', 58, 'T'), P('O', 96, 'AO'), P('kk', 64, 'K')],
  like: [P('nn', 62, 'L'), P('aa', 88, 'AY1'), P('I', 64, 'AY2'), P('kk', 64, 'K')],
  make: [P('PP', 68, 'M'), P('E', 86, 'EY1'), P('I', 64, 'EY2'), P('kk', 64, 'K')],
  take: [P('DD', 58, 'T'), P('E', 86, 'EY1'), P('I', 64, 'EY2'), P('kk', 64, 'K')],
  takes: [P('DD', 58, 'T'), P('E', 82, 'EY1'), P('I', 58, 'EY2'), P('kk', 58, 'K'), P('SS', 70, 'S')],
  come: [P('kk', 62, 'K'), P('aa', 86, 'AH'), P('PP', 70, 'M')],
  give: [P('kk', 62, 'G'), P('I', 76, 'IH'), P('FF', 70, 'V')],
  live: [P('nn', 62, 'L'), P('I', 76, 'IH'), P('FF', 70, 'V')],
  love: [P('nn', 62, 'L'), P('aa', 86, 'AH'), P('FF', 70, 'V')],
  move: [P('PP', 68, 'M'), P('U', 98, 'UW'), P('FF', 70, 'V')],
  say: [P('SS', 72, 'S'), P('E', 86, 'EY1'), P('I', 66, 'EY2')],
  said: [P('SS', 72, 'S'), P('E', 86, 'EH'), P('DD', 60, 'D')],
  says: [P('SS', 72, 'S'), P('E', 82, 'EH'), P('SS', 72, 'Z')],
  see: [P('SS', 72, 'S'), P('I', 105, 'IY')],
  go: [P('kk', 62, 'G'), P('O', 86, 'OW1'), P('U', 68, 'OW2')],
  going: [P('kk', 60, 'G'), P('O', 82, 'OW1'), P('U', 58, 'OW2'), P('I', 70, 'IH'), P('kk', 62, 'NG')],
  want: [P('U', 60, 'W'), P('aa', 88, 'AA'), P('nn', 54, 'N'), P('DD', 56, 'T')],
  need: [P('nn', 62, 'N'), P('I', 98, 'IY'), P('DD', 60, 'D')],

  // Question words & common expressions
  what: [P('U', 60, 'W'), P('aa', 88, 'AH'), P('DD', 58, 'T')],
  where: [P('U', 60, 'W'), P('E', 86, 'EH'), P('RR', 72, 'R')],
  when: [P('U', 60, 'W'), P('E', 84, 'EH'), P('nn', 64, 'N')],
  why: [P('U', 60, 'W'), P('aa', 90, 'AY1'), P('I', 68, 'AY2')],
  who: [P('aa', 38, 'HH'), P('U', 105, 'UW')],
  how: [P('aa', 40, 'HH'), P('aa', 86, 'AW1'), P('U', 72, 'AW2')],
  hello: [P('aa', 38, 'HH'), P('E', 72, 'AH'), P('nn', 60, 'L'), P('O', 86, 'OW1'), P('U', 68, 'OW2')],
  hi: [P('aa', 40, 'HH'), P('aa', 90, 'AY1'), P('I', 68, 'AY2')],
  hey: [P('aa', 40, 'HH'), P('E', 86, 'EY1'), P('I', 68, 'EY2')],
  please: [P('PP', 64, 'P'), P('nn', 56, 'L'), P('I', 98, 'IY'), P('SS', 74, 'Z')],
  thank: [P('TH', 76, 'TH'), P('aa', 84, 'AE'), P('kk', 66, 'NGK')],
  thanks: [P('TH', 76, 'TH'), P('aa', 82, 'AE'), P('kk', 60, 'NGK'), P('SS', 72, 'S')],
  sorry: [P('SS', 72, 'S'), P('O', 86, 'AA'), P('RR', 66, 'R'), P('I', 85, 'IY')],
  excuse: [P('I', 70, 'IH'), P('kk', 58, 'K'), P('SS', 66, 'S'), P('kk', 58, 'K'), P('I', 45, 'Y'), P('U', 92, 'UW'), P('SS', 72, 'Z')],
  water: [P('U', 60, 'W'), P('O', 90, 'AO'), P('DD', 50, 'T'), P('RR', 84, 'ER')],
  coffee: [P('kk', 62, 'K'), P('O', 90, 'AO'), P('FF', 68, 'F'), P('I', 95, 'IY')],
  americano: [P('E', 64, 'AH'), P('PP', 66, 'M'), P('E', 78, 'EH'), P('RR', 64, 'R'), P('I', 66, 'IH'), P('kk', 60, 'K'), P('aa', 86, 'AA'), P('nn', 60, 'N'), P('O', 84, 'OW1'), P('U', 64, 'OW2')],
  latte: [P('nn', 62, 'L'), P('aa', 92, 'AA'), P('DD', 56, 'T'), P('E', 82, 'EY1'), P('I', 60, 'EY2')],
  iced: [P('aa', 86, 'AY1'), P('I', 62, 'AY2'), P('SS', 68, 'S'), P('DD', 54, 'T')],
  oat: [P('O', 88, 'OW1'), P('U', 64, 'OW2'), P('DD', 58, 'T')],
  evening: [P('I', 95, 'IY'), P('FF', 66, 'V'), P('nn', 60, 'N'), P('I', 72, 'IH'), P('kk', 62, 'NG')],
  morning: [P('PP', 68, 'M'), P('O', 88, 'AO'), P('RR', 66, 'R'), P('nn', 60, 'N'), P('I', 72, 'IH'), P('kk', 62, 'NG')],
  night: [P('nn', 62, 'N'), P('aa', 88, 'AY1'), P('I', 64, 'AY2'), P('DD', 58, 'T')],
  right: [P('RR', 68, 'R'), P('aa', 88, 'AY1'), P('I', 64, 'AY2'), P('DD', 58, 'T')],
  thought: [P('TH', 76, 'TH'), P('O', 96, 'AO'), P('DD', 58, 'T')],
  though: [P('TH', 74, 'DH'), P('O', 88, 'OW1'), P('U', 68, 'OW2')],
  through: [P('TH', 74, 'TH'), P('RR', 64, 'R'), P('U', 102, 'UW')],
  enough: [P('I', 70, 'IH'), P('nn', 62, 'N'), P('aa', 84, 'AH'), P('FF', 72, 'F')],
  laugh: [P('nn', 62, 'L'), P('aa', 92, 'AE'), P('FF', 74, 'F')],
  hour: [P('aa', 86, 'AW1'), P('U', 68, 'AW2'), P('RR', 74, 'ER')],
  hours: [P('aa', 84, 'AW1'), P('U', 64, 'AW2'), P('RR', 68, 'ER'), P('SS', 72, 'Z')],
  honest: [P('O', 88, 'AA'), P('nn', 62, 'N'), P('I', 68, 'IH'), P('SS', 66, 'S'), P('DD', 54, 'T')],
  people: [P('PP', 68, 'P'), P('I', 92, 'IY'), P('PP', 66, 'P'), P('nn', 66, 'L')],
  business: [P('PP', 68, 'B'), P('I', 74, 'IH'), P('SS', 68, 'Z'), P('nn', 60, 'N'), P('I', 68, 'IH'), P('SS', 72, 'S')],
  busy: [P('PP', 68, 'B'), P('I', 76, 'IH'), P('SS', 68, 'Z'), P('I', 90, 'IY')],
  friend: [P('FF', 66, 'F'), P('RR', 62, 'R'), P('E', 84, 'EH'), P('nn', 54, 'N'), P('DD', 54, 'D')],
  question: [P('kk', 62, 'K'), P('U', 58, 'W'), P('E', 82, 'EH'), P('SS', 64, 'S'), P('CH', 72, 'CH'), P('E', 60, 'AH'), P('nn', 64, 'N')],
  schedule: [P('SS', 68, 'S'), P('kk', 60, 'K'), P('E', 82, 'EH'), P('CH', 72, 'JH'), P('U', 88, 'UW'), P('nn', 64, 'L')],
  receipt: [P('RR', 66, 'R'), P('I', 72, 'IH'), P('SS', 72, 'S'), P('I', 92, 'IY'), P('DD', 58, 'T')],
  account: [P('E', 66, 'AH'), P('kk', 62, 'K'), P('aa', 86, 'AW1'), P('U', 66, 'AW2'), P('nn', 54, 'N'), P('DD', 54, 'T')],
  checking: [P('CH', 76, 'CH'), P('E', 82, 'EH'), P('kk', 62, 'K'), P('I', 72, 'IH'), P('kk', 64, 'NG')],
  personal: [P('PP', 68, 'P'), P('RR', 84, 'ER'), P('SS', 68, 'S'), P('E', 60, 'AH'), P('nn', 60, 'N'), P('E', 58, 'AH'), P('nn', 64, 'L')],
  open: [P('O', 86, 'OW1'), P('U', 60, 'OW2'), P('PP', 68, 'P'), P('E', 62, 'AH'), P('nn', 64, 'N')],
  order: [P('O', 90, 'AO'), P('RR', 64, 'R'), P('DD', 58, 'D'), P('RR', 80, 'ER')],
  pick: [P('PP', 68, 'P'), P('I', 76, 'IH'), P('kk', 64, 'K')],
  up: [P('aa', 84, 'AH'), P('PP', 68, 'P')],
  grocery: [P('kk', 60, 'G'), P('RR', 62, 'R'), P('O', 84, 'OW1'), P('U', 56, 'OW2'), P('SS', 68, 'S'), P('RR', 74, 'ER'), P('I', 86, 'IY')],
  store: [P('SS', 68, 'S'), P('DD', 56, 'T'), P('O', 88, 'AO'), P('RR', 72, 'R')],
  minute: [P('PP', 68, 'M'), P('I', 74, 'IH'), P('nn', 62, 'N'), P('I', 68, 'IH'), P('DD', 58, 'T')],
  minutes: [P('PP', 68, 'M'), P('I', 72, 'IH'), P('nn', 62, 'N'), P('I', 68, 'IH'), P('DD', 52, 'T'), P('SS', 70, 'S')],
  listen: [P('nn', 62, 'L'), P('I', 74, 'IH'), P('SS', 72, 'S'), P('nn', 66, 'N')],
  often: [P('O', 90, 'AO'), P('FF', 68, 'F'), P('E', 60, 'AH'), P('nn', 64, 'N')],
};

const DIGIT_WORDS: Record<string, string> = {
  '0': 'zero',
  '1': 'one',
  '2': 'two',
  '3': 'three',
  '4': 'four',
  '5': 'five',
  '6': 'six',
  '7': 'seven',
  '8': 'eight',
  '9': 'nine',
  '10': 'ten',
  '11': 'eleven',
  '12': 'twelve',
  '15': 'fifteen',
  '20': 'twenty',
  '30': 'thirty',
  '40': 'forty',
  '50': 'fifty',
  '100': 'hundred',
};

function hasMagicSilentFinalE(w: string): boolean {
  if (w.length < 4 || !w.endsWith('e')) return false;
  if (w.endsWith('le') || w.endsWith('ee') || w.endsWith('ie') || w.endsWith('ye')) return false;
  const before = w[w.length - 2];
  const vowelBefore = w[w.length - 3];
  return !'aeiouyw'.includes(before) && 'aeiou'.includes(vowelBefore);
}

/**
 * Converts any English word to an accurate sequence of English pronunciation visemes
 * using lexicon lookup + English G2P rules (silent letters, magic-e, vowel digraphs,
 * r-colored vowels, diphthongs, and palatalization).
 */
export function englishWordToVisemes(rawWord: string): PhonemeUnit[] {
  const clean = rawWord.toLowerCase().replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, '');
  if (!clean) return [];

  if (DIGIT_WORDS[clean]) {
    return englishWordToVisemes(DIGIT_WORDS[clean]);
  }
  if (/^\d+$/.test(clean)) {
    return clean.split('').flatMap((d) => englishWordToVisemes(DIGIT_WORDS[d] || 'zero'));
  }

  if (ENGLISH_WORD_LEXICON[clean]) {
    return ENGLISH_WORD_LEXICON[clean].map((u) => ({ ...u }));
  }

  // Handle regular contractions cleanly
  if (clean.endsWith("'s") && clean.length > 2) {
    const base = englishWordToVisemes(clean.slice(0, -2));
    return [...base, P('SS', 70, 'Z')];
  }
  if (clean.endsWith("n't") && clean.length > 3) {
    const base = englishWordToVisemes(clean.slice(0, -3));
    return [...base, P('nn', 56, 'N'), P('DD', 54, 'T')];
  }

  const out: PhonemeUnit[] = [];
  const silentFinalE = hasMagicSilentFinalE(clean);
  const w = silentFinalE ? clean.slice(0, -1) : clean;
  const len = w.length;

  let i = 0;
  while (i < len) {
    const rest = w.slice(i);
    const ch = w[i];
    const next = w[i + 1] ?? '';
    const next2 = w[i + 2] ?? '';

    // 1. Word-initial silent consonant clusters
    if (i === 0 && (rest.startsWith('kn') || rest.startsWith('gn'))) {
      out.push(P('nn', 64, 'N'));
      i += 2;
      continue;
    }
    if (i === 0 && rest.startsWith('wr')) {
      out.push(P('RR', 68, 'R'));
      i += 2;
      continue;
    }
    if (i === 0 && rest.startsWith('ps')) {
      out.push(P('SS', 72, 'S'));
      i += 2;
      continue;
    }
    if (i === 0 && rest.startsWith('wh')) {
      out.push(P('U', 60, 'W'));
      i += 2;
      continue;
    }

    // 2. Common English suffixes
    if (rest === 'tion' || rest === 'sion') {
      out.push(P('CH', 74, 'SH'), P('E', 58, 'AH'), P('nn', 64, 'N'));
      break;
    }
    if (rest === 'ture') {
      out.push(P('CH', 74, 'CH'), P('RR', 78, 'ER'));
      break;
    }
    if (rest === 'ious' || rest === 'eous') {
      out.push(P('E', 66, 'AH'), P('SS', 72, 'S'));
      break;
    }
    if (rest === 'igh') {
      out.push(P('aa', 88, 'AY1'), P('I', 64, 'AY2'));
      i += 3;
      continue;
    }
    if (rest.startsWith('eigh')) {
      out.push(P('E', 86, 'EY1'), P('I', 64, 'EY2'));
      i += 4;
      continue;
    }
    if (rest.startsWith('augh') || rest.startsWith('ough')) {
      out.push(P('O', 92, 'AO'));
      i += 4;
      continue;
    }

    // 3. Silent final clusters (-mb, -bt, -mn)
    if (rest === 'mb') {
      out.push(P('PP', 70, 'M'));
      break;
    }
    if (rest === 'bt') {
      out.push(P('DD', 58, 'T'));
      break;
    }
    if (rest === 'mn') {
      out.push(P('PP', 70, 'M'));
      break;
    }

    // 4. Consonant digraphs & clusters
    if (rest.startsWith('tch') || rest.startsWith('ch') || rest.startsWith('sh')) {
      out.push(P('CH', 78, rest.startsWith('sh') ? 'SH' : 'CH'));
      i += rest.startsWith('tch') ? 3 : 2;
      continue;
    }
    if (rest.startsWith('th')) {
      out.push(P('TH', 76, 'TH'));
      i += 2;
      continue;
    }
    if (rest.startsWith('ph')) {
      out.push(P('FF', 70, 'F'));
      i += 2;
      continue;
    }
    if (rest.startsWith('gh')) {
      // medial/final 'gh' is silent in most English words (high, night, though)
      if (i === 0) out.push(P('kk', 62, 'G'));
      i += 2;
      continue;
    }
    if (rest.startsWith('qu')) {
      out.push(P('kk', 60, 'K'), P('U', 58, 'W'));
      i += 2;
      continue;
    }
    if (rest.startsWith('ng')) {
      out.push(P('kk', 64, 'NG'));
      i += 2;
      continue;
    }
    if (rest.startsWith('ck')) {
      out.push(P('kk', 64, 'K'));
      i += 2;
      continue;
    }

    // 5. Magic-E stressed vowel before final single consonant
    if (silentFinalE && i === len - 2 && 'aeiou'.includes(ch) && !'aeiou'.includes(next)) {
      if (ch === 'a') out.push(P('E', 86, 'EY1'), P('I', 62, 'EY2'));
      else if (ch === 'e') out.push(P('I', 96, 'IY'));
      else if (ch === 'i') out.push(P('aa', 88, 'AY1'), P('I', 62, 'AY2'));
      else if (ch === 'o') out.push(P('O', 86, 'OW1'), P('U', 64, 'OW2'));
      else if (ch === 'u') out.push(P('I', 42, 'Y'), P('U', 94, 'UW'));
      i += 1;
      continue;
    }

    // 6. R-colored vowels (ar, or, er, ir, ur, air, ear)
    if (rest.startsWith('air') || rest.startsWith('ear')) {
      out.push(P('E', 84, 'EH'), P('RR', 72, 'R'));
      i += 3;
      continue;
    }
    if (rest.startsWith('ar') && !'aeiou'.includes(next2)) {
      out.push(P('aa', 90, 'AA'), P('RR', 72, 'R'));
      i += 2;
      continue;
    }
    if (rest.startsWith('or') && !'aeiou'.includes(next2)) {
      out.push(P('O', 88, 'AO'), P('RR', 72, 'R'));
      i += 2;
      continue;
    }
    if ((rest.startsWith('er') || rest.startsWith('ir') || rest.startsWith('ur')) && !'aeiou'.includes(next2)) {
      out.push(P('RR', 86, 'ER'));
      i += 2;
      continue;
    }

    // 7. Vowel digraphs & diphthongs
    const two = ch + next;
    if (two === 'ai' || two === 'ay' || two === 'ey') {
      out.push(P('E', 84, 'EY1'), P('I', 62, 'EY2'));
      i += 2;
      continue;
    }
    if (two === 'ee' || two === 'ea' || two === 'ie') {
      out.push(P('I', 96, 'IY'));
      i += 2;
      continue;
    }
    if (two === 'oa' || two === 'ow' || two === 'oe') {
      if (two === 'ow' && (i + 2 === len || 'nl'.includes(next2))) {
        out.push(P('O', 84, 'OW1'), P('U', 64, 'OW2'));
      } else if (two === 'ow') {
        out.push(P('aa', 84, 'AW1'), P('U', 68, 'AW2'));
      } else {
        out.push(P('O', 86, 'OW1'), P('U', 64, 'OW2'));
      }
      i += 2;
      continue;
    }
    if (two === 'ou') {
      out.push(P('aa', 84, 'AW1'), P('U', 68, 'AW2'));
      i += 2;
      continue;
    }
    if (two === 'oo' || two === 'ew' || two === 'ue') {
      out.push(P('U', 98, 'UW'));
      i += 2;
      continue;
    }
    if (two === 'oi' || two === 'oy') {
      out.push(P('O', 84, 'OY1'), P('I', 68, 'OY2'));
      i += 2;
      continue;
    }
    if (two === 'au' || two === 'aw' || (two === 'al' && (next2 === 'k' || next2 === 'l' || next2 === 'm'))) {
      out.push(P('O', 92, 'AO'));
      if (two === 'al' && next2 === 'l') out.push(P('nn', 62, 'L'));
      i += two === 'al' && next2 === 'l' ? 3 : 2;
      continue;
    }

    // 8. Double consonants collapse to single articulation
    if (ch === next && !'aeiou'.includes(ch)) {
      i += 1;
      continue;
    }

    // 9. Single graphemes with English contextual rules
    if (ch === 'c') {
      out.push('eiy'.includes(next) ? P('SS', 72, 'S') : P('kk', 62, 'K'));
    } else if (ch === 'g') {
      out.push('eiy'.includes(next) ? P('CH', 72, 'JH') : P('kk', 62, 'G'));
    } else if (ch === 'x') {
      out.push(P('kk', 55, 'K'), P('SS', 70, 'S'));
    } else if ('pbm'.includes(ch)) {
      out.push(P('PP', 68, ch.toUpperCase()));
    } else if ('fv'.includes(ch)) {
      out.push(P('FF', 68, ch.toUpperCase()));
    } else if ('dt'.includes(ch)) {
      out.push(P('DD', 58, ch.toUpperCase()));
    } else if ('kq'.includes(ch)) {
      out.push(P('kk', 62, 'K'));
    } else if ('sz'.includes(ch)) {
      out.push(P('SS', 72, ch.toUpperCase()));
    } else if ('nl'.includes(ch)) {
      out.push(P('nn', 62, ch.toUpperCase()));
    } else if (ch === 'r') {
      out.push(P('RR', 68, 'R'));
    } else if (ch === 'j') {
      out.push(P('CH', 74, 'JH'));
    } else if (ch === 'w') {
      out.push(P('U', 60, 'W'));
    } else if (ch === 'y') {
      out.push(i === 0 ? P('I', 55, 'Y') : P('I', 84, 'IY'));
    } else if (ch === 'h') {
      out.push(P('aa', 38, 'HH'));
    } else if (ch === 'a') {
      out.push(P('aa', 88, 'AE'));
    } else if (ch === 'e') {
      // Final trailing single 'e' in short/unstressed endings stays silent unless it's the only vowel
      const hasEarlierVowel = /[aeiouy]/.test(w.slice(0, i));
      if (i === len - 1 && hasEarlierVowel) {
        i += 1;
        continue;
      }
      out.push(P('E', 80, 'EH'));
    } else if (ch === 'i') {
      out.push(P('I', 76, 'IH'));
    } else if (ch === 'o') {
      out.push(P('O', 86, 'AA'));
    } else if (ch === 'u') {
      out.push(P('aa', 80, 'AH'));
    }

    i += 1;
  }

  return out.length > 0 ? out : [P('aa', 70, 'AH')];
}

/**
 * Generates an English-phonetic Oculus Viseme timeline (in ms) with character spans
 * so real-time SpeechSynthesis `onboundary` events can stay locked to exact spoken words.
 */
export function generateVisemeTimeline(text: string, speedMultiplier = 1.0): VisemeFrame[] {
  const clean = text.trim();
  if (!clean) return [{ v: 'sil', t: 0, d: 100 }];

  const safeSpeed = Math.max(0.6, Math.min(1.5, speedMultiplier));
  const frames: VisemeFrame[] = [];
  let cursorMs = 0;

  const pushFrame = (v: VisemeId, baseDurationMs: number, charStart?: number, charEnd?: number, phoneme?: string) => {
    const d = Math.max(24, Math.round(baseDurationMs / safeSpeed));
    const prev = frames[frames.length - 1];
    // Preserve distinct repeated bilabial closures (PP) and word boundaries
    if (prev && prev.v === v && v !== 'sil' && v !== 'PP' && prev.charStart === charStart) {
      const ext = Math.round(d * 0.65);
      prev.d += ext;
      cursorMs += ext;
    } else {
      frames.push({ v, t: cursorMs, d, charStart, charEnd, phoneme });
      cursorMs += d;
    }
  };

  // Tokenize words & punctuation while keeping exact character indices for speech boundary sync
  const tokenRegex = /([A-Za-z0-9']+|[.,!?;:\s]+)/g;
  let match: RegExpExecArray | null;
  while ((match = tokenRegex.exec(clean)) !== null) {
    const token = match[0];
    const startIdx = match.index;
    const endIdx = startIdx + token.length;

    if (/^[A-Za-z0-9']+$/.test(token)) {
      const units = englishWordToVisemes(token);
      for (const u of units) {
        pushFrame(u.v, u.d, startIdx, endIdx, u.p);
      }
    } else {
      for (const ch of token) {
        if (ch === ',' || ch === ';' || ch === ':') {
          pushFrame('sil', 155, startIdx, endIdx, 'PAU');
        } else if (ch === '.' || ch === '!' || ch === '?') {
          pushFrame('sil', 250, startIdx, endIdx, 'EOS');
        } else if (ch === ' ' || ch === '\n' || ch === '\t') {
          pushFrame('sil', 34, startIdx, endIdx, 'WB');
        }
      }
    }
  }

  frames.push({ v: 'sil', t: cursorMs, d: 120, phoneme: 'END' });
  return frames;
}

/**
 * Finds the start timestamp (ms) of the viseme frame corresponding to a character index
 * emitted by SpeechSynthesisUtterance.onboundary.
 */
export function findVisemeTimeForCharIndex(frames: VisemeFrame[], charIndex: number): number | null {
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    if (
      typeof f.charStart === 'number' &&
      typeof f.charEnd === 'number' &&
      charIndex >= f.charStart &&
      charIndex < f.charEnd &&
      f.v !== 'sil'
    ) {
      return f.t;
    }
  }
  return null;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Samples smoothly coarticulated viseme weights at `elapsedMs`.
 * Blends across phoneme transitions using a cosine curve while preserving
 * bilabial closures (PP) and interdental peaks (TH).
 */
export function sampleVisemeAt(frames: VisemeFrame[], elapsedMs: number): VisemeWeights {
  if (!frames.length) return VISEME_SHAPES.sil;

  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    if (elapsedMs >= f.t && elapsedMs < f.t + f.d) {
      const curr = VISEME_SHAPES[f.v] ?? VISEME_SHAPES.sil;
      const nextFrame = frames[i + 1];
      if (!nextFrame) return curr;

      const blendMs = Math.min(24, f.d * 0.35);
      const timeLeft = f.t + f.d - elapsedMs;
      if (timeLeft < blendMs && blendMs > 0) {
        const rawT = 1 - timeLeft / blendMs;
        const smoothT = 0.5 - 0.5 * Math.cos(rawT * Math.PI);
        const next = VISEME_SHAPES[nextFrame.v] ?? VISEME_SHAPES.sil;
        return {
          jawOpen: lerp(curr.jawOpen, next.jawOpen, smoothT),
          lipRound: lerp(curr.lipRound, next.lipRound, smoothT),
          lipWidth: lerp(curr.lipWidth, next.lipWidth, smoothT),
          lipPress: lerp(curr.lipPress, next.lipPress, smoothT),
          tongueTip: lerp(curr.tongueTip, next.tongueTip, smoothT),
        };
      }
      return curr;
    }
  }
  return VISEME_SHAPES.sil;
}
