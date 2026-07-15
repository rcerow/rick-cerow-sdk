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
  movie: string;     // movie _id
  character: string; // character _id
}

/**
 * Upstream pagination envelope returned by the API.
 * Used internally by resource implementations; not re-exported from the package entry point.
 */
export interface ApiListResponse<T> {
  docs: T[];
  total: number;
  limit: number;
  offset?: number;
  page: number;
  pages: number;
}

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

/**
 * Filter operators for string fields.
 * Example: `{ match: /fellowship/i }`, `{ in: ['A', 'B'] }`, `{ exists: true }`
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
 * Example: `{ gt: 90 }`, `{ lte: 180 }`, `{ in: [4, 11] }`
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
  movie?: StringFilter;
  character?: StringFilter;
}

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
