/**
 * Serializes typed filter objects into the raw query-string segments that
 * The One API expects.
 *
 * The API uses a non-standard query syntax:
 *   - Exact match:    field=value
 *   - Not equal:      field!=value
 *   - Include list:   field=a,b,c
 *   - Exclude list:   field!=a,b,c
 *   - Regex match:    field=/pattern/flags
 *   - Regex exclude:  field!=/pattern/flags
 *   - Field exists:   field          (no value)
 *   - Field absent:   !field         (no value)
 *   - Numeric range:  field>n  field>=n  field<n  field<=n
 *
 * Comparison operators and existence markers are written literally in the
 * query string (not percent-encoded) so the API can parse them correctly.
 * String values are percent-encoded to handle spaces and special characters.
 *
 * Passing an unrecognized filter shape throws a `TypeError` rather than
 * silently omitting the filter, which could produce plausible-but-wrong results.
 */

import type { NumberFilter, StringFilter } from './types.js';

// ── Internal helpers ─────────────────────────────────────────────────────────

function regexToString(r: RegExp): string {
  const s = r.toString(); // "/pattern/flags"
  // Encode the pattern portion so spaces and URL-special characters (# & =)
  // are percent-encoded, while the surrounding slashes and flags stay literal.
  const m = /^\/(.*)\/([gimsuy]*)$/.exec(s);
  if (!m) return encodeURIComponent(s);
  const [, pattern, flags] = m;
  return `/${encodeURIComponent(pattern!)}/${flags}`;
}

function serializeStringFilter(key: string, filter: StringFilter): string {
  if (typeof filter === 'string') {
    return `${key}=${encodeURIComponent(filter)}`;
  }

  const f = filter as Record<string, unknown>;

  if ('exists' in f) return (f['exists'] as boolean) ? key : `!${key}`;
  if ('not' in f) return `${key}!=${encodeURIComponent(f['not'] as string)}`;
  if ('in' in f) return `${key}=${(f['in'] as string[]).map(encodeURIComponent).join(',')}`;
  if ('notIn' in f) return `${key}!=${(f['notIn'] as string[]).map(encodeURIComponent).join(',')}`;
  if ('match' in f) return `${key}=${regexToString(f['match'] as RegExp)}`;
  if ('notMatch' in f) return `${key}!=${regexToString(f['notMatch'] as RegExp)}`;

  throw new TypeError(`Unsupported filter operator for field "${key}"`);
}

function serializeNumberFilter(key: string, filter: NumberFilter): string {
  if (typeof filter === 'number') {
    return `${key}=${filter}`;
  }

  const f = filter as Record<string, unknown>;

  if ('not' in f) return `${key}!=${f['not'] as number}`;
  if ('gt' in f) return `${key}>${f['gt'] as number}`;
  if ('gte' in f) return `${key}>=${f['gte'] as number}`;
  if ('lt' in f) return `${key}<${f['lt'] as number}`;
  if ('lte' in f) return `${key}<=${f['lte'] as number}`;
  if ('in' in f) return `${key}=${(f['in'] as number[]).join(',')}`;
  if ('notIn' in f) return `${key}!=${(f['notIn'] as number[]).join(',')}`;

  throw new TypeError(`Unsupported filter operator for field "${key}"`);
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Converts a filter descriptor object into an array of raw query-string
 * segments ready to be joined with `&`.
 *
 * @param filters      The filter object (e.g. `{ name: { match: /fellowship/i } }`)
 * @param numberFields Set of field names that require numeric operators
 * @throws {TypeError} when a field's filter value has no recognized operator
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
