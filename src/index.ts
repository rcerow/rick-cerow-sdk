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
 * Configuration for `LotrClient`.
 *
 * In the common case, supply only `apiKey` (and optionally `baseUrl`).
 * Supply `httpClient` to inject a custom implementation — useful for tests
 * or scenarios that need non-default auth/transport behaviour.
 */
export interface ClientConfig {
  /** Bearer token from https://the-one-api.dev/sign-up */
  apiKey: string;
  /** Override the API base URL. Defaults to `https://the-one-api.dev/v2`. */
  baseUrl?: string;
  /**
   * Inject a custom HTTP client instead of the default fetch-based one.
   * When provided, `apiKey` and `baseUrl` are forwarded to `FetchClient`
   * but the injected client takes precedence for all requests.
   */
  httpClient?: HttpClient;
}

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
 * @example With an injected client (e.g. in tests)
 * ```ts
 * const mockHttp: HttpClient = { get: vi.fn().mockResolvedValue({ docs: [] }) };
 * const client = new LotrClient({ apiKey: 'test', httpClient: mockHttp });
 * ```
 */
export class LotrClient {
  /** Access movie endpoints: `list`, `get`, `listQuotes`. */
  readonly movies: MovieResource;

  /** Access quote endpoints: `list`, `get`. */
  readonly quotes: QuoteResource;

  constructor(config: ClientConfig) {
    if (!config.apiKey || !config.apiKey.trim()) {
      throw new TypeError('apiKey must be a non-empty string');
    }
    const http: HttpClient = config.httpClient ?? new FetchClient(config);
    this.movies = new MovieResource(http);
    this.quotes = new QuoteResource(http);
  }
}
