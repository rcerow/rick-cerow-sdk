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
 * Two mutually exclusive forms — the union is enforced at compile time:
 *
 * Standard:        `{ apiKey: string; baseUrl?: string }`
 * Custom transport: `{ httpClient: HttpClient }`
 */
export type ClientConfig =
  | { apiKey: string; baseUrl?: string; httpClient?: never }
  | { httpClient: HttpClient; apiKey?: never; baseUrl?: never };

export class LotrClient {
  readonly movies: MovieResource;
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
