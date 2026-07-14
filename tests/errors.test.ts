import { expect, it } from 'vitest';
import {
  ApiResponseError,
  AuthenticationError,
  LotrError,
  NetworkError,
  NotFoundError,
  RateLimitError,
} from '../src/errors.js';

// ── Hierarchy, name, statusCode ───────────────────────────────────────────────

it.each<[string, LotrError, number]>([
  ['AuthenticationError', new AuthenticationError(), 401],
  ['NotFoundError', new NotFoundError('Movie'), 404],
  ['RateLimitError', new RateLimitError(), 429],
  ['ApiResponseError', new ApiResponseError(200, null), 200],
])('%s extends LotrError with the correct name and statusCode', (name, err, status) => {
  expect(err).toBeInstanceOf(LotrError);
  expect(err).toBeInstanceOf(Error);
  expect(err.name).toBe(name);
  expect(err.statusCode).toBe(status);
});

it('NetworkError extends Error but not LotrError', () => {
  const err = new NetworkError(null);
  expect(err).toBeInstanceOf(Error);
  expect(err).not.toBeInstanceOf(LotrError);
  expect(err.name).toBe('NetworkError');
});

it('LotrError stores statusCode and message directly', () => {
  const err = new LotrError(503, 'Service Unavailable');
  expect(err.statusCode).toBe(503);
  expect(err.message).toBe('Service Unavailable');
  expect(err.name).toBe('LotrError');
});

// ── Message spot-checks ───────────────────────────────────────────────────────

it('AuthenticationError message mentions key rejection', () => {
  expect(new AuthenticationError().message).toMatch(/rejected/i);
});

it('NotFoundError includes resource type and quoted ID', () => {
  const err = new NotFoundError('Movie', 'abc123');
  expect(err.message).toContain('Movie');
  expect(err.message).toContain('"abc123"');
});

it('RateLimitError message tells the caller to wait', () => {
  expect(new RateLimitError().message).toMatch(/wait/i);
});

it('ApiResponseError default message indicates an invalid response', () => {
  expect(new ApiResponseError(200, null).message).toMatch(/invalid/i);
});

it('ApiResponseError accepts a custom message', () => {
  const err = new ApiResponseError(200, null, 'Malformed list response');
  expect(err.message).toBe('Malformed list response');
});

// ── Metadata preservation ─────────────────────────────────────────────────────

it('LotrError subclasses forward responseBody to the base', () => {
  expect(new AuthenticationError('body').responseBody).toBe('body');
  expect(new NotFoundError('Movie', 'id', 'body').responseBody).toBe('body');
  expect(new RateLimitError('body').responseBody).toBe('body');
});

it('ApiResponseError preserves cause', () => {
  const cause = new SyntaxError('Unexpected token');
  expect(new ApiResponseError(200, cause).cause).toBe(cause);
});

it('NetworkError preserves cause', () => {
  const cause = new TypeError('Failed to fetch');
  expect(new NetworkError(cause).cause).toBe(cause);
});
