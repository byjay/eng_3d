import test from 'node:test';
import assert from 'node:assert/strict';
import { VisemeExpressionDb } from './visemeExpressionDb';
import { TUTOR_PROFILES } from '../data/seedData';

test('VisemeExpressionDb seeds 50 canonical expressions and 260 per-tutor expression photos in SQLite', () => {
  const db = new VisemeExpressionDb(':memory:');
  try {
    assert.equal(db.count(), 50);
    assert.equal(db.countTutorPhotos(), 260);

    const allExpressions = db.list();
    assert.equal(allExpressions.length, 50);
    assert.equal(new Set(allExpressions.map((e) => e.code)).size, 50);

    const thOnly = db.list({ viseme: 'TH' });
    assert.ok(thOnly.length >= 3);
    assert.ok(thOnly.every((e) => e.visemeId === 'TH'));

    const m08 = db.getByCode('M08');
    assert.ok(m08);
    assert.equal(m08.visemeId, 'TH');
    assert.equal(m08.sampleWord, 'thank');

    for (const tutor of TUTOR_PROFILES) {
      assert.equal(db.countTutorPhotos(tutor.id), 52);
      const list = db.listTutorPhotos({ tutorId: tutor.id });
      assert.equal(list.length, 52);

      const sampleSearch = db.listTutorPhotos({ tutorId: tutor.id, q: 'thank' });
      assert.ok(sampleSearch.length >= 1);

      const firstPhoto = db.getTutorPhotoByCode(tutor.id, 'M01');
      assert.ok(firstPhoto);
      assert.equal(firstPhoto.visemeId, 'PP');
      assert.equal(firstPhoto.atlasUrl, tutor.visemeAtlasUrl);
    }
  } finally {
    db.close();
  }
});
