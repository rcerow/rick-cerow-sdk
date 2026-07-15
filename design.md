# SDK Design

## Structure

```
LotrClient
├── movies: MovieResource  — list, get, listQuotes
└── quotes: QuoteResource  — list, get
```

Resource objects on a shared client instance keep auth config in one place and make the relationship between related endpoints readable at the call site (`client.movies.listQuotes(id)`).

Filter serialization lives in its own module (`src/filter.ts`) because the API's query syntax is unusual (comparison operators (`>`, `<`, `!=`) and regex literals appear literally in query strings) and so isolated filters/sorting testing is needed, as it's easy to get wrong silently.

Finally, the public list response renames the upstream `docs` property to `items` and adds `hasNextPage` and `hasPrevPage` (see explanation in tradeoffs section below).

## Testing

Vitest mocks the global `fetch` so the entire suite runs offline. Each file covers one boundary:

- `errors.test.ts` — error hierarchy, status codes, response bodies, and causes
- `filter.test.ts` — filter operators, encoding, and invalid filter shapes
- `client.test.ts` — URL construction, auth headers, transport errors, andHTTP error mapping
- `movies.test.ts`, `quotes.test.ts` — endpoint paths, response mapping, input validation, and not-found behavior

`tests/integration.test.ts` contains seven tests against the live API. They run when `LOTR_API_KEY` is available and skip otherwise.

This keeps the normal suite deterministic while still verifying that the SDK's routes, authentication, response assumptions, and representative filters work against the real service.

`examples/demo.ts` is an executable usage example rather than the project's integration test.

## Tradeoffs

**BaseResource vs. shared functions.** `BaseResource` centralizes `buildQuery`, `listItems`, and `encodeId`. A few plain functions would be simpler, but the class was kept because the resourcs share transport access, validation, query construction, and response handling.  It's a bit of abstraction overkill for this project's size, but allows for resources to expand more easily in the future. 

**Injected transport versus direct fetch.** The `HttpClient` interface adds another public concept, but it keeps resource tests independent of transport details and supports custom authentication or request behavior. The interface is intentionally limited to what the SDK currently needs.

**Filter DSL breadth.** The filter system covers the full set of operators included in the API documents. This creates more public types and and serializer behavior to maintain, but prevents string and numeric operators from being mixed. Invalid filter shapes throw at runtime rather than being silently ignored.

**One operator per field.** `StringFilter` and `NumberFilter` are union types, so each field accepts one operator at a time. A natural range query such as `{ runtimeInMinutes: { gte: 120, lte: 180 } }` cannot be expressed directly. This is due to the fact that whether the API supports multiple values for the same field key is unclear from its documentation.

**`items` instead of `docs`.** `items` is more conventional for SDK consumers, but it means the public response differs from the upstream envelope and requires a mapping layer.

**`hasNextPage` / `hasPrevPage`.** These convenience booleans were added to avoid exposing `page < pages` at every call site. The tradeoff: the public `ListResult<T>` diverges from the raw API response.

**Runtime validation.** The SDK validates blank IDs, pagination values, filter shapes, and response envelopes. It does not validate every movie or quote field or every possible server-side rule. Full schema validation would be disproportionate for the current scope.

**Conditional integration tests.** Live tests provide contract coverage without requiring credentials or network access for every test run. The tradeoff is that they only run when explicitly enabled.

**No retries or caching.** Retries, caching, batching, and cancellation were left out because they require policy decisions around backoff, rate limits, invalidation, and request ownership.
