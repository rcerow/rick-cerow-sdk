/**
 * Converts typed filter objects into raw query-string segments for The One API.
 *
 * Operator characters (>, <, >=, <=, !=) and regex delimiters must appear
 * literally in the query string — percent-encoding them breaks the API's parser.
 * String values and the pattern portion of regex literals are encodeURIComponent-encoded.
 */

import type { NumberFilter, StringFilter } from './types.js';

const STRING_OPS = ['exists', 'not', 'in', 'notIn', 'match', 'notMatch'] as const;
const NUMBER_OPS = ['not', 'gt', 'gte', 'lt', 'lte', 'in', 'notIn'] as const;

function regexToString(r: RegExp): string {
  const s = r.toString();
  const m = /^\/(.*)\/([gimsuy]*)$/.exec(s);
  if (!m) return encodeURIComponent(s);
  const [, pattern, flags] = m;
  return `/${encodeURIComponent(pattern!)}/${flags}`;
}

function requireSingleOp(key: string, f: Record<string, unknown>, ops: readonly string[]): string {
  const found = ops.filter(op => op in f);
  if (found.length === 0) throw new TypeError(`Unsupported filter operator for field "${key}"`);
  if (found.length > 1) {
    throw new TypeError(
      `Filter for field "${key}" must contain exactly one operator, got: ${found.join(', ')}`,
    );
  }
  return found[0]!;
}

function serializeStringFilter(key: string, filter: StringFilter): string {
  if (typeof filter === 'string') return `${key}=${encodeURIComponent(filter)}`;

  const f = filter as Record<string, unknown>;
  const op = requireSingleOp(key, f, STRING_OPS);

  if (op === 'exists') return (f['exists'] as boolean) ? key : `!${key}`;
  if (op === 'not')    return `${key}!=${encodeURIComponent(f['not'] as string)}`;
  if (op === 'match')    return `${key}=${regexToString(f['match'] as RegExp)}`;
  if (op === 'notMatch') return `${key}!=${regexToString(f['notMatch'] as RegExp)}`;

  const arr = f[op] as string[];
  if (arr.length === 0) throw new TypeError(`Filter "${key}.${op}" must not be empty`);
  const encoded = arr.map(encodeURIComponent).join(',');
  return op === 'in' ? `${key}=${encoded}` : `${key}!=${encoded}`;
}

function serializeNumberFilter(key: string, filter: NumberFilter): string {
  if (typeof filter === 'number') return `${key}=${filter}`;

  const f = filter as Record<string, unknown>;
  const op = requireSingleOp(key, f, NUMBER_OPS);

  if (op === 'not') return `${key}!=${f['not'] as number}`;
  if (op === 'gt')  return `${key}>${f['gt'] as number}`;
  if (op === 'gte') return `${key}>=${f['gte'] as number}`;
  if (op === 'lt')  return `${key}<${f['lt'] as number}`;
  if (op === 'lte') return `${key}<=${f['lte'] as number}`;

  const arr = f[op] as number[];
  if (arr.length === 0) throw new TypeError(`Filter "${key}.${op}" must not be empty`);
  const joined = arr.join(',');
  return op === 'in' ? `${key}=${joined}` : `${key}!=${joined}`;
}

/**
 * @param filters      Filter descriptor (e.g. `{ name: { match: /fellowship/i } }`)
 * @param numberFields Fields that use numeric operators; all others use string operators
 * @throws {TypeError} when a field's value matches no known operator
 */
export function serializeFilters(
  filters: Record<string, unknown>,
  numberFields: ReadonlySet<string>,
): string[] {
  const parts: string[] = [];

  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null) continue;

    const segment = numberFields.has(key)
      ? serializeNumberFilter(key, value as NumberFilter)
      : serializeStringFilter(key, value as StringFilter);

    parts.push(segment);
  }

  return parts;
}
