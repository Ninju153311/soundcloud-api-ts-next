# soundcloud-api-ts-next

[![npm version](https://img.shields.io/npm/v/soundcloud-api-ts-next)](https://www.npmjs.com/package/soundcloud-api-ts-next)
[![npm downloads](https://img.shields.io/npm/dw/soundcloud-api-ts-next)](https://www.npmjs.com/package/soundcloud-api-ts-next)
[![CI](https://github.com/twin-paws/soundcloud-api-ts-next/actions/workflows/ci.yml/badge.svg)](https://github.com/twin-paws/soundcloud-api-ts-next/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/soundcloud-api-ts-next)](https://github.com/twin-paws/soundcloud-api-ts-next/blob/main/LICENSE)
[![bundle size](https://img.shields.io/bundlephobia/minzip/soundcloud-api-ts-next)](https://bundlephobia.com/package/soundcloud-api-ts-next)
[![install size](https://packagephobia.com/badge?p=soundcloud-api-ts-next)](https://packagephobia.com/result?p=soundcloud-api-ts-next)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node.js-≥20-339933.svg)](https://nodejs.org/)
[![docs](https://img.shields.io/badge/docs-TypeDoc-blue.svg)](https://twin-paws.github.io/soundcloud-api-ts-next/)

TypeScript React hooks and Next.js API route handlers for the SoundCloud API. Works with App Router and Pages Router. OAuth PKCE authentication built in. Client secrets stay on the server.

[**API Docs**](https://twin-paws.github.io/soundcloud-api-ts-next/) · Built on [soundcloud-api-ts](https://github.com/twin-paws/soundcloud-api-ts) — the TypeScript-first SoundCloud API client.

> **When to use this vs direct API calls:** Use this package when you're building a Next.js app and want typed React hooks for SoundCloud data without exposing credentials to the browser. The hooks fetch through your Next.js API routes, keeping secrets server-side. Supports both App Router and Pages Router. For backend-only or non-React projects, use [soundcloud-api-ts](https://github.com/twin-paws/soundcloud-api-ts) directly.

## Install

```bash
npm install soundcloud-api-ts-next
```

## Quick Start

**1. Create API routes** — secrets stay server-side:

```ts
// app/api/soundcloud/[...route]/route.ts
import { createSoundCloudRoutes } from "soundcloud-api-ts-next/server";

const sc = createSoundCloudRoutes({
  clientId: process.env.SOUNDCLOUD_CLIENT_ID!,
  clientSecret: process.env.SOUNDCLOUD_CLIENT_SECRET!,
  redirectUri: process.env.SOUNDCLOUD_REDIRECT_URI, // for OAuth
});

const handler = sc.handler();
export const GET = handler;
export const POST = handler;
export const DELETE = handler;
```

<details>
<summary>Pages Router setup</summary>

```ts
// pages/api/soundcloud/[...route].ts
import { createSoundCloudRoutes } from "soundcloud-api-ts-next/server";

const sc = createSoundCloudRoutes({
  clientId: process.env.SOUNDCLOUD_CLIENT_ID!,
  clientSecret: process.env.SOUNDCLOUD_CLIENT_SECRET!,
});

export default sc.pagesHandler();
```
</details>

**2. Add the provider:**

```tsx
// app/layout.tsx
import { SoundCloudProvider } from "soundcloud-api-ts-next";

export default function Layout({ children }) {
  return (
    <SoundCloudProvider apiPrefix="/api/soundcloud">
      {children}
    </SoundCloudProvider>
  );
}
```

**3. Use hooks:**

```tsx
import { useTrackSearch, usePlayer } from "soundcloud-api-ts-next";

function SearchPage() {
  const { data: tracks, loading } = useTrackSearch("lofi beats");

  if (loading) return <p>Searching...</p>;

  return tracks?.map((track) => (
    <div key={track.id}>
      <p>{track.title} — {track.user.username}</p>
    </div>
  ));
}
```

---

## Hooks

All hooks return `{ data, loading, error }`.

### Tracks

| Hook | Description |
|------|-------------|
| `useTrack(id)` | Single track |
| `useTrackSearch(query)` | Search tracks |
| `useTrackComments(id)` | Track comments |
| `useTrackLikes(id)` | Users who liked a track |
| `useRelatedTracks(id)` | Related tracks |
| `usePlayer(streamUrl)` | Audio player — `{ playing, progress, duration, play, pause, toggle, seek }` |

### Users

| Hook | Description |
|------|-------------|
| `useUser(id)` | Single user |
| `useUserSearch(query)` | Search users |
| `useUserTracks(id)` | User's tracks |
| `useUserPlaylists(id)` | User's playlists |
| `useUserLikes(id)` | User's liked tracks |
| `useUserFollowers(id)` | User's followers |
| `useUserFollowings(id)` | User's followings |

### Playlists

| Hook | Description |
|------|-------------|
| `usePlaylist(id)` | Single playlist |
| `usePlaylistSearch(query)` | Search playlists |
| `usePlaylistTracks(id)` | Playlist tracks |

---

## Infinite Scroll

Cursor-based pagination with `loadMore()` and `reset()`. All return `InfiniteResult<T>`:

```ts
{ data: T[], loading, error, hasMore, loadMore, reset }
```

```tsx
import { useInfiniteTrackSearch } from "soundcloud-api-ts-next";

function Feed() {
  const { data, loading, hasMore, loadMore } = useInfiniteTrackSearch("dubstep");

  return (
    <>
      {data.map((track) => <TrackCard key={track.id} track={track} />)}
      {hasMore && <button onClick={loadMore} disabled={loading}>Load More</button>}
    </>
  );
}
```

| Hook | Description |
|------|-------------|
| `useInfiniteTrackSearch(query)` | Paginated track search |
| `useInfiniteUserSearch(query)` | Paginated user search |
| `useInfinitePlaylistSearch(query)` | Paginated playlist search |
| `useInfiniteUserTracks(id)` | User's tracks |
| `useInfiniteUserPlaylists(id)` | User's playlists |
| `useInfiniteUserLikes(id)` | User's liked tracks |
| `useInfiniteUserFollowers(id)` | User's followers |
| `useInfiniteUserFollowings(id)` | User's followings |
| `useInfiniteTrackComments(id)` | Track comments |
| `useInfinitePlaylistTracks(id)` | Playlist tracks |

---

## Authentication

Full OAuth 2.1 with PKCE. No secrets on the client.

### Login

```tsx
import { useSCAuth } from "soundcloud-api-ts-next";

function LoginButton() {
  const { isAuthenticated, user, login, logout } = useSCAuth();

  if (isAuthenticated) {
    return (
      <div>
        <p>Welcome, {user?.username}</p>
        <button onClick={logout}>Logout</button>
      </div>
    );
  }

  return <button onClick={login}>Login with SoundCloud</button>;
}
```

### Callback Page

```tsx
// app/callback/page.tsx
"use client";
import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSCAuth } from "soundcloud-api-ts-next";

export default function Callback() {
  const params = useSearchParams();
  const router = useRouter();
  const { handleCallback } = useSCAuth();

  useEffect(() => {
    const code = params.get("code");
    const state = params.get("state");
    if (code && state) {
      handleCallback(code, state).then(() => router.push("/"));
    }
  }, [params]);

  return <p>Authenticating...</p>;
}
```

### Authenticated Hooks

Available after login. Automatically pass the user's access token.

| Hook | Description |
|------|-------------|
| `useMe()` | Current user profile |
| `useMeTracks()` | Your tracks |
| `useMeLikes()` | Your liked tracks |
| `useMePlaylists()` | Your playlists |
| `useMeFollowings()` | Who you follow |
| `useMeFollowers()` | Your followers |

### Actions

Mutation hooks for authenticated users.

| Hook | Methods |
|------|---------|
| `useLike()` | `likeTrack(id)`, `unlikeTrack(id)` |
| `useFollow()` | `follow(userId)`, `unfollow(userId)` |
| `useRepost()` | `repostTrack(id)`, `unrepostTrack(id)` |

```tsx
import { useLike, useFollow } from "soundcloud-api-ts-next";

function TrackActions({ trackId, artistId }) {
  const { likeTrack } = useLike();
  const { follow } = useFollow();

  return (
    <>
      <button onClick={() => likeTrack(trackId)}>❤️ Like</button>
      <button onClick={() => follow(artistId)}>➕ Follow</button>
    </>
  );
}
```

---

## Server Routes

The catch-all handler exposes these routes automatically:

| Route | Method | Description |
|-------|--------|-------------|
| `/search/tracks?q=` | GET | Search tracks |
| `/search/users?q=` | GET | Search users |
| `/search/playlists?q=` | GET | Search playlists |
| `/tracks/:id` | GET | Track details |
| `/tracks/:id/stream` | GET | Stream URLs |
| `/tracks/:id/comments` | GET | Track comments |
| `/tracks/:id/likes` | GET | Track likes |
| `/tracks/:id/related` | GET | Related tracks |
| `/tracks/:id/like` | POST/DELETE | Like/unlike (auth) |
| `/tracks/:id/repost` | POST/DELETE | Repost/unrepost (auth) |
| `/users/:id` | GET | User details |
| `/users/:id/tracks` | GET | User tracks |
| `/users/:id/playlists` | GET | User playlists |
| `/users/:id/likes/tracks` | GET | User likes |
| `/users/:id/followers` | GET | User followers |
| `/users/:id/followings` | GET | User followings |
| `/playlists/:id` | GET | Playlist details |
| `/playlists/:id/tracks` | GET | Playlist tracks |
| `/playlists/:id/like` | POST/DELETE | Like/unlike (auth) |
| `/playlists/:id/repost` | POST/DELETE | Repost/unrepost (auth) |
| `/me` | GET | Current user (auth) |
| `/me/tracks` | GET | Your tracks (auth) |
| `/me/likes` | GET | Your likes (auth) |
| `/me/playlists` | GET | Your playlists (auth) |
| `/me/followings` | GET | Your followings (auth) |
| `/me/followers` | GET | Your followers (auth) |
| `/me/follow/:userId` | POST/DELETE | Follow/unfollow (auth) |
| `/auth/login` | GET | OAuth URL (PKCE) |
| `/auth/callback` | GET | Token exchange |
| `/auth/refresh` | POST | Refresh token |
| `/auth/logout` | POST | Sign out |
| `/next?url=` | GET | Pagination cursor |

Routes marked **(auth)** require `Authorization: Bearer <token>` header.

---

## Types

Re-exported from [soundcloud-api-ts](https://github.com/twin-paws/soundcloud-api-ts):

```ts
import type {
  SoundCloudTrack,
  SoundCloudUser,
  SoundCloudPlaylist,
  SoundCloudComment,
  SoundCloudStreams,
  SoundCloudToken,
} from "soundcloud-api-ts-next";
```

---

## Requirements

- **Next.js** 13+ (App Router or Pages Router)
- **React** 18+
- **soundcloud-api-ts** installed automatically as a dependency

## License

MIT

## Related

- [soundcloud-api-ts](https://github.com/twin-paws/soundcloud-api-ts) — The TypeScript-first SoundCloud API client this package is built on
