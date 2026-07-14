# SDK Design

## Overview

The SDK is a thin, typed wrapper around The One API. It exposes two resources (`movies`, `quotes`) as properties on a top-level `LotrClient` instance. Each resource maps closely to the upstream REST endpoints but presents a consistent, ergonomic interface — including a declarative filter system that hides the API's unusual query-string syntax.

---

## Architecture

```
LotrClient
├── movies: MovieResource
│     ├── list(options?)        → ListResult<Movie>
│     ├── get(id)               → Movie
│     └── listQuotes(id, opts?) → ListResult<Quote>
│
└── quotes: QuoteResource
      ├── list(options?)        → ListResult<Quote>
      └── get(id)               → Quote
```

### Layer responsibilities

| Layer | File | Purpose |
|---|---|---|
| Entry point | `src/index.ts` | Wires `HttpClient` + resources; re-exports public types |
| HTTP client | `src/client.ts` | Fetch, auth headers, URL assembly, error mapping |
| Resources | `src/resources/` | Endpoint-specific methods; delegates to `BaseResource.buildQuery` |
| Base resource | `src/resources/base.ts` | Shared pagination / sort / filter query-string building |
| Filter serializer | `src/filter.ts` | Converts typed filter objects → raw query-string segments |
| Types | `src/types.ts` | Domain models and all public type definitions |
| Errors | `src/errors.ts` | Typed error hierarchy |

---

## Extending to New Endpoints

Adding a new resource (e.g. `/character`) requires three steps:

1. **Add types** in `src/types.ts`:
   ```ts
   export interface Character { _id: string; name: string; ... }
   export interface CharacterFilter { name?: StringFilter; ... }
   ```

2. **Create the resource** in `src/resources/characters.ts`:
   ```ts
   export class CharacterResource extends BaseResource {
     protected override numberFields() {
       return new Set(['height', 'age']);
     }

     async list(options: ListOptions<CharacterFilter> = {}) {
       return this.listItems<Character>('/character', options);
     }

     async get(id: string): Promise<Character> { ... }
   }
   ```

3. **Mount it** on `LotrClient` in `src/index.ts`:
   ```ts
   readonly characters: CharacterResource;
   // constructor:
   this.characters = new CharacterResource(http);
   ```

No other code needs to change. The filter serializer, query builder, and HTTP client are all generic and work without modification.

---

## Filter System

The API uses a non-standard query syntax where operators are embedded in the key name:

| API query string | SDK filter |
|---|---|
| `?name=The Two Towers` | `{ name: 'The Two Towers' }` |
| `?name!=The Two Towers` | `{ name: { not: 'The Two Towers' } }` |
| `?name=A,B,C` | `{ name: { in: ['A', 'B', 'C'] } }` |
| `?name!=/pattern/i` | `{ name: { notMatch: /pattern/i } }` |
| `?budgetInMillions>100` | `{ budgetInMillions: { gt: 100 } }` |
| `?budgetInMillions<=180` | `{ budgetInMillions: { lte: 180 } }` |
| `?name` (exists) | `{ name: { exists: true } }` |
| `?!name` (absent) | `{ name: { exists: false } }` |

The serializer (`src/filter.ts`) builds these raw query-string segments. Comparison operators (`>`, `<`, `>=`, `<=`, `!=`) are written literally — not percent-encoded — because the API's parser requires the literal characters.

Resources declare which of their fields are numeric by overriding `numberFields()`. This determines which serializer branch is used. All other fields are treated as strings.

---

## Error Handling

```
LotrError (base — always has statusCode)
├── AuthenticationError (401)
└── NotFoundError       (404)
```

The `HttpClient` maps HTTP status codes to these types. Individual resource methods may catch `NotFoundError` and re-throw it with a more specific message (e.g. including the requested ID).

Callers can handle errors at the level of specificity they need:

```ts
try {
  await client.movies.get(id);
} catch (e) {
  if (e instanceof NotFoundError) { /* missing resource */ }
  if (e instanceof LotrError)     { /* any API error, e.statusCode available */ }
  throw e;                          /* re-throw unexpected errors */
}
```

---

## Testing Strategy

Tests are co-located in `tests/` and use Vitest with `vi.stubGlobal('fetch', ...)` to mock the network layer. Each test file covers one module boundary:

- **`filter.test.ts`** — pure unit tests for the serializer; no I/O
- **`client.test.ts`** — verifies URL construction, headers, and error mapping
- **`movies.test.ts`** — verifies resource methods produce the right URLs and return unwrapped data
- **`quotes.test.ts`** — same for quote endpoints

Integration tests (real API calls) require an API key and are not included to avoid binding the test suite to external availability. The demo script (`examples/demo.ts`) serves as the manual integration test.

---

## Deliberate Omissions

| Item | Reason |
|---|---|
| Retry logic | Adds complexity; callers can add it at a higher level if needed |
| Response caching | Outside the scope of a single-request SDK; belongs in the calling app |
| Automatic pagination | Iterator-style pagination obscures the API's pagination semantics |
| Browser bundle | SDK targets Node.js 18+; browser support can be added via tsup's browser target if needed |
| Other endpoints (`/book`, `/chapter`, etc.) | Endpoints not requested; architecture makes them trivial to add |
