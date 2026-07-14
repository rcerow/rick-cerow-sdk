import { NotFoundError } from '../errors.js';
import type { ApiListResponse, ListOptions, ListResult, Quote, QuoteFilter } from '../types.js';
import { BaseResource } from './base.js';

// All quote fields (dialog, movie id, character id) are strings — no numeric fields.
const QUOTE_NUMBER_FIELDS: ReadonlySet<string> = new Set();

export class QuoteResource extends BaseResource {
  protected override numberFields(): ReadonlySet<string> {
    return QUOTE_NUMBER_FIELDS;
  }

  /** List all quotes, with optional filtering, sorting, and pagination. */
  async list(options: ListOptions<QuoteFilter> = {}): Promise<ListResult<Quote>> {
    return this.listItems<Quote, QuoteFilter>('/quote', options);
  }

  /**
   * Fetch a single quote by its ID.
   *
   * @throws {TypeError}     when `id` is blank.
   * @throws {NotFoundError} when no quote with that ID exists.
   */
  async get(id: string): Promise<Quote> {
    const encodedId = this.encodeId(id, 'Quote ID');
    const trimmedId = id.trim();

    let result: ApiListResponse<Quote>;
    try {
      result = await this.client.get<ApiListResponse<Quote>>(`/quote/${encodedId}`);
    } catch (e) {
      if (e instanceof NotFoundError) throw new NotFoundError('Quote', trimmedId, e.responseBody);
      throw e;
    }

    const quote = result.docs[0];
    if (!quote) throw new NotFoundError('Quote', trimmedId);
    return quote;
  }
}
