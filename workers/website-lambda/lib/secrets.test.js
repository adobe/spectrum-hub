import {
  describe, it, expect, vi, beforeEach, afterEach,
} from 'vitest';
import {
  resolveSecrets, __resetSecretsCacheForTests, SECRET_TTL_MS, SECRET_FAILURE_BACKOFF_MS,
} from './secrets.js';

// Shared, mutable test doubles for the AWS SDK. vi.hoisted so the vi.mock
// factory (hoisted above imports) can reference them, and each test can
// reconfigure send behavior / force a client-construction failure.
const h = vi.hoisted(() => ({ sendImpl: null, clientThrows: false, constructed: 0 }));

vi.mock('@aws-sdk/client-secrets-manager', () => ({
  SecretsManagerClient: class {
    constructor() {
      h.constructed += 1;
      if (h.clientThrows) { throw new Error('SDK unavailable'); }
    }

    // eslint-disable-next-line class-methods-use-this
    send(command) { return h.sendImpl(command); }
  },
  GetSecretValueCommand: class {
    constructor(input) { this.input = input; }
  },
}));

const okFor = (values) => vi.fn(async (command) => {
  const id = command.input.SecretId;
  if (!(id in values)) { throw new Error(`no such secret ${id}`); }
  return { SecretString: values[id] };
});

beforeEach(() => {
  __resetSecretsCacheForTests();
  h.sendImpl = null;
  h.clientThrows = false;
  h.constructed = 0;
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('resolveSecrets', () => {
  it('is a no-op when neither *_SECRET_ID is configured (leaves plaintext env)', async () => {
    h.sendImpl = vi.fn();
    const env = { SESSION_SECRET: 'plaintext-still-here' };
    await resolveSecrets(env);
    expect(env.SESSION_SECRET).toBe('plaintext-still-here');
    expect(h.sendImpl).not.toHaveBeenCalled();
    expect(h.constructed).toBe(0);
  });

  it('fetches configured ids and assigns the values onto env', async () => {
    h.sendImpl = okFor({
      'prod/session': 'the-session-secret',
      'prod/ims': 'the-ims-secret',
    });
    const env = { SESSION_SECRET_ID: 'prod/session', IMS_CLIENT_SECRET_ID: 'prod/ims' };
    await resolveSecrets(env);
    expect(env.SESSION_SECRET).toBe('the-session-secret');
    expect(env.IMS_CLIENT_SECRET).toBe('the-ims-secret');
  });

  it('migration: only fetches the id that is set, leaves the other plaintext in place', async () => {
    h.sendImpl = okFor({ 'prod/session': 'fetched-session' });
    const env = { SESSION_SECRET_ID: 'prod/session', IMS_CLIENT_SECRET: 'legacy-plaintext-ims' };
    await resolveSecrets(env);
    expect(env.SESSION_SECRET).toBe('fetched-session');
    // IMS_CLIENT_SECRET had no id, so its plaintext value is untouched.
    expect(env.IMS_CLIENT_SECRET).toBe('legacy-plaintext-ims');
    expect(h.sendImpl).toHaveBeenCalledTimes(1);
  });

  it('fails closed on a cold container when the fetch throws (secret stays unset)', async () => {
    h.sendImpl = vi.fn(async () => { throw new Error('AccessDenied'); });
    const env = { SESSION_SECRET_ID: 'prod/session' };
    await expect(resolveSecrets(env)).resolves.toBeUndefined(); // never rejects
    expect(env.SESSION_SECRET).toBeUndefined();
  });

  it('treats a secret with no SecretString as a failure (does not set an empty value)', async () => {
    h.sendImpl = vi.fn(async () => ({ SecretBinary: new Uint8Array([1, 2, 3]) }));
    const env = { SESSION_SECRET_ID: 'prod/session' };
    await resolveSecrets(env);
    expect(env.SESSION_SECRET).toBeUndefined();
  });

  it('keeps the last-known-good value when a later refresh fails (availability)', async () => {
    vi.useFakeTimers();
    h.sendImpl = okFor({ 'prod/session': 'good-value' });
    const env = { SESSION_SECRET_ID: 'prod/session' };
    await resolveSecrets(env);
    expect(env.SESSION_SECRET).toBe('good-value');

    // TTL expires, next fetch fails - the good value must remain in env.
    vi.advanceTimersByTime(SECRET_TTL_MS + 1);
    h.sendImpl = vi.fn(async () => { throw new Error('transient'); });
    await resolveSecrets(env);
    expect(env.SESSION_SECRET).toBe('good-value');
  });

  it('caches a good fetch for the TTL (no re-fetch within the window)', async () => {
    vi.useFakeTimers();
    const send = okFor({ 'prod/session': 'v1' });
    h.sendImpl = send;
    const env = { SESSION_SECRET_ID: 'prod/session' };
    await resolveSecrets(env);
    vi.advanceTimersByTime(SECRET_TTL_MS - 1000);
    await resolveSecrets(env);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('re-fetches after the TTL expires (picks up a rotated value)', async () => {
    vi.useFakeTimers();
    h.sendImpl = okFor({ 'prod/session': 'v1' });
    const env = { SESSION_SECRET_ID: 'prod/session' };
    await resolveSecrets(env);
    expect(env.SESSION_SECRET).toBe('v1');

    vi.advanceTimersByTime(SECRET_TTL_MS + 1);
    h.sendImpl = okFor({ 'prod/session': 'v2-rotated' });
    await resolveSecrets(env);
    expect(env.SESSION_SECRET).toBe('v2-rotated');
  });

  it('backs off after a failure but retries once the short window passes', async () => {
    vi.useFakeTimers();
    const failing = vi.fn(async () => { throw new Error('down'); });
    h.sendImpl = failing;
    const env = { SESSION_SECRET_ID: 'prod/session' };
    await resolveSecrets(env);
    // Within the backoff window: no retry (still one call).
    vi.advanceTimersByTime(SECRET_FAILURE_BACKOFF_MS - 1);
    await resolveSecrets(env);
    expect(failing).toHaveBeenCalledTimes(1);
    // After the window: retries, and a now-healthy fetch resolves.
    vi.advanceTimersByTime(2);
    h.sendImpl = okFor({ 'prod/session': 'recovered' });
    await resolveSecrets(env);
    expect(env.SESSION_SECRET).toBe('recovered');
  });

  it('degrades (does not throw) when the SDK client cannot be constructed', async () => {
    h.clientThrows = true;
    h.sendImpl = vi.fn();
    const env = { SESSION_SECRET_ID: 'prod/session' };
    await expect(resolveSecrets(env)).resolves.toBeUndefined();
    expect(env.SESSION_SECRET).toBeUndefined();
    expect(h.sendImpl).not.toHaveBeenCalled();
  });
});
