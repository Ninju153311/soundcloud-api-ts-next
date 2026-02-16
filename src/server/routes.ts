import {
  SoundCloudClient,
  generateCodeVerifier,
  generateCodeChallenge,
  getAuthorizationUrl,
  signOut,
} from "soundcloud-api-ts";
import type { SoundCloudRoutesConfig, SCRouteTelemetry } from "../types.js";

interface RouteContext {
  config: SoundCloudRoutesConfig;
  client: SoundCloudClient | null;
  token: string | undefined;
  tokenExpiry: number;
}

const ctx: RouteContext = {
  config: { clientId: "", clientSecret: "" },
  client: null,
  token: undefined,
  tokenExpiry: 0,
};

function getClient(): SoundCloudClient {
  if (!ctx.client) {
    ctx.client = new SoundCloudClient({
      clientId: ctx.config.clientId,
      clientSecret: ctx.config.clientSecret,
      redirectUri: ctx.config.redirectUri,
      onRequest: ctx.config.onRequest,
    });
  }
  return ctx.client;
}

// In-memory PKCE verifier store (state → verifier)
const pkceStore = new Map<string, { verifier: string; createdAt: number }>();

// Clean up old entries every 10 minutes
function cleanPkceStore() {
  const now = Date.now();
  for (const [key, val] of pkceStore) {
    if (now - val.createdAt > 600_000) pkceStore.delete(key);
  }
}

async function ensureToken(): Promise<string> {
  // Use custom token provider if configured
  if (ctx.config.getToken) {
    return ctx.config.getToken();
  }
  if (ctx.token && Date.now() < ctx.tokenExpiry) return ctx.token;
  const result = await getClient().auth.getClientToken();
  ctx.token = result.access_token;
  // Expire 5 minutes before actual expiry
  ctx.tokenExpiry = Date.now() + (result.expires_in - 300) * 1000;
  return ctx.token;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status: number): Response {
  return jsonResponse({ error: message }, status);
}

function getUserTokenFromHeaders(headers: Headers): string | null {
  const auth = headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

async function handleRoute(
  pathname: string,
  url: URL,
  method: string = "GET",
  headers: Headers = new Headers(),
  body?: any,
): Promise<Response> {
  // ── Auth routes ──

  // GET /auth/login
  if (pathname === "/auth/login" && method === "GET") {
    if (!ctx.config.redirectUri) {
      return errorResponse("redirectUri not configured", 500);
    }
    cleanPkceStore();
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    const state = crypto.randomUUID();
    pkceStore.set(state, { verifier, createdAt: Date.now() });
    const authUrl = getAuthorizationUrl(ctx.config.clientId, ctx.config.redirectUri, {
      state,
      codeChallenge: challenge,
    });
    return jsonResponse({ url: authUrl, state });
  }

  // GET /auth/callback?code=...&state=...
  if (pathname === "/auth/callback" && method === "GET") {
    if (!ctx.config.redirectUri) {
      return errorResponse("redirectUri not configured", 500);
    }
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!code || !state) return errorResponse("Missing code or state parameter", 400);
    const entry = pkceStore.get(state);
    if (!entry) return errorResponse("Invalid or expired state", 400);
    pkceStore.delete(state);
    const tokens = await getClient().auth.getUserToken(code, entry.verifier);
    return jsonResponse(tokens);
  }

  // POST /auth/refresh
  if (pathname === "/auth/refresh" && method === "POST") {
    if (!ctx.config.redirectUri) {
      return errorResponse("redirectUri not configured", 500);
    }
    const refreshTokenValue = body?.refresh_token;
    if (!refreshTokenValue) return errorResponse("Missing refresh_token", 400);
    const tokens = await getClient().auth.refreshUserToken(refreshTokenValue);
    return jsonResponse(tokens);
  }

  // POST /auth/logout
  if (pathname === "/auth/logout" && method === "POST") {
    const accessTokenValue = body?.access_token;
    if (accessTokenValue) {
      try {
        await signOut(accessTokenValue);
      } catch {
        // best effort
      }
    }
    return jsonResponse({ success: true });
  }

  // ── Authenticated "me" routes ──
  const userToken = getUserTokenFromHeaders(headers);

  // GET /me
  if (pathname === "/me" && method === "GET") {
    if (!userToken) return errorResponse("Authorization required", 401);
    const result = await getClient().me.getMe({ token: userToken });
    return jsonResponse(result);
  }

  // GET /me/tracks
  if (pathname === "/me/tracks" && method === "GET") {
    if (!userToken) return errorResponse("Authorization required", 401);
    const result = await getClient().me.getTracks(undefined, { token: userToken });
    return jsonResponse(result);
  }

  // GET /me/likes
  if (pathname === "/me/likes" && method === "GET") {
    if (!userToken) return errorResponse("Authorization required", 401);
    const result = await getClient().me.getLikesTracks(undefined, { token: userToken });
    return jsonResponse(result);
  }

  // GET /me/playlists
  if (pathname === "/me/playlists" && method === "GET") {
    if (!userToken) return errorResponse("Authorization required", 401);
    const result = await getClient().me.getPlaylists(undefined, { token: userToken });
    return jsonResponse(result);
  }

  // GET /me/followings
  if (pathname === "/me/followings" && method === "GET") {
    if (!userToken) return errorResponse("Authorization required", 401);
    const result = await getClient().me.getFollowings(undefined, { token: userToken });
    return jsonResponse(result);
  }

  // GET /me/followers
  if (pathname === "/me/followers" && method === "GET") {
    if (!userToken) return errorResponse("Authorization required", 401);
    const result = await getClient().me.getFollowers(undefined, { token: userToken });
    return jsonResponse(result);
  }

  // ── Action routes (POST/DELETE) ──

  // POST|DELETE /me/follow/:userId
  const followMatch = pathname.match(/^\/me\/follow\/([^/]+)$/);
  if (followMatch && (method === "POST" || method === "DELETE")) {
    if (!userToken) return errorResponse("Authorization required", 401);
    const userId = followMatch[1];
    if (method === "POST") {
      await getClient().me.follow(userId, { token: userToken });
    } else {
      await getClient().me.unfollow(userId, { token: userToken });
    }
    return jsonResponse({ success: true });
  }

  // POST|DELETE /tracks/:id/like
  const trackLikeActionMatch = pathname.match(/^\/tracks\/([^/]+)\/like$/);
  if (trackLikeActionMatch && (method === "POST" || method === "DELETE")) {
    if (!userToken) return errorResponse("Authorization required", 401);
    const trackId = trackLikeActionMatch[1];
    if (method === "POST") {
      await getClient().likes.likeTrack(trackId, { token: userToken });
    } else {
      await getClient().likes.unlikeTrack(trackId, { token: userToken });
    }
    return jsonResponse({ success: true });
  }

  // POST|DELETE /tracks/:id/repost
  const trackRepostMatch = pathname.match(/^\/tracks\/([^/]+)\/repost$/);
  if (trackRepostMatch && (method === "POST" || method === "DELETE")) {
    if (!userToken) return errorResponse("Authorization required", 401);
    const trackId = trackRepostMatch[1];
    if (method === "POST") {
      await getClient().reposts.repostTrack(trackId, { token: userToken });
    } else {
      await getClient().reposts.unrepostTrack(trackId, { token: userToken });
    }
    return jsonResponse({ success: true });
  }

  // POST|DELETE /playlists/:id/like
  const playlistLikeMatch = pathname.match(/^\/playlists\/([^/]+)\/like$/);
  if (playlistLikeMatch && (method === "POST" || method === "DELETE")) {
    if (!userToken) return errorResponse("Authorization required", 401);
    const playlistId = playlistLikeMatch[1];
    if (method === "POST") {
      await getClient().likes.likePlaylist(playlistId, { token: userToken });
    } else {
      await getClient().likes.unlikePlaylist(playlistId, { token: userToken });
    }
    return jsonResponse({ success: true });
  }

  // POST|DELETE /playlists/:id/repost
  const playlistRepostMatch = pathname.match(/^\/playlists\/([^/]+)\/repost$/);
  if (playlistRepostMatch && (method === "POST" || method === "DELETE")) {
    if (!userToken) return errorResponse("Authorization required", 401);
    const playlistId = playlistRepostMatch[1];
    if (method === "POST") {
      await getClient().reposts.repostPlaylist(playlistId, { token: userToken });
    } else {
      await getClient().reposts.unrepostPlaylist(playlistId, { token: userToken });
    }
    return jsonResponse({ success: true });
  }

  // ── Public routes (use client credentials token) ──
  const token = await ensureToken();

  // /resolve?url=<soundcloud_url> — resolve a SoundCloud URL to an API resource
  if (pathname === "/resolve") {
    const scUrl = url.searchParams.get("url");
    if (!scUrl) return errorResponse("Missing 'url' parameter", 400);
    const result = await getClient().resolve.resolveUrl(scUrl, { token });
    return jsonResponse(result);
  }

  // /next?url=<encoded_next_href> — generic next-page fetcher
  // Note: scFetchUrl is used directly here as the client doesn't expose a raw URL fetcher.
  // Telemetry for this route is covered by onRouteComplete.
  if (pathname === "/next") {
    const nextUrl = url.searchParams.get("url");
    if (!nextUrl) return errorResponse("Missing 'url' parameter", 400);
    const { scFetchUrl } = await import("soundcloud-api-ts");
    const result = await scFetchUrl(nextUrl, token);
    return jsonResponse(result);
  }

  // /search/playlists?q=...
  if (pathname === "/search/playlists") {
    const q = url.searchParams.get("q");
    if (!q) return errorResponse("Missing query parameter 'q'", 400);
    const result = await getClient().search.playlists(q, undefined, { token });
    return jsonResponse(result);
  }

  // /search/users?q=...
  if (pathname === "/search/users") {
    const q = url.searchParams.get("q");
    if (!q) return errorResponse("Missing query parameter 'q'", 400);
    const result = await getClient().search.users(q, undefined, { token });
    return jsonResponse(result);
  }

  // /search/tracks?q=...&limit=...
  if (pathname === "/search/tracks") {
    const q = url.searchParams.get("q");
    if (!q) return errorResponse("Missing query parameter 'q'", 400);
    const page = url.searchParams.get("page");
    const result = await getClient().search.tracks(q, page ? parseInt(page, 10) : undefined, { token });
    return jsonResponse(result);
  }

  // /tracks/:id/stream
  const streamMatch = pathname.match(/^\/tracks\/([^/]+)\/stream$/);
  if (streamMatch) {
    const streams = await getClient().tracks.getStreams(streamMatch[1], { token });
    return jsonResponse(streams);
  }

  // /tracks/:id/comments
  const trackCommentsMatch = pathname.match(/^\/tracks\/([^/]+)\/comments$/);
  if (trackCommentsMatch) {
    const result = await getClient().tracks.getComments(trackCommentsMatch[1], undefined, { token });
    return jsonResponse(result);
  }

  // /tracks/:id/likes
  const trackLikesMatch = pathname.match(/^\/tracks\/([^/]+)\/likes$/);
  if (trackLikesMatch) {
    const result = await getClient().tracks.getLikes(trackLikesMatch[1], undefined, { token });
    return jsonResponse(result);
  }

  // /tracks/:id/related
  const trackRelatedMatch = pathname.match(/^\/tracks\/([^/]+)\/related$/);
  if (trackRelatedMatch) {
    const result = await getClient().tracks.getRelated(trackRelatedMatch[1], undefined, { token });
    return jsonResponse(result);
  }

  // /tracks/:id
  const trackMatch = pathname.match(/^\/tracks\/([^/]+)$/);
  if (trackMatch) {
    const track = await getClient().tracks.getTrack(trackMatch[1], { token });
    return jsonResponse(track);
  }

  // /playlists/:id/tracks
  const playlistTracksMatch = pathname.match(/^\/playlists\/([^/]+)\/tracks$/);
  if (playlistTracksMatch) {
    const result = await getClient().playlists.getTracks(playlistTracksMatch[1], undefined, undefined, { token });
    return jsonResponse(result);
  }

  // /playlists/:id
  const playlistMatch = pathname.match(/^\/playlists\/([^/]+)$/);
  if (playlistMatch) {
    const result = await getClient().playlists.getPlaylist(playlistMatch[1], { token });
    return jsonResponse(result);
  }

  // /users/:id/tracks
  const userTracksMatch = pathname.match(/^\/users\/([^/]+)\/tracks$/);
  if (userTracksMatch) {
    const limit = url.searchParams.get("limit");
    const result = await getClient().users.getTracks(
      userTracksMatch[1],
      limit ? parseInt(limit, 10) : undefined,
      { token },
    );
    return jsonResponse(result);
  }

  // /users/:id/playlists
  const userPlaylistsMatch = pathname.match(/^\/users\/([^/]+)\/playlists$/);
  if (userPlaylistsMatch) {
    const result = await getClient().users.getPlaylists(userPlaylistsMatch[1], undefined, { token });
    return jsonResponse(result);
  }

  // /users/:id/likes/tracks
  const userLikesMatch = pathname.match(/^\/users\/([^/]+)\/likes\/tracks$/);
  if (userLikesMatch) {
    const result = await getClient().users.getLikesTracks(userLikesMatch[1], undefined, undefined, { token });
    return jsonResponse(result);
  }

  // /users/:id/followers
  const userFollowersMatch = pathname.match(/^\/users\/([^/]+)\/followers$/);
  if (userFollowersMatch) {
    const result = await getClient().users.getFollowers(userFollowersMatch[1], undefined, { token });
    return jsonResponse(result);
  }

  // /users/:id/followings
  const userFollowingsMatch = pathname.match(/^\/users\/([^/]+)\/followings$/);
  if (userFollowingsMatch) {
    const result = await getClient().users.getFollowings(userFollowingsMatch[1], undefined, { token });
    return jsonResponse(result);
  }

  // /users/:id
  const userMatch = pathname.match(/^\/users\/([^/]+)$/);
  if (userMatch) {
    const user = await getClient().users.getUser(userMatch[1], { token });
    return jsonResponse(user);
  }

  return errorResponse("Not found", 404);
}

/**
 * Create SoundCloud API route handlers for Next.js.
 *
 * Returns an object with individual data-fetching methods (e.g. `searchTracks`, `getTrack`)
 * and catch-all handlers for App Router (`handler()`) and Pages Router (`pagesHandler()`).
 * Manages client credential tokens automatically.
 *
 * @param config - SoundCloud API credentials and optional redirect URI.
 * @returns An object with route handlers and direct API methods.
 *
 * @example
 * ```ts
 * // app/api/soundcloud/[...route]/route.ts
 * import { createSoundCloudRoutes } from "soundcloud-api-ts-next/server";
 *
 * const sc = createSoundCloudRoutes({
 *   clientId: process.env.SC_CLIENT_ID!,
 *   clientSecret: process.env.SC_CLIENT_SECRET!,
 *   redirectUri: "http://localhost:3000/api/soundcloud/auth/callback",
 * });
 *
 * const handle = sc.handler();
 * export const GET = handle;
 * export const POST = handle;
 * export const DELETE = handle;
 * ```
 *
 * @see {@link SoundCloudRoutesConfig} for configuration options
 * @see {@link SoundCloudProvider} for the client-side provider
 */
export function createSoundCloudRoutes(config: SoundCloudRoutesConfig) {
  ctx.config = config;
  // Reset client and token when config changes
  ctx.client = null;
  ctx.token = undefined;
  ctx.tokenExpiry = 0;

  return {
    /** Individual route handlers */
    async resolveUrl(url: string) {
      const token = await ensureToken();
      return getClient().resolve.resolveUrl(url, { token });
    },
    async searchTracks(q: string, page?: number) {
      const token = await ensureToken();
      return getClient().search.tracks(q, page, { token });
    },
    async searchUsers(q: string) {
      const token = await ensureToken();
      return getClient().search.users(q, undefined, { token });
    },
    async searchPlaylists(q: string) {
      const token = await ensureToken();
      return getClient().search.playlists(q, undefined, { token });
    },
    async getTrack(trackId: string | number) {
      const token = await ensureToken();
      return getClient().tracks.getTrack(trackId, { token });
    },
    async getTrackComments(trackId: string | number) {
      const token = await ensureToken();
      return getClient().tracks.getComments(trackId, undefined, { token });
    },
    async getTrackLikes(trackId: string | number) {
      const token = await ensureToken();
      return getClient().tracks.getLikes(trackId, undefined, { token });
    },
    async getRelatedTracks(trackId: string | number) {
      const token = await ensureToken();
      return getClient().tracks.getRelated(trackId, undefined, { token });
    },
    async getUser(userId: string | number) {
      const token = await ensureToken();
      return getClient().users.getUser(userId, { token });
    },
    async getUserTracks(userId: string | number, limit?: number) {
      const token = await ensureToken();
      return getClient().users.getTracks(userId, limit, { token });
    },
    async getUserPlaylists(userId: string | number) {
      const token = await ensureToken();
      return getClient().users.getPlaylists(userId, undefined, { token });
    },
    async getUserLikesTracks(userId: string | number) {
      const token = await ensureToken();
      return getClient().users.getLikesTracks(userId, undefined, undefined, { token });
    },
    async getFollowers(userId: string | number) {
      const token = await ensureToken();
      return getClient().users.getFollowers(userId, undefined, { token });
    },
    async getFollowings(userId: string | number) {
      const token = await ensureToken();
      return getClient().users.getFollowings(userId, undefined, { token });
    },
    async getTrackStreams(trackId: string | number) {
      const token = await ensureToken();
      return getClient().tracks.getStreams(trackId, { token });
    },
    async getPlaylist(playlistId: string | number) {
      const token = await ensureToken();
      return getClient().playlists.getPlaylist(playlistId, { token });
    },
    async getPlaylistTracks(playlistId: string | number) {
      const token = await ensureToken();
      return getClient().playlists.getTracks(playlistId, undefined, undefined, { token });
    },

    /**
     * App Router catch-all handler.
     * Mount at `app/api/soundcloud/[...route]/route.ts`
     */
    handler() {
      const handle = async (request: Request): Promise<Response> => {
        const startTime = Date.now();
        let routePath = "";
        try {
          const url = new URL(request.url);
          // Extract the route portion after /api/soundcloud
          const match = url.pathname.match(/\/api\/soundcloud(\/.*)/);
          routePath = match ? match[1] : url.pathname;

          let body: any = undefined;
          if (request.method === "POST" || request.method === "PUT" || request.method === "PATCH") {
            try {
              body = await request.json();
            } catch {
              body = undefined;
            }
          }

          const response = await handleRoute(routePath, url, request.method, request.headers, body);
          ctx.config.onRouteComplete?.({
            route: routePath,
            method: request.method,
            durationMs: Date.now() - startTime,
            status: response.status,
          });
          return response;
        } catch (err: any) {
          const status = err?.statusCode ?? 500;
          ctx.config.onRouteComplete?.({
            route: routePath,
            method: request.method,
            durationMs: Date.now() - startTime,
            status,
            error: err?.message,
          });
          return errorResponse(err?.message ?? "Internal server error", status);
        }
      };
      return handle;
    },

    /**
     * Pages Router catch-all handler.
     * Mount at `pages/api/soundcloud/[...route].ts`
     */
    pagesHandler() {
      return async (req: any, res: any): Promise<void> => {
        const startTime = Date.now();
        let routePath = "";
        try {
          routePath = Array.isArray(req.query.route)
            ? "/" + req.query.route.join("/")
            : req.url?.replace(/^\/api\/soundcloud/, "") ?? "/";

          const protocol = req.headers["x-forwarded-proto"] || "http";
          const host = req.headers.host || "localhost";
          const url = new URL(`${protocol}://${host}${req.url}`);

          const headers = new Headers();
          if (req.headers.authorization) {
            headers.set("authorization", req.headers.authorization);
          }

          const response = await handleRoute(routePath, url, req.method || "GET", headers, req.body);
          const body = await response.json();
          ctx.config.onRouteComplete?.({
            route: routePath,
            method: req.method || "GET",
            durationMs: Date.now() - startTime,
            status: response.status,
          });
          res.status(response.status).json(body);
        } catch (err: any) {
          const status = err?.statusCode ?? 500;
          ctx.config.onRouteComplete?.({
            route: routePath,
            method: req.method || "GET",
            durationMs: Date.now() - startTime,
            status,
            error: err?.message,
          });
          res.status(status).json({ error: err?.message ?? "Internal server error" });
        }
      };
    },
  };
}
