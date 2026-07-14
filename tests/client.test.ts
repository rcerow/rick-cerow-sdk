import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FetchClient } from '../src/client.js';
import {
  ApiResponseError,
  AuthenticationError,
  LotrError,
  NetworkError,
  NotFoundError,
  RateLimitError,
} from '../src/errors.js';
import { LotrClient } from '../src/index.js';
import type { HttpClient } from '../src/index.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function mockFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('FetchClient', () => {
  const fetchSpy = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sets Authorization header on every request', async () => {
    fetchSpy.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

    const client = new FetchClient({ apiKey: 'my-key' });
    await client.get('/movie');

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer my-key' }),
      }),
    );
  });

  it('constructs the URL from baseUrl + path', async () => {
    fetchSpy.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

    const client = new FetchClient({ apiKey: 'k', baseUrl: 'https://example.com/v2' });
    await client.get('/movie');

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://example.com/v2/movie',
      expect.any(Object),
    );
  });

  it('appends query parts as a query string', async () => {
    fetchSpy.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

    const client = new FetchClient({ apiKey: 'k' });
    await client.get('/movie', ['limit=10', 'name=/lord/i']);

    const [url] = fetchSpy.mock.calls[0] as [string, ...unknown[]];
    expect(url).toContain('?limit=10&name=/lord/i');
  });

  it('omits "?" when there are no query parts', async () => {
    fetchSpy.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

    const client = new FetchClient({ apiKey: 'k' });
    await client.get('/movie');

    const [url] = fetchSpy.mock.calls[0] as [string, ...unknown[]];
    expect(url).not.toContain('?');
  });

  it('normalises a trailing slash in the baseUrl', async () => {
    fetchSpy.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

    const client = new FetchClient({ apiKey: 'k', baseUrl: 'https://example.com/v2/' });
    await client.get('/movie');

    const [url] = fetchSpy.mock.calls[0] as [string, ...unknown[]];
    expect(url).toBe('https://example.com/v2/movie');
  });

  it('throws AuthenticationError on 401', async () => {
    vi.stubGlobal('fetch', mockFetch(401, 'Unauthorized'));
    const client = new FetchClient({ apiKey: 'bad-key' });

    await expect(client.get('/movie')).rejects.toThrow(AuthenticationError);
  });

  it('throws NotFoundError on 404', async () => {
    vi.stubGlobal('fetch', mockFetch(404, 'Not Found'));
    const client = new FetchClient({ apiKey: 'k' });

    await expect(client.get('/movie/bad-id')).rejects.toThrow(NotFoundError);
  });

  it('throws LotrError with the HTTP status for other errors', async () => {
    vi.stubGlobal('fetch', mockFetch(503, 'Service Unavailable'));
    const client = new FetchClient({ apiKey: 'k' });

    const err = await client.get('/movie').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(LotrError);
    expect((err as LotrError).statusCode).toBe(503);
  });

  it('throws RateLimitError on 429', async () => {
    vi.stubGlobal('fetch', mockFetch(429, 'Too Many Requests'));
    const client = new FetchClient({ apiKey: 'k' });

    await expect(client.get('/movie')).rejects.toThrow(RateLimitError);
  });

  it('throws NetworkError when fetch itself throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const client = new FetchClient({ apiKey: 'k' });

    const err = await client.get('/movie').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(NetworkError);
    expect((err as NetworkError).cause).toBeInstanceOf(TypeError);
  });

  it('throws ApiResponseError when the response body is not valid JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.reject(new SyntaxError('Unexpected token')),
      text: () => Promise.resolve('<!DOCTYPE html>'),
    }));
    const client = new FetchClient({ apiKey: 'k' });

    const err = await client.get('/movie').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiResponseError);
    expect((err as ApiResponseError).statusCode).toBe(200);
    expect((err as ApiResponseError).cause).toBeInstanceOf(SyntaxError);
  });

  it('returns parsed JSON on success', async () => {
    const payload = { docs: [], total: 0, limit: 1000, offset: 0, page: 1, pages: 0 };
    vi.stubGlobal('fetch', mockFetch(200, payload));

    const client = new FetchClient({ apiKey: 'k' });
    const result = await client.get('/movie');

    expect(result).toEqual(payload);
  });

  // ── Configuration ─────────────────────────────────────────────────────────

  describe('configuration', () => {
    it('uses the default base URL when none is supplied', async () => {
      fetchSpy.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
      const client = new FetchClient({ apiKey: 'k' });
      await client.get('/movie');
      const [url] = fetchSpy.mock.calls[0] as [string, ...unknown[]];
      expect(url).toMatch(/^https:\/\/the-one-api\.dev\/v2\//);
    });

    it('throws TypeError for an empty API key', () => {
      expect(() => new FetchClient({ apiKey: '' })).toThrow(TypeError);
    });

    it('throws TypeError for a whitespace-only API key', () => {
      expect(() => new FetchClient({ apiKey: '   ' })).toThrow(TypeError);
    });

    it('does not include the API key in AuthenticationError messages', async () => {
      vi.stubGlobal('fetch', mockFetch(401, 'Unauthorized'));
      const client = new FetchClient({ apiKey: 'super-secret-key' });
      const err = await client.get('/movie').catch((e: unknown) => e);
      expect((err as Error).message).not.toContain('super-secret-key');
    });

    it('does not include the API key in NetworkError messages', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
      const client = new FetchClient({ apiKey: 'super-secret-key' });
      const err = await client.get('/movie').catch((e: unknown) => e);
      expect((err as Error).message).not.toContain('super-secret-key');
    });
  });

  // ── Error contract ────────────────────────────────────────────────────────

  describe('error contract', () => {
    it('passes the API response body through AuthenticationError', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false, status: 401,
        json: () => Promise.reject(new Error()),
        text: () => Promise.resolve('Unauthorized: token rejected'),
      }));
      const client = new FetchClient({ apiKey: 'k' });
      const err = await client.get('/movie').catch((e: unknown) => e);
      expect(err).toBeInstanceOf(AuthenticationError);
      expect((err as AuthenticationError).responseBody).toBe('Unauthorized: token rejected');
    });

    it('passes the API response body through NotFoundError', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false, status: 404,
        json: () => Promise.reject(new Error()),
        text: () => Promise.resolve('No document with that ID'),
      }));
      const client = new FetchClient({ apiKey: 'k' });
      const err = await client.get('/movie/x').catch((e: unknown) => e);
      expect(err).toBeInstanceOf(NotFoundError);
      expect((err as NotFoundError).responseBody).toBe('No document with that ID');
    });

    it('passes the API response body through RateLimitError', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false, status: 429,
        json: () => Promise.reject(new Error()),
        text: () => Promise.resolve('Rate limit exceeded'),
      }));
      const client = new FetchClient({ apiKey: 'k' });
      const err = await client.get('/movie').catch((e: unknown) => e);
      expect(err).toBeInstanceOf(RateLimitError);
      expect((err as RateLimitError).responseBody).toBe('Rate limit exceeded');
    });

    it('falls back to "HTTP <status>" when response.text() rejects', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false, status: 503,
        json: () => Promise.reject(new Error()),
        text: () => Promise.reject(new Error('body read failed')),
      }));
      const client = new FetchClient({ apiKey: 'k' });
      const err = await client.get('/movie').catch((e: unknown) => e);
      expect(err).toBeInstanceOf(LotrError);
      expect((err as LotrError).statusCode).toBe(503);
      expect((err as LotrError).message).toBe('HTTP 503');
    });
  });
});

// ── LotrClient ────────────────────────────────────────────────────────────────

describe('LotrClient', () => {
  const fetchSpy = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws TypeError for an empty API key', () => {
    expect(() => new LotrClient({ apiKey: '' })).toThrow(TypeError);
  });

  it('throws TypeError for a whitespace-only API key', () => {
    expect(() => new LotrClient({ apiKey: '   ' })).toThrow(TypeError);
  });

  it('accepts a custom HttpClient without requiring an API key', () => {
    const mockHttp: HttpClient = { get: vi.fn() };
    expect(() => new LotrClient({ httpClient: mockHttp })).not.toThrow();
  });

  it('routes both movies and quotes through the same injected HttpClient', async () => {
    const emptyList = { docs: [], total: 0, limit: 1000, offset: 0, page: 1, pages: 1 };
    const mockHttp: HttpClient = {
      get: vi.fn().mockResolvedValue(emptyList),
    };
    const client = new LotrClient({ httpClient: mockHttp });
    await client.movies.list();
    await client.quotes.list();
    expect(mockHttp.get).toHaveBeenCalledTimes(2);
    const calls = (mockHttp.get as ReturnType<typeof vi.fn>).mock.calls as [string][];
    expect(calls[0]![0]).toBe('/movie');
    expect(calls[1]![0]).toBe('/quote');
  });

  it('propagates errors from the injected client unchanged', async () => {
    const transportError = new Error('connection refused');
    const mockHttp: HttpClient = {
      get: vi.fn().mockRejectedValue(transportError),
    };
    const client = new LotrClient({ httpClient: mockHttp });
    const err = await client.movies.list().catch((e: unknown) => e);
    expect(err).toBe(transportError);
  });
});
