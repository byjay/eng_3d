import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';
import { VISEME_EXPRESSIONS_50 } from '../data/visemeExpressions';
import { TUTOR_EXPRESSION_PHOTOS_260 } from '../data/tutorExpressionPhotos';
import type {
  MouthExpression,
  TutorExpressionPhoto,
  TutorId,
  TutorMood,
  VisemeId,
} from '../core/types';

interface DbExpressionRow {
  id: number;
  code: string;
  viseme_id: string;
  ipa: string;
  arpabet: string;
  name: string;
  name_ko: string;
  articulatory_cue_ko: string;
  sample_word: string;
  jaw_open: number;
  lip_round: number;
  lip_width: number;
  lip_press: number;
  tongue_tip: number;
  teeth_visible: number;
  cheek_lift: number;
  brow_lift: number;
  smile_bias: number;
  mood: string;
}

interface DbTutorPhotoRow extends DbExpressionRow {
  tutor_id: string;
  photo_code: string;
  expression_code: string;
  sample_sentence: string;
  atlas_url: string;
  tile_col: number;
  tile_row: number;
  blend_tile_col: number;
  blend_tile_row: number;
  blend_ratio: number;
}

function rowToMouthExpression(row: DbExpressionRow): MouthExpression {
  return {
    id: row.id,
    code: row.code,
    visemeId: row.viseme_id as VisemeId,
    ipa: row.ipa,
    arpabet: row.arpabet,
    name: row.name,
    nameKo: row.name_ko,
    articulatoryCueKo: row.articulatory_cue_ko,
    sampleWord: row.sample_word,
    jawOpen: row.jaw_open,
    lipRound: row.lip_round,
    lipWidth: row.lip_width,
    lipPress: row.lip_press,
    tongueTip: row.tongue_tip,
    teethVisible: row.teeth_visible,
    cheekLift: row.cheek_lift,
    browLift: row.brow_lift,
    smileBias: row.smile_bias,
    mood: row.mood as TutorMood,
  };
}

function rowToTutorPhoto(row: DbTutorPhotoRow): TutorExpressionPhoto {
  return {
    id: row.id,
    tutorId: row.tutor_id as TutorId,
    photoCode: row.photo_code,
    expressionCode: row.expression_code,
    visemeId: row.viseme_id as VisemeId,
    ipa: row.ipa,
    arpabet: row.arpabet,
    name: row.name,
    nameKo: row.name_ko,
    articulatoryCueKo: row.articulatory_cue_ko,
    sampleWord: row.sample_word,
    sampleSentence: row.sample_sentence,
    atlasUrl: row.atlas_url,
    tileCol: row.tile_col,
    tileRow: row.tile_row,
    blendTileCol: row.blend_tile_col,
    blendTileRow: row.blend_tile_row,
    blendRatio: row.blend_ratio,
    jawOpen: row.jaw_open,
    lipRound: row.lip_round,
    lipWidth: row.lip_width,
    lipPress: row.lip_press,
    tongueTip: row.tongue_tip,
    teethVisible: row.teeth_visible,
    cheekLift: row.cheek_lift,
    browLift: row.brow_lift,
    smileBias: row.smile_bias,
    mood: row.mood as TutorMood,
  };
}

export class VisemeExpressionDb {
  private db: DatabaseSync;

  constructor(dbPath = path.resolve(process.cwd(), 'data', 'fluentstage.db')) {
    if (dbPath !== ':memory:') {
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    }
    this.db = new DatabaseSync(dbPath);
    this.initAndSeed();
  }

  private initAndSeed(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS viseme_expressions (
        id INTEGER PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        viseme_id TEXT NOT NULL,
        ipa TEXT NOT NULL,
        arpabet TEXT NOT NULL,
        name TEXT NOT NULL,
        name_ko TEXT NOT NULL,
        articulatory_cue_ko TEXT NOT NULL,
        sample_word TEXT NOT NULL,
        jaw_open REAL NOT NULL,
        lip_round REAL NOT NULL,
        lip_width REAL NOT NULL,
        lip_press REAL NOT NULL,
        tongue_tip REAL NOT NULL,
        teeth_visible REAL NOT NULL,
        cheek_lift REAL NOT NULL,
        brow_lift REAL NOT NULL,
        smile_bias REAL NOT NULL,
        mood TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_viseme_expressions_viseme_id ON viseme_expressions(viseme_id);
      CREATE INDEX IF NOT EXISTS idx_viseme_expressions_arpabet ON viseme_expressions(arpabet);

      CREATE TABLE IF NOT EXISTS tutor_expression_photos (
        id INTEGER PRIMARY KEY,
        tutor_id TEXT NOT NULL,
        photo_code TEXT NOT NULL UNIQUE,
        expression_code TEXT NOT NULL,
        viseme_id TEXT NOT NULL,
        ipa TEXT NOT NULL,
        arpabet TEXT NOT NULL,
        name TEXT NOT NULL,
        name_ko TEXT NOT NULL,
        articulatory_cue_ko TEXT NOT NULL,
        sample_word TEXT NOT NULL,
        sample_sentence TEXT NOT NULL,
        atlas_url TEXT NOT NULL,
        tile_col INTEGER NOT NULL,
        tile_row INTEGER NOT NULL,
        blend_tile_col INTEGER NOT NULL,
        blend_tile_row INTEGER NOT NULL,
        blend_ratio REAL NOT NULL,
        jaw_open REAL NOT NULL,
        lip_round REAL NOT NULL,
        lip_width REAL NOT NULL,
        lip_press REAL NOT NULL,
        tongue_tip REAL NOT NULL,
        teeth_visible REAL NOT NULL,
        cheek_lift REAL NOT NULL,
        brow_lift REAL NOT NULL,
        smile_bias REAL NOT NULL,
        mood TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_tutor_photos_tutor_id ON tutor_expression_photos(tutor_id);
      CREATE INDEX IF NOT EXISTS idx_tutor_photos_viseme_id ON tutor_expression_photos(viseme_id);
    `);

    const upsertExp = this.db.prepare(`
      INSERT INTO viseme_expressions (
        id, code, viseme_id, ipa, arpabet, name, name_ko, articulatory_cue_ko, sample_word,
        jaw_open, lip_round, lip_width, lip_press, tongue_tip, teeth_visible, cheek_lift, brow_lift, smile_bias, mood, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
      ON CONFLICT(code) DO UPDATE SET
        viseme_id = excluded.viseme_id,
        ipa = excluded.ipa,
        arpabet = excluded.arpabet,
        name = excluded.name,
        name_ko = excluded.name_ko,
        articulatory_cue_ko = excluded.articulatory_cue_ko,
        sample_word = excluded.sample_word,
        jaw_open = excluded.jaw_open,
        lip_round = excluded.lip_round,
        lip_width = excluded.lip_width,
        lip_press = excluded.lip_press,
        tongue_tip = excluded.tongue_tip,
        teeth_visible = excluded.teeth_visible,
        cheek_lift = excluded.cheek_lift,
        brow_lift = excluded.brow_lift,
        smile_bias = excluded.smile_bias,
        mood = excluded.mood,
        updated_at = excluded.updated_at
    `);

    const upsertPhoto = this.db.prepare(`
      INSERT INTO tutor_expression_photos (
        id, tutor_id, photo_code, expression_code, viseme_id, ipa, arpabet, name, name_ko,
        articulatory_cue_ko, sample_word, sample_sentence, atlas_url,
        tile_col, tile_row, blend_tile_col, blend_tile_row, blend_ratio,
        jaw_open, lip_round, lip_width, lip_press, tongue_tip, teeth_visible,
        cheek_lift, brow_lift, smile_bias, mood, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?
      )
      ON CONFLICT(photo_code) DO UPDATE SET
        tutor_id = excluded.tutor_id,
        expression_code = excluded.expression_code,
        viseme_id = excluded.viseme_id,
        ipa = excluded.ipa,
        arpabet = excluded.arpabet,
        name = excluded.name,
        name_ko = excluded.name_ko,
        articulatory_cue_ko = excluded.articulatory_cue_ko,
        sample_word = excluded.sample_word,
        sample_sentence = excluded.sample_sentence,
        atlas_url = excluded.atlas_url,
        tile_col = excluded.tile_col,
        tile_row = excluded.tile_row,
        blend_tile_col = excluded.blend_tile_col,
        blend_tile_row = excluded.blend_tile_row,
        blend_ratio = excluded.blend_ratio,
        jaw_open = excluded.jaw_open,
        lip_round = excluded.lip_round,
        lip_width = excluded.lip_width,
        lip_press = excluded.lip_press,
        tongue_tip = excluded.tongue_tip,
        teeth_visible = excluded.teeth_visible,
        cheek_lift = excluded.cheek_lift,
        brow_lift = excluded.brow_lift,
        smile_bias = excluded.smile_bias,
        mood = excluded.mood,
        updated_at = excluded.updated_at
    `);

    const now = new Date().toISOString();
    this.db.exec('BEGIN');
    try {
      for (const exp of VISEME_EXPRESSIONS_50) {
        upsertExp.run(
          exp.id,
          exp.code,
          exp.visemeId,
          exp.ipa,
          exp.arpabet,
          exp.name,
          exp.nameKo,
          exp.articulatoryCueKo,
          exp.sampleWord,
          exp.jawOpen,
          exp.lipRound,
          exp.lipWidth,
          exp.lipPress,
          exp.tongueTip,
          exp.teethVisible,
          exp.cheekLift,
          exp.browLift,
          exp.smileBias,
          exp.mood,
          now,
        );
      }

      for (const p of TUTOR_EXPRESSION_PHOTOS_260) {
        upsertPhoto.run(
          p.id,
          p.tutorId,
          p.photoCode,
          p.expressionCode,
          p.visemeId,
          p.ipa,
          p.arpabet,
          p.name,
          p.nameKo,
          p.articulatoryCueKo,
          p.sampleWord,
          p.sampleSentence,
          p.atlasUrl,
          p.tileCol,
          p.tileRow,
          p.blendTileCol,
          p.blendTileRow,
          p.blendRatio,
          p.jawOpen,
          p.lipRound,
          p.lipWidth,
          p.lipPress,
          p.tongueTip,
          p.teethVisible,
          p.cheekLift,
          p.browLift,
          p.smileBias,
          p.mood,
          now,
        );
      }
      this.db.exec('COMMIT');
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }

  public count(): number {
    const row = this.db.prepare('SELECT COUNT(*) AS cnt FROM viseme_expressions').get() as { cnt: number };
    return Number(row?.cnt ?? 0);
  }

  public countTutorPhotos(tutorId?: TutorId): number {
    const row = tutorId
      ? (this.db
          .prepare('SELECT COUNT(*) AS cnt FROM tutor_expression_photos WHERE tutor_id = ?')
          .get(tutorId) as { cnt: number })
      : (this.db.prepare('SELECT COUNT(*) AS cnt FROM tutor_expression_photos').get() as { cnt: number });
    return Number(row?.cnt ?? 0);
  }

  public list(filter?: { viseme?: string; q?: string }): MouthExpression[] {
    const viseme = filter?.viseme?.trim();
    const q = filter?.q?.trim().toLowerCase();

    const rows =
      viseme && viseme !== 'ALL'
        ? (this.db
            .prepare('SELECT * FROM viseme_expressions WHERE viseme_id = ? ORDER BY id ASC')
            .all(viseme) as unknown as DbExpressionRow[])
        : (this.db
            .prepare('SELECT * FROM viseme_expressions ORDER BY id ASC')
            .all() as unknown as DbExpressionRow[]);

    const mapped = rows.map(rowToMouthExpression);
    if (!q) return mapped;

    return mapped.filter(
      (item) =>
        item.code.toLowerCase().includes(q) ||
        item.ipa.toLowerCase().includes(q) ||
        item.arpabet.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.nameKo.toLowerCase().includes(q) ||
        item.sampleWord.toLowerCase().includes(q) ||
        item.articulatoryCueKo.toLowerCase().includes(q),
    );
  }

  public listTutorPhotos(filter: {
    tutorId?: TutorId;
    viseme?: string;
    q?: string;
  }): TutorExpressionPhoto[] {
    const tutorId = filter.tutorId?.trim();
    const viseme = filter.viseme?.trim();
    const q = filter.q?.trim().toLowerCase();

    let rows: DbTutorPhotoRow[];
    if (tutorId && viseme && viseme !== 'ALL') {
      rows = this.db
        .prepare('SELECT * FROM tutor_expression_photos WHERE tutor_id = ? AND viseme_id = ? ORDER BY id ASC')
        .all(tutorId, viseme) as unknown as DbTutorPhotoRow[];
    } else if (tutorId) {
      rows = this.db
        .prepare('SELECT * FROM tutor_expression_photos WHERE tutor_id = ? ORDER BY id ASC')
        .all(tutorId) as unknown as DbTutorPhotoRow[];
    } else if (viseme && viseme !== 'ALL') {
      rows = this.db
        .prepare('SELECT * FROM tutor_expression_photos WHERE viseme_id = ? ORDER BY id ASC')
        .all(viseme) as unknown as DbTutorPhotoRow[];
    } else {
      rows = this.db
        .prepare('SELECT * FROM tutor_expression_photos ORDER BY id ASC')
        .all() as unknown as DbTutorPhotoRow[];
    }

    const mapped = rows.map(rowToTutorPhoto);
    if (!q) return mapped;

    return mapped.filter(
      (item) =>
        item.photoCode.toLowerCase().includes(q) ||
        item.expressionCode.toLowerCase().includes(q) ||
        item.ipa.toLowerCase().includes(q) ||
        item.arpabet.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.nameKo.toLowerCase().includes(q) ||
        item.sampleWord.toLowerCase().includes(q) ||
        item.articulatoryCueKo.toLowerCase().includes(q),
    );
  }

  public getByCode(code: string): MouthExpression | null {
    const clean = code.trim().toUpperCase();
    const row = this.db
      .prepare('SELECT * FROM viseme_expressions WHERE code = ? LIMIT 1')
      .get(clean) as unknown as DbExpressionRow | undefined;
    return row ? rowToMouthExpression(row) : null;
  }

  public getTutorPhotoByCode(tutorId: TutorId, expressionCode: string): TutorExpressionPhoto | null {
    const clean = expressionCode.trim().toUpperCase();
    const row = this.db
      .prepare('SELECT * FROM tutor_expression_photos WHERE tutor_id = ? AND (expression_code = ? OR photo_code = ?) LIMIT 1')
      .get(tutorId, clean, clean) as unknown as DbTutorPhotoRow | undefined;
    return row ? rowToTutorPhoto(row) : null;
  }

  public close(): void {
    this.db.close();
  }
}
