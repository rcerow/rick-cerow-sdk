export class LotrError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly responseBody?: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class AuthenticationError extends LotrError {
  constructor(responseBody?: string) {
    super(401, 'Authentication failed: the API key was rejected', responseBody);
  }
}

export class NotFoundError extends LotrError {
  constructor(resource: string, id?: string, responseBody?: string) {
    super(404, id ? `${resource} with id "${id}" was not found` : `${resource} not found`, responseBody);
  }
}

export class RateLimitError extends LotrError {
  constructor(responseBody?: string) {
    super(429, 'Rate limit exceeded. Please wait before making another request.', responseBody);
  }
}

export class ApiResponseError extends LotrError {
  constructor(statusCode: number, cause: unknown) {
    super(statusCode, 'The API returned a response that could not be parsed');
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
