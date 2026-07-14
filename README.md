# lotr-sdk

TypeScript SDK for [The One API](https://the-one-api.dev/) — Lord of the Rings data.

Covers the **movie** and **quote** endpoints with full TypeScript types, declarative filtering, sorting, and pagination.

---

## Requirements

- Node.js ≥ 18.0.0
- A free API key from [the-one-api.dev/sign-up](https://the-one-api.dev/sign-up)

---

## Installation

```sh
npm install lotr-sdk
# or
pnpm add lotr-sdk
```

---

## Quick Start

```ts
import { LotrClient } from 'lotr-sdk';

const client = new LotrClient({ apiKey: process.env.LOTR_API_KEY! });

// List all movies
const movies = await client.movies.list();
console.log(movies.docs);

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

| Option | Type | Description |
|---|---|---|
| `apiKey` | `string` | **Required.** Bearer token from the-one-api.dev |
| `baseUrl` | `string` | Optional. Defaults to `https://the-one-api.dev/v2` |

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

result.docs   // Movie[]
result.total  // total matching count
result.pages  // total pages
```

#### `movies.get(id)`

Returns a single `Movie`. Throws `NotFoundError` if the ID does not exist.

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

Returns a single `Quote`. Throws `NotFoundError` if the ID does not exist.

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

All errors extend `LotrError` and carry a `statusCode`.

```ts
import { LotrError, AuthenticationError, NotFoundError } from 'lotr-sdk';

try {
  await client.movies.get(someId);
} catch (e) {
  if (e instanceof NotFoundError) {
    console.error('Movie not found:', e.message);
  } else if (e instanceof AuthenticationError) {
    console.error('Invalid API key');
  } else if (e instanceof LotrError) {
    console.error(`API error ${e.statusCode}:`, e.message);
  } else {
    throw e; // unexpected — re-throw
  }
}
```

---

## Running the Demo

The demo script exercises every endpoint and filter type against the live API.

```sh
# 1. Set your API key
export LOTR_API_KEY="your-key-here"

# 2. Run
npm run demo
```

Or directly with `tsx` without installing globally:

```sh
LOTR_API_KEY="your-key" npx tsx examples/demo.ts
```

---

## Running Tests

Tests run entirely offline — no API key required.

```sh
npm test             # run once
npm run test:watch   # re-run on save
```

---

## Building

```sh
npm run build    # emits ESM to dist/
npm run typecheck # type-check without emitting
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
  docs: T[];
  total: number;
  limit: number;
  offset: number;
  page: number;
  pages: number;
}
```
