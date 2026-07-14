/**
 * Typed errors thrown by the SDK.
 *
 * HTTP-level errors extend `LotrError` (always carry a `statusCode`).
 * Transport-level failure (no HTTP response at all) throws `NetworkError`,
 * which extends `Error` directly since no status code is available.
 */

/** Base class for all errors that carry an HTTP status code. */
export class LotrError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'LotrError';
  }
}

/** Thrown when the API key is missing or invalid (HTTP 401). */
export class AuthenticationError extends LotrError {
  constructor() {
    super(
      401,
      'Authentication failed: invalid or missing API key. ' +
        'Obtain one at https://the-one-api.dev/sign-up',
    );
    this.name = 'AuthenticationError';
  }
}

/** Thrown when a requested resource does not exist (HTTP 404 or empty result). */
export class NotFoundError extends LotrError {
  constructor(resource: string, id?: string) {
    super(404, id ? `${resource} with id "${id}" was not found` : `${resource} not found`);
    this.name = 'NotFoundError';
  }
}

/** Thrown when the API rate limit has been exceeded (HTTP 429). */
export class RateLimitError extends LotrError {
  constructor() {
    super(429, 'Rate limit exceeded. Please wait before making another request.');
    this.name = 'RateLimitError';
  }
}

/**
 * Thrown when a successful HTTP response arrives but its body cannot be
 * parsed as JSON (e.g. the API returned HTML for a maintenance page).
 */
export class ApiResponseError extends LotrError {
  constructor(statusCode: number, cause: unknown) {
    super(statusCode, 'The API returned a response that could not be parsed');
    this.name = 'ApiResponseError';
    this.cause = cause;
  }
}

/**
 * Thrown when the network request itself fails before any HTTP response
 * is received — e.g. DNS failure, connection refused, or no internet.
 *
 * Does not extend `LotrError` because there is no HTTP status code to report.
 */
export class NetworkError extends Error {
  constructor(cause: unknown) {
    super('Network request failed — check your internet connection');
    this.name = 'NetworkError';
    this.cause = cause;
  }
}
