import { describe, expect, it } from 'vitest';
import {
  ApiResponseError,
  AuthenticationError,
  LotrError,
  NetworkError,
  NotFoundError,
  RateLimitError,
} from '../src/errors.js';

// ── Error hierarchy ───────────────────────────────────────────────────────────

describe('error hierarchy', () => {
  it('AuthenticationError extends LotrError', () => {
    expect(new AuthenticationError()).toBeInstanceOf(LotrError);
  });

  it('NotFoundError extends LotrError', () => {
    expect(new NotFoundError('Movie')).toBeInstanceOf(LotrError);
  });

  it('RateLimitError extends LotrError', () => {
    expect(new RateLimitError()).toBeInstanceOf(LotrError);
  });

  it('ApiResponseError extends LotrError', () => {
    expect(new ApiResponseError(200, null)).toBeInstanceOf(LotrError);
  });

  it('NetworkError extends Error but NOT LotrError', () => {
    const err = new NetworkError(null);
    expect(err).toBeInstanceOf(Error);
    expect(err).not.toBeInstanceOf(LotrError);
  });

  it('all LotrError subclasses also extend Error', () => {
    expect(new AuthenticationError()).toBeInstanceOf(Error);
    expect(new NotFoundError('X')).toBeInstanceOf(Error);
    expect(new RateLimitError()).toBeInstanceOf(Error);
    expect(new ApiResponseError(500, null)).toBeInstanceOf(Error);
  });
});

// ── LotrError ─────────────────────────────────────────────────────────────────

describe('LotrError', () => {
  it('stores the statusCode and message', () => {
    const err = new LotrError(503, 'Service Unavailable');
    expect(err.statusCode).toBe(503);
    expect(err.message).toBe('Service Unavailable');
  });

  it('has name "LotrError"', () => {
    expect(new LotrError(500, 'oops').name).toBe('LotrError');
  });
});

// ── AuthenticationError ───────────────────────────────────────────────────────

describe('AuthenticationError', () => {
  it('has statusCode 401', () => {
    expect(new AuthenticationError().statusCode).toBe(401);
  });

  it('has name "AuthenticationError"', () => {
    expect(new AuthenticationError().name).toBe('AuthenticationError');
  });

  it('message mentions key rejection', () => {
    expect(new AuthenticationError().message).toMatch(/rejected/i);
  });
});

// ── NotFoundError ─────────────────────────────────────────────────────────────

describe('NotFoundError', () => {
  it('has statusCode 404', () => {
    expect(new NotFoundError('Movie').statusCode).toBe(404);
  });

  it('has name "NotFoundError"', () => {
    expect(new NotFoundError('Movie').name).toBe('NotFoundError');
  });

  it('message includes the resource type when no ID is provided', () => {
    expect(new NotFoundError('Quote').message).toContain('Quote');
  });

  it('message includes both resource type and ID when an ID is provided', () => {
    const err = new NotFoundError('Movie', 'abc123');
    expect(err.message).toContain('Movie');
    expect(err.message).toContain('abc123');
  });

  it('wraps the ID in double quotes for readability', () => {
    expect(new NotFoundError('Movie', 'abc123').message).toContain('"abc123"');
  });
});

// ── RateLimitError ────────────────────────────────────────────────────────────

describe('RateLimitError', () => {
  it('has statusCode 429', () => {
    expect(new RateLimitError().statusCode).toBe(429);
  });

  it('has name "RateLimitError"', () => {
    expect(new RateLimitError().name).toBe('RateLimitError');
  });

  it('message tells the caller to wait', () => {
    expect(new RateLimitError().message).toMatch(/wait/i);
  });
});

// ── ApiResponseError ──────────────────────────────────────────────────────────

describe('ApiResponseError', () => {
  it('has name "ApiResponseError"', () => {
    expect(new ApiResponseError(200, null).name).toBe('ApiResponseError');
  });

  it('stores the HTTP status code', () => {
    expect(new ApiResponseError(503, null).statusCode).toBe(503);
  });

  it('preserves the original parse error as cause', () => {
    const cause = new SyntaxError('Unexpected token');
    const err = new ApiResponseError(200, cause);
    expect(err.cause).toBe(cause);
  });

  it('message indicates a parse failure', () => {
    expect(new ApiResponseError(200, null).message).toMatch(/parse/i);
  });

  it('works with non-200 success status codes', () => {
    expect(new ApiResponseError(201, null).statusCode).toBe(201);
  });
});

// ── NetworkError ──────────────────────────────────────────────────────────────

describe('NetworkError', () => {
  it('has name "NetworkError"', () => {
    expect(new NetworkError(null).name).toBe('NetworkError');
  });

  it('preserves the original transport error as cause', () => {
    const cause = new TypeError('Failed to fetch');
    expect(new NetworkError(cause).cause).toBe(cause);
  });

  it('message is human-readable and mentions connectivity', () => {
    expect(new NetworkError(null).message).toMatch(/network|internet|connection/i);
  });

  it('accepts null cause without throwing', () => {
    expect(() => new NetworkError(null)).not.toThrow();
  });
});
