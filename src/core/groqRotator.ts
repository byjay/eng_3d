export interface GroqKeySlot {
  index: number; // 1-based slot ID (1..5)
  apiKey: string;
  cooldownUntilMs: number;
  consecutiveErrors: number;
  totalRequests: number;
  lastErrorStatus?: number;
}

export interface GroqRotatorStatus {
  totalKeys: number;
  healthyKeys: number;
  nextSlotIndex: number;
  slots: Array<{
    slot: number;
    healthy: boolean;
    cooldownRemainingMs: number;
    totalRequests: number;
    lastErrorStatus?: number;
  }>;
}

/**
 * Extracts up to N distinct Groq API keys from environment variables:
 * - GROQ_API_KEYS (comma/whitespace-separated)
 * - GROQ_API_KEY_1 .. GROQ_API_KEY_5
 * - GROQ_API_KEY (single fallback)
 */
export function loadGroqKeysFromEnv(
  env: Record<string, string | undefined> = process.env,
): string[] {
  const candidates: string[] = [];

  for (let i = 1; i <= 5; i++) {
    const k = env[`GROQ_API_KEY_${i}`]?.trim();
    if (k) candidates.push(k);
  }

  if (env.GROQ_API_KEYS) {
    for (const part of env.GROQ_API_KEYS.split(/[,\s]+/)) {
      const trimmed = part.trim();
      if (trimmed) candidates.push(trimmed);
    }
  }

  if (env.GROQ_API_KEY?.trim()) {
    candidates.push(env.GROQ_API_KEY.trim());
  }

  // Deduplicate while preserving slot order, ignore obvious placeholders
  const seen = new Set<string>();
  const keys: string[] = [];
  for (const key of candidates) {
    if (key.startsWith('MY_') || key === 'undefined' || key === 'null') continue;
    if (!seen.has(key)) {
      seen.add(key);
      keys.push(key);
    }
  }
  return keys;
}

/**
 * Round-robin + automatic cooldown failover rotator for 5 Groq API keys.
 */
export class GroqKeyRotator {
  private readonly slots: GroqKeySlot[];
  private cursor = 0;

  constructor(apiKeys: string[]) {
    this.slots = apiKeys.map((apiKey, idx) => ({
      index: idx + 1,
      apiKey,
      cooldownUntilMs: 0,
      consecutiveErrors: 0,
      totalRequests: 0,
    }));
  }

  get size(): number {
    return this.slots.length;
  }

  hasKeys(): boolean {
    return this.slots.length > 0;
  }

  /**
   * Acquires the next available API key slot in round-robin order.
   * Skips slots currently in cooldown; if all slots are cooling down, picks the one expiring soonest.
   */
  acquireSlot(nowMs: number = Date.now()): GroqKeySlot {
    if (this.slots.length === 0) {
      throw new Error('No Groq API keys configured.');
    }

    const total = this.slots.length;
    for (let offset = 0; offset < total; offset++) {
      const idx = (this.cursor + offset) % total;
      const slot = this.slots[idx];
      if (slot.cooldownUntilMs <= nowMs) {
        this.cursor = (idx + 1) % total;
        slot.totalRequests += 1;
        return slot;
      }
    }

    // All slots in cooldown: pick the one with earliest recovery timestamp
    let earliest = this.slots[0];
    for (let i = 1; i < total; i++) {
      if (this.slots[i].cooldownUntilMs < earliest.cooldownUntilMs) {
        earliest = this.slots[i];
      }
    }
    this.cursor = (this.slots.indexOf(earliest) + 1) % total;
    earliest.totalRequests += 1;
    return earliest;
  }

  reportSuccess(slotIndex: number): void {
    const slot = this.slots.find((s) => s.index === slotIndex);
    if (!slot) return;
    slot.consecutiveErrors = 0;
    slot.cooldownUntilMs = 0;
    slot.lastErrorStatus = undefined;
  }

  reportFailure(
    slotIndex: number,
    statusCode?: number,
    retryAfterMs?: number,
    nowMs: number = Date.now(),
  ): void {
    const slot = this.slots.find((s) => s.index === slotIndex);
    if (!slot) return;

    slot.consecutiveErrors += 1;
    slot.lastErrorStatus = statusCode;

    let cooldownMs = 15_000;
    if (statusCode === 429) {
      cooldownMs = retryAfterMs && retryAfterMs > 0 ? retryAfterMs : 60_000;
    } else if (statusCode === 401 || statusCode === 403) {
      cooldownMs = 10 * 60_000;
    } else if (statusCode && statusCode >= 500) {
      cooldownMs = Math.min(120_000, 10_000 * slot.consecutiveErrors);
    }

    slot.cooldownUntilMs = nowMs + cooldownMs;
  }

  /**
   * Executes an async task using round-robin rotation and automatic failover across all configured keys.
   */
  async executeWithRotation<T>(
    fn: (apiKey: string, slotIndex: number) => Promise<T>,
  ): Promise<{ result: T; slotIndex: number; attempts: number }> {
    if (this.slots.length === 0) {
      throw new Error('No Groq API keys configured.');
    }

    const maxAttempts = this.slots.length;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const slot = this.acquireSlot();
      try {
        const result = await fn(slot.apiKey, slot.index);
        this.reportSuccess(slot.index);
        return { result, slotIndex: slot.index, attempts: attempt };
      } catch (err: unknown) {
        lastError = err;
        const status = extractHttpStatus(err);
        const retryAfterMs = extractRetryAfterMs(err);
        this.reportFailure(slot.index, status, retryAfterMs);

        // Only abort immediately on 400 Bad Request (prompt/schema error unrelated to key)
        if (status === 400) {
          throw err;
        }
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error('All rotated Groq API keys failed.');
  }

  getStatus(nowMs: number = Date.now()): GroqRotatorStatus {
    const slots = this.slots.map((s) => {
      const cooldownRemainingMs = Math.max(0, s.cooldownUntilMs - nowMs);
      return {
        slot: s.index,
        healthy: cooldownRemainingMs === 0,
        cooldownRemainingMs,
        totalRequests: s.totalRequests,
        lastErrorStatus: s.lastErrorStatus,
      };
    });
    return {
      totalKeys: slots.length,
      healthyKeys: slots.filter((s) => s.healthy).length,
      nextSlotIndex: this.slots.length > 0 ? (this.cursor % this.slots.length) + 1 : 0,
      slots,
    };
  }
}

function extractHttpStatus(err: unknown): number | undefined {
  if (!err || typeof err !== 'object') return undefined;
  const rec = err as { status?: unknown; statusCode?: unknown };
  if (typeof rec.status === 'number') return rec.status;
  if (typeof rec.statusCode === 'number') return rec.statusCode;
  return undefined;
}

function extractRetryAfterMs(err: unknown): number | undefined {
  if (!err || typeof err !== 'object') return undefined;
  const headers = (err as { headers?: Record<string, string> }).headers;
  const retryAfter = headers?.['retry-after'];
  if (!retryAfter) return undefined;
  const secs = Number(retryAfter);
  return Number.isFinite(secs) && secs > 0 ? secs * 1000 : undefined;
}
