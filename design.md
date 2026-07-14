# SDK Design

## Structure

```
LotrClient
├── movies: MovieResource  — list, get, listQuotes
└── quotes: QuoteResource  — list, get
```

Resource objects on a shared client instance keep auth config in one place and make the relationship between related endpoints readable at the call site (`client.movies.listQuotes(id)`).

Filter serialization lives in its own module (`src/filter.ts`) because the API's query syntax is unusual enough to warrant isolated testing. Comparison operators (`>`, `<`, `!=`) and regex literals appear literally in query strings — not percent-encoded — which is non-standard and easy to get wrong silently.

## Testing

Vitest mocks the global `fetch` so the entire suite runs offline. Each file covers one boundary:

- `errors.test.ts` — error class hierarchy, names, status codes, cause preservation
- `filter.test.ts` — serializer unit tests against expected query-string output
- `client.test.ts` — URL construction, auth headers, HTTP error mapping
- `movies.test.ts`, `quotes.test.ts` — endpoint paths, response mapping, input validation

The demo script (`examples/demo.ts`) serves as a manual integration test against the live API.

## Tradeoffs

**BaseResource vs. shared functions.** `BaseResource` centralizes `buildQuery`, `listItems`, and `encodeId`. Two plain functions would be simpler; the class was kept because the `numberFields()` hook lets each resource declare which fields are numeric without threading a `Set` through every call. Mild over-abstraction for two resources — earns its keep if more endpoints are added.

**Filter DSL breadth.** The filter system covers the full set of operators the API documents. The cost is a larger public type surface that must stay in sync with the serializer. Unrecognized operator shapes throw at runtime rather than silently broadening the query.

**One operator per field.** `StringFilter` and `NumberFilter` are union types, so each field accepts one operator at a time. A natural range query such as `{ runtimeInMinutes: { gte: 120, lte: 180 } }` cannot be expressed directly. Whether the API supports multiple values for the same field key is unclear from its documentation.

**`hasNextPage` / `hasPrevPage`.** These convenience booleans were added to avoid exposing `page < pages` arithmetic at every call site. The tradeoff: the public `ListResult<T>` diverges from the upstream envelope, which caused the README to drift out of sync. Returning the upstream fields directly would have been safer in a constrained assignment.
