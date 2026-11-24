import type { TutorExpressionPhoto, TutorId, TutorMood } from '../core/types';
import { TUTOR_PROFILES } from './seedData';
import { VISEME_EXPRESSIONS_50 } from './visemeExpressions';
import { VISEME_ATLAS_COORDS } from '../core/viseme';

const TUTOR_SENTENCE_TEMPLATES: Record<TutorId, string[]> = {
  amy: [
    'Could I get an iced oat latte, please?',
    'Thank you so much for your help today!',
    'Where would you like to meet around noon?',
  ],
  marcus: [
    'Let us review the quarterly budget proposal.',
    'Please share your thoughts on this strategy.',
    'That timeline works well for our team.',
  ],
  elena: [
    'Notice how clear the /θ/ sound becomes here.',
    'Try rounding your lips gently on "though".',
    'Open your jaw comfortably on "coffee" and "water".',
  ],
  oliver: [
    'Pardon me, could you verify this transfer?',
    'We ought to confirm the itinerary shortly.',
    'What a thoughtful observation about rhetoric!',
  ],
  sofia: [
    'Excuse me, how do I get to Terminal Three?',
    'I would love a window seat if available.',
    'That neighborhood market opens very early!',
  ],
};

function resolveBlendOverlay(mood: TutorMood, jawOpen: number): {
  col: number;
  row: number;
  ratio: number;
} {
  if (mood === 'happy') {
    return { ...VISEME_ATLAS_COORDS.happy, ratio: 0.34 };
  }
  if (mood === 'encouraging') {
    return { ...VISEME_ATLAS_COORDS.happy, ratio: 0.22 };
  }
  if (mood === 'surprised') {
    return { ...VISEME_ATLAS_COORDS.aa, ratio: jawOpen > 0.4 ? 0.15 : 0.28 };
  }
  if (mood === 'thinking') {
    return { ...VISEME_ATLAS_COORDS.sil, ratio: 0.25 };
  }
  return { ...VISEME_ATLAS_COORDS.sil, ratio: 0 };
}

/**
 * Generates 52 distinct DB-persisted expression & photo records per tutor (260 total across 5 tutors).
 * Each record binds a tutor's Gemini Banana 4x4 atlas tile + expression blend state to an English phoneme/mood.
 */
export function buildTutorExpressionPhotos(): TutorExpressionPhoto[] {
  const rows: TutorExpressionPhoto[] = [];
  let seqId = 1;

  for (const tutor of TUTOR_PROFILES) {
    const samples = TUTOR_SENTENCE_TEMPLATES[tutor.id];

    // M01..M50: 50 English phoneme mouth-shape & expression entries for this tutor
    VISEME_EXPRESSIONS_50.forEach((exp, idx) => {
      const baseTile = VISEME_ATLAS_COORDS[exp.visemeId] ?? VISEME_ATLAS_COORDS.sil;
      const overlay = resolveBlendOverlay(exp.mood, exp.jawOpen);
      const upperCode = tutor.id.toUpperCase();

      rows.push({
        id: seqId++,
        tutorId: tutor.id,
        photoCode: `${upperCode}-${exp.code}`,
        expressionCode: exp.code,
        visemeId: exp.visemeId,
        ipa: exp.ipa,
        arpabet: exp.arpabet,
        name: `${tutor.name.split(' ')[0]} · ${exp.name}`,
        nameKo: `${tutor.name.split(' ')[0]} · ${exp.nameKo}`,
        articulatoryCueKo: exp.articulatoryCueKo,
        sampleWord: exp.sampleWord,
        sampleSentence: `${exp.sampleWord} — ${samples[idx % samples.length]}`,
        atlasUrl: tutor.visemeAtlasUrl,
        tileCol: baseTile.col,
        tileRow: baseTile.row,
        blendTileCol: overlay.col,
        blendTileRow: overlay.row,
        blendRatio: overlay.ratio,
        jawOpen: exp.jawOpen,
        lipRound: exp.lipRound,
        lipWidth: exp.lipWidth,
        lipPress: exp.lipPress,
        tongueTip: exp.tongueTip,
        teethVisible: exp.teethVisible,
        cheekLift: exp.cheekLift,
        browLift: exp.browLift,
        smileBias: exp.smileBias,
        mood: exp.mood,
      });
    });

    // E51 & E52: Dedicated Idol Greeting Smile & Thinking Conversation Expressions (>50 per person = 52)
    const happyTile = VISEME_ATLAS_COORDS.happy;
    const silTile = VISEME_ATLAS_COORDS.sil;
    const upperCode = tutor.id.toUpperCase();

    rows.push({
      id: seqId++,
      tutorId: tutor.id,
      photoCode: `${upperCode}-E51`,
      expressionCode: 'E51',
      visemeId: 'I',
      ipa: '/smile/',
      arpabet: 'HAPPY_IDOL',
      name: `${tutor.name.split(' ')[0]} · Warm Idol Encouragement Smile`,
      nameKo: `${tutor.name.split(' ')[0]} · 아이돌 격려 미소 표정`,
      articulatoryCueKo: '학습자가 정답을 말했을 때 눈웃음과 입꼬리를 올려 따뜻하게 격려하는 표정입니다.',
      sampleWord: 'awesome',
      sampleSentence: 'Awesome job! Your English sounds super natural.',
      atlasUrl: tutor.visemeAtlasUrl,
      tileCol: happyTile.col,
      tileRow: happyTile.row,
      blendTileCol: happyTile.col,
      blendTileRow: happyTile.row,
      blendRatio: 0,
      jawOpen: 0.24,
      lipRound: 0.0,
      lipWidth: 0.88,
      lipPress: 0.0,
      tongueTip: 0.0,
      teethVisible: 0.85,
      cheekLift: 0.88,
      browLift: 0.42,
      smileBias: 0.95,
      mood: 'happy',
    });

    rows.push({
      id: seqId++,
      tutorId: tutor.id,
      photoCode: `${upperCode}-E52`,
      expressionCode: 'E52',
      visemeId: 'sil',
      ipa: '/pause/',
      arpabet: 'THINK_LISTEN',
      name: `${tutor.name.split(' ')[0]} · Attentive Listening Neutral`,
      nameKo: `${tutor.name.split(' ')[0]} · 경청·생각 중 차분한 표정`,
      articulatoryCueKo: '학습자의 발음을 주의 깊게 들으며 입술을 편안히 다문 대기·생각 표정입니다.',
      sampleWord: 'hmm',
      sampleSentence: 'Let me think of an even better phrase for you.',
      atlasUrl: tutor.visemeAtlasUrl,
      tileCol: silTile.col,
      tileRow: silTile.row,
      blendTileCol: silTile.col,
      blendTileRow: silTile.row,
      blendRatio: 0,
      jawOpen: 0.0,
      lipRound: 0.0,
      lipWidth: 0.14,
      lipPress: 0.15,
      tongueTip: 0.0,
      teethVisible: 0.0,
      cheekLift: 0.1,
      browLift: 0.26,
      smileBias: 0.05,
      mood: 'thinking',
    });
  }

  return rows;
}

export const TUTOR_EXPRESSION_PHOTOS_260: TutorExpressionPhoto[] = buildTutorExpressionPhotos();

export function getTutorExpressionPhotos(tutorId: TutorId): TutorExpressionPhoto[] {
  return TUTOR_EXPRESSION_PHOTOS_260.filter((item) => item.tutorId === tutorId);
}
