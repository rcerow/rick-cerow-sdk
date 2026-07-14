import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LotrClient } from '../src/index.js';
import { NotFoundError } from '../src/errors.js';
import type { Quote } from '../src/types.js';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const GANDALF_QUOTE: Quote = {
  _id: '5cd96e05de30eff6ebcce7e9',
  dialog: 'You shall not pass!',
  movie: '5cd95395de30eff6ebccde5b',
  character: '5cd99d4bde30eff6ebccfe9e',
};

const FRODO_QUOTE: Quote = {
  _id: '5cd96e05de30eff6ebcce800',
  dialog: 'I will take the Ring, though I do not know the way.',
  movie: '5cd95395de30eff6ebccde5b',
  character: '5cd99d4bde30eff6ebccfbe6',
};

function listResponse<T>(docs: T[]) {
  return { docs, total: docs.length, limit: 1000, offset: 0, page: 1, pages: 1 };
}

// ── Setup ────────────────────────────────────────────────────────────────────

const fetchSpy = vi.fn();

function mockOk(body: unknown) {
  fetchSpy.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

function mockError(status: number) {
  fetchSpy.mockResolvedValueOnce({
    ok: false,
    status,
    json: () => Promise.reject(new Error('not json')),
    text: () => Promise.resolve(''),
  });
}

let client: LotrClient;

beforeEach(() => {
  vi.stubGlobal('fetch', fetchSpy);
  client = new LotrClient({ apiKey: 'test-key', baseUrl: 'https://api.test/v2' });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── quotes.list — response field mapping ─────────────────────────────────────

describe('quotes.list() — response field mapping', () => {
  it('maps all Quote fields from the upstream response', async () => {
    mockOk(listResponse([GANDALF_QUOTE]));
    const result = await client.quotes.list();
    const q = result.items[0]!;
    expect(q._id).toBe(GANDALF_QUOTE._id);
    expect(q.dialog).toBe(GANDALF_QUOTE.dialog);
    expect(q.movie).toBe(GANDALF_QUOTE.movie);
    expect(q.character).toBe(GANDALF_QUOTE.character);
  });
});

// ── quotes.list ───────────────────────────────────────────────────────────────

describe('quotes.list()', () => {
  it('calls GET /quote and returns items', async () => {
    mockOk(listResponse([GANDALF_QUOTE, FRODO_QUOTE]));
    const result = await client.quotes.list();

    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toBe('https://api.test/v2/quote');
    expect(result.items).toHaveLength(2);
  });

  it('sends dialog regex filter', async () => {
    mockOk(listResponse([GANDALF_QUOTE]));
    await client.quotes.list({ filter: { dialog: { match: /not pass/i } } });

    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toContain('dialog=/not%20pass/i');
  });

  it('filters by movie ID (exact)', async () => {
    mockOk(listResponse([GANDALF_QUOTE, FRODO_QUOTE]));
    await client.quotes.list({ filter: { movie: GANDALF_QUOTE.movie } });

    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toContain(`movie=${GANDALF_QUOTE.movie}`);
  });

  it('filters by multiple movie IDs', async () => {
    mockOk(listResponse([GANDALF_QUOTE]));
    await client.quotes.list({
      filter: { movie: { in: ['5cd95395de30eff6ebccde5b', '5cd95395de30eff6ebccde5c'] } },
    });

    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toContain('movie=5cd95395de30eff6ebccde5b,5cd95395de30eff6ebccde5c');
  });

  it('filters by character ID', async () => {
    mockOk(listResponse([GANDALF_QUOTE]));
    await client.quotes.list({ filter: { character: GANDALF_QUOTE.character } });

    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toContain(`character=${GANDALF_QUOTE.character}`);
  });

  it('sends pagination params', async () => {
    mockOk(listResponse([GANDALF_QUOTE]));
    await client.quotes.list({ pagination: { limit: 25, offset: 50 } });

    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toContain('limit=25');
    expect(url).toContain('offset=50');
  });

  it('sends sort param', async () => {
    mockOk(listResponse([GANDALF_QUOTE]));
    await client.quotes.list({ sort: { by: 'dialog', order: 'asc' } });

    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toContain('sort=dialog:asc');
  });

  it('sends dialog filter (not equal)', async () => {
    mockOk(listResponse([FRODO_QUOTE]));
    await client.quotes.list({ filter: { dialog: { not: 'You shall not pass!' } } });

    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toContain('dialog!=You%20shall%20not%20pass!');
  });

  it('sends dialog filter (notMatch regex)', async () => {
    mockOk(listResponse([FRODO_QUOTE]));
    await client.quotes.list({ filter: { dialog: { notMatch: /pass/i } } });

    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toContain('dialog!=/pass/i');
  });

  it('sends dialog filter (field exists)', async () => {
    mockOk(listResponse([GANDALF_QUOTE]));
    await client.quotes.list({ filter: { dialog: { exists: true } } });

    const [url] = fetchSpy.mock.calls[0] as [string];
    const qs = url.split('?')[1] ?? '';
    expect(qs.split('&')).toContain('dialog');
  });

  it('sends character filter (not in list)', async () => {
    mockOk(listResponse([GANDALF_QUOTE]));
    await client.quotes.list({
      filter: { character: { notIn: [FRODO_QUOTE.character] } },
    });

    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toContain(`character!=${FRODO_QUOTE.character}`);
  });
});

// ── quotes.get ────────────────────────────────────────────────────────────────

describe('quotes.get()', () => {
  it('calls GET /quote/:id and returns the quote', async () => {
    mockOk(listResponse([GANDALF_QUOTE]));
    const quote = await client.quotes.get(GANDALF_QUOTE._id);

    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toBe(`https://api.test/v2/quote/${GANDALF_QUOTE._id}`);
    expect(quote).toEqual(GANDALF_QUOTE);
  });

  it('throws NotFoundError for an unknown ID (404 from API)', async () => {
    mockError(404);
    const err = await client.quotes.get('nonexistent').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(NotFoundError);
    expect((err as Error).message).toContain('"nonexistent"');
  });

  it('throws NotFoundError when docs array is empty', async () => {
    mockOk(listResponse([]));
    await expect(client.quotes.get('empty-id')).rejects.toThrow(NotFoundError);
  });

  it('URL-encodes slashes in the quote ID', async () => {
    mockOk(listResponse([GANDALF_QUOTE]));
    await client.quotes.get('id/with/slashes');

    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toContain('quote/id%2Fwith%2Fslashes');
  });

  it('throws TypeError for an empty quote ID', async () => {
    await expect(client.quotes.get('')).rejects.toThrow(TypeError);
  });

  it('throws TypeError for a whitespace-only quote ID', async () => {
    await expect(client.quotes.get('   ')).rejects.toThrow(TypeError);
  });
});
