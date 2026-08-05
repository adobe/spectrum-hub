import {
  describe, it, expect, vi, beforeEach, afterEach,
} from 'vitest';
import { getJwk, resetJwksCache, IMS_JWKS_URL } from './jwks.js';

const jwksResponse = (keys, status = 200) => new Response(JSON.stringify({ keys }), { status });

beforeEach(() => {
  resetJwksCache();
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('getJwk', () => {
  it('fetches the prod keyset and returns the matching key', async () => {
    fetch.mockResolvedValue(jwksResponse([{ kid: 'k1', kty: 'RSA' }]));
    expect(await getJwk('prod', 'k1')).toEqual({ kid: 'k1', kty: 'RSA' });
    expect(fetch).toHaveBeenCalledWith(IMS_JWKS_URL.prod);
  });

  it('routes dev and stage to the shared stg1 keyset', async () => {
    fetch.mockResolvedValue(jwksResponse([{ kid: 'k1' }]));
    await getJwk('dev', 'k1');
    expect(fetch).toHaveBeenCalledWith(IMS_JWKS_URL.dev);
    expect(IMS_JWKS_URL.dev).toBe(IMS_JWKS_URL.stage);
  });

  it('falls back to the prod keyset for an unrecognized env', async () => {
    fetch.mockResolvedValue(jwksResponse([{ kid: 'k1' }]));
    await getJwk('made-up', 'k1');
    expect(fetch).toHaveBeenCalledWith(IMS_JWKS_URL.prod);
  });

  it('returns null for a kid absent from the keyset', async () => {
    fetch.mockResolvedValue(jwksResponse([{ kid: 'k1' }]));
    expect(await getJwk('prod', 'unknown')).toBe(null);
  });

  it('reuses a cached keyset within the TTL instead of refetching', async () => {
    fetch.mockResolvedValue(jwksResponse([{ kid: 'k1' }]));
    await getJwk('prod', 'k1');
    await getJwk('prod', 'k1');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('refetches once when a kid is missing, to cover key rotation', async () => {
    fetch
      .mockResolvedValueOnce(jwksResponse([{ kid: 'k1' }]))
      .mockResolvedValueOnce(jwksResponse([{ kid: 'k1' }, { kid: 'k2' }]));
    await getJwk('prod', 'k1');
    expect(await getJwk('prod', 'k2')).toEqual({ kid: 'k2' });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('does not refetch a second time when the kid is still missing after one refetch', async () => {
    fetch.mockResolvedValue(jwksResponse([{ kid: 'k1' }]));
    expect(await getJwk('prod', 'unknown')).toBe(null);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('refetches after the TTL expires', async () => {
    vi.useFakeTimers();
    fetch.mockImplementation(async () => jwksResponse([{ kid: 'k1' }]));
    await getJwk('prod', 'k1');
    vi.advanceTimersByTime(60 * 60 * 1000 + 1);
    await getJwk('prod', 'k1');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('refetches when the env changes, even within the TTL', async () => {
    fetch.mockImplementation(async () => jwksResponse([{ kid: 'k1' }]));
    await getJwk('prod', 'k1');
    await getJwk('dev', 'k1');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('throws rather than caching a failed JWKS request', async () => {
    fetch.mockResolvedValue(jwksResponse([], 500));
    await expect(getJwk('prod', 'k1')).rejects.toThrow();
    fetch.mockResolvedValue(jwksResponse([{ kid: 'k1' }]));
    expect(await getJwk('prod', 'k1')).toEqual({ kid: 'k1' });
  });
});
