/**
 * End-to-end demonstration of the LOTR SDK.
 *
 * Prerequisites:
 *   1. Sign up for a free API key at https://the-one-api.dev/sign-up
 *   2. Set it as an environment variable:
 *        export LOTR_API_KEY="your-key-here"
 *   3. Run from the project root:
 *        npm run demo
 *      or directly with tsx:
 *        npx tsx examples/demo.ts
 */

import { LotrClient, AuthenticationError, NotFoundError, LotrError } from '../src/index.js';

const apiKey = process.env['LOTR_API_KEY'];
if (!apiKey) {
  console.error('Error: LOTR_API_KEY environment variable is not set.');
  console.error('Get a free key at https://the-one-api.dev/sign-up');
  process.exit(1);
}

const client = new LotrClient({ apiKey });

function section(title: string) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  ${title}`);
  console.log('─'.repeat(60));
}

async function main() {
  // ── 1. List all movies ─────────────────────────────────────────────────────
  section('1. All movies');

  const allMovies = await client.movies.list();
  console.log(`Total movies: ${allMovies.total}`);
  allMovies.items.forEach((m) =>
    console.log(`  ${m._id}  ${m.name} (${m.runtimeInMinutes} min)`),
  );

  // ── 2. Get a single movie ──────────────────────────────────────────────────
  section('2. Get a single movie by ID');

  const fellowshipId = allMovies.items.find((m) =>
    m.name.toLowerCase().includes('fellowship'),
  )?._id;

  if (!fellowshipId) {
    console.log('Fellowship not found in results — skipping single-movie demo.');
  } else {
    const fellowship = await client.movies.get(fellowshipId);
    console.log(`Name:       ${fellowship.name}`);
    console.log(`Runtime:    ${fellowship.runtimeInMinutes} min`);
    console.log(`Budget:     $${fellowship.budgetInMillions}M`);
    console.log(`Box office: $${fellowship.boxOfficeRevenueInMillions}M`);
    console.log(`Oscar wins: ${fellowship.academyAwardWins}`);

    // ── 3. Quotes for that movie ─────────────────────────────────────────────
    section(`3. First 5 quotes from "${fellowship.name}"`);

    const quotes = await client.movies.listQuotes(fellowship._id, {
      pagination: { limit: 5 },
    });
    console.log(`(${quotes.total} total quotes, showing first ${quotes.items.length})`);
    quotes.items.forEach((q) => console.log(`  "${q.dialog}"`));
  }

  // ── 4. Filter movies by budget ─────────────────────────────────────────────
  section('4. Movies with budget > $90M, sorted by box office desc');

  const bigBudget = await client.movies.list({
    filter: { budgetInMillions: { gt: 90 } },
    sort: { by: 'boxOfficeRevenueInMillions', order: 'desc' },
  });
  bigBudget.items.forEach((m) =>
    console.log(`  ${m.name}  budget=$${m.budgetInMillions}M  box=$${m.boxOfficeRevenueInMillions}M`),
  );

  // ── 5. Filter movies by award wins ─────────────────────────────────────────
  section('5. Movies with 4+ Academy Award wins');

  const awardWinners = await client.movies.list({
    filter: { academyAwardWins: { gte: 4 } },
    sort: { by: 'academyAwardWins', order: 'desc' },
  });
  awardWinners.items.forEach((m) =>
    console.log(`  ${m.name}  wins=${m.academyAwardWins}`),
  );

  // ── 6. Search quotes by dialog ────────────────────────────────────────────
  section('6. Quotes matching /not pass/i');

  const notPassQuotes = await client.quotes.list({
    filter: { dialog: { match: /not pass/i } },
  });
  console.log(`Found ${notPassQuotes.total} matching quote(s):`);
  notPassQuotes.items.forEach((q) => console.log(`  "${q.dialog}"`));

  // ── 7. Get a single quote ─────────────────────────────────────────────────
  const firstQuoteId = notPassQuotes.items[0]?._id;
  if (firstQuoteId) {
    section('7. Get a single quote by ID');
    const quote = await client.quotes.get(firstQuoteId);
    console.log(`ID:        ${quote._id}`);
    console.log(`Dialog:    "${quote.dialog}"`);
    console.log(`Movie ID:  ${quote.movie}`);
  }

  // ── 8. Error handling examples ────────────────────────────────────────────
  section('8. Error handling');

  try {
    await client.movies.get('000000000000000000000000');
  } catch (e) {
    if (e instanceof NotFoundError) {
      console.log(`NotFoundError caught: ${e.message}`);
    }
  }

  // Demonstrate typed error hierarchy
  const err = new NotFoundError('Movie', 'abc');
  console.log(`instanceof NotFoundError: ${err instanceof NotFoundError}`);  // true
  console.log(`instanceof LotrError:     ${err instanceof LotrError}`);      // true

  console.log('\nDemo complete.');
}

main().catch((err: unknown) => {
  if (err instanceof AuthenticationError) {
    console.error('Authentication failed — check your LOTR_API_KEY.');
  } else if (err instanceof LotrError) {
    console.error(`API error ${err.statusCode}: ${err.message}`);
  } else {
    console.error('Unexpected error:', err);
  }
  process.exit(1);
});
