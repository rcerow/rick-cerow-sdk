import type { HttpClient } from '../http-client.js';
import type { ApiListResponse, ListOptions, ListResult } from '../types.js';
import { serializeFilters } from '../filter.js';

function toListResult<T>(raw: ApiListResponse<T>): ListResult<T> {
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
 * and inherit `buildQuery` / `listItems` / `getItem` helpers.
 *
 * Adding a new endpoint means extending this class and overriding
 * `numberFields` to declare any numeric filterable fields.
 */
export abstract class BaseResource {
  constructor(protected readonly client: HttpClient) {}

  /**
   * Override to declare which filter fields accept numeric operators
   * (gt, gte, lt, lte, etc.).  All other fields are treated as strings.
   */
  protected numberFields(): ReadonlySet<string> {
    return new Set();
  }

  /**
   * Converts a `ListOptions` object into raw query-string segments.
   *
   * @param options       Pagination, sort, and filter options.
   * @param numberFields  Optional override for which fields are numeric.
   *                      Defaults to `this.numberFields()`.
   */
  protected buildQuery<TFilter extends Record<string, unknown>>(
    options: ListOptions<TFilter> = {},
    numberFields?: ReadonlySet<string>,
  ): string[] {
    const parts: string[] = [];
    const fields = numberFields ?? this.numberFields();

    const { limit, page, offset } = options.pagination ?? {};
    if (limit !== undefined) parts.push(`limit=${limit}`);
    if (page !== undefined) parts.push(`page=${page}`);
    if (offset !== undefined) parts.push(`offset=${offset}`);

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

  protected async listItems<T>(
    path: string,
    options: ListOptions<Record<string, unknown>> = {},
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
