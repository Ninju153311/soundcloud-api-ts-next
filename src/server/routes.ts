import {
  SoundCloudClient,
  getClientToken,
  searchTracks,
  getTrack,
  getUser,
  getUserTracks,
  getTrackStreams,
  getFollowers,
  getFollowings,
  getUserPlaylists,
  getUserLikesTracks,
  getTrackComments,
  getTrackLikes,
  getRelatedTracks,
  getPlaylist,
  getPlaylistTracks,
  searchUsers,
  searchPlaylists,
  scFetchUrl,
  // Auth
  getAuthorizationUrl,
  generateCodeVerifier,
  generateCodeChallenge,
  getUserToken,
  refreshUserToken,
  signOut,
  // Me
  getMe,
  getMeTracks,
  getMeLikesTracks,
  getMePlaylists,
  getMeFollowings,
  getMeFollowers,
  // Actions
  followUser,
  unfollowUser,
  likeTrack,
  unlikeTrack,
  likePlaylist,
  unlikePlaylist,
  repostTrack,
  unrepostTrack,
  repostPlaylist,
  unrepostPlaylist,
} from "soundcloud-api-ts";
import type { SoundCloudRoutesConfig } from "../types.js";

interface RouteContext {
  config: SoundCloudRoutesConfig;
  token: string | undefined;
  tokenExpiry: number;
}

const ctx: RouteContext = {
  config: { clientId: "", clientSecret: "" },
  token: undefined,
  tokenExpiry: 0,
};

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
  if (ctx.token && Date.now() < ctx.tokenExpiry) return ctx.token;
  const result = await getClientToken(ctx.config.clientId, ctx.config.clientSecret);
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
    const tokens = await getUserToken(
      ctx.config.clientId,
      ctx.config.clientSecret,
      ctx.config.redirectUri,
      code,
      entry.verifier,
    );
    return jsonResponse(tokens);
  }

  // POST /auth/refresh
  if (pathname === "/auth/refresh" && method === "POST") {
    if (!ctx.config.redirectUri) {
      return errorResponse("redirectUri not configured", 500);
    }
    const refreshTokenValue = body?.refresh_token;
    if (!refreshTokenValue) return errorResponse("Missing refresh_token", 400);
    const tokens = await refreshUserToken(
      ctx.config.clientId,
      ctx.config.clientSecret,
      ctx.config.redirectUri,
      refreshTokenValue,
    );
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
    const result = await getMe(userToken);
    return jsonResponse(result);
  }

  // GET /me/tracks
  if (pathname === "/me/tracks" && method === "GET") {
    if (!userToken) return errorResponse("Authorization required", 401);
    const result = await getMeTracks(userToken);
    return jsonResponse(result);
  }

  // GET /me/likes
  if (pathname === "/me/likes" && method === "GET") {
    if (!userToken) return errorResponse("Authorization required", 401);
    const result = await getMeLikesTracks(userToken);
    return jsonResponse(result);
  }

  // GET /me/playlists
  if (pathname === "/me/playlists" && method === "GET") {
    if (!userToken) return errorResponse("Authorization required", 401);
    const result = await getMePlaylists(userToken);
    return jsonResponse(result);
  }

  // GET /me/followings
  if (pathname === "/me/followings" && method === "GET") {
    if (!userToken) return errorResponse("Authorization required", 401);
    const result = await getMeFollowings(userToken);
    return jsonResponse(result);
  }

  // GET /me/followers
  if (pathname === "/me/followers" && method === "GET") {
    if (!userToken) return errorResponse("Authorization required", 401);
    const result = await getMeFollowers(userToken);
    return jsonResponse(result);
  }

  // ── Action routes (POST/DELETE) ──

  // POST|DELETE /me/follow/:userId
  const followMatch = pathname.match(/^\/me\/follow\/([^/]+)$/);
  if (followMatch && (method === "POST" || method === "DELETE")) {
    if (!userToken) return errorResponse("Authorization required", 401);
    const userId = followMatch[1];
    if (method === "POST") {
      await followUser(userToken, userId);
    } else {
      await unfollowUser(userToken, userId);
    }
    return jsonResponse({ success: true });
  }

  // POST|DELETE /tracks/:id/like
  const trackLikeActionMatch = pathname.match(/^\/tracks\/([^/]+)\/like$/);
  if (trackLikeActionMatch && (method === "POST" || method === "DELETE")) {
    if (!userToken) return errorResponse("Authorization required", 401);
    const trackId = trackLikeActionMatch[1];
    if (method === "POST") {
      await likeTrack(userToken, trackId);
    } else {
      await unlikeTrack(userToken, trackId);
    }
    return jsonResponse({ success: true });
  }

  // POST|DELETE /tracks/:id/repost
  const trackRepostMatch = pathname.match(/^\/tracks\/([^/]+)\/repost$/);
  if (trackRepostMatch && (method === "POST" || method === "DELETE")) {
    if (!userToken) return errorResponse("Authorization required", 401);
    const trackId = trackRepostMatch[1];
    if (method === "POST") {
      await repostTrack(userToken, trackId);
    } else {
      await unrepostTrack(userToken, trackId);
    }
    return jsonResponse({ success: true });
  }

  // POST|DELETE /playlists/:id/like
  const playlistLikeMatch = pathname.match(/^\/playlists\/([^/]+)\/like$/);
  if (playlistLikeMatch && (method === "POST" || method === "DELETE")) {
    if (!userToken) return errorResponse("Authorization required", 401);
    const playlistId = playlistLikeMatch[1];
    if (method === "POST") {
      await likePlaylist(userToken, playlistId);
    } else {
      await unlikePlaylist(userToken, playlistId);
    }
    return jsonResponse({ success: true });
  }

  // POST|DELETE /playlists/:id/repost
  const playlistRepostMatch = pathname.match(/^\/playlists\/([^/]+)\/repost$/);
  if (playlistRepostMatch && (method === "POST" || method === "DELETE")) {
    if (!userToken) return errorResponse("Authorization required", 401);
    const playlistId = playlistRepostMatch[1];
    if (method === "POST") {
      await repostPlaylist(userToken, playlistId);
    } else {
      await unrepostPlaylist(userToken, playlistId);
    }
    return jsonResponse({ success: true });
  }

  // ── Public routes (use client credentials token) ──
  const token = await ensureToken();

  // /next?url=<encoded_next_href> — generic next-page fetcher
  if (pathname === "/next") {
    const nextUrl = url.searchParams.get("url");
    if (!nextUrl) return errorResponse("Missing 'url' parameter", 400);
    const result = await scFetchUrl(nextUrl, token);
    return jsonResponse(result);
  }

  // /search/playlists?q=...
  if (pathname === "/search/playlists") {
    const q = url.searchParams.get("q");
    if (!q) return errorResponse("Missing query parameter 'q'", 400);
    const result = await searchPlaylists(token, q);
    return jsonResponse(result);
  }

  // /search/users?q=...
  if (pathname === "/search/users") {
    const q = url.searchParams.get("q");
    if (!q) return errorResponse("Missing query parameter 'q'", 400);
    const result = await searchUsers(token, q);
    return jsonResponse(result);
  }

  // /search/tracks?q=...&limit=...
  if (pathname === "/search/tracks") {
    const q = url.searchParams.get("q");
    if (!q) return errorResponse("Missing query parameter 'q'", 400);
    const page = url.searchParams.get("page");
    const result = await searchTracks(token, q, page ? parseInt(page, 10) : undefined);
    return jsonResponse(result);
  }

  // /tracks/:id/stream
  const streamMatch = pathname.match(/^\/tracks\/([^/]+)\/stream$/);
  if (streamMatch) {
    const streams = await getTrackStreams(token, streamMatch[1]);
    return jsonResponse(streams);
  }

  // /tracks/:id/comments
  const trackCommentsMatch = pathname.match(/^\/tracks\/([^/]+)\/comments$/);
  if (trackCommentsMatch) {
    const result = await getTrackComments(token, trackCommentsMatch[1]);
    return jsonResponse(result);
  }

  // /tracks/:id/likes
  const trackLikesMatch = pathname.match(/^\/tracks\/([^/]+)\/likes$/);
  if (trackLikesMatch) {
    const result = await getTrackLikes(token, trackLikesMatch[1]);
    return jsonResponse(result);
  }

  // /tracks/:id/related
  const trackRelatedMatch = pathname.match(/^\/tracks\/([^/]+)\/related$/);
  if (trackRelatedMatch) {
    const result = await getRelatedTracks(token, trackRelatedMatch[1]);
    return jsonResponse(result);
  }

  // /tracks/:id
  const trackMatch = pathname.match(/^\/tracks\/([^/]+)$/);
  if (trackMatch) {
    const track = await getTrack(token, trackMatch[1]);
    return jsonResponse(track);
  }

  // /playlists/:id/tracks
  const playlistTracksMatch = pathname.match(/^\/playlists\/([^/]+)\/tracks$/);
  if (playlistTracksMatch) {
    const result = await getPlaylistTracks(token, playlistTracksMatch[1]);
    return jsonResponse(result);
  }

  // /playlists/:id
  const playlistMatch = pathname.match(/^\/playlists\/([^/]+)$/);
  if (playlistMatch) {
    const result = await getPlaylist(token, playlistMatch[1]);
    return jsonResponse(result);
  }

  // /users/:id/tracks
  const userTracksMatch = pathname.match(/^\/users\/([^/]+)\/tracks$/);
  if (userTracksMatch) {
    const limit = url.searchParams.get("limit");
    const result = await getUserTracks(
      token,
      userTracksMatch[1],
      limit ? parseInt(limit, 10) : undefined,
    );
    return jsonResponse(result);
  }

  // /users/:id/playlists
  const userPlaylistsMatch = pathname.match(/^\/users\/([^/]+)\/playlists$/);
  if (userPlaylistsMatch) {
    const result = await getUserPlaylists(token, userPlaylistsMatch[1]);
    return jsonResponse(result);
  }

  // /users/:id/likes/tracks
  const userLikesMatch = pathname.match(/^\/users\/([^/]+)\/likes\/tracks$/);
  if (userLikesMatch) {
    const result = await getUserLikesTracks(token, userLikesMatch[1]);
    return jsonResponse(result);
  }

  // /users/:id/followers
  const userFollowersMatch = pathname.match(/^\/users\/([^/]+)\/followers$/);
  if (userFollowersMatch) {
    const result = await getFollowers(token, userFollowersMatch[1]);
    return jsonResponse(result);
  }

  // /users/:id/followings
  const userFollowingsMatch = pathname.match(/^\/users\/([^/]+)\/followings$/);
  if (userFollowingsMatch) {
    const result = await getFollowings(token, userFollowingsMatch[1]);
    return jsonResponse(result);
  }

  // /users/:id
  const userMatch = pathname.match(/^\/users\/([^/]+)$/);
  if (userMatch) {
    const user = await getUser(token, userMatch[1]);
    return jsonResponse(user);
  }

  return errorResponse("Not found", 404);
}

export function createSoundCloudRoutes(config: SoundCloudRoutesConfig) {
  ctx.config = config;
  // Reset token when config changes
  ctx.token = undefined;
  ctx.tokenExpiry = 0;

  return {
    /** Individual route handlers */
    async searchTracks(q: string, page?: number) {
      const token = await ensureToken();
      return searchTracks(token, q, page);
    },
    async searchUsers(q: string) {
      const token = await ensureToken();
      return searchUsers(token, q);
    },
    async searchPlaylists(q: string) {
      const token = await ensureToken();
      return searchPlaylists(token, q);
    },
    async getTrack(trackId: string | number) {
      const token = await ensureToken();
      return getTrack(token, trackId);
    },
    async getTrackComments(trackId: string | number) {
      const token = await ensureToken();
      return getTrackComments(token, trackId);
    },
    async getTrackLikes(trackId: string | number) {
      const token = await ensureToken();
      return getTrackLikes(token, trackId);
    },
    async getRelatedTracks(trackId: string | number) {
      const token = await ensureToken();
      return getRelatedTracks(token, trackId);
    },
    async getUser(userId: string | number) {
      const token = await ensureToken();
      return getUser(token, userId);
    },
    async getUserTracks(userId: string | number, limit?: number) {
      const token = await ensureToken();
      return getUserTracks(token, userId, limit);
    },
    async getUserPlaylists(userId: string | number) {
      const token = await ensureToken();
      return getUserPlaylists(token, userId);
    },
    async getUserLikesTracks(userId: string | number) {
      const token = await ensureToken();
      return getUserLikesTracks(token, userId);
    },
    async getFollowers(userId: string | number) {
      const token = await ensureToken();
      return getFollowers(token, userId);
    },
    async getFollowings(userId: string | number) {
      const token = await ensureToken();
      return getFollowings(token, userId);
    },
    async getTrackStreams(trackId: string | number) {
      const token = await ensureToken();
      return getTrackStreams(token, trackId);
    },
    async getPlaylist(playlistId: string | number) {
      const token = await ensureToken();
      return getPlaylist(token, playlistId);
    },
    async getPlaylistTracks(playlistId: string | number) {
      const token = await ensureToken();
      return getPlaylistTracks(token, playlistId);
    },

    /**
     * App Router catch-all handler.
     * Mount at `app/api/soundcloud/[...route]/route.ts`
     */
    handler() {
      const handle = async (request: Request): Promise<Response> => {
        try {
          const url = new URL(request.url);
          // Extract the route portion after /api/soundcloud
          const match = url.pathname.match(/\/api\/soundcloud(\/.*)/);
          const route = match ? match[1] : url.pathname;

          let body: any = undefined;
          if (request.method === "POST" || request.method === "PUT" || request.method === "PATCH") {
            try {
              body = await request.json();
            } catch {
              body = undefined;
            }
          }

          return await handleRoute(route, url, request.method, request.headers, body);
        } catch (err: any) {
          const status = err?.statusCode ?? 500;
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
        try {
          const route = Array.isArray(req.query.route)
            ? "/" + req.query.route.join("/")
            : req.url?.replace(/^\/api\/soundcloud/, "") ?? "/";

          const protocol = req.headers["x-forwarded-proto"] || "http";
          const host = req.headers.host || "localhost";
          const url = new URL(`${protocol}://${host}${req.url}`);

          const headers = new Headers();
          if (req.headers.authorization) {
            headers.set("authorization", req.headers.authorization);
          }

          const response = await handleRoute(route, url, req.method || "GET", headers, req.body);
          const body = await response.json();
          res.status(response.status).json(body);
        } catch (err: any) {
          const status = err?.statusCode ?? 500;
          res.status(status).json({ error: err?.message ?? "Internal server error" });
        }
      };
    },
  };
}
