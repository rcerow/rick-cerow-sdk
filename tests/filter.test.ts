import { describe, expect, it } from 'vitest';
import { serializeFilters } from '../src/filter.js';

const NO_NUMBER_FIELDS = new Set<string>();
const NUMBER_FIELDS = new Set(['budget', 'runtime', 'wins']);

describe('serializeFilters — string fields', () => {
  it('exact match', () => {
    const result = serializeFilters({ name: 'The Two Towers' }, NO_NUMBER_FIELDS);
    expect(result).toEqual(['name=The%20Two%20Towers']);
  });

  it('not equal', () => {
    const result = serializeFilters({ name: { not: 'The Two Towers' } }, NO_NUMBER_FIELDS);
    expect(result).toEqual(['name!=The%20Two%20Towers']);
  });

  it('in list', () => {
    const result = serializeFilters(
      { name: { in: ['Fellowship', 'Two Towers'] } },
      NO_NUMBER_FIELDS,
    );
    expect(result).toEqual(['name=Fellowship,Two%20Towers']);
  });

  it('not in list', () => {
    const result = serializeFilters(
      { name: { notIn: ['Fellowship', 'Two Towers'] } },
      NO_NUMBER_FIELDS,
    );
    expect(result).toEqual(['name!=Fellowship,Two%20Towers']);
  });

  it('regex match via RegExp', () => {
    const result = serializeFilters({ name: { match: /fellowship/i } }, NO_NUMBER_FIELDS);
    expect(result).toEqual(['name=/fellowship/i']);
  });

  it('regex not-match', () => {
    const result = serializeFilters({ name: { notMatch: /hobbit/i } }, NO_NUMBER_FIELDS);
    expect(result).toEqual(['name!=/hobbit/i']);
  });

  it('exists: true', () => {
    const result = serializeFilters({ name: { exists: true } }, NO_NUMBER_FIELDS);
    expect(result).toEqual(['name']);
  });

  it('exists: false (absence check)', () => {
    const result = serializeFilters({ name: { exists: false } }, NO_NUMBER_FIELDS);
    expect(result).toEqual(['!name']);
  });
});

describe('serializeFilters — number fields', () => {
  it('exact match', () => {
    const result = serializeFilters({ budget: 94 }, NUMBER_FIELDS);
    expect(result).toEqual(['budget=94']);
  });

  it('not equal', () => {
    const result = serializeFilters({ budget: { not: 94 } }, NUMBER_FIELDS);
    expect(result).toEqual(['budget!=94']);
  });

  it('greater than', () => {
    const result = serializeFilters({ budget: { gt: 100 } }, NUMBER_FIELDS);
    expect(result).toEqual(['budget>100']);
  });

  it('greater than or equal', () => {
    const result = serializeFilters({ budget: { gte: 100 } }, NUMBER_FIELDS);
    expect(result).toEqual(['budget>=100']);
  });

  it('less than', () => {
    const result = serializeFilters({ budget: { lt: 50 } }, NUMBER_FIELDS);
    expect(result).toEqual(['budget<50']);
  });

  it('less than or equal', () => {
    const result = serializeFilters({ budget: { lte: 180 } }, NUMBER_FIELDS);
    expect(result).toEqual(['budget<=180']);
  });

  it('in list', () => {
    const result = serializeFilters({ wins: { in: [4, 11] } }, NUMBER_FIELDS);
    expect(result).toEqual(['wins=4,11']);
  });

  it('not in list', () => {
    const result = serializeFilters({ wins: { notIn: [0, 1] } }, NUMBER_FIELDS);
    expect(result).toEqual(['wins!=0,1']);
  });
});

describe('serializeFilters — URL encoding edge cases', () => {
  it('encodes ampersand in string values', () => {
    const result = serializeFilters({ name: 'Tom & Jerry' }, NO_NUMBER_FIELDS);
    expect(result).toEqual(['name=Tom%20%26%20Jerry']);
  });

  it('encodes equals sign in string values', () => {
    const result = serializeFilters({ name: 'a=b' }, NO_NUMBER_FIELDS);
    expect(result).toEqual(['name=a%3Db']);
  });

  it('encodes hash in string values', () => {
    const result = serializeFilters({ name: 'plan#9' }, NO_NUMBER_FIELDS);
    expect(result).toEqual(['name=plan%239']);
  });

  it('serializes a regex with no flags', () => {
    const result = serializeFilters({ name: { match: /fellowship/ } }, NO_NUMBER_FIELDS);
    expect(result).toEqual(['name=/fellowship/']);
  });

  it('serializes a regex with multiple flags', () => {
    const result = serializeFilters({ name: { match: /fellowship/gi } }, NO_NUMBER_FIELDS);
    expect(result).toEqual(['name=/fellowship/gi']);
  });

  it('encodes spaces and special chars inside a regex pattern', () => {
    const result = serializeFilters({ name: { match: /lord & rings/i } }, NO_NUMBER_FIELDS);
    expect(result).toEqual(['name=/lord%20%26%20rings/i']);
  });

  it('encodes equals sign inside a notMatch regex pattern', () => {
    const result = serializeFilters({ name: { notMatch: /score=100/i } }, NO_NUMBER_FIELDS);
    expect(result).toEqual(['name!=/score%3D100/i']);
  });
});

describe('serializeFilters — invalid filter combinations', () => {
  it('throws TypeError for a numeric operator applied to a string field', () => {
    // { gt: 50 } has no branch in serializeStringFilter — throws rather than
    // silently omitting, since silent omission produces plausible-but-wrong results
    expect(() =>
      serializeFilters({ name: { gt: 50 } as unknown as string }, NO_NUMBER_FIELDS),
    ).toThrow(TypeError);
  });

  it('throws TypeError for a string operator applied to a number field', () => {
    // { match: /foo/ } has no branch in serializeNumberFilter
    expect(() =>
      serializeFilters({ budget: { match: /foo/ } as unknown as number }, NUMBER_FIELDS),
    ).toThrow(TypeError);
  });

  it('throws TypeError for an unrecognised filter shape (empty object)', () => {
    expect(() =>
      serializeFilters({ name: {} as unknown as string }, NO_NUMBER_FIELDS),
    ).toThrow(TypeError);
  });

  it('TypeError message names the offending field', () => {
    expect(() =>
      serializeFilters({ runtimeInMinutes: {} as unknown as number }, NUMBER_FIELDS),
    ).toThrow(/runtimeInMinutes/);
  });

  it('throws TypeError for a number filter with multiple operators', () => {
    expect(() =>
      serializeFilters({ budget: { gt: 50, lt: 100 } as unknown as number }, NUMBER_FIELDS),
    ).toThrow(TypeError);
  });

  it('throws TypeError for a string filter with multiple operators', () => {
    expect(() =>
      serializeFilters({ name: { not: 'x', match: /y/ } as unknown as string }, NO_NUMBER_FIELDS),
    ).toThrow(TypeError);
  });

  it.each([
    ['string in',    { name: { in: [] } },    NO_NUMBER_FIELDS],
    ['string notIn', { name: { notIn: [] } }, NO_NUMBER_FIELDS],
    ['number in',    { budget: { in: [] } },  NUMBER_FIELDS],
    ['number notIn', { budget: { notIn: [] } }, NUMBER_FIELDS],
  ] as const)('throws TypeError for an empty %s array', (_label, filter, fields) => {
    expect(() => serializeFilters(filter as Record<string, unknown>, fields)).toThrow(TypeError);
  });
});

describe('serializeFilters — multiple fields', () => {
  it('serializes multiple filters as separate segments', () => {
    const result = serializeFilters(
      { name: { match: /lord/i }, budget: { gt: 50 } },
      NUMBER_FIELDS,
    );
    expect(result).toContain('name=/lord/i');
    expect(result).toContain('budget>50');
    expect(result).toHaveLength(2);
  });

  it('skips undefined values', () => {
    const result = serializeFilters({ name: undefined, budget: 94 }, NUMBER_FIELDS);
    expect(result).toEqual(['budget=94']);
  });

  it('skips null values', () => {
    const result = serializeFilters({ name: null, budget: 94 }, NUMBER_FIELDS);
    expect(result).toEqual(['budget=94']);
  });

  it('returns empty array for empty filter object', () => {
    expect(serializeFilters({}, NO_NUMBER_FIELDS)).toEqual([]);
  });
});
