import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LotrClient } from '../src/index.js';
import { NotFoundError } from '../src/errors.js';
import type { Movie, Quote } from '../src/types.js';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const FELLOWSHIP: Movie = {
  _id: '5cd95395de30eff6ebccde5b',
  name: 'The Fellowship of the Ring',
  runtimeInMinutes: 178,
  budgetInMillions: 93,
  boxOfficeRevenueInMillions: 871.5,
  academyAwardNominations: 13,
  academyAwardWins: 4,
  rottenTomatoesScore: 91,
};

const TWO_TOWERS: Movie = {
  _id: '5cd95395de30eff6ebccde5c',
  name: 'The Two Towers',
  runtimeInMinutes: 179,
  budgetInMillions: 94,
  boxOfficeRevenueInMillions: 926,
  academyAwardNominations: 6,
  academyAwardWins: 2,
  rottenTomatoesScore: 95,
};

const SAMPLE_QUOTE: Quote = {
  _id: '5cd96e05de30eff6ebcce7e9',
  dialog: 'You shall not pass!',
  movie: FELLOWSHIP._id,
  character: '5cd99d4bde30eff6ebccfe9e',
};

function listResponse<T>(docs: T[], overrides: Partial<Record<string, unknown>> = {}) {
  return { docs, total: docs.length, limit: 1000, offset: 0, page: 1, pages: 1, ...overrides };
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

// ── movies.list ───────────────────────────────────────────────────────────────

describe('movies.list()', () => {
  it('calls GET /movie and returns items', async () => {
    mockOk(listResponse([FELLOWSHIP, TWO_TOWERS]));
    const result = await client.movies.list();

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toBe('https://api.test/v2/movie');
    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(2);
  });

  it('computes hasNextPage and hasPrevPage from page/pages', async () => {
    mockOk({ docs: [FELLOWSHIP], total: 8, limit: 1, offset: 0, page: 3, pages: 8 });
    const result = await client.movies.list({ pagination: { page: 3, limit: 1 } });
    expect(result.hasNextPage).toBe(true);
    expect(result.hasPrevPage).toBe(true);
  });

  it('hasNextPage is false on the last page', async () => {
    mockOk(listResponse([FELLOWSHIP, TWO_TOWERS]));
    const result = await client.movies.list();
    expect(result.hasNextPage).toBe(false);
  });

  it('hasPrevPage is false on the first page', async () => {
    mockOk(listResponse([FELLOWSHIP, TWO_TOWERS]));
    const result = await client.movies.list();
    expect(result.hasPrevPage).toBe(false);
  });

  it('sends pagination params', async () => {
    mockOk(listResponse([FELLOWSHIP]));
    await client.movies.list({ pagination: { limit: 5, page: 2 } });

    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toContain('limit=5');
    expect(url).toContain('page=2');
  });

  it('sends sort param', async () => {
    mockOk(listResponse([FELLOWSHIP]));
    await client.movies.list({ sort: { by: 'name', order: 'desc' } });

    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toContain('sort=name:desc');
  });

  it('sends string filter (exact match)', async () => {
    mockOk(listResponse([FELLOWSHIP]));
    await client.movies.list({ filter: { name: 'The Fellowship of the Ring' } });

    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toContain('name=The%20Fellowship%20of%20the%20Ring');
  });

  it('sends string filter (regex)', async () => {
    mockOk(listResponse([FELLOWSHIP]));
    await client.movies.list({ filter: { name: { match: /fellowship/i } } });

    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toContain('name=/fellowship/i');
  });

  it('sends numeric filter (greater than)', async () => {
    mockOk(listResponse([TWO_TOWERS]));
    await client.movies.list({ filter: { budgetInMillions: { gt: 90 } } });

    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toContain('budgetInMillions>90');
  });

  it('sends numeric filter (less than or equal)', async () => {
    mockOk(listResponse([FELLOWSHIP]));
    await client.movies.list({ filter: { runtimeInMinutes: { lte: 178 } } });

    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toContain('runtimeInMinutes<=178');
  });

  it('sends numeric filter (in list)', async () => {
    mockOk(listResponse([FELLOWSHIP, TWO_TOWERS]));
    await client.movies.list({ filter: { academyAwardWins: { in: [2, 4] } } });

    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toContain('academyAwardWins=2,4');
  });
});

// ── movies.list — response field mapping ─────────────────────────────────────

describe('movies.list() — response field mapping', () => {
  it('maps all Movie fields from the upstream response', async () => {
    mockOk(listResponse([FELLOWSHIP]));
    const result = await client.movies.list();
    expect(result.items[0]).toEqual(FELLOWSHIP);
    // verify every field is present and correct
    const m = result.items[0]!;
    expect(m._id).toBe(FELLOWSHIP._id);
    expect(m.name).toBe(FELLOWSHIP.name);
    expect(m.runtimeInMinutes).toBe(FELLOWSHIP.runtimeInMinutes);
    expect(m.budgetInMillions).toBe(FELLOWSHIP.budgetInMillions);
    expect(m.boxOfficeRevenueInMillions).toBe(FELLOWSHIP.boxOfficeRevenueInMillions);
    expect(m.academyAwardNominations).toBe(FELLOWSHIP.academyAwardNominations);
    expect(m.academyAwardWins).toBe(FELLOWSHIP.academyAwardWins);
    expect(m.rottenTomatoesScore).toBe(FELLOWSHIP.rottenTomatoesScore);
  });
});

// ── movies.list — additional filter coverage ──────────────────────────────────

describe('movies.list() — additional filter coverage', () => {
  it('sends string filter (not equal)', async () => {
    mockOk(listResponse([FELLOWSHIP]));
    await client.movies.list({ filter: { name: { not: 'The Two Towers' } } });
    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toContain('name!=The%20Two%20Towers');
  });

  it('sends string filter (not in list)', async () => {
    mockOk(listResponse([FELLOWSHIP]));
    await client.movies.list({ filter: { name: { notIn: ['The Two Towers'] } } });
    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toContain('name!=The%20Two%20Towers');
  });

  it('sends string filter (notMatch regex)', async () => {
    mockOk(listResponse([FELLOWSHIP, TWO_TOWERS]));
    await client.movies.list({ filter: { name: { notMatch: /hobbit/i } } });
    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toContain('name!=/hobbit/i');
  });

  it('sends string filter (field exists)', async () => {
    mockOk(listResponse([FELLOWSHIP]));
    await client.movies.list({ filter: { name: { exists: true } } });
    const [url] = fetchSpy.mock.calls[0] as [string];
    // existence marker: ?name (no "=")
    const qs = url.split('?')[1] ?? '';
    expect(qs.split('&')).toContain('name');
  });

  it('sends string filter (field absent)', async () => {
    mockOk(listResponse([]));
    await client.movies.list({ filter: { name: { exists: false } } });
    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toContain('!name');
  });

  it('sends numeric filter (not equal)', async () => {
    mockOk(listResponse([TWO_TOWERS]));
    await client.movies.list({ filter: { academyAwardWins: { not: 4 } } });
    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toContain('academyAwardWins!=4');
  });

  it('sends numeric filter (gte) on academyAwardNominations', async () => {
    mockOk(listResponse([FELLOWSHIP, TWO_TOWERS]));
    await client.movies.list({ filter: { academyAwardNominations: { gte: 6 } } });
    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toContain('academyAwardNominations>=6');
  });

  it('sends numeric filter (lt) on rottenTomatoesScore', async () => {
    mockOk(listResponse([TWO_TOWERS]));
    await client.movies.list({ filter: { rottenTomatoesScore: { lt: 95 } } });
    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toContain('rottenTomatoesScore<95');
  });

  it('sends numeric filter (not in list)', async () => {
    mockOk(listResponse([FELLOWSHIP]));
    await client.movies.list({ filter: { academyAwardWins: { notIn: [0, 1, 2] } } });
    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toContain('academyAwardWins!=0,1,2');
  });

  it('defaults sort order to asc when not specified', async () => {
    mockOk(listResponse([FELLOWSHIP]));
    await client.movies.list({ sort: { by: 'name' } });
    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toContain('sort=name:asc');
  });

  it('URL-encodes spaces in the sort field name', async () => {
    mockOk(listResponse([FELLOWSHIP]));
    await client.movies.list({ sort: { by: 'box office revenue', order: 'desc' } });
    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toContain('sort=box%20office%20revenue:desc');
  });

  it('sends multiple filters together', async () => {
    mockOk(listResponse([FELLOWSHIP]));
    await client.movies.list({
      filter: { budgetInMillions: { gte: 90 }, academyAwardWins: { gte: 4 } },
    });
    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toContain('budgetInMillions>=90');
    expect(url).toContain('academyAwardWins>=4');
  });

  it('sends filter, sort, and pagination simultaneously', async () => {
    mockOk(listResponse([FELLOWSHIP]));
    await client.movies.list({
      filter: { academyAwardWins: { gt: 0 } },
      sort: { by: 'name', order: 'asc' },
      pagination: { limit: 10, page: 1 },
    });
    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toContain('limit=10');
    expect(url).toContain('page=1');
    expect(url).toContain('sort=name:asc');
    expect(url).toContain('academyAwardWins>0');
  });
});

// ── movies.get ───────────────────────────────────────────────────────────────

describe('movies.get()', () => {
  it('calls GET /movie/:id and returns the movie', async () => {
    mockOk(listResponse([FELLOWSHIP]));
    const movie = await client.movies.get(FELLOWSHIP._id);

    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toBe(`https://api.test/v2/movie/${FELLOWSHIP._id}`);
    expect(movie).toEqual(FELLOWSHIP);
  });

  it('throws NotFoundError when the API returns 404', async () => {
    mockError(404);
    const err = await client.movies.get('bad-id').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(NotFoundError);
    expect((err as Error).message).toContain('"bad-id"');
  });

  it('throws NotFoundError when docs array is empty', async () => {
    mockOk(listResponse([]));
    await expect(client.movies.get('empty-id')).rejects.toThrow(NotFoundError);
  });

  it('URL-encodes slashes in the movie ID', async () => {
    mockOk(listResponse([FELLOWSHIP]));
    await client.movies.get('id/with/slashes');
    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toContain('movie/id%2Fwith%2Fslashes');
  });

  it('throws TypeError for an empty movie ID', async () => {
    await expect(client.movies.get('')).rejects.toThrow(TypeError);
  });

  it('throws TypeError for a whitespace-only movie ID', async () => {
    await expect(client.movies.get('   ')).rejects.toThrow(TypeError);
  });
});

// ── movies.listQuotes ────────────────────────────────────────────────────────

describe('movies.listQuotes()', () => {
  it('calls GET /movie/:id/quote', async () => {
    mockOk(listResponse([SAMPLE_QUOTE]));
    const result = await client.movies.listQuotes(FELLOWSHIP._id);

    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toBe(`https://api.test/v2/movie/${FELLOWSHIP._id}/quote`);
    expect(result.items[0]).toEqual(SAMPLE_QUOTE);
  });

  it('sends dialog filter for quote search', async () => {
    mockOk(listResponse([SAMPLE_QUOTE]));
    await client.movies.listQuotes(FELLOWSHIP._id, {
      filter: { dialog: { match: /not pass/i } },
    });

    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toContain('dialog=/not%20pass/i');
  });

  it('sends pagination on sub-resource', async () => {
    mockOk(listResponse([SAMPLE_QUOTE]));
    await client.movies.listQuotes(FELLOWSHIP._id, { pagination: { limit: 20 } });

    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toContain('limit=20');
  });

  it('sends sort param for quotes', async () => {
    mockOk(listResponse([SAMPLE_QUOTE]));
    await client.movies.listQuotes(FELLOWSHIP._id, { sort: { by: 'dialog', order: 'asc' } });

    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toContain('sort=dialog:asc');
  });

  it('combines dialog filter and pagination', async () => {
    mockOk(listResponse([SAMPLE_QUOTE]));
    await client.movies.listQuotes(FELLOWSHIP._id, {
      filter: { dialog: { match: /pass/i } },
      pagination: { limit: 10 },
    });

    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toContain('dialog=/pass/i');
    expect(url).toContain('limit=10');
  });

  it('URL-encodes slashes in the movie ID', async () => {
    mockOk(listResponse([SAMPLE_QUOTE]));
    await client.movies.listQuotes('id/with/slashes');

    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toContain('movie/id%2Fwith%2Fslashes/quote');
  });

  it('throws TypeError for an empty movieId', async () => {
    await expect(client.movies.listQuotes('')).rejects.toThrow(TypeError);
  });

  it('throws TypeError for a whitespace-only movieId', async () => {
    await expect(client.movies.listQuotes('   ')).rejects.toThrow(TypeError);
  });
});

// ── movies.list — pagination validation ──────────────────────────────────────

describe('movies.list() — pagination validation', () => {
  it('throws TypeError for a non-integer limit', async () => {
    await expect(client.movies.list({ pagination: { limit: 2.5 } })).rejects.toThrow(TypeError);
  });

  it('throws TypeError for a zero limit', async () => {
    await expect(client.movies.list({ pagination: { limit: 0 } })).rejects.toThrow(TypeError);
  });

  it('throws TypeError for a negative limit', async () => {
    await expect(client.movies.list({ pagination: { limit: -1 } })).rejects.toThrow(TypeError);
  });

  it('throws TypeError for a zero page', async () => {
    await expect(client.movies.list({ pagination: { page: 0 } })).rejects.toThrow(TypeError);
  });

  it('throws TypeError for a negative offset', async () => {
    await expect(client.movies.list({ pagination: { offset: -1 } })).rejects.toThrow(TypeError);
  });

  it('throws TypeError for a fractional offset', async () => {
    await expect(client.movies.list({ pagination: { offset: 1.5 } })).rejects.toThrow(TypeError);
  });

  it('accepts offset of zero', async () => {
    mockOk(listResponse([FELLOWSHIP]));
    await expect(client.movies.list({ pagination: { offset: 0 } })).resolves.toBeDefined();
  });
});
