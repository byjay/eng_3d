import test from 'node:test';
import assert from 'node:assert/strict';
import { GroqKeyRotator, loadGroqKeysFromEnv } from './groqRotator';

test('loadGroqKeysFromEnv collects 5 numbered keys and deduplicates placeholders', () => {
  const keys = loadGroqKeysFromEnv({
    GROQ_API_KEY_1: 'gsk_key_one',
    GROQ_API_KEY_2: 'gsk_key_two',
    GROQ_API_KEY_3: 'gsk_key_three',
    GROQ_API_KEY_4: 'gsk_key_four',
    GROQ_API_KEY_5: 'gsk_key_five',
    GROQ_API_KEYS: 'gsk_key_two, MY_PLACEHOLDER',
  });
  assert.deepEqual(keys, [
    'gsk_key_one',
    'gsk_key_two',
    'gsk_key_three',
    'gsk_key_four',
    'gsk_key_five',
  ]);
});

test('GroqKeyRotator cycles strictly through all 5 keys in round-robin order', () => {
  const rotator = new GroqKeyRotator(['k1', 'k2', 'k3', 'k4', 'k5']);
  const sequence = Array.from({ length: 7 }, () => rotator.acquireSlot(1000).apiKey);
  assert.deepEqual(sequence, ['k1', 'k2', 'k3', 'k4', 'k5', 'k1', 'k2']);
});

test('GroqKeyRotator skips 429-rate-limited keys and recovers after cooldown', async () => {
  const rotator = new GroqKeyRotator(['k1', 'k2', 'k3', 'k4', 'k5']);
  const seenKeys: string[] = [];

  const outcome = await rotator.executeWithRotation(async (apiKey) => {
    seenKeys.push(apiKey);
    if (apiKey === 'k1' || apiKey === 'k2') {
      const err = new Error('Rate limit reached') as Error & { status: number };
      err.status = 429;
      throw err;
    }
    return `ok-from-${apiKey}`;
  });

  assert.equal(outcome.result, 'ok-from-k3');
  assert.equal(outcome.slotIndex, 3);
  assert.equal(outcome.attempts, 3);
  assert.deepEqual(seenKeys, ['k1', 'k2', 'k3']);

  const status = rotator.getStatus(Date.now());
  assert.equal(status.totalKeys, 5);
  assert.equal(status.healthyKeys, 3);
  assert.equal(status.slots[0].healthy, false);
  assert.equal(status.slots[1].healthy, false);
  assert.equal(status.slots[2].healthy, true);
});
