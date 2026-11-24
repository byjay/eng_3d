import type {
  GestureCategory,
  GestureDefinition,
  GestureKinematics,
  TutorId,
  TutorMood,
} from '../core/types';

interface BaseGestureBlueprint {
  slug: string;
  name: string;
  nameKo: string;
  category: GestureCategory;
  mood: TutorMood;
  kinematics: GestureKinematics;
}

const BASE_50_BLUEPRINTS: BaseGestureBlueprint[] = [
  // 1-10: Greeting & Rapport
  { slug: 'warm_welcome_nod', name: 'Warm Welcome Nod', nameKo: '따뜻한 환영 인사', category: 'greeting', mood: 'happy', kinematics: { headPitch: 0.12, headYaw: 0.04, headRoll: 0.03, leanZ: 0.04, bounceY: 0.012, swayX: 0, freqHz: 1.8, durationMs: 1600, smileBoost: 0.45, browLift: 0.25, jawPulse: 0.08, zoomDelta: -0.05 } },
  { slug: 'friendly_wave_lean', name: 'Friendly Lean-In Greet', nameKo: '다정하게 다가가며 인사', category: 'greeting', mood: 'happy', kinematics: { headPitch: 0.06, headYaw: -0.08, headRoll: 0.07, leanZ: 0.06, bounceY: 0.015, swayX: 0.02, freqHz: 2.0, durationMs: 1700, smileBoost: 0.55, browLift: 0.3, jawPulse: 0.1, zoomDelta: -0.08 } },
  { slug: 'polite_bow_greet', name: 'Polite Studio Bow', nameKo: '정중한 목례 인사', category: 'greeting', mood: 'encouraging', kinematics: { headPitch: 0.18, headYaw: 0, headRoll: 0, leanZ: 0.05, bounceY: -0.01, swayX: 0, freqHz: 1.1, durationMs: 1800, smileBoost: 0.3, browLift: 0.1, jawPulse: 0, zoomDelta: 0 } },
  { slug: 'eyebrow_flash_hello', name: 'Eyebrow Flash Hello', nameKo: '반가운 눈썹 인사', category: 'greeting', mood: 'happy', kinematics: { headPitch: -0.06, headYaw: 0.05, headRoll: 0.04, leanZ: 0.03, bounceY: 0.015, swayX: 0, freqHz: 2.2, durationMs: 1400, smileBoost: 0.5, browLift: 0.55, jawPulse: 0.05, zoomDelta: -0.04 } },
  { slug: 'morning_cheer_sway', name: 'Morning Energy Sway', nameKo: '활기찬 아침 인사', category: 'greeting', mood: 'happy', kinematics: { headPitch: 0.05, headYaw: 0.12, headRoll: -0.06, leanZ: 0.03, bounceY: 0.02, swayX: 0.035, freqHz: 2.4, durationMs: 1800, smileBoost: 0.6, browLift: 0.3, jawPulse: 0.12, zoomDelta: 0 } },
  { slug: 'gentle_tilt_welcome', name: 'Gentle Tilt Welcome', nameKo: '부드러운 고개 갸웃 환영', category: 'greeting', mood: 'encouraging', kinematics: { headPitch: 0.04, headYaw: -0.06, headRoll: 0.14, leanZ: 0.02, bounceY: 0.008, swayX: -0.015, freqHz: 1.4, durationMs: 1700, smileBoost: 0.4, browLift: 0.2, jawPulse: 0, zoomDelta: 0 } },
  { slug: 'check_in_glance', name: 'Attentive Check-In', nameKo: '안부를 묻는 눈맞춤', category: 'greeting', mood: 'encouraging', kinematics: { headPitch: 0.08, headYaw: 0.09, headRoll: 0.05, leanZ: 0.05, bounceY: 0.005, swayX: 0.01, freqHz: 1.5, durationMs: 1600, smileBoost: 0.35, browLift: 0.25, jawPulse: 0.05, zoomDelta: -0.06 } },
  { slug: 'relaxed_shoulder_greet', name: 'Relaxed Shoulder Ease', nameKo: '편안한 어깨 풀기 인사', category: 'greeting', mood: 'neutral', kinematics: { headPitch: 0.03, headYaw: 0.05, headRoll: -0.04, leanZ: -0.02, bounceY: 0.018, swayX: 0.02, freqHz: 1.6, durationMs: 1800, smileBoost: 0.25, browLift: 0.1, jawPulse: 0, zoomDelta: 0.03 } },
  { slug: 'warm_farewell_nod', name: 'Warm Closing Nod', nameKo: '따뜻한 마무리 인사', category: 'greeting', mood: 'happy', kinematics: { headPitch: 0.14, headYaw: -0.04, headRoll: 0.04, leanZ: 0.02, bounceY: 0.01, swayX: 0, freqHz: 1.4, durationMs: 1700, smileBoost: 0.55, browLift: 0.2, jawPulse: 0.06, zoomDelta: 0 } },
  { slug: 'ready_to_begin_cue', name: 'Ready-to-Start Cue', nameKo: '수업 시작 신호 끄덕임', category: 'greeting', mood: 'encouraging', kinematics: { headPitch: 0.15, headYaw: 0, headRoll: 0, leanZ: 0.06, bounceY: 0.014, swayX: 0, freqHz: 2.3, durationMs: 1400, smileBoost: 0.4, browLift: 0.3, jawPulse: 0.05, zoomDelta: -0.07 } },

  // 11-20: Encouragement & Praise
  { slug: 'affirming_double_nod', name: 'Affirming Double Nod', nameKo: '공감의 두 번 끄덕임', category: 'encouragement', mood: 'encouraging', kinematics: { headPitch: 0.16, headYaw: 0.02, headRoll: 0.02, leanZ: 0.04, bounceY: 0.012, swayX: 0, freqHz: 2.8, durationMs: 1500, smileBoost: 0.5, browLift: 0.25, jawPulse: 0.05, zoomDelta: -0.04 } },
  { slug: 'proud_beam_smile', name: 'Proud Beaming Smile', nameKo: '뿌듯한 칭찬 미소', category: 'encouragement', mood: 'happy', kinematics: { headPitch: -0.04, headYaw: 0.06, headRoll: 0.06, leanZ: 0.03, bounceY: 0.016, swayX: 0.015, freqHz: 1.6, durationMs: 1800, smileBoost: 0.75, browLift: 0.35, jawPulse: 0.08, zoomDelta: -0.05 } },
  { slug: 'enthusiastic_cheer', name: 'Enthusiastic Bravo', nameKo: '열정적인 박수 리액션', category: 'encouragement', mood: 'happy', kinematics: { headPitch: 0.1, headYaw: 0.1, headRoll: -0.05, leanZ: 0.06, bounceY: 0.026, swayX: 0.03, freqHz: 3.1, durationMs: 1700, smileBoost: 0.7, browLift: 0.45, jawPulse: 0.14, zoomDelta: -0.09 } },
  { slug: 'keep_going_nudge', name: 'Keep Going Nudge', nameKo: '계속 말해보라는 격려', category: 'encouragement', mood: 'encouraging', kinematics: { headPitch: 0.11, headYaw: -0.05, headRoll: 0.05, leanZ: 0.05, bounceY: 0.01, swayX: 0.01, freqHz: 2.2, durationMs: 1600, smileBoost: 0.4, browLift: 0.3, jawPulse: 0, zoomDelta: -0.06 } },
  { slug: 'reassuring_slow_nod', name: 'Reassuring Slow Nod', nameKo: '안심시키는 천천한 끄덕임', category: 'encouragement', mood: 'encouraging', kinematics: { headPitch: 0.13, headYaw: 0, headRoll: 0.04, leanZ: 0.03, bounceY: 0.006, swayX: 0, freqHz: 1.2, durationMs: 2000, smileBoost: 0.38, browLift: 0.15, jawPulse: 0, zoomDelta: -0.03 } },
  { slug: 'spot_on_acknowledge', name: 'Spot-On Acknowledgment', nameKo: '정확하다는 감탄 끄덕임', category: 'encouragement', mood: 'happy', kinematics: { headPitch: 0.14, headYaw: 0.08, headRoll: -0.03, leanZ: 0.05, bounceY: 0.018, swayX: 0.015, freqHz: 2.6, durationMs: 1500, smileBoost: 0.6, browLift: 0.4, jawPulse: 0.1, zoomDelta: -0.06 } },
  { slug: 'gentle_confidence_boost', name: 'Confidence Boost Lean', nameKo: '자신감 불어넣기', category: 'encouragement', mood: 'encouraging', kinematics: { headPitch: 0.06, headYaw: 0.04, headRoll: 0.08, leanZ: 0.06, bounceY: 0.012, swayX: 0.01, freqHz: 1.7, durationMs: 1700, smileBoost: 0.5, browLift: 0.25, jawPulse: 0.04, zoomDelta: -0.08 } },
  { slug: 'patient_wait_smile', name: 'Patient Listening Smile', nameKo: '기다려주는 편안한 미소', category: 'encouragement', mood: 'encouraging', kinematics: { headPitch: 0.03, headYaw: -0.04, headRoll: 0.06, leanZ: 0.02, bounceY: 0.005, swayX: 0, freqHz: 1.0, durationMs: 2000, smileBoost: 0.42, browLift: 0.12, jawPulse: 0, zoomDelta: 0 } },
  { slug: 'breakthrough_celebrate', name: 'Breakthrough Celebrate', nameKo: '성취 축하 제스처', category: 'encouragement', mood: 'happy', kinematics: { headPitch: -0.07, headYaw: 0.12, headRoll: 0.09, leanZ: 0.05, bounceY: 0.024, swayX: 0.03, freqHz: 2.9, durationMs: 1700, smileBoost: 0.8, browLift: 0.5, jawPulse: 0.15, zoomDelta: -0.07 } },
  { slug: 'supportive_empathy', name: 'Supportive Empathy', nameKo: '따뜻한 공감 표정', category: 'encouragement', mood: 'encouraging', kinematics: { headPitch: 0.08, headYaw: -0.07, headRoll: 0.12, leanZ: 0.04, bounceY: 0.006, swayX: -0.01, freqHz: 1.3, durationMs: 1900, smileBoost: 0.35, browLift: 0.2, jawPulse: 0, zoomDelta: -0.05 } },

  // 21-30: Thinking & Active Listening
  { slug: 'deep_ponder_tilt', name: 'Deep Ponder Tilt', nameKo: '깊이 생각하는 고개 기울임', category: 'thinking', mood: 'thinking', kinematics: { headPitch: -0.05, headYaw: 0.16, headRoll: 0.14, leanZ: -0.02, bounceY: 0.004, swayX: -0.015, freqHz: 0.9, durationMs: 2000, smileBoost: -0.1, browLift: 0.18, jawPulse: 0, zoomDelta: 0.02 } },
  { slug: 'curious_head_cock', name: 'Curious Head Tilt', nameKo: '호기심 어린 고개 갸웃', category: 'thinking', mood: 'thinking', kinematics: { headPitch: 0.04, headYaw: -0.12, headRoll: 0.18, leanZ: 0.03, bounceY: 0.006, swayX: 0.01, freqHz: 1.2, durationMs: 1800, smileBoost: 0.1, browLift: 0.35, jawPulse: 0, zoomDelta: -0.04 } },
  { slug: 'active_listening_lean', name: 'Active Listening Lean', nameKo: '경청하며 앞으로 기울이기', category: 'thinking', mood: 'neutral', kinematics: { headPitch: 0.09, headYaw: 0.06, headRoll: 0.05, leanZ: 0.07, bounceY: 0.004, swayX: 0, freqHz: 1.4, durationMs: 1800, smileBoost: 0.15, browLift: 0.2, jawPulse: 0, zoomDelta: -0.08 } },
  { slug: 'memory_recall_gaze', name: 'Memory Recall Upward', nameKo: '표현 떠올리는 시선', category: 'thinking', mood: 'thinking', kinematics: { headPitch: -0.12, headYaw: 0.18, headRoll: 0.08, leanZ: -0.03, bounceY: 0.005, swayX: 0.015, freqHz: 0.85, durationMs: 1900, smileBoost: -0.05, browLift: 0.28, jawPulse: 0, zoomDelta: 0.04 } },
  { slug: 'analyzing_grammar_scan', name: 'Grammar Check Pause', nameKo: '문장 구조 살피기', category: 'thinking', mood: 'thinking', kinematics: { headPitch: 0.06, headYaw: -0.1, headRoll: -0.08, leanZ: 0.02, bounceY: 0.003, swayX: -0.01, freqHz: 1.1, durationMs: 1700, smileBoost: 0, browLift: 0.12, jawPulse: 0.03, zoomDelta: -0.02 } },
  { slug: 'weighing_options_sway', name: 'Weighing Nuance Sway', nameKo: '두 가지 뉘앙스 저울질', category: 'thinking', mood: 'thinking', kinematics: { headPitch: 0.02, headYaw: 0.14, headRoll: 0.1, leanZ: 0, bounceY: 0.008, swayX: 0.028, freqHz: 1.5, durationMs: 2000, smileBoost: 0.05, browLift: 0.2, jawPulse: 0, zoomDelta: 0 } },
  { slug: 'hmm_contemplation', name: 'Contemplative Hmm', nameKo: '음~ 하며 생각 잠기기', category: 'thinking', mood: 'thinking', kinematics: { headPitch: 0.08, headYaw: 0.11, headRoll: 0.09, leanZ: 0.01, bounceY: 0.004, swayX: 0, freqHz: 1.0, durationMs: 1800, smileBoost: -0.05, browLift: 0.15, jawPulse: 0.04, zoomDelta: -0.02 } },
  { slug: 'focused_comprehension', name: 'Focused Comprehension', nameKo: '집중해서 이해하는 표정', category: 'thinking', mood: 'neutral', kinematics: { headPitch: 0.07, headYaw: -0.05, headRoll: 0.04, leanZ: 0.05, bounceY: 0.003, swayX: 0, freqHz: 1.3, durationMs: 1700, smileBoost: 0.08, browLift: 0.1, jawPulse: 0, zoomDelta: -0.05 } },
  { slug: 'aha_insight_lift', name: 'Aha Moment Lift', nameKo: '번뜩이는 아이디어 떠올림', category: 'thinking', mood: 'surprised', kinematics: { headPitch: -0.1, headYaw: 0.06, headRoll: -0.06, leanZ: 0.05, bounceY: 0.02, swayX: 0, freqHz: 2.2, durationMs: 1500, smileBoost: 0.45, browLift: 0.6, jawPulse: 0.12, zoomDelta: -0.06 } },
  { slug: 'subtle_doubt_shake', name: 'Gentle Rethink Shake', nameKo: '다시 생각해보라는 미세 흔들림', category: 'thinking', mood: 'thinking', kinematics: { headPitch: 0.03, headYaw: 0.16, headRoll: 0.04, leanZ: 0, bounceY: 0.004, swayX: 0.01, freqHz: 2.5, durationMs: 1500, smileBoost: 0.1, browLift: 0.22, jawPulse: 0, zoomDelta: 0 } },

  // 31-40: Explanation & Teaching Emphasis
  { slug: 'key_point_stress', name: 'Key Point Emphasis', nameKo: '핵심 포인트 강조', category: 'explanation', mood: 'encouraging', kinematics: { headPitch: 0.15, headYaw: 0.04, headRoll: 0, leanZ: 0.06, bounceY: 0.015, swayX: 0, freqHz: 2.4, durationMs: 1500, smileBoost: 0.2, browLift: 0.35, jawPulse: 0.12, zoomDelta: -0.07 } },
  { slug: 'step_by_step_pace', name: 'Step-by-Step Cadence', nameKo: '차근차근 단계별 설명', category: 'explanation', mood: 'neutral', kinematics: { headPitch: 0.09, headYaw: 0.1, headRoll: 0.04, leanZ: 0.03, bounceY: 0.01, swayX: 0.022, freqHz: 1.9, durationMs: 1900, smileBoost: 0.2, browLift: 0.2, jawPulse: 0.08, zoomDelta: -0.03 } },
  { slug: 'contrast_left_right', name: 'A-vs-B Comparison', nameKo: '두 표현 비교 설명', category: 'explanation', mood: 'encouraging', kinematics: { headPitch: 0.04, headYaw: 0.18, headRoll: 0.06, leanZ: 0.02, bounceY: 0.008, swayX: 0.035, freqHz: 1.6, durationMs: 1900, smileBoost: 0.25, browLift: 0.25, jawPulse: 0.06, zoomDelta: 0 } },
  { slug: 'articulate_enunciation', name: 'Clear Enunciation Focus', nameKo: '또렷한 발음 시범', category: 'explanation', mood: 'neutral', kinematics: { headPitch: 0.03, headYaw: 0, headRoll: 0, leanZ: 0.07, bounceY: 0.006, swayX: 0, freqHz: 1.8, durationMs: 1700, smileBoost: 0.15, browLift: 0.25, jawPulse: 0.22, zoomDelta: -0.1 } },
  { slug: 'nuance_highlight', name: 'Subtle Nuance Cue', nameKo: '미묘한 뉘앙스 짚어주기', category: 'explanation', mood: 'encouraging', kinematics: { headPitch: 0.06, headYaw: -0.09, headRoll: 0.1, leanZ: 0.04, bounceY: 0.008, swayX: -0.015, freqHz: 1.5, durationMs: 1700, smileBoost: 0.3, browLift: 0.32, jawPulse: 0.06, zoomDelta: -0.05 } },
  { slug: 'big_picture_pullback', name: 'Big Picture Frame', nameKo: '전체 맥락 짚어주기', category: 'explanation', mood: 'neutral', kinematics: { headPitch: -0.05, headYaw: 0.08, headRoll: -0.04, leanZ: -0.04, bounceY: 0.012, swayX: 0.02, freqHz: 1.3, durationMs: 1800, smileBoost: 0.2, browLift: 0.2, jawPulse: 0.05, zoomDelta: 0.06 } },
  { slug: 'example_story_sway', name: 'Storytelling Example', nameKo: '예시 스토리텔링', category: 'explanation', mood: 'happy', kinematics: { headPitch: 0.05, headYaw: 0.12, headRoll: 0.07, leanZ: 0.03, bounceY: 0.014, swayX: 0.025, freqHz: 1.7, durationMs: 1900, smileBoost: 0.45, browLift: 0.25, jawPulse: 0.1, zoomDelta: -0.03 } },
  { slug: 'polite_correction_soft', name: 'Gentle Correction Ease', nameKo: '부드러운 교정 안내', category: 'explanation', mood: 'encouraging', kinematics: { headPitch: 0.08, headYaw: -0.06, headRoll: 0.09, leanZ: 0.04, bounceY: 0.006, swayX: 0, freqHz: 1.4, durationMs: 1800, smileBoost: 0.4, browLift: 0.2, jawPulse: 0.04, zoomDelta: -0.04 } },
  { slug: 'rhythm_beat_nod', name: 'Sentence Stress Beat', nameKo: '영어 강세 리듬 타기', category: 'explanation', mood: 'encouraging', kinematics: { headPitch: 0.12, headYaw: 0.03, headRoll: 0.03, leanZ: 0.03, bounceY: 0.016, swayX: 0.012, freqHz: 3.0, durationMs: 1600, smileBoost: 0.35, browLift: 0.2, jawPulse: 0.08, zoomDelta: -0.03 } },
  { slug: 'summarize_wrap_nod', name: 'Summary Wrap-Up', nameKo: '핵심 요약 정리', category: 'explanation', mood: 'happy', kinematics: { headPitch: 0.14, headYaw: -0.03, headRoll: 0.02, leanZ: 0.04, bounceY: 0.01, swayX: 0, freqHz: 1.7, durationMs: 1600, smileBoost: 0.45, browLift: 0.25, jawPulse: 0.06, zoomDelta: -0.04 } },

  // 41-50: Natural Human Reactions
  { slug: 'delighted_surprise', name: 'Delighted Surprise', nameKo: '반가운 놀람 리액션', category: 'reaction', mood: 'surprised', kinematics: { headPitch: -0.09, headYaw: 0.05, headRoll: 0.07, leanZ: -0.03, bounceY: 0.024, swayX: 0, freqHz: 2.5, durationMs: 1500, smileBoost: 0.6, browLift: 0.7, jawPulse: 0.18, zoomDelta: -0.04 } },
  { slug: 'light_chuckle_bob', name: 'Warm Chuckle Bob', nameKo: '자연스러운 웃음 끄덕임', category: 'reaction', mood: 'happy', kinematics: { headPitch: 0.09, headYaw: 0.08, headRoll: -0.06, leanZ: 0.02, bounceY: 0.022, swayX: 0.02, freqHz: 3.4, durationMs: 1600, smileBoost: 0.85, browLift: 0.3, jawPulse: 0.14, zoomDelta: -0.03 } },
  { slug: 'intrigued_raise', name: 'Intrigued Brow Raise', nameKo: '흥미진진한 눈썹 올림', category: 'reaction', mood: 'surprised', kinematics: { headPitch: -0.04, headYaw: -0.08, headRoll: 0.1, leanZ: 0.05, bounceY: 0.01, swayX: 0, freqHz: 1.6, durationMs: 1600, smileBoost: 0.35, browLift: 0.58, jawPulse: 0.05, zoomDelta: -0.06 } },
  { slug: 'playful_disbelief_shake', name: 'Playful No-Way Shake', nameKo: '유쾌한 놀람 고개 저음', category: 'reaction', mood: 'surprised', kinematics: { headPitch: 0.02, headYaw: 0.2, headRoll: 0.05, leanZ: -0.02, bounceY: 0.012, swayX: 0.015, freqHz: 2.8, durationMs: 1600, smileBoost: 0.5, browLift: 0.45, jawPulse: 0.1, zoomDelta: 0.02 } },
  { slug: 'deep_agreement_sigh', name: 'Sincere Agreement', nameKo: '진심 어린 동의 표정', category: 'reaction', mood: 'encouraging', kinematics: { headPitch: 0.15, headYaw: 0, headRoll: 0.05, leanZ: 0.04, bounceY: 0.008, swayX: 0, freqHz: 1.3, durationMs: 1800, smileBoost: 0.45, browLift: 0.2, jawPulse: 0.04, zoomDelta: -0.05 } },
  { slug: 'impressed_whistle_tilt', name: 'Impressed Approval', nameKo: '감탄하는 인정 표정', category: 'reaction', mood: 'happy', kinematics: { headPitch: -0.05, headYaw: 0.1, headRoll: -0.1, leanZ: 0.03, bounceY: 0.014, swayX: 0.015, freqHz: 1.8, durationMs: 1700, smileBoost: 0.65, browLift: 0.45, jawPulse: 0.1, zoomDelta: -0.04 } },
  { slug: 'sympathetic_wince', name: 'Empathetic Reaction', nameKo: '아쉬움에 공감하는 표정', category: 'reaction', mood: 'neutral', kinematics: { headPitch: 0.07, headYaw: -0.09, headRoll: 0.13, leanZ: 0.03, bounceY: 0.004, swayX: -0.01, freqHz: 1.4, durationMs: 1800, smileBoost: 0.05, browLift: 0.3, jawPulse: 0.04, zoomDelta: -0.03 } },
  { slug: 'tell_me_more_spark', name: 'Tell-Me-More Spark', nameKo: '더 들려달라는 반짝 반응', category: 'reaction', mood: 'happy', kinematics: { headPitch: 0.05, headYaw: 0.06, headRoll: 0.06, leanZ: 0.07, bounceY: 0.016, swayX: 0, freqHz: 2.3, durationMs: 1500, smileBoost: 0.6, browLift: 0.48, jawPulse: 0.08, zoomDelta: -0.09 } },
  { slug: 'polite_pause_breathe', name: 'Calm Studio Breath', nameKo: '자연스러운 호흡 정리', category: 'reaction', mood: 'neutral', kinematics: { headPitch: 0.04, headYaw: 0.03, headRoll: -0.02, leanZ: 0, bounceY: 0.012, swayX: 0, freqHz: 0.8, durationMs: 2000, smileBoost: 0.2, browLift: 0.08, jawPulse: 0, zoomDelta: 0 } },
  { slug: 'high_energy_finale', name: 'Upbeat Session Finale', nameKo: '신나는 응원 마무리', category: 'reaction', mood: 'happy', kinematics: { headPitch: 0.1, headYaw: 0.1, headRoll: 0.08, leanZ: 0.06, bounceY: 0.026, swayX: 0.025, freqHz: 2.8, durationMs: 1700, smileBoost: 0.8, browLift: 0.45, jawPulse: 0.12, zoomDelta: -0.08 } },
];

const TUTOR_SIGNATURE_OFFSETS: Record<
  TutorId,
  { prefix: string; styleTag: string; ampScale: number; speedScale: number; rollBias: number }
> = {
  amy: { prefix: 'Amy', styleTag: 'Warm Coach', ampScale: 1.0, speedScale: 1.0, rollBias: 0.02 },
  marcus: { prefix: 'Marcus', styleTag: 'Executive', ampScale: 0.88, speedScale: 0.92, rollBias: -0.01 },
  elena: { prefix: 'Elena', styleTag: 'Precision', ampScale: 0.96, speedScale: 1.08, rollBias: 0.015 },
  oliver: { prefix: 'Oliver', styleTag: 'British Wit', ampScale: 1.06, speedScale: 0.95, rollBias: -0.025 },
  sofia: { prefix: 'Sofia', styleTag: 'Expressive', ampScale: 1.18, speedScale: 1.12, rollBias: 0.03 },
};

function buildTutor50Gestures(tutorId: TutorId): GestureDefinition[] {
  const sig = TUTOR_SIGNATURE_OFFSETS[tutorId];
  return BASE_50_BLUEPRINTS.map((bp, idx) => ({
    id: `${tutorId}_${bp.slug}`,
    tutorId,
    index: idx + 1,
    name: `${bp.name}`,
    nameKo: `${bp.nameKo}`,
    category: bp.category,
    mood: bp.mood,
    kinematics: {
      headPitch: Number((bp.kinematics.headPitch * sig.ampScale).toFixed(3)),
      headYaw: Number((bp.kinematics.headYaw * sig.ampScale).toFixed(3)),
      headRoll: Number((bp.kinematics.headRoll * sig.ampScale + sig.rollBias).toFixed(3)),
      leanZ: Number((bp.kinematics.leanZ * sig.ampScale).toFixed(3)),
      bounceY: Number((bp.kinematics.bounceY * sig.ampScale).toFixed(3)),
      swayX: Number((bp.kinematics.swayX * sig.ampScale).toFixed(3)),
      freqHz: Number((bp.kinematics.freqHz * sig.speedScale).toFixed(2)),
      durationMs: bp.kinematics.durationMs,
      smileBoost: bp.kinematics.smileBoost,
      browLift: bp.kinematics.browLift,
      jawPulse: bp.kinematics.jawPulse,
      zoomDelta: bp.kinematics.zoomDelta,
    },
  }));
}

export const TUTOR_GESTURES_BY_ID: Record<TutorId, GestureDefinition[]> = {
  amy: buildTutor50Gestures('amy'),
  marcus: buildTutor50Gestures('marcus'),
  elena: buildTutor50Gestures('elena'),
  oliver: buildTutor50Gestures('oliver'),
  sofia: buildTutor50Gestures('sofia'),
};

export const ALL_TUTOR_GESTURES: GestureDefinition[] = [
  ...TUTOR_GESTURES_BY_ID.amy,
  ...TUTOR_GESTURES_BY_ID.marcus,
  ...TUTOR_GESTURES_BY_ID.elena,
  ...TUTOR_GESTURES_BY_ID.oliver,
  ...TUTOR_GESTURES_BY_ID.sofia,
];

export const GESTURE_SLUGS: string[] = BASE_50_BLUEPRINTS.map((bp) => bp.slug);

const CLASSIC_TAG_TO_SLUG: Record<string, string> = {
  wave: 'warm_welcome_nod',
  nod: 'affirming_double_nod',
  tilt_head: 'curious_head_cock',
  shake: 'playful_disbelief_shake',
  none: 'polite_pause_breathe',
};

export function resolveGestureForTutor(
  tutorId: TutorId,
  gestureIdOrTag: string,
): GestureDefinition {
  const list = TUTOR_GESTURES_BY_ID[tutorId];
  const exact = list.find(
    (g) => g.id === gestureIdOrTag || g.id === `${tutorId}_${gestureIdOrTag}`,
  );
  if (exact) return exact;

  const mappedSlug = CLASSIC_TAG_TO_SLUG[gestureIdOrTag];
  if (mappedSlug) {
    const bySlug = list.find((g) => g.id === `${tutorId}_${mappedSlug}`);
    if (bySlug) return bySlug;
  }

  return list[0];
}
