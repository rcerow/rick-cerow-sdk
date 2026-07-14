// ── Domain models ────────────────────────────────────────────────────────────

export interface Movie {
  _id: string;
  name: string;
  runtimeInMinutes: number;
  budgetInMillions: number;
  boxOfficeRevenueInMillions: number;
  academyAwardNominations: number;
  academyAwardWins: number;
  rottenTomatoesScore: number;
}

export interface Quote {
  _id: string;
  dialog: string;
  /** ID of the Movie this quote belongs to. */
  movie: string;
  /** ID of the Character who delivered this line. */
  character: string;
}

// ── Response shapes ──────────────────────────────────────────────────────────

/**
 * Raw paginated envelope as returned by the API.
 * Internal — not part of the public SDK surface.
 */
export interface ApiListResponse<T> {
  docs: T[];
  total: number;
  limit: number;
  offset: number;
  page: number;
  pages: number;
}

/** Paginated result returned by all list methods. */
export interface ListResult<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  page: number;
  pages: number;
  /** `true` when there is at least one more page after this one. */
  hasNextPage: boolean;
  /** `true` when this is not the first page. */
  hasPrevPage: boolean;
}

// ── Filter primitives ────────────────────────────────────────────────────────

/**
 * Filter operators for string fields.
 *
 * @example
 * // Exact match
 * { name: 'The Two Towers' }
 *
 * // Regex match (case-insensitive)
 * { name: { match: /fellowship/i } }
 *
 * // Exclude specific values
 * { name: { notIn: ['The Two Towers', 'The Return of the King'] } }
 *
 * // Check that the field is present
 * { name: { exists: true } }
 */
export type StringFilter =
  | string
  | { not: string }
  | { in: string[] }
  | { notIn: string[] }
  | { match: RegExp }
  | { notMatch: RegExp }
  | { exists: boolean };

/**
 * Filter operators for numeric fields.
 *
 * @example
 * // Exact match
 * { budgetInMillions: 94 }
 *
 * // Range
 * { budgetInMillions: { gt: 50 } }
 * { runtimeInMinutes: { lte: 180 } }
 *
 * // In list
 * { academyAwardWins: { in: [4, 11] } }
 */
export type NumberFilter =
  | number
  | { not: number }
  | { gt: number }
  | { gte: number }
  | { lt: number }
  | { lte: number }
  | { in: number[] }
  | { notIn: number[] };

// ── Resource-specific filter shapes ─────────────────────────────────────────

export interface MovieFilter {
  name?: StringFilter;
  runtimeInMinutes?: NumberFilter;
  budgetInMillions?: NumberFilter;
  boxOfficeRevenueInMillions?: NumberFilter;
  academyAwardNominations?: NumberFilter;
  academyAwardWins?: NumberFilter;
  rottenTomatoesScore?: NumberFilter;
}

export interface QuoteFilter {
  dialog?: StringFilter;
  /** Filter by one or more movie IDs. */
  movie?: StringFilter;
  /** Filter by one or more character IDs. */
  character?: StringFilter;
}

// ── Query option shapes ──────────────────────────────────────────────────────

export interface SortOptions {
  /** Field name to sort by (e.g. `"name"`, `"budgetInMillions"`). */
  by: string;
  order?: 'asc' | 'desc';
}

export interface PaginationOptions {
  limit?: number;
  page?: number;
  offset?: number;
}

export interface ListOptions<TFilter = Record<string, never>> {
  filter?: TFilter;
  sort?: SortOptions;
  pagination?: PaginationOptions;
}
