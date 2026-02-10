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

async function handleRoute(pathname: string, url: URL): Promise<Response> {
  const token = await ensureToken();

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
      return async (request: Request): Promise<Response> => {
        try {
          const url = new URL(request.url);
          // Extract the route portion after /api/soundcloud
          const match = url.pathname.match(/\/api\/soundcloud(\/.*)/);
          const route = match ? match[1] : url.pathname;
          return await handleRoute(route, url);
        } catch (err: any) {
          const status = err?.statusCode ?? 500;
          return errorResponse(err?.message ?? "Internal server error", status);
        }
      };
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

          const response = await handleRoute(route, url);
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
