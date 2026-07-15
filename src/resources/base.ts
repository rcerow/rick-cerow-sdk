import { ApiResponseError, NotFoundError } from '../errors.js';
import type { HttpClient } from '../http-client.js';
import type { ApiListResponse, ListOptions, ListResult, PaginationOptions } from '../types.js';
import { serializeFilters } from '../filter.js';

const EMPTY_FIELDS: ReadonlySet<string> = new Set();

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

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
    !isFiniteNumber(raw.total) ||
    !isFiniteNumber(raw.limit) ||
    (raw.offset !== undefined && !isFiniteNumber(raw.offset)) ||
    !isFiniteNumber(raw.page) ||
    !isFiniteNumber(raw.pages)
  ) {
    throw new ApiResponseError(200, new Error('Malformed list response'), 'Malformed list response: missing or non-numeric required fields');
  }
  return {
    items: raw.docs,
    total: raw.total,
    limit: raw.limit,
    offset: raw.offset ?? 0,
    page: raw.page,
    pages: raw.pages,
    hasNextPage: raw.page < raw.pages,
    hasPrevPage: raw.page > 1,
  };
}

export abstract class BaseResource {
  constructor(protected readonly client: HttpClient) {}

  protected numberFields(): ReadonlySet<string> {
    return EMPTY_FIELDS;
  }

  protected encodeId(id: string, label: string): string {
    const normalized = id.trim();
    if (!normalized) throw new TypeError(`${label} must be a non-empty string`);
    return encodeURIComponent(normalized);
  }

  protected firstItem<T>(raw: ApiListResponse<T>, resource: string, id: string): T {
    if (!raw || !Array.isArray(raw.docs)) {
      throw new ApiResponseError(200, new Error(`Malformed ${resource} response`), `Malformed ${resource} response: docs is not an array`);
    }
    const item = raw.docs[0];
    if (!item) throw new NotFoundError(resource, id);
    return item;
  }

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
      parts.push(...serializeFilters(options.filter as Record<string, unknown>, fields));
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
}
