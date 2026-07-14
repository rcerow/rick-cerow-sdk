# lotr-sdk

TypeScript SDK for [The One API](https://the-one-api.dev/) — Lord of the Rings data.

Covers the **movie** and **quote** endpoints with full TypeScript types, declarative filtering, sorting, and pagination.

---

## Requirements

- Node.js ≥ 18.0.0
- A free API key from [the-one-api.dev/sign-up](https://the-one-api.dev/sign-up)

---

## Installation

Clone the repository and install dependencies:

```sh
git clone https://github.com/rcerow/rick-cerow-sdk.git
cd rick-cerow-sdk
npm install
npm run build
```

Then import directly from the built output or from source:

```ts
// from the built dist (after npm run build)
import { LotrClient } from './dist/index.js';

// or during development via tsx
import { LotrClient } from './src/index.js';
```

---

## Quick Start

```ts
import { LotrClient } from './src/index.js';

const client = new LotrClient({ apiKey: process.env.LOTR_API_KEY! });

// List all movies
const movies = await client.movies.list();
console.log(movies.items);       // Movie[]
console.log(movies.total);       // number of results
console.log(movies.hasNextPage); // boolean

// Get a single movie
const fellowship = await client.movies.get('5cd95395de30eff6ebccde5b');

// Get quotes for that movie
const quotes = await client.movies.listQuotes(fellowship._id, {
  pagination: { limit: 10 },
});

// Search all quotes
const iconic = await client.quotes.list({
  filter: { dialog: { match: /you shall not pass/i } },
});
```

---

## API Reference

### `new LotrClient(config)`

Two mutually exclusive configuration forms:

**Standard** — provide your API key:

| Option | Type | Description |
|---|---|---|
| `apiKey` | `string` | **Required.** Bearer token from the-one-api.dev |
| `baseUrl` | `string` | Optional. Defaults to `https://the-one-api.dev/v2` |

**Custom transport** — provide your own `HttpClient` implementation (manages its own auth):

| Option | Type | Description |
|---|---|---|
| `httpClient` | `HttpClient` | Your implementation of the `HttpClient` interface |

The two forms are mutually exclusive at the type level; combining `apiKey` and `httpClient` is a compile-time error.

---

### `client.movies`

#### `movies.list(options?)`

Returns all movies as a paginated `ListResult<Movie>`.

```ts
const result = await client.movies.list({
  filter: { budgetInMillions: { gt: 90 } },
  sort:   { by: 'name', order: 'asc' },
  pagination: { limit: 5, page: 1 },
});

result.items        // Movie[]
result.total        // total matching count
result.pages        // total pages
result.hasNextPage  // true if more pages follow
result.hasPrevPage  // true if not on the first page
```

#### `movies.get(id)`

Returns a single `Movie`. Throws `NotFoundError` if the ID does not exist, `TypeError` if `id` is blank.

```ts
const movie = await client.movies.get('5cd95395de30eff6ebccde5b');
```

#### `movies.listQuotes(movieId, options?)`

Returns quotes for one movie as a `ListResult<Quote>`. Accepts the same filter/sort/pagination options as `quotes.list()`.

```ts
const quotes = await client.movies.listQuotes(movie._id, {
  filter: { dialog: { match: /ring/i } },
  pagination: { limit: 20 },
});
```

---

### `client.quotes`

#### `quotes.list(options?)`

Returns all quotes as a `ListResult<Quote>`.

```ts
const result = await client.quotes.list({
  filter: {
    dialog:    { match: /precious/i },
    character: '5cd99d4bde30eff6ebccfe9e',
  },
});
```

#### `quotes.get(id)`

Returns a single `Quote`. Throws `NotFoundError` if the ID does not exist, `TypeError` if `id` is blank.

```ts
const quote = await client.quotes.get('5cd96e05de30eff6ebcce7e9');
```

---

## Filtering

Every list method accepts a `filter` object. Each field can be:

### String fields (`name`, `dialog`, `movie`, `character`)

| Filter | Example |
|---|---|
| Exact match | `{ name: 'The Two Towers' }` |
| Not equal | `{ name: { not: 'The Two Towers' } }` |
| In list | `{ name: { in: ['A', 'B'] } }` |
| Not in list | `{ name: { notIn: ['A', 'B'] } }` |
| Regex match | `{ dialog: { match: /ring/i } }` |
| Regex exclude | `{ dialog: { notMatch: /sam/i } }` |
| Field exists | `{ name: { exists: true } }` |
| Field absent | `{ name: { exists: false } }` |

### Numeric fields (`runtimeInMinutes`, `budgetInMillions`, `boxOfficeRevenueInMillions`, `academyAwardNominations`, `academyAwardWins`, `rottenTomatoesScore`)

| Filter | Example |
|---|---|
| Exact match | `{ academyAwardWins: 4 }` |
| Not equal | `{ academyAwardWins: { not: 0 } }` |
| Greater than | `{ budgetInMillions: { gt: 90 } }` |
| Greater or equal | `{ budgetInMillions: { gte: 90 } }` |
| Less than | `{ runtimeInMinutes: { lt: 180 } }` |
| Less or equal | `{ runtimeInMinutes: { lte: 180 } }` |
| In list | `{ academyAwardWins: { in: [2, 4, 11] } }` |
| Not in list | `{ academyAwardWins: { notIn: [0] } }` |

---

## Error Handling

HTTP-level errors extend `LotrError` and carry a `statusCode`. Transport failures throw `NetworkError`, which extends `Error` directly (no status code available).

```ts
import {
  LotrError,
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  NetworkError,
} from './src/index.js';

try {
  await client.movies.get(someId);
} catch (e) {
  if (e instanceof NotFoundError) {
    console.error('Movie not found:', e.message);
  } else if (e instanceof RateLimitError) {
    console.error('Rate limit hit — wait before retrying');
  } else if (e instanceof AuthenticationError) {
    console.error('Invalid API key');
  } else if (e instanceof LotrError) {
    console.error(`API error ${e.statusCode}:`, e.message);
  } else if (e instanceof NetworkError) {
    console.error('Network failure:', e.message);
  } else {
    throw e; // unexpected — re-throw
  }
}
```

| Error class | When thrown |
|---|---|
| `AuthenticationError` | HTTP 401 — invalid or missing API key |
| `NotFoundError` | HTTP 404, or resource ID not in the response |
| `RateLimitError` | HTTP 429 — too many requests |
| `ApiResponseError` | Successful HTTP but response body is not valid JSON |
| `NetworkError` | `fetch()` threw — DNS failure, no internet, etc. |
| `LotrError` | Any other HTTP error (base class for the above) |

---

## Running the Demo

The demo script exercises every endpoint and filter type against the live API.

```sh
# 1. Copy the env template and add your key
cp .env.example .env
# edit .env: LOTR_API_KEY=your-key-here

# 2. Run
npm run demo
```

---

## Running Tests

Tests run entirely offline — no API key required.

```sh
npm test              # run once
npm run test:watch    # re-run on save
npm run test:coverage # with coverage report
```

---

## Building

```sh
npm run build     # emits ESM to dist/
npm run typecheck # type-check without emitting
npm run check     # typecheck + test + build in sequence
```

---

## Response Types

```ts
interface Movie {
  _id: string;
  name: string;
  runtimeInMinutes: number;
  budgetInMillions: number;
  boxOfficeRevenueInMillions: number;
  academyAwardNominations: number;
  academyAwardWins: number;
  rottenTomatoesScore: number;
}

interface Quote {
  _id: string;
  dialog: string;
  movie: string;     // movie ID
  character: string; // character ID
}

interface ListResult<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  page: number;
  pages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}
```
