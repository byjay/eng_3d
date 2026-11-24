import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractReadableErrorMessage,
  getApiUrl,
  normalizeBaseUrl,
  parseEmbedConfigFromSearch,
  resolveAssetUrl,
  setRuntimeApiBase,
} from './androidBridge';

test('parseEmbedConfigFromSearch parses embed mode, apiBase, tutor, cefr, and tab', () => {
  const cfg = parseEmbedConfigFromSearch(
    '?embed=1&tutor=elena&cefr=B2&tab=shadowing&scenario=cafe_order&apiBase=https://tutor.example.com/',
  );
  assert.equal(cfg.embed, true);
  assert.equal(cfg.apiBase, 'https://tutor.example.com');
  assert.equal(cfg.initialTutorId, 'elena');
  assert.equal(cfg.initialCefr, 'B2');
  assert.equal(cfg.initialTab, 'shadowing');
  assert.equal(cfg.initialScenarioId, 'cafe_order');

  assert.equal(getApiUrl('/api/v1/chat'), 'https://tutor.example.com/api/v1/chat');
  assert.equal(
    resolveAssetUrl('/src/assets/images/idol_elena.jpg'),
    'https://tutor.example.com/src/assets/images/idol_elena.jpg',
  );

  // Reset runtime base
  setRuntimeApiBase('');
  assert.equal(getApiUrl('api/v1/chat'), '/api/v1/chat');
});

test('normalizeBaseUrl rejects unsafe non-http schemes', () => {
  assert.equal(normalizeBaseUrl('javascript:alert(1)'), '');
  assert.equal(normalizeBaseUrl('https://app.example.com///'), 'https://app.example.com');
});

test('extractReadableErrorMessage unwraps nested Gemini JSON error payloads cleanly', () => {
  const raw = JSON.stringify({
    error: {
      code: 503,
      message: 'This model is currently experiencing high demand.',
      status: 'UNAVAILABLE',
    },
  });
  assert.equal(
    extractReadableErrorMessage(raw, 503),
    'This model is currently experiencing high demand.',
  );
  assert.equal(
    extractReadableErrorMessage(undefined, 503),
    'AI tutor server is temporarily busy. Please try again in a moment.',
  );
  assert.ok(
    extractReadableErrorMessage('<!doctype html><html><body>404</body></html>', 404).includes('HTML instead of JSON'),
  );
});

test('parseEmbedConfigFromSearch supports guide tab, domain, and sentence query params', () => {
  const cfg = parseEmbedConfigFromSearch('?embed=1&tab=guide&domain=banking&sentence=42&cefr=B1');
  assert.equal(cfg.embed, true);
  assert.equal(cfg.initialTab, 'guide');
  assert.equal(cfg.initialDomain, 'banking');
  assert.equal(cfg.initialSentenceId, 42);
  assert.equal(cfg.initialCefr, 'B1');
});
