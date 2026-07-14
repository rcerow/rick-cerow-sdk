import { ApiResponseError } from '../errors.js';
import type { HttpClient } from '../http-client.js';
import type { ApiListResponse, ListOptions, ListResult, PaginationOptions } from '../types.js';
import { serializeFilters } from '../filter.js';

// Shared constant so numberFields() doesn't allocate a new Set per call.
const EMPTY_FIELDS: ReadonlySet<string> = new Set();

function validatePagination({ limit, page, offset }: PaginationOptions): void {
  if (limit !== undefined && (!Number.isInteger(limit) || limit <= 0)) {
    throw new TypeError(`pagination.limit must be a positive integer, got ${limit}`);
  }
  if (page !== undefined && (!Number.isInteger(page) || page <= 0)) {
    throw new TypeError(`pagination.page must be a positive integer, got ${page}`);
  }
  if (offset !== undefined && (!Number.isInteger(offset) || offset < 0)) {
    throw new TypeError(`pagination.offset must be a non-negative integer, got ${offset}`);
  }
}

function toListResult<T>(raw: ApiListResponse<T>): ListResult<T> {
  if (
    !raw ||
    !Array.isArray(raw.docs) ||
    typeof raw.total !== 'number' ||
    typeof raw.page !== 'number' ||
    typeof raw.pages !== 'number'
  ) {
    throw new ApiResponseError(200, new Error('Malformed list response: missing required pagination fields'));
  }
  return {
    items: raw.docs,
    total: raw.total,
    limit: raw.limit,
    offset: raw.offset,
    page: raw.page,
    pages: raw.pages,
    hasNextPage: raw.page < raw.pages,
    hasPrevPage: raw.page > 1,
  };
}

/**
 * Base class for all resource types.
 *
 * Subclasses declare which fields are numeric (to pick the right serializer)
 * and inherit `encodeId`, `buildQuery`, and `listItems` helpers.
 */
export abstract class BaseResource {
  constructor(protected readonly client: HttpClient) {}

  /**
   * Override to declare which filter fields accept numeric operators
   * (gt, gte, lt, lte, etc.). All other fields are treated as strings.
   */
  protected numberFields(): ReadonlySet<string> {
    return EMPTY_FIELDS;
  }

  /**
   * Normalises and URL-encodes a resource ID.
   *
   * @throws {TypeError} when `id` is blank after trimming.
   */
  protected encodeId(id: string, label: string): string {
    const normalized = id.trim();
    if (!normalized) throw new TypeError(`${label} must be a non-empty string`);
    return encodeURIComponent(normalized);
  }

  /**
   * Converts a `ListOptions` object into raw query-string segments.
   *
   * @throws {TypeError} when pagination values are not valid positive integers.
   */
  protected buildQuery<TFilter>(
    options: ListOptions<TFilter> = {},
    numberFields?: ReadonlySet<string>,
  ): string[] {
    const parts: string[] = [];
    const fields = numberFields ?? this.numberFields();

    if (options.pagination) {
      validatePagination(options.pagination);
      const { limit, page, offset } = options.pagination;
      if (limit !== undefined) parts.push(`limit=${limit}`);
      if (page !== undefined) parts.push(`page=${page}`);
      if (offset !== undefined) parts.push(`offset=${offset}`);
    }

    if (options.sort) {
      const { by, order = 'asc' } = options.sort;
      parts.push(`sort=${encodeURIComponent(by)}:${order}`);
    }

    if (options.filter) {
      const filterParts = serializeFilters(
        options.filter as Record<string, unknown>,
        fields,
      );
      parts.push(...filterParts);
    }

    return parts;
  }

  protected async listItems<T, TFilter = Record<string, unknown>>(
    path: string,
    options: ListOptions<TFilter> = {},
    numberFields?: ReadonlySet<string>,
  ): Promise<ListResult<T>> {
    const query = this.buildQuery(options, numberFields);
    const raw = await this.client.get<ApiListResponse<T>>(path, query);
    return toListResult(raw);
  }

  protected async getItem<T>(path: string): Promise<T> {
    return this.client.get<T>(path);
  }
}
