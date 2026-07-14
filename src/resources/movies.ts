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

const QUOTE_NUMBER_FIELDS: ReadonlySet<string> = new Set();

export class MovieResource extends BaseResource {
  protected override numberFields(): ReadonlySet<string> {
    return MOVIE_NUMBER_FIELDS;
  }

  async list(options: ListOptions<MovieFilter> = {}): Promise<ListResult<Movie>> {
    return this.listItems<Movie, MovieFilter>('/movie', options);
  }

  /**
   * @throws {TypeError}     when `id` is blank.
   * @throws {NotFoundError} when no movie with that ID exists.
   */
  async get(id: string): Promise<Movie> {
    const encodedId = this.encodeId(id, 'Movie ID');
    const trimmedId = id.trim();

    let result: ApiListResponse<Movie>;
    try {
      // The API returns a paginated envelope even for single-ID lookups.
      result = await this.client.get<ApiListResponse<Movie>>(`/movie/${encodedId}`);
    } catch (e) {
      if (e instanceof NotFoundError) throw new NotFoundError('Movie', trimmedId, e.responseBody);
      throw e;
    }

    const movie = result.docs[0];
    if (!movie) throw new NotFoundError('Movie', trimmedId);
    return movie;
  }

  /**
   * @param movieId The `_id` of the movie.
   * @throws {TypeError} when `movieId` is blank.
   */
  async listQuotes(
    movieId: string,
    options: ListOptions<QuoteFilter> = {},
  ): Promise<ListResult<Quote>> {
    const path = `/movie/${this.encodeId(movieId, 'Movie ID')}/quote`;
    return this.listItems<Quote, QuoteFilter>(path, options, QUOTE_NUMBER_FIELDS);
  }
}
