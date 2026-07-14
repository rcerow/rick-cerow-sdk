import type { HttpClient } from './http-client.js';
import { FetchClient } from './client.js';
import { MovieResource } from './resources/movies.js';
import { QuoteResource } from './resources/quotes.js';

export type { HttpClient } from './http-client.js';
export {
  ApiResponseError,
  AuthenticationError,
  LotrError,
  NetworkError,
  NotFoundError,
  RateLimitError,
} from './errors.js';
export type {
  ListOptions,
  ListResult,
  Movie,
  MovieFilter,
  NumberFilter,
  PaginationOptions,
  Quote,
  QuoteFilter,
  SortOptions,
  StringFilter,
} from './types.js';

/**
 * Configuration for `LotrClient`. Two mutually exclusive forms:
 *
 * **Standard** — supply `apiKey` (and optionally `baseUrl`). The client
 * creates a `FetchClient` internally.
 *
 * **Custom transport** — supply your own `HttpClient` implementation.
 * It manages its own auth and transport; `apiKey` and `baseUrl` must be
 * omitted. Useful for testing or non-standard auth schemes.
 */
export type ClientConfig =
  | { apiKey: string; baseUrl?: string; httpClient?: never }
  | { httpClient: HttpClient; apiKey?: never; baseUrl?: never };

/**
 * Entry point for the Lord of the Rings SDK.
 *
 * @example Default usage
 * ```ts
 * import { LotrClient } from 'lotr-sdk';
 *
 * const client = new LotrClient({ apiKey: process.env.LOTR_API_KEY! });
 *
 * const movies = await client.movies.list();
 * const fellowship = await client.movies.get('5cd95395de30eff6ebccde5b');
 * const quotes = await client.movies.listQuotes(fellowship._id, {
 *   filter: { dialog: { match: /you shall not pass/i } },
 * });
 * ```
 *
 * @example Custom transport (e.g. in tests)
 * ```ts
 * const mockHttp: HttpClient = { get: vi.fn().mockResolvedValue({ docs: [] }) };
 * const client = new LotrClient({ httpClient: mockHttp });
 * ```
 */
export class LotrClient {
  /** Access movie endpoints: `list`, `get`, `listQuotes`. */
  readonly movies: MovieResource;

  /** Access quote endpoints: `list`, `get`. */
  readonly quotes: QuoteResource;

  constructor(config: ClientConfig) {
    let http: HttpClient;
    if (config.httpClient) {
      http = config.httpClient;
    } else {
      http = new FetchClient({ apiKey: config.apiKey, baseUrl: config.baseUrl });
    }
    this.movies = new MovieResource(http);
    this.quotes = new QuoteResource(http);
  }
}
