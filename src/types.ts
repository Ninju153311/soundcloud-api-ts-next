/** A SoundCloud track object containing metadata like title, duration, artwork, and stream URLs. */
export type {
  SoundCloudTrack,
  /** A SoundCloud user profile with username, avatar, follower counts, etc. */
  SoundCloudUser,
  /** A SoundCloud playlist containing track references and metadata. */
  SoundCloudPlaylist,
  /** A comment on a SoundCloud track with body text, timestamp, and author info. */
  SoundCloudComment,
  /** Stream URLs for a SoundCloud track (HLS, progressive MP3, etc.). */
  SoundCloudStreams,
  /** Paginated response wrapper with `collection` array and `next_href` for cursor-based pagination. */
  SoundCloudPaginatedResponse,
  /** The authenticated user's profile (extends SoundCloudUser with quota/plan info). */
  SoundCloudMe,
  /** A user's linked web profile (e.g., Twitter, Instagram). */
  SoundCloudWebProfile,
  /** A single activity item from the user's activity feed. */
  SoundCloudActivity,
  /** Paginated activity feed response with `collection` and `next_href`. */
  SoundCloudActivitiesResponse,
} from "soundcloud-api-ts";

export type { SCRequestTelemetry } from "soundcloud-api-ts";

/**
 * Structured telemetry emitted after every Next.js API route is handled.
 */
export interface SCRouteTelemetry {
  /** The route path handled (e.g. "/tracks/123", "/search/tracks") */
  route: string;
  /** HTTP method */
  method: string;
  /** Total handler duration in milliseconds */
  durationMs: number;
  /** HTTP response status code */
  status: number;
  /** Error message if the route handler threw */
  error?: string;
}

/**
 * Configuration for initializing server-side SoundCloud API route handlers.
 *
 * @example
 * ```ts
 * import { createSoundCloudRoutes } from "soundcloud-api-ts-next/server";
 *
 * const sc = createSoundCloudRoutes({
 *   clientId: process.env.SC_CLIENT_ID!,
 *   clientSecret: process.env.SC_CLIENT_SECRET!,
 *   redirectUri: "http://localhost:3000/api/soundcloud/auth/callback",
 * });
 * ```
 *
 * @see {@link createSoundCloudRoutes} for usage
 */
export interface SoundCloudRoutesConfig {
  /** SoundCloud OAuth client ID from your app registration. */
  clientId: string;
  /** SoundCloud OAuth client secret from your app registration. */
  clientSecret: string;
  /** OAuth redirect URI — required if using authentication features (login/callback). */
  redirectUri?: string;
  /**
   * Custom token provider for public (non-auth) routes.
   * When set, this function is called instead of the default client-credentials flow.
   * Useful when your app stores OAuth tokens externally (e.g. Redis, database).
   *
   * @returns A valid SoundCloud access token string.
   *
   * @example
   * ```ts
   * const sc = createSoundCloudRoutes({
   *   clientId: process.env.SC_CLIENT_ID!,
   *   clientSecret: process.env.SC_CLIENT_SECRET!,
   *   getToken: async () => {
   *     const redis = await getRedisClient();
   *     return redis.get("sc:token");
   *   },
   * });
   * ```
   */
  getToken?: () => Promise<string>;
  /**
   * Called after every API route is handled with route-level telemetry.
   * Use for logging, metrics, or observability on the Next.js side.
   *
   * @example
   * ```ts
   * const sc = createSoundCloudRoutes({
   *   clientId: process.env.SC_CLIENT_ID!,
   *   clientSecret: process.env.SC_CLIENT_SECRET!,
   *   onRouteComplete: (t) => console.log(`[Route] ${t.method} ${t.route} ${t.status} ${t.durationMs}ms`),
   * });
   * ```
   */
  onRouteComplete?: (telemetry: import("./types.js").SCRouteTelemetry) => void;
  /**
   * Passed through to the underlying SoundCloud API calls for per-request telemetry.
   * Fires for each individual SoundCloud API request (including retries).
   *
   * @example
   * ```ts
   * const sc = createSoundCloudRoutes({
   *   clientId: process.env.SC_CLIENT_ID!,
   *   clientSecret: process.env.SC_CLIENT_SECRET!,
   *   onRequest: (t) => console.log(`[SC] ${t.method} ${t.path} ${t.status} ${t.durationMs}ms`),
   * });
   * ```
   */
  onRequest?: (telemetry: import("soundcloud-api-ts").SCRequestTelemetry) => void;
}

/**
 * Token response returned from SoundCloud OAuth token exchange.
 *
 * @see {@link useSCAuth} for client-side auth flow
 */
export interface SoundCloudToken {
  /** The bearer token for authenticated API requests. */
  access_token: string;
  /** Token used to obtain a new access token when the current one expires. */
  refresh_token: string;
  /** Token lifetime in seconds. */
  expires_in: number;
  /** Always "Bearer". */
  token_type: string;
  /** OAuth scope granted. */
  scope: string;
}

/**
 * Authentication state tracked by the SoundCloud provider context.
 *
 * @see {@link useSCAuth} for accessing auth state in components
 * @see {@link SoundCloudProvider} for setting up the auth context
 */
export interface AuthState {
  /** The authenticated user's profile, or `null` if not logged in. */
  user: import("soundcloud-api-ts").SoundCloudUser | null;
  /** Current OAuth access token, or `null`. */
  accessToken: string | null;
  /** Current OAuth refresh token, or `null`. */
  refreshToken: string | null;
  /** Whether the user is currently authenticated. */
  isAuthenticated: boolean;
  /** Timestamp (ms since epoch) when the access token expires, or `null`. */
  expiresAt: number | null;
}

/**
 * Standard return shape for data-fetching hooks.
 *
 * @typeParam T - The type of data returned on success.
 *
 * @example
 * ```ts
 * const { data, loading, error }: HookResult<SoundCloudTrack> = useTrack(123);
 * ```
 *
 * @see {@link InfiniteResult} for paginated hooks
 * @see {@link MutationResult} for action hooks
 */
export interface HookResult<T> {
  /** Fetched data, or `null` while loading or on error. */
  data: T | null;
  /** `true` while the request is in flight. */
  loading: boolean;
  /** The error thrown during fetch, or `null` on success. */
  error: Error | null;
}

/**
 * Return shape for mutation/action hooks (follow, like, repost).
 *
 * @typeParam TArgs - Tuple type of arguments passed to `execute`.
 *
 * @example
 * ```ts
 * const { execute, loading, error }: MutationResult<[number]> = useSomeMutation();
 * await execute(12345);
 * ```
 *
 * @see {@link useFollow} — follow/unfollow a user
 * @see {@link useLike} — like/unlike a track
 * @see {@link useRepost} — repost/unrepost a track
 */
export interface MutationResult<TArgs extends any[] = []> {
  /** Call this to perform the mutation. */
  execute: (...args: TArgs) => Promise<void>;
  /** `true` while the mutation is in flight. */
  loading: boolean;
  /** The error from the last mutation attempt, or `null`. */
  error: Error | null;
}

/**
 * Return shape for infinite/paginated hooks with cursor-based loading.
 *
 * @typeParam T - The type of each item in the collection.
 *
 * @example
 * ```ts
 * const { data, loadMore, hasMore } = useInfiniteTrackSearch("lofi");
 * // data is T[] accumulated across pages
 * if (hasMore) loadMore();
 * ```
 *
 * @see {@link HookResult} for single-page hooks
 * @see {@link useInfinite} for the base infinite hook
 */
export interface InfiniteResult<T> {
  /** Accumulated items across all fetched pages. */
  data: T[];
  /** `true` while any page is being fetched. */
  loading: boolean;
  /** The last fetch error, if any. */
  error: Error | null;
  /** `true` if a next page is available. */
  hasMore: boolean;
  /** Fetch the next page. No-op if loading or no more pages. */
  loadMore: () => void;
  /** Clear all data and refetch from the first page. */
  reset: () => void;
}

/**
 * Return shape for the {@link usePlayer} hook — controls audio playback of a SoundCloud track.
 *
 * @example
 * ```ts
 * const player = usePlayer(trackId);
 * player.toggle(); // play or pause
 * player.seek(30); // jump to 30 seconds
 * ```
 *
 * @see {@link usePlayer}
 */
export interface PlayerState {
  /** Whether audio is currently playing. */
  playing: boolean;
  /** Current playback position in seconds. */
  progress: number;
  /** Total track duration in seconds. */
  duration: number;
  /** Start playback. */
  play: () => void;
  /** Pause playback. */
  pause: () => void;
  /** Toggle between play and pause. */
  toggle: () => void;
  /** Seek to a specific time in seconds. */
  seek: (time: number) => void;
}
