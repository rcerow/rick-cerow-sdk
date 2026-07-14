import {
  ApiResponseError,
  AuthenticationError,
  LotrError,
  NetworkError,
  NotFoundError,
  RateLimitError,
} from './errors.js';
import type { HttpClient } from './http-client.js';

interface FetchClientConfig {
  apiKey: string;
  baseUrl?: string;
}

/**
 * Default `HttpClient` implementation backed by the global `fetch`.
 *
 * Responsibilities:
 *  - Validates that `apiKey` is non-empty at construction time.
 *  - Attaches `Authorization: Bearer <apiKey>` to every request.
 *  - Assembles URLs from a base + path + raw query-string segments.
 *  - Translates HTTP error statuses and transport failures into typed errors:
 *      401 → AuthenticationError
 *      404 → NotFoundError
 *      429 → RateLimitError
 *      other 4xx/5xx → LotrError (with statusCode and response body)
 *      malformed JSON body → ApiResponseError
 *      fetch() throws → NetworkError
 *
 * Nothing else lives here: no retries, no caching, no request queuing.
 * Swap this out via `ClientConfig.httpClient` if you need different behaviour.
 */
export class FetchClient implements HttpClient {
  private readonly baseUrl: string;
  private readonly headers: Readonly<Record<string, string>>;

  constructor({ apiKey, baseUrl = 'https://the-one-api.dev/v2' }: FetchClientConfig) {
    if (!apiKey || !apiKey.trim()) {
      throw new TypeError('apiKey must be a non-empty string');
    }
    this.baseUrl = baseUrl.replace(/\/$/, ''); // normalise trailing slash
    this.headers = {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    };
  }

  /**
   * Issue a GET request and return the parsed JSON body.
   *
   * @param path        e.g. `/movie` or `/movie/5cd95395de30eff6ebccde5c/quote`
   * @param queryParts  Raw query-string segments, e.g. `['limit=10', 'name=/lord/i']`
   */
  async get<T>(path: string, queryParts: string[] = []): Promise<T> {
    const qs = queryParts.length ? `?${queryParts.join('&')}` : '';
    const url = `${this.baseUrl}${path}${qs}`;

    let response: Response;
    try {
      response = await fetch(url, { headers: this.headers });
    } catch (e) {
      throw new NetworkError(e);
    }

    return this.handleResponse<T>(response);
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (response.ok) {
      try {
        return (await response.json()) as T;
      } catch (e) {
        throw new ApiResponseError(response.status, e);
      }
    }

    const body = await response.text().catch(() => '');

    switch (response.status) {
      case 401:
        throw new AuthenticationError(body || undefined);
      case 404:
        throw new NotFoundError('Resource', undefined, body || undefined);
      case 429:
        throw new RateLimitError(body || undefined);
      default:
        throw new LotrError(response.status, body || `HTTP ${response.status}`);
    }
  }
}
