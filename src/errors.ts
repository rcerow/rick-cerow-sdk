export class LotrError extends Error {
  /** Raw response body from the API, if one was received. */
  readonly responseBody?: string;

  constructor(
    public readonly statusCode: number,
    message: string,
    responseBody?: string,
  ) {
    super(message);
    this.name = 'LotrError';
    if (responseBody) this.responseBody = responseBody;
  }
}

export class AuthenticationError extends LotrError {
  constructor(responseBody?: string) {
    super(
      401,
      'Authentication failed: the API key was rejected. ' +
        'Check your key at https://the-one-api.dev/sign-up',
      responseBody,
    );
    this.name = 'AuthenticationError';
  }
}

export class NotFoundError extends LotrError {
  constructor(resource: string, id?: string, responseBody?: string) {
    super(404, id ? `${resource} with id "${id}" was not found` : `${resource} not found`, responseBody);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends LotrError {
  constructor(responseBody?: string) {
    super(429, 'Rate limit exceeded. Please wait before making another request.', responseBody);
    this.name = 'RateLimitError';
  }
}

export class ApiResponseError extends LotrError {
  constructor(statusCode: number, cause: unknown) {
    super(statusCode, 'The API returned a response that could not be parsed');
    this.name = 'ApiResponseError';
    this.cause = cause;
  }
}

// Does not extend LotrError — fetch() threw before any HTTP response arrived,
// so there is no status code to report.
export class NetworkError extends Error {
  constructor(cause: unknown) {
    super('Network request failed — check your internet connection');
    this.name = 'NetworkError';
    this.cause = cause;
  }
}
