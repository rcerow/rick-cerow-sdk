/**
 * Converts typed filter objects into raw query-string segments for The One API.
 *
 * Operator characters (>, <, >=, <=, !=) and regex delimiters must appear
 * literally in the query string — percent-encoding them breaks the API's parser.
 * String values and the pattern portion of regex literals are encodeURIComponent-encoded.
 */

import type { NumberFilter, StringFilter } from './types.js';

function regexToString(r: RegExp): string {
  const s = r.toString();
  const m = /^\/(.*)\/([gimsuy]*)$/.exec(s);
  if (!m) return encodeURIComponent(s);
  const [, pattern, flags] = m;
  return `/${encodeURIComponent(pattern!)}/${flags}`;
}

function serializeStringFilter(key: string, filter: StringFilter): string {
  if (typeof filter === 'string') return `${key}=${encodeURIComponent(filter)}`;

  const f = filter as Record<string, unknown>;

  if ('exists' in f) return (f['exists'] as boolean) ? key : `!${key}`;
  if ('not' in f)    return `${key}!=${encodeURIComponent(f['not'] as string)}`;
  if ('in' in f)     return `${key}=${(f['in'] as string[]).map(encodeURIComponent).join(',')}`;
  if ('notIn' in f)  return `${key}!=${(f['notIn'] as string[]).map(encodeURIComponent).join(',')}`;
  if ('match' in f)    return `${key}=${regexToString(f['match'] as RegExp)}`;
  if ('notMatch' in f) return `${key}!=${regexToString(f['notMatch'] as RegExp)}`;

  throw new TypeError(`Unsupported filter operator for field "${key}"`);
}

function serializeNumberFilter(key: string, filter: NumberFilter): string {
  if (typeof filter === 'number') return `${key}=${filter}`;

  const f = filter as Record<string, unknown>;

  if ('not' in f)   return `${key}!=${f['not'] as number}`;
  if ('gt' in f)    return `${key}>${f['gt'] as number}`;
  if ('gte' in f)   return `${key}>=${f['gte'] as number}`;
  if ('lt' in f)    return `${key}<${f['lt'] as number}`;
  if ('lte' in f)   return `${key}<=${f['lte'] as number}`;
  if ('in' in f)    return `${key}=${(f['in'] as number[]).join(',')}`;
  if ('notIn' in f) return `${key}!=${(f['notIn'] as number[]).join(',')}`;

  throw new TypeError(`Unsupported filter operator for field "${key}"`);
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
