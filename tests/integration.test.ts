// Integration tests against the live API. Skipped when LOTR_API_KEY is not set.
// Run with: LOTR_API_KEY=your-key npm test
import { beforeAll, describe, expect, it } from 'vitest';
import { LotrClient, NotFoundError } from '../src/index.js';

const apiKey = process.env['LOTR_API_KEY'];

describe.skipIf(!apiKey)('integration — live API', () => {
  let client: LotrClient;

  beforeAll(() => {
    client = new LotrClient({ apiKey: apiKey! });
  });

  it('list() returns movies with the expected envelope shape', async () => {
    const result = await client.movies.list({ pagination: { limit: 3 } });
    expect(typeof result.total).toBe('number');
    expect(typeof result.pages).toBe('number');
    expect(typeof result.page).toBe('number');
    expect(Array.isArray(result.items)).toBe(true);
    expect(typeof result.hasNextPage).toBe('boolean');
    expect(typeof result.hasPrevPage).toBe('boolean');
    expect(result.items.length).toBeGreaterThanOrEqual(1);
    const movie = result.items[0]!;
    expect(typeof movie._id).toBe('string');
    expect(typeof movie.name).toBe('string');
    expect(typeof movie.runtimeInMinutes).toBe('number');
  }, 15_000);

  it('get() returns a known movie by its documented ID', async () => {
    const id = '5cd95395de30eff6ebccde5b'; // The Two Towers
    const movie = await client.movies.get(id);
    expect(movie._id).toBe(id);
    expect(typeof movie.name).toBe('string');
    expect(movie.name.length).toBeGreaterThan(0);
  }, 15_000);

  it('listQuotes() returns quotes for the known movie', async () => {
    const movieId = '5cd95395de30eff6ebccde5b';
    const result = await client.movies.listQuotes(movieId, {
      pagination: { limit: 5 },
    });
    expect(result.items.length).toBeGreaterThanOrEqual(1);
    const quote = result.items[0]!;
    expect(quote.movie).toBe(movieId);
    expect(typeof quote.dialog).toBe('string');
  }, 15_000);

  it('numeric filter (budgetInMillions >= 90) is applied by the API', async () => {
    const result = await client.movies.list({
      filter: { budgetInMillions: { gte: 90 } },
    });
    for (const movie of result.items) {
      expect(movie.budgetInMillions).toBeGreaterThanOrEqual(90);
    }
  }, 15_000);

  it('string filter (name regex) is applied by the API', async () => {
    const result = await client.movies.list({
      filter: { name: { match: /tower/i } },
    });
    expect(result.items.length).toBeGreaterThanOrEqual(1);
    for (const movie of result.items) {
      expect(movie.name.toLowerCase()).toContain('tower');
    }
  }, 15_000);

  it('get() throws NotFoundError for a nonexistent ID', async () => {
    await expect(
      client.movies.get('000000000000000000000000'),
    ).rejects.toThrow(NotFoundError);
  }, 15_000);

  it('pagination fields are self-consistent', async () => {
    const page1 = await client.movies.list({ pagination: { limit: 1, page: 1 } });
    expect(page1.page).toBe(1);
    expect(page1.limit).toBe(1);
    if (page1.total > 1) {
      expect(page1.hasNextPage).toBe(true);
    }
    expect(page1.hasPrevPage).toBe(false);
  }, 15_000);
});
