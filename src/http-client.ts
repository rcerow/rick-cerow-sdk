/**
 * The contract every HTTP client in this SDK must satisfy.
 *
 * Resources depend on this interface rather than any concrete implementation,
 * so callers can inject their own client for testing, custom auth, or any
 * other reason without touching the resource layer.
 *
 * @example Implement a custom client for testing
 * ```ts
 * const mockClient: HttpClient = {
 *   get: vi.fn().mockResolvedValue({ docs: [], total: 0, ... }),
 * };
 * const sdk = new LotrClient({ apiKey: 'test', httpClient: mockClient });
 * ```
 */
export interface HttpClient {
  get<T>(path: string, queryParts?: string[]): Promise<T>;
}
