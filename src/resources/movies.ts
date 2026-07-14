import { NotFoundError } from '../errors.js';
import type {
  ApiListResponse,
  ListOptions,
  ListResult,
  Movie,
  MovieFilter,
  Quote,
  QuoteFilter,
} from '../types.js';
import { BaseResource } from './base.js';

const MOVIE_NUMBER_FIELDS: ReadonlySet<string> = new Set([
  'runtimeInMinutes',
  'budgetInMillions',
  'boxOfficeRevenueInMillions',
  'academyAwardNominations',
  'academyAwardWins',
  'rottenTomatoesScore',
]);

// Quote fields are all strings (dialog, movie id, character id).
const QUOTE_NUMBER_FIELDS: ReadonlySet<string> = new Set();

export class MovieResource extends BaseResource {
  protected override numberFields(): ReadonlySet<string> {
    return MOVIE_NUMBER_FIELDS;
  }

  /** List all movies, with optional filtering, sorting, and pagination. */
  async list(options: ListOptions<MovieFilter> = {}): Promise<ListResult<Movie>> {
    return this.listItems<Movie>(
      '/movie',
      options as ListOptions<Record<string, unknown>>,
    );
  }

  /**
   * Fetch a single movie by its ID.
   *
   * @throws {NotFoundError} when no movie with that ID exists.
   */
  async get(id: string): Promise<Movie> {
    let result: ApiListResponse<Movie>;
    try {
      result = await this.client.get<ApiListResponse<Movie>>(`/movie/${encodeURIComponent(id)}`);
    } catch (e) {
      if (e instanceof NotFoundError) throw new NotFoundError('Movie', id);
      throw e;
    }

    const movie = result.docs[0];
    if (!movie) throw new NotFoundError('Movie', id);
    return movie;
  }

  /**
   * List all quotes for a given movie, with optional filtering, sorting,
   * and pagination.
   *
   * @param movieId  The `_id` of the movie.
   */
  async listQuotes(
    movieId: string,
    options: ListOptions<QuoteFilter> = {},
  ): Promise<ListResult<Quote>> {
    const path = `/movie/${encodeURIComponent(movieId)}/quote`;
    return this.listItems<Quote>(
      path,
      options as ListOptions<Record<string, unknown>>,
      QUOTE_NUMBER_FIELDS,
    );
  }
}
