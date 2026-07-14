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

export class FetchClient implements HttpClient {
  private readonly baseUrl: string;
  private readonly headers: Readonly<Record<string, string>>;

  constructor({ apiKey, baseUrl = 'https://the-one-api.dev/v2' }: FetchClientConfig) {
    if (!apiKey || !apiKey.trim()) {
      throw new TypeError('apiKey must be a non-empty string');
    }
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.headers = {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    };
  }

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
      // JSON parse errors on a successful response become ApiResponseError.
      // Error responses use response.text() below and never go through this path.
      try {
        return (await response.json()) as T;
      } catch (e) {
        throw new ApiResponseError(response.status, e, 'The API response could not be parsed as JSON');
      }
    }

    const body = await response.text().catch(() => '');

    switch (response.status) {
      case 401: throw new AuthenticationError(body || undefined);
      case 404: throw new NotFoundError('Resource', undefined, body || undefined);
      case 429: throw new RateLimitError(body || undefined);
      default:  throw new LotrError(response.status, body || `HTTP ${response.status}`);
    }
  }
}
