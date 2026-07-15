/** Contract every HTTP transport in this SDK must satisfy. */
export interface HttpClient {
  get<T>(path: string, queryParts?: string[]): Promise<T>;
}
