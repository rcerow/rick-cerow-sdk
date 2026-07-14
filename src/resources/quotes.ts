import { NotFoundError } from '../errors.js';
import type { ApiListResponse, ListOptions, ListResult, Quote, QuoteFilter } from '../types.js';
import { BaseResource } from './base.js';

// All quote fields (dialog, movie, character) are strings — no numeric fields.
const QUOTE_NUMBER_FIELDS: ReadonlySet<string> = new Set();

export class QuoteResource extends BaseResource {
  protected override numberFields(): ReadonlySet<string> {
    return QUOTE_NUMBER_FIELDS;
  }

  /** List all quotes, with optional filtering, sorting, and pagination. */
  async list(options: ListOptions<QuoteFilter> = {}): Promise<ListResult<Quote>> {
    return this.listItems<Quote>(
      '/quote',
      options as ListOptions<Record<string, unknown>>,
    );
  }

  /**
   * Fetch a single quote by its ID.
   *
   * @throws {NotFoundError} when no quote with that ID exists.
   */
  async get(id: string): Promise<Quote> {
    let result: ApiListResponse<Quote>;
    try {
      result = await this.client.get<ApiListResponse<Quote>>(`/quote/${encodeURIComponent(id)}`);
    } catch (e) {
      if (e instanceof NotFoundError) throw new NotFoundError('Quote', id);
      throw e;
    }

    const quote = result.docs[0];
    if (!quote) throw new NotFoundError('Quote', id);
    return quote;
  }
}
